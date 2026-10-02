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
