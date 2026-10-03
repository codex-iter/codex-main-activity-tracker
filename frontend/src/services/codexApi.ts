import { supabase } from "../lib/supabase";

// ── Types ──────────────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  id: string;
  snapshot_date: string;
  total_score: number;
  active_days: number;
  current_streak: number;
  leetcode_total: number;
  leetcode_easy: number;
  leetcode_medium: number;
  leetcode_hard: number;
  github_contributions: number;
  codeforces_rating: number;
  codechef_rating: number;
  hackerrank_badges: number;
  contests_attended: number;
  members: {
    id: string;
    full_name: string;
    roll_number: string | null;
    avatar_url: string | null;
    github_handle: string | null;
  };
}

// ── Service ────────────────────────────────────────────────────────────────

/**
 * Fetches today's leaderboard from Supabase.
 *
 * Query:
 *   SELECT activity_snapshots.*, members(id, full_name, roll_number, avatar_url, github_handle)
 *   FROM activity_snapshots
 *   WHERE snapshot_date = <today UTC>
 *   ORDER BY total_score DESC
 *
 * The foreign-key join on `member_id → members.id` is expressed via Supabase's
 * PostgREST syntax: `members(...)` inside the select string.
 */
export async function getDailyLeaderboard(): Promise<LeaderboardEntry[]> {
  const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD" UTC

  const { data, error } = await supabase
    .from("activity_snapshots")
    .select(
      `
      id,
      snapshot_date,
      total_score,
      active_days,
      current_streak,
      leetcode_total,
      leetcode_easy,
      leetcode_medium,
      leetcode_hard,
      github_contributions,
      codeforces_rating,
      codechef_rating,
      hackerrank_badges,
      contests_attended,
      members (
        id,
        full_name,
        roll_number,
        avatar_url,
        github_handle
      )
    `
    )
    .eq("snapshot_date", today)
    .order("total_score", { ascending: false });

  if (error) {
    console.error("[codexApi] getDailyLeaderboard error:", error.message);
    throw new Error(error.message);
  }

  return (data ?? []) as unknown as LeaderboardEntry[];
}

// ── Club Activity Map ──────────────────────────────────────────────────────

