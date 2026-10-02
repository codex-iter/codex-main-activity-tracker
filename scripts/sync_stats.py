"""
CODEX Activity Tracker - Automated Stats Sync Pipeline
=======================================================
Runs twice daily via GitHub Actions to fetch platform metrics for all active
CODEX members and upsert a daily snapshot into Supabase.

Environment Variables Required:
    SUPABASE_URL              - Supabase project URL
    SUPABASE_SERVICE_ROLE_KEY - Supabase service role key (bypasses RLS)
    LEADERBOARD_GH_PAT        - GitHub Personal Access Token

--- API Response Shapes (live-verified) ---

GitHub GraphQL /graphql:
  data.user.repositories.totalCount
  data.user.contributionsCollection.contributionCalendar.totalContributions

Codeforces /api/user.info?handles={}:
  result[0].rating, result[0].maxRating, result[0].rank

Codeforces /api/user.status?handle={}:
  result[].verdict == "OK" -> distinct (contestId, index) for solved count

Codeforces /api/user.rating?handle={}:
  result[] -> length = contests attended

LeetCode  GET /{handle}/solved       -> { total_solved }
LeetCode  GET /{handle}              -> { submitStats.acSubmissionNum[{difficulty,count}] }
LeetCode  GET /{handle}/contests     -> {
              userContestRanking: { attendedContestsCount, rating, badge.name },
              userContestRankingHistory: [{ rating }]  <- max() for peak
            }

CodeChef  GET /{handle}              -> { data: { totalSolved, totalActiveDays, currentRating, maxRating } }
CodeChef  GET /{handle}/heatmap      -> { data: { totalSubmissions, currentStreak, longestStreak, totalActiveDays } }
CodeChef  GET /{handle}/contests     -> { data: { count, rating, maxRating } }
CodeChef  GET /{handle}/stats        -> { data: { topicAnalysis: [{topic, count}] } }

GFG       GET /{handle}              -> { data: { totalSolved, totalActiveDays }, totalProblemsSolved }
GFG       GET /{handle}/heatmap      -> { data: { totalSubmissions, currentStreak, longestStreak, totalActiveDays } }
GFG       GET /{handle}/stats        -> { data: { byDifficulty: {school,basic,easy,medium,hard}, topicAnalysis: [{topic,count}] } }
GFG       GET /{handle}/rating       -> { data: { current, max } }   <- may be null

HackerRank GET /{handle}/badges      -> { badges: [...], data: { count } }
HackerRank GET /{handle}/stats       -> { data: { topicAnalysis: [{topic, count}] } }
"""

import logging
import os
import time
from datetime import datetime, timezone

import requests
from supabase import create_client, Client

# ---------------------------------------------------------------------------
# Logging Configuration
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
REQUEST_TIMEOUT = 10          # seconds per external API call
INTER_CALL_SLEEP = 1.5        # seconds between platform calls (rate-limit courtesy)
GH_CONTRIBUTIONS_CAP = 500    # cap GitHub contributions to prevent padding exploit

# Standard browser User-Agent to bypass Cloudflare/bot-protection on community APIs
BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json",
}

# ---------------------------------------------------------------------------
# Supabase Client
# ---------------------------------------------------------------------------

def get_supabase_client() -> Client:
    """Initialize and return a Supabase client using environment variables."""
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise EnvironmentError(
            "Missing required environment variables: SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY"
        )
    return create_client(url, key)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get(url: str, **kwargs) -> dict:
    """
    Thin wrapper around requests.get that always attaches BROWSER_HEADERS
    and the standard timeout, then raises on non-2xx status.
    """
    headers = {**BROWSER_HEADERS, **kwargs.pop("headers", {})}
    resp = requests.get(url, headers=headers, timeout=REQUEST_TIMEOUT, **kwargs)
    resp.raise_for_status()
    return resp.json()


def _safe_int(value, default: int = 0) -> int:
    """Convert value to int, returning default on None / TypeError / ValueError."""
    try:
        return int(value) if value is not None else default
    except (TypeError, ValueError):
        return default


def _safe_float(value, default: float = 0.0) -> float:
    try:
        return float(value) if value is not None else default
    except (TypeError, ValueError):
        return default


