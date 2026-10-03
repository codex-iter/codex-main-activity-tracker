import os
import logging
import aiohttp
from .utils import safe_fetch, _safe_int

log = logging.getLogger(__name__)

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
