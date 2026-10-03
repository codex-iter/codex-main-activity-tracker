import asyncio
import logging
import aiohttp
from .utils import safe_fetch, _safe_int

log = logging.getLogger(__name__)

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