# ---------------------------------------------------------------------------
# Platform Data Fetchers
# ---------------------------------------------------------------------------

# ── GitHub ─────────────────────────────────────────────────────────────────

def fetch_github(handle: str) -> dict:
    """
    Fetch GitHub contributions (current year) and public repo count via GraphQL.

    Response path:
      data.user.repositories.totalCount
      data.user.contributionsCollection.contributionCalendar.totalContributions

    Returns: { github_contributions, github_repos }
    """
    token = os.environ.get("LEADERBOARD_GH_PAT", "")
    query = """
    query($login: String!) {
      user(login: $login) {
        repositories(privacy: PUBLIC) { totalCount }
        contributionsCollection {
          contributionCalendar { totalContributions }
        }
      }
    }
    """
    resp = requests.post(
        "https://api.github.com/graphql",
        json={"query": query, "variables": {"login": handle}},
        headers={
            **BROWSER_HEADERS,
            "Authorization": f"bearer {token}",
            "Content-Type": "application/json",
        },
        timeout=REQUEST_TIMEOUT,
    )
    resp.raise_for_status()
    data = resp.json()
    user = data.get("data", {}).get("user") or {}
    contributions = (
        user.get("contributionsCollection", {})
            .get("contributionCalendar", {})
            .get("totalContributions", 0)
    )
    repos = user.get("repositories", {}).get("totalCount", 0)
    return {
        "github_contributions": _safe_int(contributions),
        "github_repos": _safe_int(repos),
    }


# ── Codeforces ─────────────────────────────────────────────────────────────

def fetch_codeforces(handle: str) -> dict:
    """
    Fetches Codeforces metrics across three endpoints:
      1. user.info  -> current rating, max rating, rank title
      2. user.status -> count of distinct AC'd problems
      3. user.rating -> number of rated contests attended

    Returns: {
      codeforces_rating, codeforces_max_rating, codeforces_rank_title,
      codeforces_solved, contests_attended (CF portion)
    }
    """
    # 1. Profile info
    info_data = _get(f"https://codeforces.com/api/user.info?handles={handle}")
    rating, max_rating, rank_title = 0, 0, "Unrated"
    if info_data.get("status") == "OK" and info_data.get("result"):
        r = info_data["result"][0]
        rating = _safe_int(r.get("rating"))
        max_rating = _safe_int(r.get("maxRating"))
        rank_title = r.get("rank") or "Unrated"

    time.sleep(INTER_CALL_SLEEP)

    # 2. Distinct solved problems
    status_data = _get(f"https://codeforces.com/api/user.status?handle={handle}")
    solved: set = set()
    if status_data.get("status") == "OK":
        for sub in status_data.get("result", []):
            if sub.get("verdict") == "OK":
                prob = sub.get("problem", {})
                solved.add((prob.get("contestId"), prob.get("index")))

    time.sleep(INTER_CALL_SLEEP)

    # 3. Contest history -> count attended
    rating_data = _get(f"https://codeforces.com/api/user.rating?handle={handle}")
    cf_contests = 0
    if rating_data.get("status") == "OK":
        cf_contests = len(rating_data.get("result", []))

    return {
        "codeforces_rating": rating,
        "codeforces_max_rating": max_rating,
        "codeforces_rank_title": rank_title,
        "codeforces_solved": len(solved),
        "cf_contests_attended": cf_contests,
    }


# ── LeetCode ───────────────────────────────────────────────────────────────

