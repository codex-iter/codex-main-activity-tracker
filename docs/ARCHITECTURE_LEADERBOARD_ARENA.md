# CODEX Activity Tracker: Leaderboard & Arena Architecture

This document exhaustively details the data flow, database schema, scoring mechanics, and architectural connections that power the **Leaderboard** and **Arena** features of the CODEX platform.

---

## 1. Database Schema (Supabase)

The platform revolves around two primary tables in Supabase: `members` and `member_snapshots`.

### A. `members` Table
This table acts as the source of truth for user identities and platform linkages.

**Core Fields:**
*   `id` (UUID) - Primary key, linked to Supabase Auth.
*   `full_name`, `roll_number`, `bio`, `avatar_url` - Profile metadata.
*   `github_url`, `linkedin_url`, `portfolio_url` - Social links.

**Platform Handles:**
*   `github_handle`
*   `leetcode_handle`
*   `codeforces_handle`
*   `codechef_handle`
*   `gfg_handle`
*   `hackerrank_handle`

*Note: The Python backend only attempts to fetch data for platforms where a handle is provided.*

### B. `member_snapshots` Table
This is a time-series table. Instead of overwriting a user's stats, the backend inserts or updates a new row for every single day (`snapshot_date`). This is the secret to the Arena's monthly calculation mechanics.

**Core Fields:**
*   `member_id` (UUID) - Foreign key to `members`.
*   `snapshot_date` (Date) - The UTC date of the snapshot (e.g., `2026-10-06`).

**Calculated Scores:**
*   `total_score`, `dsa_score`, `dev_score`

**Aggregated Global Metrics:**
*   `active_days` - Total cumulative active days across all tracked platforms.
*   `current_streak` - Consecutive days where total platform activity increased.
*   `max_streak` - The longest historical `current_streak`.
*   `contests_attended` - Total contests across LeetCode, CodeChef, and Codeforces.

**Platform-Specific Metrics:**
*   **LeetCode:** `leetcode_easy`, `leetcode_medium`, `leetcode_hard`, `leetcode_total`, `leetcode_rating`, `leetcode_max_rating`, `leetcode_contests`
*   **Codeforces:** `codeforces_rating`, `codeforces_max_rating`, `codeforces_solved`, `codeforces_contests`, `codeforces_rank_title`
*   **CodeChef:** `codechef_rating`, `codechef_max_rating`, `codechef_solved`, `codechef_contests`
*   **GeeksForGeeks:** `gfg_solved`, `gfg_school`, `gfg_basic`, `gfg_easy`, `gfg_medium`, `gfg_hard`, `gfg_max_rating`
*   **HackerRank:** `hackerrank_badges`
*   **GitHub:** `github_contributions`, `github_repos`, `github_prs`, `github_issues`, `raw_github_commits`, `valid_github_commits`

**JSONB Metadata:**
*   `topic_stats` - Aggregated tags/topics solved (e.g., "Dynamic Programming": 40).
*   `badges_detail` - List of earned badges across platforms with icon URLs.

---

## 2. Backend Pipeline (`scripts/main.py`)

The backend is an asynchronous Python pipeline (usually run via a cron job or GitHub Action) that syncs all member data daily.

### Fetching & Rate Limiting
*   The script groups members into chunks (`CHUNK_SIZE = 10`) to prevent overwhelming external APIs.
*   Each fetcher (`codechef.py`, `leetcode.py`, etc.) utilizes `asyncio.Semaphore` and `asyncio.sleep()` micro-delays to perfectly pace concurrent requests and avoid `HTTP 429 Too Many Requests` bans.

### Monotonicity & Fault Tolerance
A critical rule of the tracker is that **metrics must never decrease**.
*   If an API goes down, times out, or returns a lower number of solved problems than the day before (e.g., if a user deletes a GitHub repo), `main.py` detects this drop by comparing the new fetch against the `yesterday_snap`.
*   If a drop is detected, the script gracefully falls back to yesterday's value for that specific platform, preserving the user's historical progress.

### The Global Streak System
Instead of relying on platform-specific streaks (which are often calculated differently by each site), CODEX calculates a unified global streak.
1.  The script calculates `yesterday_total` and `day_before_total` by summing all solved problems, commits, and badges.
2.  If `yesterday_total > day_before_total`, the user was active yesterday, meaning their streak continues today.
3.  If `current_total > yesterday_total`, the user is active *today*, and `current_streak` increments by 1.
4.  Otherwise, the streak resets to 0 (or remains pending if the user hasn't coded today but coded yesterday).

### Anti-Spam GitHub Commits
To prevent users from gaming the leaderboard by pushing 500 commits in a single day, GitHub contributions are throttled. The backend tracks `raw_github_commits` but caps the daily delta added to `valid_github_commits` at a maximum of `15` per day.

### Auto-Onboarding (The Arena Fix)
When a new user joins mid-month, they don't have a snapshot for the 1st of the month. To prevent their lifetime stats from being registered as a massive 1-day spike in the Arena, `main.py` flags `_is_new_member`. It then automatically seeds a backdated clone of their current stats to the 1st of the current month.

---

## 3. Frontend Architecture

The frontend is built with React, TypeScript, and Supabase's JS Client.

### Data Fetching (`codexApi.ts`)
*   `fetchLeaderboard()`: Pulls the absolute *latest* snapshot for every member in the DB, regardless of the date. This powers the main Leaderboard.
*   `fetchArenaData()`: Pulls exactly two snapshots per member:
    1.  The latest snapshot available in the current month.
    2.  The baseline snapshot (specifically where `snapshot_date` equals the 1st of the current month).

### The Main Leaderboard (`useLeaderboard.ts`)
The main leaderboard represents a user's **Lifetime Activity**.
*   It displays the absolute values of their latest snapshot.
*   Users can filter by "Overall", "DSA", or "Development" (which sorts by `total_score`, `dsa_score`, and `dev_score` respectively).
*   These scores are pre-calculated by the Python backend's `scoring.py` module.

### The Arena (`Arena.tsx`)
The Arena represents a user's **Monthly Momentum**.
*   Instead of ranking by absolute score, the Arena ranks by **Delta** (Growth).
*   For every metric, the UI calculates: `Delta = Latest Value - Baseline Value`.
*   If a user had 400 LeetCode problems on the 1st of the month, and 450 today, their Arena score reflects exactly 50 LeetCode problems.
*   This resets on the 1st of every month, giving everyone (veterans and newcomers alike) an equal chance to top the Arena leaderboard.

---

## 4. Scoring Mechanics (`scoring.py`)

The platform converts disparate activities (Commits vs. Hard Problems) into a unified currency.

### DSA Score (`dsa_score`)
Calculated using a weighted sum of problem difficulties:
*   **LeetCode:** Easy (1x), Medium (3x), Hard (5x)
*   **GeeksForGeeks:** School (0.25x), Basic (0.5x), Easy (1x), Medium (3x), Hard (5x)
*   **Codeforces & CodeChef:** Heavily weighted by rating multipliers. If a user is highly rated (e.g., > 1600), every problem they solve is worth significantly more points, rewarding high-level competitive programming.

### Development Score (`dev_score`)
*   Based heavily on `valid_github_commits` (capped daily).
*   Rewards PRs (Pull Requests) and Issues with massive multipliers to encourage open-source contributions over isolated commits.

### Total Score (`total_score`)
`total_score = dsa_score + dev_score + hackerrank_badges`
(Contests attended also contribute minor flat bonuses to the total score).
