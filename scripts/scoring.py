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

    # GFG, CodeChef & TUF Volume (Max 100 pts) - Penalizes School/Basic spam
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

    tuf_weight = (
        (snapshot.get("tuf_easy") or 0) * 1.0 +
        (snapshot.get("tuf_medium") or 0) * 3.0 +
        (snapshot.get("tuf_hard") or 0) * 6.0
    )
    if tuf_weight == 0 and (snapshot.get("tuf_solved") or 0) > 0:
        tuf_weight = (snapshot.get("tuf_solved") or 0) * 1.5

    cc_solved = (snapshot.get("codechef_solved") or 0) * 2.0
    gfg_cc_tuf_pts = min(100.0, ((gfg_weight + cc_solved + tuf_weight) / 1000.0) * 100.0)

    solved_score = lc_solved_pts + cf_solved_pts + gfg_cc_tuf_pts

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