def fetch_leetcode(handle: str) -> dict:
    """
    Fetches LeetCode metrics across two endpoints:
      1. GET /{handle}/solved  -> { total_solved }
         (real key is `total_solved` in snake_case, NOT `totalSolved`)
      2. GET /{handle}         -> { submitStats.acSubmissionNum[{difficulty, count}] }
         Used for per-difficulty breakdown (easy / medium / hard).
      3. GET /{handle}/contests -> {
             userContestRanking: { attendedContestsCount, rating, badge.name },
             userContestRankingHistory: [{ rating }]
           }
         Used for contest count and max rating (peak over history).

    Returns: {
      leetcode_easy, leetcode_medium, leetcode_hard, leetcode_total,
      leetcode_max_rating, lc_contests_attended, lc_badge_name
    }
    """
    BASE = "https://leetcode-api-pied.vercel.app"

    # 1. Total solved
    solved_data = _get(f"{BASE}/user/{handle}/solved")
    total = _safe_int(solved_data.get("total_solved"))

    time.sleep(INTER_CALL_SLEEP)

    # 2. Per-difficulty breakdown from summary endpoint
    easy = medium = hard = 0
    try:
        summary = _get(f"{BASE}/user/{handle}")
        ac_list = (
            summary.get("submitStats", {})
                   .get("acSubmissionNum", [])
        )
        for item in ac_list:
            diff = (item.get("difficulty") or "").lower()
            count = _safe_int(item.get("count"))
            if diff == "easy":
                easy = count
            elif diff == "medium":
                medium = count
            elif diff == "hard":
                hard = count
        if easy + medium + hard > total:
            total = easy + medium + hard
    except Exception as exc:
        log.warning("    LeetCode difficulty breakdown unavailable for %s: %s", handle, exc)

    time.sleep(INTER_CALL_SLEEP)

    # 3. Contest history
    lc_contests = 0
    lc_max_rating = 0
    lc_badge = ""
    try:
        contest_data = _get(f"{BASE}/user/{handle}/contests")
        ranking = contest_data.get("userContestRanking") or {}
        lc_contests = _safe_int(ranking.get("attendedContestsCount"))
        current_rating = _safe_float(ranking.get("rating"))
        lc_badge = (ranking.get("badge") or {}).get("name") or ""

        # Peak rating = max across full history
        history = contest_data.get("userContestRankingHistory") or []
        history_ratings = [
            _safe_float(entry.get("rating"))
            for entry in history
            if entry.get("attended") is True
        ]
        lc_max_rating = int(max([current_rating] + history_ratings)) if history_ratings else int(current_rating)
    except Exception as exc:
        log.warning("    LeetCode contests unavailable for %s: %s", handle, exc)

    return {
        "leetcode_easy": easy,
        "leetcode_medium": medium,
        "leetcode_hard": hard,
        "leetcode_total": total,
        "leetcode_max_rating": lc_max_rating,
        "lc_contests_attended": lc_contests,
        "lc_badge_name": lc_badge,
    }


# ── CodeChef ───────────────────────────────────────────────────────────────

def fetch_codechef(handle: str) -> dict:
    """
    Fetches CodeChef metrics across three endpoints. All data is inside `data: {}`.

    1. GET /{handle}          -> data.{ currentRating, maxRating, totalSolved, totalActiveDays }
    2. GET /{handle}/heatmap  -> data.{ totalSubmissions, currentStreak, longestStreak }
    3. GET /{handle}/contests -> data.{ count (contests attended) }
    4. GET /{handle}/stats    -> data.{ topicAnalysis: [{topic, count}] }

    Returns: {
      codechef_rating, codechef_max_rating, codechef_solved,
      cc_active_days, cc_total_submissions, cc_current_streak, cc_max_streak,
      cc_contests_attended, cc_topics
    }
    """
    BASE = f"https://codechef-stats.tashif.codes/{handle}"

    # 1. Profile summary
    profile = (_get(BASE).get("data") or {})
    cc_rating = _safe_int(profile.get("currentRating"))
    cc_max_rating = _safe_int(profile.get("maxRating"))
    cc_solved = _safe_int(profile.get("totalSolved"))
    cc_active_days = _safe_int(profile.get("totalActiveDays"))

    time.sleep(INTER_CALL_SLEEP)

    # 2. Heatmap -> streak & submission counts
    heatmap = (_get(f"{BASE}/heatmap").get("data") or {})
    cc_total_subs = _safe_int(heatmap.get("totalSubmissions"))
    cc_current_streak = _safe_int(heatmap.get("currentStreak"))
    cc_max_streak = _safe_int(heatmap.get("longestStreak"))
    # Prefer heatmap active days as it's more granular
    if heatmap.get("totalActiveDays"):
        cc_active_days = _safe_int(heatmap.get("totalActiveDays"))

    time.sleep(INTER_CALL_SLEEP)

    # 3. Contests attended
    contests_data = (_get(f"{BASE}/contests").get("data") or {})
    cc_contests = _safe_int(contests_data.get("count"))
    # If the contests endpoint has a better maxRating, prefer it
    if contests_data.get("maxRating"):
        cc_max_rating = _safe_int(contests_data.get("maxRating"))

    time.sleep(INTER_CALL_SLEEP)

    # 4. Topic analysis
    stats_data = (_get(f"{BASE}/stats").get("data") or {})
    cc_topics = {
        item["topic"]: item["count"]
        for item in stats_data.get("topicAnalysis", [])
        if item.get("topic")
    }

    return {
        "codechef_rating": cc_rating,
        "codechef_max_rating": cc_max_rating,
        "codechef_solved": cc_solved,
        "cc_active_days": cc_active_days,
        "cc_total_submissions": cc_total_subs,
        "cc_current_streak": cc_current_streak,
        "cc_max_streak": cc_max_streak,
        "cc_contests_attended": cc_contests,
        "cc_topics": cc_topics,
    }


