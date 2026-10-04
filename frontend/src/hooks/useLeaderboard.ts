import { useState, useEffect, useMemo } from "react";
import { getDailyLeaderboard, getClubStatsSummary, getClubGithubHeatmap } from "../services/codexApi";
import type { ClubStatsSummary, ActivityDay } from "../services/codexApi";

export interface LeaderboardMember {
  id: string;
  rank: number;
  handle: string;
  full_name: string;
  avatar_url: string | null;
  total_score: number;
  dsa_score: number;
  dev_score: number;
  daily_score_delta: number;
  current_streak: number;
  leetcode_total: number;
  tuf_handle: string | null;
  tuf_solved: number;
  contests_attended: number;
  github_contributions: number;
  codeforces_rating: number;
  codechef_rating: number;
  hackerrank_badges: number;
}

export type SortMode = 'GLOBAL' | 'DSA' | 'DEV';

export function useLeaderboard() {
  const [rawMembers, setRawMembers] = useState<LeaderboardMember[]>([]);
  const [clubSummary, setClubSummary] = useState<ClubStatsSummary | null>(null);
  const [githubHeatmap, setGithubHeatmap] = useState<ActivityDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("GLOBAL");

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const [lbData, statsData, heatmapData] = await Promise.all([
          getDailyLeaderboard(),
          getClubStatsSummary(),
          getClubGithubHeatmap().catch(() => [])
        ]);

        if (!cancelled) {
          const mappedMembers: LeaderboardMember[] = lbData.map((entry, index) => ({
            id: entry.id,
            rank: index + 1, // original rank by score
            handle: entry.members.github_handle ?? "",
            full_name: entry.members.full_name ?? "—",
            avatar_url: entry.members.avatar_url,
            total_score: entry.total_score,
            dsa_score: entry.dsa_score,
            dev_score: entry.dev_score,
            daily_score_delta: 0, // placeholder, would need previous snapshot for delta
            current_streak: entry.current_streak,
            leetcode_total: entry.leetcode_total,
            tuf_handle: entry.members.tuf_handle,
            tuf_solved: entry.tuf_solved || 0,
            contests_attended: entry.contests_attended,
            github_contributions: entry.github_contributions,
            codeforces_rating: entry.codeforces_rating,
            codechef_rating: entry.codechef_rating,
            hackerrank_badges: entry.hackerrank_badges,
          }));

          setRawMembers(mappedMembers);
          setClubSummary(statsData);
          setGithubHeatmap(heatmapData);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load leaderboard");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, []);

  const members = useMemo(() => {
    let filtered = rawMembers;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(m => 
        m.full_name.toLowerCase().includes(q) || 
        m.handle.toLowerCase().includes(q)
      );
    }

    const sorted = filtered.sort((a, b) => {
      if (sortMode === "DSA") return (b.dsa_score || 0) - (a.dsa_score || 0);
      if (sortMode === "DEV") return (b.dev_score || 0) - (a.dev_score || 0);
      return (b.total_score || 0) - (a.total_score || 0); // GLOBAL default
    });

    return sorted.map((member, index) => ({
      ...member,
      rank: index + 1
    }));
  }, [rawMembers, searchQuery, sortMode]);

  return {
    members,
    clubSummary,
    githubHeatmap,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    sortMode,
    setSortMode
  };
}
