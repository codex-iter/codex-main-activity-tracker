"""
CODEX Activity Tracker - Automated Stats Sync Pipeline
=======================================================
Runs twice daily via GitHub Actions to fetch platform metrics for all active
CODEX members and upsert a daily snapshot into Supabase.

Environment Variables Required:
    SUPABASE_URL              - Supabase project URL
    SUPABASE_SERVICE_ROLE_KEY - Supabase service role key (bypasses RLS)
    LEADERBOARD_GH_PAT        - GitHub Personal Access Token
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
# Platform Data Fetchers
# ---------------------------------------------------------------------------

def fetch_github(handle: str) -> dict:
    """
    Fetch GitHub contributions (current year) and public repo count via GraphQL.
    Returns: { github_contributions: int, github_repos: int }
    """
    token = os.environ.get("LEADERBOARD_GH_PAT", "")
    query = """
    query($login: String!) {
      user(login: $login) {
        repositories(privacy: PUBLIC) {
          totalCount
        }
        contributionsCollection {
          contributionCalendar {
            totalContributions
          }
        }
      }
    }
    """
    headers = {
        "Authorization": f"bearer {token}",
        "Content-Type": "application/json",
    }
    resp = requests.post(
        "https://api.github.com/graphql",
        json={"query": query, "variables": {"login": handle}},
        headers=headers,
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
        "github_contributions": int(contributions),
        "github_repos": int(repos),
    }


def fetch_codeforces(handle: str) -> dict:
    """
    Fetch Codeforces current rating and count of distinct solved problems.
    Returns: { codeforces_rating: int, codeforces_solved: int }
    """
    # Rating
    info_resp = requests.get(
        f"https://codeforces.com/api/user.info?handles={handle}",
        timeout=REQUEST_TIMEOUT,
    )
    info_resp.raise_for_status()
    info_data = info_resp.json()
    rating = 0
    if info_data.get("status") == "OK" and info_data.get("result"):
        rating = info_data["result"][0].get("rating", 0) or 0

    time.sleep(INTER_CALL_SLEEP)

    # Solved problems (distinct AC submissions)
    status_resp = requests.get(
        f"https://codeforces.com/api/user.status?handle={handle}",
        timeout=REQUEST_TIMEOUT,
    )
    status_resp.raise_for_status()
    status_data = status_resp.json()
    solved = set()
    if status_data.get("status") == "OK":
        for submission in status_data.get("result", []):
            if submission.get("verdict") == "OK":
                problem = submission.get("problem", {})
                problem_key = (problem.get("contestId"), problem.get("index"))
                solved.add(problem_key)

    return {
        "codeforces_rating": int(rating),
        "codeforces_solved": len(solved),
    }


def fetch_leetcode(handle: str) -> dict:
    """
    Fetch LeetCode solved problem counts by difficulty.

    Real response shape from /user/{handle}/solved:
      { "username": "...", "total_solved": 250, "solved_slugs": [...], "solved": [...] }

    The /solved endpoint only provides total_solved (not per-difficulty). The per-difficulty
    breakdown (easySolved / mediumSolved / hardSolved) comes from the /user/{handle}/stats
    endpoint, but that returns 404 for this API host. We therefore fetch the summary endpoint
    GET /{handle} which contains submitStats.acSubmissionNum with difficulty-level data.

    Returns: { leetcode_easy, leetcode_medium, leetcode_hard, leetcode_total }
    """
    # Step 1: Get total_solved from the /solved endpoint
    solved_resp = requests.get(
        f"https://leetcode-api-pied.vercel.app/user/{handle}/solved",
        headers=BROWSER_HEADERS,
        timeout=REQUEST_TIMEOUT,
    )
    solved_resp.raise_for_status()
    solved_data = solved_resp.json()
    # Real key is `total_solved`, not `totalSolved`
    total = int(solved_data.get("total_solved", 0) or 0)

    time.sleep(INTER_CALL_SLEEP)

    # Step 2: Get per-difficulty breakdown from the summary endpoint GET /{handle}
    # Response contains submitStats.acSubmissionNum[{difficulty, count}]
    easy, medium, hard = 0, 0, 0
    try:
        summary_resp = requests.get(
            f"https://leetcode-api-pied.vercel.app/user/{handle}",
            headers=BROWSER_HEADERS,
            timeout=REQUEST_TIMEOUT,
        )
        summary_resp.raise_for_status()
        summary_data = summary_resp.json()
        ac_list = (
            summary_data.get("submitStats", {})
                        .get("acSubmissionNum", [])
        )
        for item in ac_list:
            diff = (item.get("difficulty") or "").lower()
            count = int(item.get("count", 0) or 0)
            if diff == "easy":
                easy = count
            elif diff == "medium":
                medium = count
            elif diff == "hard":
                hard = count
        # If breakdown sums exceed total, trust the breakdown
        if easy + medium + hard > total:
            total = easy + medium + hard
    except Exception as exc:
        log.warning("    LeetCode difficulty breakdown unavailable for %s: %s", handle, exc)

    return {
        "leetcode_easy": easy,
        "leetcode_medium": medium,
        "leetcode_hard": hard,
        "leetcode_total": total,
    }


def fetch_codechef(handle: str) -> dict:
    """
    Fetch CodeChef current rating and total problems solved.

    Real response shape:
      {
        "status": "success",
        "data": {
          "currentRating": 1800,
          "totalSolved": 120,
          ...
        }
      }
    NOTE: All metrics are nested under the `data` key — the old code incorrectly
    read from the top-level object, which does NOT contain these fields.

    Returns: { codechef_rating: int, codechef_solved: int }
    """
    resp = requests.get(
        f"https://codechef-stats.tashif.codes/{handle}",
        headers=BROWSER_HEADERS,
        timeout=REQUEST_TIMEOUT,
    )
    resp.raise_for_status()
    payload = resp.json()
    # All actual data is inside the nested `data` object
    data = payload.get("data") or {}
    return {
        "codechef_rating": int(data.get("currentRating", 0) or 0),
        "codechef_solved": int(data.get("totalSolved", 0) or 0),
    }


def fetch_gfg(handle: str) -> dict:
    """
    Fetch GeeksforGeeks overall coding score and total problems solved.

    Real response shape:
      {
        "userName": "...",
        "totalProblemsSolved": 1,     <- top-level convenience field
        "status": "success",
        "data": {
          "totalSolved": 1,
          "totalActiveDays": 1,
          ...
        }
      }
    NOTE: `score` does NOT exist at the top level. `totalSolved` is inside `data`.
    We also use the top-level `totalProblemsSolved` as a fallback.
    There is no explicit `overallCodingScore` field in this API — we use totalSolved
    as the gfg_score metric as well (they are equivalent for ranking purposes).

    Returns: { gfg_score: int, gfg_solved: int }
    """
    resp = requests.get(
        f"https://gfg-stats.tashif.codes/{handle}",
        headers=BROWSER_HEADERS,
        timeout=REQUEST_TIMEOUT,
    )
    resp.raise_for_status()
    payload = resp.json()
    # Prefer data.totalSolved, fall back to top-level totalProblemsSolved
    data = payload.get("data") or {}
    solved = int(
        data.get("totalSolved")
        or payload.get("totalProblemsSolved")
        or 0
    )
    # No dedicated `score` field exists; mirror totalSolved as the score
    score = solved
    return {
        "gfg_score": score,
        "gfg_solved": solved,
    }


def fetch_hackerrank(handle: str) -> dict:
    """
    Fetch HackerRank badge count.

    Real response shape from /{handle}/badges:
      {
        "status": "success",
        "badges": [ { "id": "...", "displayName": "..." }, ... ],
        "data": {
          "count": 3,
          "active": { ... },
          "list": [ ... ]
        }
      }
    NOTE: The old code called `/{handle}` (the profile endpoint) and read
    `badgesCount` — a key that does NOT exist. The correct endpoint is
    `/{handle}/badges` and the count is at `data.count` (or len(badges)).

    Returns: { hackerrank_badges: int }
    """
    resp = requests.get(
        # Use the dedicated /badges endpoint, not the base profile endpoint
        f"https://hackerrank-stats.tashif.codes/{handle}/badges",
        headers=BROWSER_HEADERS,
        timeout=REQUEST_TIMEOUT,
    )
    resp.raise_for_status()
    payload = resp.json()
    # Prefer data.count; fall back to counting the badges array directly
    data = payload.get("data") or {}
    count = int(
        data.get("count")
        if data.get("count") is not None
        else len(payload.get("badges", []))
    )
    return {
        "hackerrank_badges": count,
    }


# ---------------------------------------------------------------------------
# Scoring Formula
# ---------------------------------------------------------------------------

def calculate_score(snapshot: dict) -> float:
    """
    Calculate the unified CODEX score from a snapshot dict.
    Weights:
      LeetCode    : easy*1 + medium*3 + hard*6
      Codeforces  : solved*3 + max(0, rating-800)*0.5
      CodeChef    : solved*2 + max(0, rating-1000)*0.4
      GFG         : solved*1.5 + score*0.2
      GitHub      : min(contributions, 500) * 1.0
      HackerRank  : badges * 5
    """
    lc = (
        snapshot.get("leetcode_easy", 0) * 1
        + snapshot.get("leetcode_medium", 0) * 3
        + snapshot.get("leetcode_hard", 0) * 6
    )
    cf_rating = snapshot.get("codeforces_rating", 0) or 0
    cf = (
        snapshot.get("codeforces_solved", 0) * 3
        + max(0, cf_rating - 800) * 0.5
    )
    cc_rating = snapshot.get("codechef_rating", 0) or 0
    cc = (
        snapshot.get("codechef_solved", 0) * 2
        + max(0, cc_rating - 1000) * 0.4
    )
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
            body = exc.response.text[:200]  # log first 200 chars of error body
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
    Fetch all platform metrics for a single member and build the snapshot dict.
    """
    member_id = member["id"]
    name = member.get("full_name", "Unknown")
    log.info("  Syncing member: %s (%s)", name, member_id)

    snapshot: dict = {
        "member_id": member_id,
        "snapshot_date": today,
        # Default all platform metrics to 0
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
    }

    # --- GitHub ---
    if handle := member.get("github_handle"):
        data = safe_fetch(fetch_github, handle, "GitHub", {"github_contributions": 0, "github_repos": 0})
        snapshot.update(data)
        time.sleep(INTER_CALL_SLEEP)

    # --- Codeforces ---
    if handle := member.get("codeforces_handle"):
        data = safe_fetch(fetch_codeforces, handle, "Codeforces", {"codeforces_rating": 0, "codeforces_solved": 0})
        snapshot.update(data)
        time.sleep(INTER_CALL_SLEEP)

    # --- LeetCode ---
    if handle := member.get("leetcode_handle"):
        defaults = {"leetcode_easy": 0, "leetcode_medium": 0, "leetcode_hard": 0, "leetcode_total": 0}
        data = safe_fetch(fetch_leetcode, handle, "LeetCode", defaults)
        snapshot.update(data)
        time.sleep(INTER_CALL_SLEEP)

    # --- CodeChef ---
    if handle := member.get("codechef_handle"):
        data = safe_fetch(fetch_codechef, handle, "CodeChef", {"codechef_rating": 0, "codechef_solved": 0})
        snapshot.update(data)
        time.sleep(INTER_CALL_SLEEP)

    # --- GeeksforGeeks ---
    if handle := member.get("gfg_handle"):
        data = safe_fetch(fetch_gfg, handle, "GFG", {"gfg_score": 0, "gfg_solved": 0})
        snapshot.update(data)
        time.sleep(INTER_CALL_SLEEP)

    # --- HackerRank ---
    if handle := member.get("hackerrank_handle"):
        data = safe_fetch(fetch_hackerrank, handle, "HackerRank", {"hackerrank_badges": 0})
        snapshot.update(data)
        time.sleep(INTER_CALL_SLEEP)

    # --- Compute Score ---
    snapshot["total_score"] = calculate_score(snapshot)
    log.info("  → Total Score: %.2f", snapshot["total_score"])

    return snapshot


def main():
    log.info("=" * 60)
    log.info("CODEX Stats Sync Pipeline — %s UTC", datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"))
    log.info("=" * 60)

    # Initialize Supabase client
    supabase = get_supabase_client()
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # Fetch all active members
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

            # Upsert into activity_snapshots (conflict on member_id + snapshot_date)
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
            # Continue with next member regardless
            continue

    log.info("=" * 60)
    log.info("Sync complete. Success: %d | Failed: %d", success_count, fail_count)
    log.info("=" * 60)


if __name__ == "__main__":
    main()