# ── GeeksforGeeks ──────────────────────────────────────────────────────────

def fetch_gfg(handle: str) -> dict:
    """
    Fetches GFG metrics across three endpoints. All data is inside `data: {}`.

    1. GET /{handle}          -> data.totalSolved  (top-level totalProblemsSolved as fallback)
    2. GET /{handle}/heatmap  -> data.{ totalSubmissions, currentStreak, longestStreak, totalActiveDays }
    3. GET /{handle}/stats    -> data.{
           byDifficulty: { school, basic, easy, medium, hard },
           topicAnalysis: [{topic, count}]
         }
    4. GET /{handle}/rating   -> data.{ current (max rating if available) }

    GFG difficulty keys (live-verified):
      data.byDifficulty.school / basic / easy / medium / hard

    Returns: {
      gfg_solved, gfg_score,
      gfg_school, gfg_basic, gfg_easy, gfg_medium, gfg_hard,
      gfg_active_days, gfg_total_submissions, gfg_current_streak, gfg_max_streak,
      gfg_topics
    }
    """
    BASE = f"https://gfg-stats.tashif.codes/{handle}"

    # 1. Summary
    summary_payload = _get(BASE)
    summary_data = summary_payload.get("data") or {}
    solved = _safe_int(
        summary_data.get("totalSolved")
        or summary_payload.get("totalProblemsSolved")
    )

    time.sleep(INTER_CALL_SLEEP)

    # 2. Heatmap -> streak & submission counts
    heatmap = (_get(f"{BASE}/heatmap").get("data") or {})
    gfg_total_subs = _safe_int(heatmap.get("totalSubmissions"))
    gfg_current_streak = _safe_int(heatmap.get("currentStreak"))
    gfg_max_streak = _safe_int(heatmap.get("longestStreak"))
    gfg_active_days = _safe_int(heatmap.get("totalActiveDays"))

    time.sleep(INTER_CALL_SLEEP)

    # 3. Difficulty breakdown + topics
    stats_data = (_get(f"{BASE}/stats").get("data") or {})
    by_diff = stats_data.get("byDifficulty") or {}
    gfg_school = _safe_int(by_diff.get("school"))
    gfg_basic = _safe_int(by_diff.get("basic"))
    gfg_easy = _safe_int(by_diff.get("easy"))
    gfg_medium = _safe_int(by_diff.get("medium"))
    gfg_hard = _safe_int(by_diff.get("hard"))
    gfg_topics = {
        item["topic"]: item["count"]
        for item in stats_data.get("topicAnalysis", [])
        if item.get("topic")
    }

    time.sleep(INTER_CALL_SLEEP)

    # 4. Rating (may be null for non-contest users)
    rating_data = (_get(f"{BASE}/rating").get("data") or {})
    gfg_max_rating = _safe_int(rating_data.get("max"))

    # Use totalSolved as score (no dedicated score field exists in this API)
    score = solved

    return {
        "gfg_solved": solved,
        "gfg_score": score,
        "gfg_school": gfg_school,
        "gfg_basic": gfg_basic,
        "gfg_easy": gfg_easy,
        "gfg_medium": gfg_medium,
        "gfg_hard": gfg_hard,
        "gfg_active_days": gfg_active_days,
        "gfg_total_submissions": gfg_total_subs,
        "gfg_current_streak": gfg_current_streak,
        "gfg_max_streak": gfg_max_streak,
        "gfg_max_rating": gfg_max_rating,
        "gfg_topics": gfg_topics,
    }