/** Shape required by react-activity-calendar */
export interface ActivityDay {
  date: string;           // "YYYY-MM-DD"
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

/**
 * Maps a raw count to a level 0-4 relative to the max count in the dataset.
 *  0 → no activity
 *  1-4 → quartile-based intensity
 */
function countToLevel(count: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (count === 0 || max === 0) return 0;
  const ratio = count / max;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5)  return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

/**
 * Fetches the pre-aggregated `club_daily_activity` view from Supabase
 * and returns data formatted for `react-activity-calendar`.
 *
 * View shape: { date: string, count: number }
 */
export async function getClubActivityMap(): Promise<ActivityDay[]> {
  const { data, error } = await supabase
    .from("club_daily_activity")
    .select("date, count")
    .order("date", { ascending: true });

  if (error) {
    console.error("[codexApi] getClubActivityMap error:", error.message);
    throw new Error(error.message);
  }

  const rows = (data ?? []) as { date: string; count: number }[];
  const max = Math.max(0, ...rows.map((r) => r.count));

  return rows.map((r) => ({
    date: r.date,
    count: r.count,
    level: countToLevel(r.count, max),
  }));
}

// ── Club GitHub Heatmap ───────────────────────────────────────────────────

export async function getClubGithubHeatmap(): Promise<ActivityDay[]> {
  const { data, error } = await supabase
    .from("activity_snapshots")
    .select("snapshot_date, daily_github_delta")
    .not("daily_github_delta", "is", null);

  if (error) {
    console.error("[codexApi] getClubGithubHeatmap error:", error.message);
    throw new Error(error.message);
  }

  const dateMap: Record<string, number> = {};
  for (const row of (data || [])) {
    const dStr = row.snapshot_date.split("T")[0]; // ensure format YYYY-MM-DD
    dateMap[dStr] = (dateMap[dStr] || 0) + (row.daily_github_delta || 0);
  }

  // Convert to sorted array
  const rows = Object.entries(dateMap)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const max = Math.max(0, ...rows.map((r) => r.count));

  return rows.map((r) => ({
    date: r.date,
    count: r.count,
    level: countToLevel(r.count, max),
  }));
}

// ── Club Stats Summary ─────────────────────────────────────────────────────

export interface ClubStatsSummary {
  total_leetcode: number;
  total_codeforces: number;
  total_codechef: number;
  total_gfg: number;
  total_hackerrank_badges: number;
  total_club_solved: number;
  total_fundamentals: number;
  total_dsa: number;
  total_cp: number;
}

export async function getClubStatsSummary(): Promise<ClubStatsSummary> {
  const defaultStats: ClubStatsSummary = {
    total_leetcode: 0,
    total_codeforces: 0,
    total_codechef: 0,
    total_gfg: 0,
    total_hackerrank_badges: 0,
    total_club_solved: 0,
    total_fundamentals: 0,
    total_dsa: 0,
    total_cp: 0,
  };

  try {
    const { data, error } = await supabase
      .from("club_stats_summary")
      .select("*")
      .limit(1)
      .single();

    if (error) {
      console.error("[codexApi] getClubStatsSummary error:", error.message);
      return defaultStats;
    }

    if (!data) return defaultStats;

    return {
      total_leetcode: data.total_leetcode || 0,
      total_codeforces: data.total_codeforces || 0,
      total_codechef: data.total_codechef || 0,
      total_gfg: data.total_gfg || 0,
      total_hackerrank_badges: data.total_hackerrank_badges || 0,
      total_club_solved: data.total_club_solved || 0,
      total_fundamentals: data.total_fundamentals || 0,
      total_dsa: data.total_dsa || 0,
      total_cp: data.total_cp || 0,
    };
  } catch (err) {
    console.error("[codexApi] getClubStatsSummary error:", err);
    return defaultStats;
  }
}

// ── Member Profile ─────────────────────────────────────────────────────────

export interface MemberProfile {
  id: string;
  full_name: string;
  roll_number: string | null;
  avatar_url: string | null;
  github_handle: string | null;
  leetcode_handle: string | null;
  codeforces_handle: string | null;
  codechef_handle: string | null;
  gfg_handle: string | null;
  hackerrank_handle: string | null;
  bio: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  snapshot: {
    snapshot_date: string;
    total_score: number;
    active_days: number;
    current_streak: number;
    max_streak: number;
    leetcode_easy: number;
    leetcode_medium: number;
    leetcode_hard: number;
    leetcode_total: number;
    gfg_school: number;
    gfg_basic: number;
    gfg_easy: number;
    gfg_medium: number;
    gfg_hard: number;
    github_contributions: number;
    codeforces_rating: number;
    codeforces_max_rating: number;
    codeforces_solved: number;
    codechef_rating: number;
    codechef_max_rating: number;
    codechef_solved: number;
    leetcode_rating: number;
    leetcode_max_rating: number;
    gfg_solved: number;
    gfg_score: number;
    hackerrank_badges: number;
    contests_attended: number;
    topic_stats: Record<string, number> | null;
    badges_detail: Record<string, unknown> | null;
  } | null;
}

/**
 * Fetches a member profile by github_handle (tried first) or roll_number,
 * along with their most recent activity_snapshot row.
 */
export async function getMemberProfile(handle: string): Promise<MemberProfile | null> {
  for (const field of ["github_handle", "roll_number"] as const) {
    const { data: members, error } = await supabase
      .from("members")
      .select(
        "id, full_name, roll_number, avatar_url, github_handle, leetcode_handle, codeforces_handle, codechef_handle, gfg_handle, hackerrank_handle, bio, linkedin_url, github_url, portfolio_url"
      )
      .eq(field, handle)
      .limit(1);

    if (error) {
      console.error("[codexApi] getMemberProfile error:", error.message);
      throw new Error(error.message);
    }

    if (!members || members.length === 0) continue;

    const member = members[0] as Omit<MemberProfile, "snapshot">;

    const { data: snapshots } = await supabase
      .from("activity_snapshots")
      .select(
        `snapshot_date, total_score, active_days, current_streak, max_streak,
         leetcode_easy, leetcode_medium, leetcode_hard, leetcode_total,
         leetcode_rating, leetcode_max_rating,
         gfg_school, gfg_basic, gfg_easy, gfg_medium, gfg_hard, gfg_solved, gfg_score,
         github_contributions, codeforces_rating, codeforces_max_rating, codeforces_solved,
         codechef_rating, codechef_max_rating, codechef_solved,
         hackerrank_badges, contests_attended, topic_stats, badges_detail`
      )
      .eq("member_id", member.id)
      .order("snapshot_date", { ascending: false })
      .limit(1);

    return {
      ...member,
      snapshot:
        snapshots && snapshots.length > 0
          ? (snapshots[0] as MemberProfile["snapshot"])
          : null,
    };
  }

  return null;
}
