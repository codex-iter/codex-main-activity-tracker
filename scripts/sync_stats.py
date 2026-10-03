"""
CODEX Activity Tracker - Automated Stats Sync Pipeline (Async Edition)
=======================================================================
Runs twice daily via GitHub Actions to fetch platform metrics for all active
CODEX members and upsert a daily snapshot into Supabase.

Architecture:
  - All HTTP I/O is done with aiohttp (async).
  - Per-member: all 5 platforms are fetched concurrently with asyncio.gather().
  - Cross-member: processed in chunks of CHUNK_SIZE with an inter-chunk sleep
    to avoid rate-limiting from community APIs (LeetCode / CodeChef / GFG).
  - Supabase reads/writes remain synchronous (supabase-py client).

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

import asyncio
import logging
import os
from datetime import datetime, timezone

import aiohttp
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
REQUEST_TIMEOUT   = 15           # seconds per external API call (aiohttp timeout)
CHUNK_SIZE        = 10           # members processed concurrently per batch
INTER_CHUNK_SLEEP = 3            # seconds to sleep between member chunks
GH_CONTRIBUTIONS_CAP = 500       # cap GitHub contributions to prevent padding exploit

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
# Async HTTP Helpers
# ---------------------------------------------------------------------------

async def safe_fetch(
    session: aiohttp.ClientSession,
    url: str,
    *,
    method: str = "GET",
    headers: dict | None = None,
    json_body: dict | None = None,
) -> dict:
    """
    Thin async wrapper around aiohttp requests.
    - Always attaches BROWSER_HEADERS (merged with any extra headers).
    - Applies REQUEST_TIMEOUT via aiohttp.ClientTimeout.
    - Returns parsed JSON dict on success, empty dict on any error.
    """
    merged_headers = {**BROWSER_HEADERS, **(headers or {})}
    timeout = aiohttp.ClientTimeout(total=REQUEST_TIMEOUT)
    try:
        if method.upper() == "POST":
            async with session.post(
                url, headers=merged_headers, json=json_body, timeout=timeout
            ) as resp:
                resp.raise_for_status()
                return await resp.json(content_type=None)
        else:
            async with session.get(
                url, headers=merged_headers, timeout=timeout
            ) as resp:
                resp.raise_for_status()
                return await resp.json(content_type=None)
    except asyncio.TimeoutError:
        log.warning("    TIMEOUT fetching %s", url)
    except aiohttp.ClientResponseError as exc:
        log.warning("    HTTP %s fetching %s — %s", exc.status, url, exc.message)
    except Exception as exc:  # noqa: BLE001
        log.warning("    ERROR fetching %s — %s", url, exc)
    return {}


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
# Async Platform Data Fetchers
# ---------------------------------------------------------------------------

# ── GitHub ─────────────────────────────────────────────────────────────────

async def fetch_github(session: aiohttp.ClientSession, handle: str) -> dict:
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
    data = await safe_fetch(
        session,
        "https://api.github.com/graphql",
        method="POST",
        headers={
            "Authorization": f"bearer {token}",
            "Content-Type": "application/json",
        },
        json_body={"query": query, "variables": {"login": handle}},
    )
    user = data.get("data", {}).get("user") or {}
    contributions = (
        user.get("contributionsCollection", {})
            .get("contributionCalendar", {})
            .get("totalContributions", 0)
    )
    repos = user.get("repositories", {}).get("totalCount", 0)
    result = {
        "github_contributions": _safe_int(contributions),
        "github_repos": _safe_int(repos),
    }
    log.info("    ✓ GitHub       -> %s", result)
    return result


# ── Codeforces ─────────────────────────────────────────────────────────────

async def fetch_codeforces(session: aiohttp.ClientSession, handle: str) -> dict:
    """
    Fetches Codeforces metrics across three endpoints concurrently:
      1. user.info  -> current rating, max rating, rank title
      2. user.status -> count of distinct AC'd problems
      3. user.rating -> number of rated contests attended

    Returns: {
      codeforces_rating, codeforces_max_rating, codeforces_rank_title,
      codeforces_solved, cf_contests_attended
    }
    """
    info_data, status_data, rating_data = await asyncio.gather(
        safe_fetch(session, f"https://codeforces.com/api/user.info?handles={handle}"),
        safe_fetch(session, f"https://codeforces.com/api/user.status?handle={handle}"),
        safe_fetch(session, f"https://codeforces.com/api/user.rating?handle={handle}"),
    )

    # 1. Profile info
    rating, max_rating, rank_title = 0, 0, "Unrated"
    if info_data.get("status") == "OK" and info_data.get("result"):
        r = info_data["result"][0]
        rating = _safe_int(r.get("rating"))
        max_rating = _safe_int(r.get("maxRating"))
        rank_title = r.get("rank") or "Unrated"

    # 2. Distinct solved problems
    solved: set = set()
    if status_data.get("status") == "OK":
        for sub in status_data.get("result", []):
            if sub.get("verdict") == "OK":
                prob = sub.get("problem", {})
                solved.add((prob.get("contestId"), prob.get("index")))

    # 3. Contest history -> count attended
    cf_contests = 0
    if rating_data.get("status") == "OK":
        cf_contests = len(rating_data.get("result", []))

    result = {
        "codeforces_rating": rating,
        "codeforces_max_rating": max_rating,
        "codeforces_rank_title": rank_title,
        "codeforces_solved": len(solved),
        "cf_contests_attended": cf_contests,
    }
    log.info("    ✓ Codeforces   -> %s", result)
    return result


# ── LeetCode ───────────────────────────────────────────────────────────────

async def fetch_leetcode(session: aiohttp.ClientSession, handle: str) -> dict:
    """
    Fetches LeetCode metrics across three endpoints concurrently:
      1. GET /{handle}/solved  -> { total_solved }
      2. GET /{handle}         -> { submitStats.acSubmissionNum[{difficulty, count}] }
      3. GET /{handle}/contests -> {
             userContestRanking: { attendedContestsCount, rating, badge.name },
             userContestRankingHistory: [{ rating }]
           }

    Returns: {
      leetcode_easy, leetcode_medium, leetcode_hard, leetcode_total,
      leetcode_max_rating, lc_contests_attended, lc_badge_name, _lc_summary
    }
    """
    BASE = "https://leetcode-api-pied.vercel.app"

    solved_data, summary, contest_data = await asyncio.gather(
        safe_fetch(session, f"{BASE}/user/{handle}/solved"),
        safe_fetch(session, f"{BASE}/user/{handle}"),
        safe_fetch(session, f"{BASE}/user/{handle}/contests"),
    )

    # 1. Total solved
    total = _safe_int(solved_data.get("total_solved"))

    # 2. Per-difficulty breakdown
    easy = medium = hard = 0
    try:
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

    # 3. Contest history
    lc_contests = 0
    lc_rating = 0
    lc_max_rating = 0
    lc_badge = ""
    try:
        ranking = contest_data.get("userContestRanking") or {}
        lc_contests = _safe_int(ranking.get("attendedContestsCount"))
        current_rating = _safe_float(ranking.get("rating"))
        lc_rating = int(current_rating)
        lc_badge = (ranking.get("badge") or {}).get("name") or ""

        history = contest_data.get("userContestRankingHistory") or []
        history_ratings = [
            _safe_float(entry.get("rating"))
            for entry in history
            if entry.get("attended") is True
        ]
        lc_max_rating = int(max([current_rating] + history_ratings)) if history_ratings else int(current_rating)
    except Exception as exc:
        log.warning("    LeetCode contests unavailable for %s: %s", handle, exc)

    result = {
        "leetcode_easy": easy,
        "leetcode_medium": medium,
        "leetcode_hard": hard,
        "leetcode_total": total,
        "leetcode_rating": lc_rating,
        "leetcode_max_rating": lc_max_rating,
        "lc_contests_attended": lc_contests,
        "lc_badge_name": lc_badge,
        "_lc_summary": summary,   # kept for topic aggregation in build_topic_stats
    }
    log.info("    ✓ LeetCode     -> easy=%d med=%d hard=%d total=%d contests=%d",
             easy, medium, hard, total, lc_contests)
    return result


# ── CodeChef ───────────────────────────────────────────────────────────────

async def fetch_codechef(session: aiohttp.ClientSession, handle: str) -> dict:
    """
    Fetches CodeChef metrics across four endpoints concurrently. All data inside `data: {}`.

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

    profile_resp, heatmap_resp, contests_resp, stats_resp = await asyncio.gather(
        safe_fetch(session, BASE),
        safe_fetch(session, f"{BASE}/heatmap"),
        safe_fetch(session, f"{BASE}/contests"),
        safe_fetch(session, f"{BASE}/stats"),
    )

    # 1. Profile summary
    profile = profile_resp.get("data") or {}
    cc_rating = _safe_int(profile.get("currentRating"))
    cc_max_rating = _safe_int(profile.get("maxRating"))
    cc_solved = _safe_int(profile.get("totalSolved"))
    cc_active_days = _safe_int(profile.get("totalActiveDays"))

    # 2. Heatmap -> streak & submission counts
    heatmap = heatmap_resp.get("data") or {}
    cc_total_subs = _safe_int(heatmap.get("totalSubmissions"))
    cc_current_streak = _safe_int(heatmap.get("currentStreak"))
    cc_max_streak = _safe_int(heatmap.get("longestStreak"))
    # Prefer heatmap active days as it's more granular
    if heatmap.get("totalActiveDays"):
        cc_active_days = _safe_int(heatmap.get("totalActiveDays"))

    # 3. Contests attended
    contests_data = contests_resp.get("data") or {}
    cc_contests = _safe_int(contests_data.get("count"))
    # If the contests endpoint has a better maxRating, prefer it
    if contests_data.get("maxRating"):
        cc_max_rating = _safe_int(contests_data.get("maxRating"))

    # 4. Topic analysis
    stats_data = stats_resp.get("data") or {}
    cc_topics = {
        item["topic"]: item["count"]
        for item in stats_data.get("topicAnalysis", [])
        if item.get("topic")
    }

    result = {
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
    log.info("    ✓ CodeChef     -> rating=%d solved=%d streak=%d",
             cc_rating, cc_solved, cc_current_streak)
    return result


# ── GeeksforGeeks ──────────────────────────────────────────────────────────

async def fetch_gfg(session: aiohttp.ClientSession, handle: str) -> dict:
    """
    Fetches GFG metrics across four endpoints concurrently. All data inside `data: {}`.

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

    summary_payload, heatmap_resp, stats_resp, rating_resp = await asyncio.gather(
        safe_fetch(session, BASE),
        safe_fetch(session, f"{BASE}/heatmap"),
        safe_fetch(session, f"{BASE}/stats"),
        safe_fetch(session, f"{BASE}/rating"),
    )

    # 1. Summary
    summary_data = summary_payload.get("data") or {}
    solved = _safe_int(
        summary_data.get("totalSolved")
        or summary_payload.get("totalProblemsSolved")
    )

    # 2. Heatmap -> streak & submission counts
    heatmap = heatmap_resp.get("data") or {}
    gfg_total_subs = _safe_int(heatmap.get("totalSubmissions"))
    gfg_current_streak = _safe_int(heatmap.get("currentStreak"))
    gfg_max_streak = _safe_int(heatmap.get("longestStreak"))
    gfg_active_days = _safe_int(heatmap.get("totalActiveDays"))

    # 3. Difficulty breakdown + topics
    stats_data = stats_resp.get("data") or {}
    by_diff = stats_data.get("byDifficulty") or {}
    gfg_school = _safe_int(by_diff.get("school"))
    gfg_basic  = _safe_int(by_diff.get("basic"))
    gfg_easy   = _safe_int(by_diff.get("easy"))
    gfg_medium = _safe_int(by_diff.get("medium"))
    gfg_hard   = _safe_int(by_diff.get("hard"))
    gfg_topics = {
        item["topic"]: item["count"]
        for item in stats_data.get("topicAnalysis", [])
        if item.get("topic")
    }

    # 4. Rating (may be null for non-contest users)
    rating_data = rating_resp.get("data") or {}
    _gfg_max_rating = _safe_int(rating_data.get("max"))  # stored for reference; not a snapshot column

    # Use totalSolved as score (no dedicated score field exists in this API)
    score = solved

    result = {
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
        "gfg_max_rating": _gfg_max_rating,
        "gfg_topics": gfg_topics,
    }
    log.info("    ✓ GFG          -> solved=%d streak=%d [S=%d B=%d E=%d M=%d H=%d]",
             solved, gfg_current_streak, gfg_school, gfg_basic, gfg_easy, gfg_medium, gfg_hard)
    return result


# ── HackerRank ─────────────────────────────────────────────────────────────

async def fetch_hackerrank(session: aiohttp.ClientSession, handle: str) -> dict:
    """
    Fetches HackerRank metrics across two endpoints concurrently.

    1. GET /{handle}/badges  -> { badges: [...], data: { count, list: [{id,name}] } }
       badge count = data.count, badge list = data.list
    2. GET /{handle}/stats   -> { data: { topicAnalysis: [{topic, count}] } }

    Returns: {
      hackerrank_badges, hr_badges_list, hr_topics
    }
    """
    BASE = f"https://hackerrank-stats.tashif.codes/{handle}"

    badges_payload, stats_resp = await asyncio.gather(
        safe_fetch(session, f"{BASE}/badges"),
        safe_fetch(session, f"{BASE}/stats"),
    )

    # 1. Badges
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

    # 2. Topic analysis from stats
    hr_topics = {}
    try:
        stats_data = stats_resp.get("data") or {}
        hr_topics = {
            item["topic"]: item["count"]
            for item in stats_data.get("topicAnalysis", [])
            if item.get("topic")
        }
    except Exception as exc:
        log.warning("    HackerRank topics unavailable for %s: %s", handle, exc)

    result = {
        "hackerrank_badges": hr_badge_count,
        "hr_badges_list": hr_badges_list,
        "hr_topics": hr_topics,
    }
    log.info("    ✓ HackerRank   -> badges=%d", hr_badge_count)
    return result


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
    Calculates a bounded CODEX Developer Score out of 1000.
    Divides evaluation into four pillars:
      1. Competitive Ratings (Max 450 pts)
      2. Problem Solving Volume (Max 350 pts)
      3. Consistency & Engagement (Max 100 pts)
      4. Development (Max 100 pts)
    """

    # ---------------------------------------------------------
    # 1. COMPETITIVE RATINGS (Max 450 Points)
    # ---------------------------------------------------------
    # Codeforces (Max 200 pts): Base 800, Target 2000 (Candidate Master)
    cf_rating = snapshot.get("codeforces_max_rating") or snapshot.get("codeforces_rating") or 0
    cf_pts = min(200.0, (max(0, cf_rating - 800) / 1200.0) * 200.0)

    # LeetCode (Max 150 pts): Base 1400, Target 2200 (Guardian)
    lc_rating = snapshot.get("leetcode_max_rating") or 0
    lc_pts = min(150.0, (max(0, lc_rating - 1400) / 800.0) * 150.0)

    # CodeChef (Max 100 pts): Base 1000, Target 2000 (5-Star)
    cc_rating = snapshot.get("codechef_max_rating") or snapshot.get("codechef_rating") or 0
    cc_pts = min(100.0, (max(0, cc_rating - 1000) / 1000.0) * 100.0)

    rating_score = cf_pts + lc_pts + cc_pts

    # ---------------------------------------------------------
    # 2. PROBLEM SOLVING VOLUME (Max 350 Points)
    # ---------------------------------------------------------
    # LeetCode Volume (Max 150 pts) - Target: ~1500 weighted points
    lc_weight = (
        (snapshot.get("leetcode_easy") or 0) * 1 +
        (snapshot.get("leetcode_medium") or 0) * 3 +
        (snapshot.get("leetcode_hard") or 0) * 6
    )
    lc_solved_pts = min(150.0, (lc_weight / 1500.0) * 150.0)

    # Codeforces Volume (Max 100 pts) - Target: 250 problems
    cf_solved = snapshot.get("codeforces_solved") or 0
    cf_solved_pts = min(100.0, (cf_solved / 250.0) * 100.0)

    # GFG & CodeChef Volume (Max 100 pts) - Penalizes School/Basic spam
    gfg_weight = (
        (snapshot.get("gfg_school") or 0) * 0.0 +
        (snapshot.get("gfg_basic") or 0) * 0.5 +
        (snapshot.get("gfg_easy") or 0) * 1.0 +
        (snapshot.get("gfg_medium") or 0) * 3.0 +
        (snapshot.get("gfg_hard") or 0) * 6.0
    )
    # Fallback to general solved count if granular difficulty extraction is absent
    if gfg_weight == 0 and (snapshot.get("gfg_solved") or 0) > 0:
        gfg_weight = (snapshot.get("gfg_solved") or 0) * 1.5

    cc_solved = (snapshot.get("codechef_solved") or 0) * 2.0
    gfg_cc_pts = min(100.0, ((gfg_weight + cc_solved) / 1000.0) * 100.0)

    solved_score = lc_solved_pts + cf_solved_pts + gfg_cc_pts

    # ---------------------------------------------------------
    # 3. CONSISTENCY & ENGAGEMENT (Max 100 Points)
    # ---------------------------------------------------------
    active_days = snapshot.get("active_days") or 0        # Target: 150 active days
    max_streak = snapshot.get("max_streak") or 0          # Target: 30 day streak
    contests = snapshot.get("contests_attended") or 0     # Target: 30 contests attended

    days_pts = min(40.0, (active_days / 150.0) * 40.0)
    streak_pts = min(30.0, (max_streak / 30.0) * 30.0)
    contest_pts = min(30.0, (contests / 30.0) * 30.0)

    consistency_score = days_pts + streak_pts + contest_pts

    # ---------------------------------------------------------
    # 4. DEVELOPMENT (Max 100 Points)
    # ---------------------------------------------------------
    gh_commits = snapshot.get("github_contributions") or 0  # Target: 500 contributions
    gh_pts = min(80.0, (gh_commits / 500.0) * 80.0)

    hr_badges = snapshot.get("hackerrank_badges") or 0      # Target: 4 badges
    hr_pts = min(20.0, hr_badges * 5.0)

    dev_score = gh_pts + hr_pts

    # ---------------------------------------------------------
    # TOTAL SCORE AGGREGATION (0 - 1000)
    # ---------------------------------------------------------
    total = rating_score + solved_score + consistency_score + dev_score
    return round(float(total), 2)


# ---------------------------------------------------------------------------
# Async Per-Member Sync
# ---------------------------------------------------------------------------

async def sync_member_async(
    session: aiohttp.ClientSession,
    member: dict,
    today: str,
) -> dict:
    """
    Fetch all platform metrics for a single member concurrently using asyncio.gather().
    All 5 platform fetches fire at the same time; we wait for all to complete before
    assembling the snapshot dict.
    """
    member_id = member["id"]
    name = member.get("full_name", "Unknown")
    log.info("  → Syncing: %s (%s)", name, member_id)

    # ── Defaults for every snapshot column ──────────────────────────────────
    snapshot: dict = {
        "member_id": member_id,
        "snapshot_date": today,

        # Basic platform metrics
        "github_contributions": 0,
        "github_repos": 0,
        "codeforces_rating": 0,
        "codeforces_solved": 0,
        "leetcode_easy": 0,
        "leetcode_medium": 0,
        "leetcode_hard": 0,
        "leetcode_total": 0,
        "leetcode_rating": 0,
        "codechef_rating": 0,
        "codechef_solved": 0,
        "gfg_score": 0,
        "gfg_solved": 0,
        "hackerrank_badges": 0,
        "total_score": 0.0,

        # Consistency & Streaks
        "active_days": 0,
        "current_streak": 0,
        "max_streak": 0,
        "total_submissions": 0,

        # Contest Metrics & Peak Ratings
        "contests_attended": 0,
        "leetcode_max_rating": 0,
        "codechef_max_rating": 0,
        "codeforces_max_rating": 0,
        "codeforces_rank_title": "Unrated",

        # GFG Difficulty Breakdown
        "gfg_school": 0,
        "gfg_basic": 0,
        "gfg_easy": 0,
        "gfg_medium": 0,
        "gfg_hard": 0,

        # Deep Analytics (JSONB)
        "topic_stats": {},
        "badges_detail": [],
    }

    # Prepare coroutine list — only for handles that actually exist on the member row
    gh_handle  = member.get("github_handle")
    cf_handle  = member.get("codeforces_handle")
    lc_handle  = member.get("leetcode_handle")
    cc_handle  = member.get("codechef_handle")
    gfg_handle = member.get("gfg_handle")
    hr_handle  = member.get("hackerrank_handle")

    # Build coroutines; use None sentinel for skipped platforms
    async def _noop() -> dict:
        return {}

    gh_coro  = fetch_github(session, gh_handle)    if gh_handle  else _noop()
    cf_coro  = fetch_codeforces(session, cf_handle) if cf_handle  else _noop()
    lc_coro  = fetch_leetcode(session, lc_handle)  if lc_handle  else _noop()
    cc_coro  = fetch_codechef(session, cc_handle)  if cc_handle  else _noop()
    gfg_coro = fetch_gfg(session, gfg_handle)      if gfg_handle else _noop()
    hr_coro  = fetch_hackerrank(session, hr_handle) if hr_handle  else _noop()

    # ── Fire all platform requests concurrently ──────────────────────────────
    gh_data, cf_data, lc_data, cc_data, gfg_data, hr_data = await asyncio.gather(
        gh_coro, cf_coro, lc_coro, cc_coro, gfg_coro, hr_coro,
        return_exceptions=False,
    )

    # Intermediate aggregation helpers
    _lc_badge_name  = ""
    _hr_badges_list: list = []
    _cc_topics: dict = {}
    _gfg_topics: dict = {}
    _hr_topics: dict = {}
    _lc_summary: dict = {}
    _cf_contests = 0
    _lc_contests = 0
    _cc_contests = 0

    # ── GitHub ──────────────────────────────────────────────────────────────
    if gh_handle and gh_data:
        snapshot.update({
            "github_contributions": gh_data.get("github_contributions", 0),
            "github_repos": gh_data.get("github_repos", 0),
        })

    # ── Codeforces ──────────────────────────────────────────────────────────
    if cf_handle and cf_data:
        snapshot["codeforces_rating"]     = cf_data.get("codeforces_rating", 0)
        snapshot["codeforces_max_rating"] = cf_data.get("codeforces_max_rating", 0)
        snapshot["codeforces_rank_title"] = cf_data.get("codeforces_rank_title", "Unrated")
        snapshot["codeforces_solved"]     = cf_data.get("codeforces_solved", 0)
        _cf_contests                      = cf_data.get("cf_contests_attended", 0)

    # ── LeetCode ────────────────────────────────────────────────────────────
    if lc_handle and lc_data:
        snapshot["leetcode_easy"]        = lc_data.get("leetcode_easy", 0)
        snapshot["leetcode_medium"]      = lc_data.get("leetcode_medium", 0)
        snapshot["leetcode_hard"]        = lc_data.get("leetcode_hard", 0)
        snapshot["leetcode_total"]       = lc_data.get("leetcode_total", 0)
        snapshot["leetcode_rating"]      = lc_data.get("leetcode_rating", 0)
        snapshot["leetcode_max_rating"]  = lc_data.get("leetcode_max_rating", 0)
        _lc_contests                     = lc_data.get("lc_contests_attended", 0)
        _lc_badge_name                   = lc_data.get("lc_badge_name", "")
        _lc_summary                      = lc_data.get("_lc_summary", {})

    # ── CodeChef ────────────────────────────────────────────────────────────
    if cc_handle and cc_data:
        snapshot["codechef_rating"]     = cc_data.get("codechef_rating", 0)
        snapshot["codechef_max_rating"] = cc_data.get("codechef_max_rating", 0)
        snapshot["codechef_solved"]     = cc_data.get("codechef_solved", 0)
        _cc_topics                      = cc_data.get("cc_topics", {})
        _cc_contests                    = cc_data.get("cc_contests_attended", 0)
        # Accumulate streak & active days into cross-platform fields
        snapshot["active_days"]        += cc_data.get("cc_active_days", 0)
        snapshot["total_submissions"]  += cc_data.get("cc_total_submissions", 0)
        if cc_data.get("cc_current_streak", 0) > snapshot["current_streak"]:
            snapshot["current_streak"] = cc_data.get("cc_current_streak", 0)
        if cc_data.get("cc_max_streak", 0) > snapshot["max_streak"]:
            snapshot["max_streak"] = cc_data.get("cc_max_streak", 0)

    # ── GeeksforGeeks ───────────────────────────────────────────────────────
    if gfg_handle and gfg_data:
        snapshot["gfg_solved"]   = gfg_data.get("gfg_solved", 0)
        snapshot["gfg_score"]    = gfg_data.get("gfg_score", 0)
        snapshot["gfg_school"]   = gfg_data.get("gfg_school", 0)
        snapshot["gfg_basic"]    = gfg_data.get("gfg_basic", 0)
        snapshot["gfg_easy"]     = gfg_data.get("gfg_easy", 0)
        snapshot["gfg_medium"]   = gfg_data.get("gfg_medium", 0)
        snapshot["gfg_hard"]     = gfg_data.get("gfg_hard", 0)
        _gfg_topics              = gfg_data.get("gfg_topics", {})
        snapshot["active_days"]       += gfg_data.get("gfg_active_days", 0)
        snapshot["total_submissions"] += gfg_data.get("gfg_total_submissions", 0)
        if gfg_data.get("gfg_current_streak", 0) > snapshot["current_streak"]:
            snapshot["current_streak"] = gfg_data.get("gfg_current_streak", 0)
        if gfg_data.get("gfg_max_streak", 0) > snapshot["max_streak"]:
            snapshot["max_streak"] = gfg_data.get("gfg_max_streak", 0)

    # ── HackerRank ──────────────────────────────────────────────────────────
    if hr_handle and hr_data:
        snapshot["hackerrank_badges"] = hr_data.get("hackerrank_badges", 0)
        _hr_badges_list               = hr_data.get("hr_badges_list", [])
        _hr_topics                    = hr_data.get("hr_topics", {})

    # ── Cross-platform Aggregation ───────────────────────────────────────────
    snapshot["contests_attended"] = _cf_contests + _lc_contests + _cc_contests

    snapshot["topic_stats"] = build_topic_stats(
        _lc_summary, _cc_topics, _gfg_topics, _hr_topics
    )
    snapshot["badges_detail"] = build_badges_detail(_lc_badge_name, _hr_badges_list)

    # ── Compute Score ────────────────────────────────────────────────────────
    snapshot["total_score"] = calculate_score(snapshot)
    log.info(
        "  ✓ %s — Score: %.2f | Contests: %d | Streak: %d",
        name, snapshot["total_score"], snapshot["contests_attended"], snapshot["current_streak"],
    )

    return snapshot


# ---------------------------------------------------------------------------
# Async Main Orchestrator
# ---------------------------------------------------------------------------

async def run_sync() -> None:
    """
    Main async orchestrator:
      1. Fetches all active members from Supabase (synchronous).
      2. Splits members into chunks of CHUNK_SIZE.
      3. For each chunk: fires all member syncs concurrently, then sleeps INTER_CHUNK_SLEEP.
      4. Upserts each completed snapshot to Supabase (synchronous).
    """
    log.info("=" * 60)
    log.info("CODEX Stats Sync Pipeline — %s UTC",
             datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"))
    log.info("Async mode: CHUNK_SIZE=%d, INTER_CHUNK_SLEEP=%ds, TIMEOUT=%ds",
             CHUNK_SIZE, INTER_CHUNK_SLEEP, REQUEST_TIMEOUT)
    log.info("=" * 60)

    supabase_client = get_supabase_client()
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    log.info("Fetching active members from Supabase...")
    response = supabase_client.table("members").select("*").eq("is_active", True).execute()
    members = response.data or []
    log.info("Found %d active member(s).", len(members))

    if not members:
        log.warning("No active members found. Exiting.")
        return

    # Split into chunks
    chunks = [members[i : i + CHUNK_SIZE] for i in range(0, len(members), CHUNK_SIZE)]
    total_chunks = len(chunks)

    success_count = 0
    fail_count = 0

    connector = aiohttp.TCPConnector(limit=50)   # max 50 simultaneous TCP connections
    async with aiohttp.ClientSession(connector=connector) as session:
        for chunk_idx, chunk in enumerate(chunks, start=1):
            log.info(
                "-" * 60
                + f"\nChunk {chunk_idx}/{total_chunks} — processing {len(chunk)} member(s)..."
            )

            # Fire all members in this chunk concurrently
            tasks = [sync_member_async(session, m, today) for m in chunk]
            results = await asyncio.gather(*tasks, return_exceptions=True)

            # Upsert results synchronously (supabase-py is synchronous)
            for member, result in zip(chunk, results):
                name = member.get("full_name", member["id"])
                if isinstance(result, Exception):
                    log.error("  ✗ Failed to sync %s: %s", name, result)
                    fail_count += 1
                    continue
                try:
                    supabase_client.table("activity_snapshots").upsert(
                        result,
                        on_conflict="member_id,snapshot_date",
                    ).execute()
                    log.info("  ✓ Upserted snapshot for %s", name)
                    success_count += 1
                except Exception as exc:  # noqa: BLE001
                    log.error("  ✗ Supabase upsert failed for %s: %s", name, exc)
                    fail_count += 1

            # Inter-chunk rate-limit courtesy sleep (skip after last chunk)
            if chunk_idx < total_chunks:
                log.info("  ⏳ Sleeping %ds before next chunk...", INTER_CHUNK_SLEEP)
                await asyncio.sleep(INTER_CHUNK_SLEEP)

    log.info("=" * 60)
    log.info("Sync complete. Success: %d | Failed: %d", success_count, fail_count)
    log.info("=" * 60)


# ---------------------------------------------------------------------------
# Entry Point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    asyncio.run(run_sync())