# ── HackerRank ─────────────────────────────────────────────────────────────

def fetch_hackerrank(handle: str) -> dict:
    """
    Fetches HackerRank metrics across two endpoints.

    1. GET /{handle}/badges  -> { badges: [...], data: { count, list: [{id,name}] } }
       badge count = data.count, badge list = data.list
    2. GET /{handle}/stats   -> { data: { topicAnalysis: [{topic, count}] } }

    Returns: {
      hackerrank_badges, hr_badges_list, hr_topics
    }
    """
    BASE = f"https://hackerrank-stats.tashif.codes/{handle}"

    # 1. Badges
    badges_payload = _get(f"{BASE}/badges")
    badges_data = badges_payload.get("data") or {}
    hr_badge_count = _safe_int(
        badges_data.get("count")
        if badges_data.get("count") is not None
        else len(badges_payload.get("badges", []))
    )
    hr_badges_list = [
        {"id": b.get("id", ""), "name": b.get("name") or b.get("displayName", "")}
        for b in (badges_data.get("list") or badges_payload.get("badges") or [])
    ]

    time.sleep(INTER_CALL_SLEEP)

    # 2. Topic analysis from stats
    hr_topics = {}
    try:
        stats_data = (_get(f"{BASE}/stats").get("data") or {})
        hr_topics = {
            item["topic"]: item["count"]
            for item in stats_data.get("topicAnalysis", [])
            if item.get("topic")
        }
    except Exception as exc:
        log.warning("    HackerRank topics unavailable for %s: %s", handle, exc)

    return {
        "hackerrank_badges": hr_badge_count,
        "hr_badges_list": hr_badges_list,
        "hr_topics": hr_topics,
    }


# ---------------------------------------------------------------------------
# Snapshot Assembly: JSONB Aggregation
# ---------------------------------------------------------------------------

def build_topic_stats(lc_summary: dict, cc_topics: dict, gfg_topics: dict, hr_topics: dict) -> dict:
    """
    Aggregates topic/tag data from all platforms into a single JSONB dict.
    Structure: { "leetcode": {tag: count}, "codechef": {topic: count}, ... }
    """
    # LeetCode topics come from the summary endpoint's tagProblemCounts (if present)
    lc_topics = {}
    try:
        tag_counts = lc_summary.get("tagProblemCounts") or {}
        for section in ("advanced", "intermediate", "fundamental"):
            for item in tag_counts.get(section, []):
                name = item.get("tagName") or item.get("tagSlug", "")
                count = _safe_int(item.get("problemsSolved"))
                if name:
                    lc_topics[name] = lc_topics.get(name, 0) + count
    except Exception:
        pass

    return {
        "leetcode": lc_topics,
        "codechef": cc_topics,
        "gfg": gfg_topics,
        "hackerrank": hr_topics,
    }


def build_badges_detail(lc_badge_name: str, hr_badges_list: list) -> list:
    """
    Combines badge data from all platforms into a JSONB-compatible list of dicts.
    Each badge: { platform, id, name }
    """
    badges = []
    if lc_badge_name:
        badges.append({"platform": "leetcode", "id": "lc_badge", "name": lc_badge_name})
    for b in hr_badges_list:
        badges.append({"platform": "hackerrank", "id": b.get("id", ""), "name": b.get("name", "")})
    return badges


# ---------------------------------------------------------------------------
# Scoring Formula
# ---------------------------------------------------------------------------

def calculate_score(snapshot: dict) -> float:
    """
    Calculate the unified CODEX score from a snapshot dict.
    Weights:
      LeetCode   : easy*1 + medium*3 + hard*6
      Codeforces : solved*3 + max(0, rating-800)*0.5
      CodeChef   : solved*2 + max(0, rating-1000)*0.4
      GFG        : solved*1.5 + score*0.2
      GitHub     : min(contributions, 500) * 1.0
      HackerRank : badges * 5
    """
    lc = (
        snapshot.get("leetcode_easy", 0) * 1
        + snapshot.get("leetcode_medium", 0) * 3
        + snapshot.get("leetcode_hard", 0) * 6
    )
    cf_rating = snapshot.get("codeforces_rating", 0) or 0
    cf = snapshot.get("codeforces_solved", 0) * 3 + max(0, cf_rating - 800) * 0.5

    cc_rating = snapshot.get("codechef_rating", 0) or 0
    cc = snapshot.get("codechef_solved", 0) * 2 + max(0, cc_rating - 1000) * 0.4

    gfg = (
        snapshot.get("gfg_solved", 0) * 1.5
        + snapshot.get("gfg_score", 0) * 0.2
    )
    gh = min(snapshot.get("github_contributions", 0), GH_CONTRIBUTIONS_CAP) * 1.0
    hr = snapshot.get("hackerrank_badges", 0) * 5

    return round(lc + cf + cc + gfg + gh + hr, 2)


# ---------------------------------------------------------------------------
# Platform Fetch Dispatcher
# ---------------------------------------------------------------------------

def safe_fetch(fetcher, handle: str, platform: str, defaults: dict) -> dict:
    """
    Safely calls a platform fetcher. On any exception, logs a warning with the
    full error message and returns the provided default values to keep the sync
    loop running without aborting the entire member sync.
    """
    try:
        result = fetcher(handle)
        log.info("    ✓ %-12s -> %s", platform, result)
        return result
    except requests.exceptions.Timeout:
        log.warning(
            "    ✗ %-12s -> Timed out after %ds (handle=%s). Using defaults.",
            platform, REQUEST_TIMEOUT, handle,
        )
    except requests.exceptions.HTTPError as exc:
        status = exc.response.status_code if exc.response is not None else "?"
        body = ""
        try:
            body = exc.response.text[:200]
        except Exception:  # noqa: BLE001
            pass
        log.warning(
            "    ✗ %-12s -> HTTP %s (handle=%s). Body: %s. Using defaults.",
            platform, status, handle, body,
        )
    except Exception as exc:  # noqa: BLE001
        log.warning(
            "    ✗ %-12s -> Unexpected error (handle=%s): %s. Using defaults.",
            platform, handle, exc,
        )
    return defaults


# ---------------------------------------------------------------------------
# Main Sync Logic
# ---------------------------------------------------------------------------

def sync_member(member: dict, today: str) -> dict:
    """
    Fetch all platform metrics for a single member and build the full snapshot dict.
    """
    member_id = member["id"]
    name = member.get("full_name", "Unknown")
    log.info("  Syncing member: %s (%s)", name, member_id)

    # ── Defaults for every snapshot column ──────────────────────────────────
    snapshot: dict = {
        "member_id": member_id,
        "snapshot_date": today,

        # Basic platform metrics (existing columns)
        "github_contributions": 0,
        "github_repos": 0,
        "codeforces_rating": 0,
        "codeforces_solved": 0,
        "leetcode_easy": 0,
        "leetcode_medium": 0,
        "leetcode_hard": 0,
        "leetcode_total": 0,
        "codechef_rating": 0,
        "codechef_solved": 0,
        "gfg_score": 0,
        "gfg_solved": 0,
        "hackerrank_badges": 0,
        "total_score": 0.0,

        # ── NEW: Consistency & Streaks ─────────────────────────────────────
        "active_days": 0,
        "current_streak": 0,
        "max_streak": 0,
        "total_submissions": 0,

        # ── NEW: Contest Metrics & Peak Ratings ───────────────────────────
        "contests_attended": 0,
        "leetcode_max_rating": 0,
        "codechef_max_rating": 0,
        "codeforces_max_rating": 0,
        "codeforces_rank_title": "Unrated",

        # ── NEW: GFG Difficulty Breakdown ─────────────────────────────────
        "gfg_school": 0,
        "gfg_basic": 0,
        "gfg_easy": 0,
        "gfg_medium": 0,
        "gfg_hard": 0,

        # ── NEW: Deep Analytics (JSONB) ───────────────────────────────────
        "topic_stats": {},
        "badges_detail": [],
    }

    # Intermediate fields (not written directly to Supabase — used for aggregation)
    _lc_badge_name = ""
    _hr_badges_list: list = []
    _cc_topics: dict = {}
    _gfg_topics: dict = {}
    _hr_topics: dict = {}
    _lc_summary: dict = {}   # cached for topic extraction
    _cf_contests = 0
    _lc_contests = 0
    _cc_contests = 0

    # ── GitHub ──────────────────────────────────────────────────────────────
    if handle := member.get("github_handle"):
        defaults = {"github_contributions": 0, "github_repos": 0}
        data = safe_fetch(fetch_github, handle, "GitHub", defaults)
        snapshot.update(data)
        time.sleep(INTER_CALL_SLEEP)

    # ── Codeforces ──────────────────────────────────────────────────────────
    if handle := member.get("codeforces_handle"):
        defaults = {
            "codeforces_rating": 0, "codeforces_max_rating": 0,
            "codeforces_rank_title": "Unrated", "codeforces_solved": 0,
            "cf_contests_attended": 0,
        }
        data = safe_fetch(fetch_codeforces, handle, "Codeforces", defaults)
        snapshot["codeforces_rating"] = data.get("codeforces_rating", 0)
        snapshot["codeforces_max_rating"] = data.get("codeforces_max_rating", 0)
        snapshot["codeforces_rank_title"] = data.get("codeforces_rank_title", "Unrated")
        snapshot["codeforces_solved"] = data.get("codeforces_solved", 0)
        _cf_contests = data.get("cf_contests_attended", 0)
        time.sleep(INTER_CALL_SLEEP)

    # ── LeetCode ────────────────────────────────────────────────────────────
    if handle := member.get("leetcode_handle"):
        defaults = {
            "leetcode_easy": 0, "leetcode_medium": 0,
            "leetcode_hard": 0, "leetcode_total": 0,
            "leetcode_max_rating": 0, "lc_contests_attended": 0,
            "lc_badge_name": "",
        }
        data = safe_fetch(fetch_leetcode, handle, "LeetCode", defaults)
        snapshot["leetcode_easy"] = data.get("leetcode_easy", 0)
        snapshot["leetcode_medium"] = data.get("leetcode_medium", 0)
        snapshot["leetcode_hard"] = data.get("leetcode_hard", 0)
        snapshot["leetcode_total"] = data.get("leetcode_total", 0)
        snapshot["leetcode_max_rating"] = data.get("leetcode_max_rating", 0)
        _lc_contests = data.get("lc_contests_attended", 0)
        _lc_badge_name = data.get("lc_badge_name", "")
        time.sleep(INTER_CALL_SLEEP)

    # ── CodeChef ────────────────────────────────────────────────────────────
    if handle := member.get("codechef_handle"):
        defaults = {
            "codechef_rating": 0, "codechef_max_rating": 0, "codechef_solved": 0,
            "cc_active_days": 0, "cc_total_submissions": 0,
            "cc_current_streak": 0, "cc_max_streak": 0,
            "cc_contests_attended": 0, "cc_topics": {},
        }
        data = safe_fetch(fetch_codechef, handle, "CodeChef", defaults)
        snapshot["codechef_rating"] = data.get("codechef_rating", 0)
        snapshot["codechef_max_rating"] = data.get("codechef_max_rating", 0)
        snapshot["codechef_solved"] = data.get("codechef_solved", 0)
        _cc_topics = data.get("cc_topics", {})
        _cc_contests = data.get("cc_contests_attended", 0)
        # Accumulate streak & active days into cross-platform fields
        snapshot["active_days"] += data.get("cc_active_days", 0)
        snapshot["total_submissions"] += data.get("cc_total_submissions", 0)
        # Use the platform with the biggest streak as the reported streak
        if data.get("cc_current_streak", 0) > snapshot["current_streak"]:
            snapshot["current_streak"] = data.get("cc_current_streak", 0)
        if data.get("cc_max_streak", 0) > snapshot["max_streak"]:
            snapshot["max_streak"] = data.get("cc_max_streak", 0)
        time.sleep(INTER_CALL_SLEEP)

    # ── GeeksforGeeks ───────────────────────────────────────────────────────
    if handle := member.get("gfg_handle"):
        defaults = {
            "gfg_solved": 0, "gfg_score": 0,
            "gfg_school": 0, "gfg_basic": 0, "gfg_easy": 0,
            "gfg_medium": 0, "gfg_hard": 0,
            "gfg_active_days": 0, "gfg_total_submissions": 0,
            "gfg_current_streak": 0, "gfg_max_streak": 0,
            "gfg_max_rating": 0, "gfg_topics": {},
        }
        data = safe_fetch(fetch_gfg, handle, "GFG", defaults)
        snapshot["gfg_solved"] = data.get("gfg_solved", 0)
        snapshot["gfg_score"] = data.get("gfg_score", 0)
        snapshot["gfg_school"] = data.get("gfg_school", 0)
        snapshot["gfg_basic"] = data.get("gfg_basic", 0)
        snapshot["gfg_easy"] = data.get("gfg_easy", 0)
        snapshot["gfg_medium"] = data.get("gfg_medium", 0)
        snapshot["gfg_hard"] = data.get("gfg_hard", 0)
        _gfg_topics = data.get("gfg_topics", {})
        snapshot["active_days"] += data.get("gfg_active_days", 0)
        snapshot["total_submissions"] += data.get("gfg_total_submissions", 0)
        if data.get("gfg_current_streak", 0) > snapshot["current_streak"]:
            snapshot["current_streak"] = data.get("gfg_current_streak", 0)
        if data.get("gfg_max_streak", 0) > snapshot["max_streak"]:
            snapshot["max_streak"] = data.get("gfg_max_streak", 0)
        time.sleep(INTER_CALL_SLEEP)

    # ── HackerRank ──────────────────────────────────────────────────────────
    if handle := member.get("hackerrank_handle"):
        defaults = {"hackerrank_badges": 0, "hr_badges_list": [], "hr_topics": {}}
        data = safe_fetch(fetch_hackerrank, handle, "HackerRank", defaults)
        snapshot["hackerrank_badges"] = data.get("hackerrank_badges", 0)
        _hr_badges_list = data.get("hr_badges_list", [])
        _hr_topics = data.get("hr_topics", {})
        time.sleep(INTER_CALL_SLEEP)

    # ── Cross-platform Aggregation ──────────────────────────────────────────
    # Total contests attended = sum of all platforms
    snapshot["contests_attended"] = _cf_contests + _lc_contests + _cc_contests

    # JSONB: topic_stats (keyed by platform)
    snapshot["topic_stats"] = build_topic_stats(
        _lc_summary, _cc_topics, _gfg_topics, _hr_topics
    )

    # JSONB: badges_detail (unified list)
    snapshot["badges_detail"] = build_badges_detail(_lc_badge_name, _hr_badges_list)

    # ── Compute Score ───────────────────────────────────────────────────────
    snapshot["total_score"] = calculate_score(snapshot)
    log.info("  → Total Score: %.2f | Contests: %d | Streak: %d",
             snapshot["total_score"], snapshot["contests_attended"], snapshot["current_streak"])

    return snapshot


def main():
    log.info("=" * 60)
    log.info("CODEX Stats Sync Pipeline — %s UTC",
             datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"))
    log.info("=" * 60)

    supabase = get_supabase_client()
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    log.info("Fetching active members from Supabase...")
    response = supabase.table("members").select("*").eq("is_active", True).execute()
    members = response.data or []
    log.info("Found %d active member(s).", len(members))

    if not members:
        log.warning("No active members found. Exiting.")
        return

    success_count = 0
    fail_count = 0

    for member in members:
        try:
            snapshot = sync_member(member, today)

            supabase.table("activity_snapshots").upsert(
                snapshot,
                on_conflict="member_id,snapshot_date",
            ).execute()
            log.info("  ✓ Upserted snapshot for %s\n", member.get("full_name", member["id"]))
            success_count += 1

        except Exception as exc:  # noqa: BLE001
            log.error(
                "  ✗ Failed to sync member %s: %s\n",
                member.get("full_name", member.get("id")),
                exc,
            )
            fail_count += 1
            continue

    log.info("=" * 60)
    log.info("Sync complete. Success: %d | Failed: %d", success_count, fail_count)
    log.info("=" * 60)


if __name__ == "__main__":
    main()
