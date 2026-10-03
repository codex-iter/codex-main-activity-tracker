import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ScrollReveal, StaggerContainer, StaggerItem } from "../components/animations/ScrollReveal";
import SEO from "../components/SEO";
import { getDailyLeaderboard, type LeaderboardEntry, getClubStatsSummary, type ClubStatsSummary } from "../services/codexApi";
import ClubActivityCalendar from "../components/ClubActivityCalendar";

// ── Rank badge colours ────────────────────────────────────────────────────

const RANK_STYLES: Record<number, { bg: string; text: string; border: string }> = {
  1: { bg: "bg-yellow-400",  text: "text-slate-900", border: "border-yellow-500" },
  2: { bg: "bg-slate-300",   text: "text-slate-900", border: "border-slate-400"  },
  3: { bg: "bg-amber-600",   text: "text-white",     border: "border-amber-700"  },
};

function rankStyle(rank: number) {
  return RANK_STYLES[rank] ?? { bg: "bg-white", text: "text-slate-900", border: "border-slate-900" };
}

// ── Platform pill ─────────────────────────────────────────────────────────

function StatPill({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center border-2 border-slate-900 px-3 py-1 min-w-[64px]">
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 leading-none">
        {label}
      </span>
      <span className="text-base font-black text-slate-900 leading-tight">{value}</span>
    </div>
  );
}

// ── Single leaderboard row ────────────────────────────────────────────────

function LeaderboardRow({
  entry,
  rank,
}: {
  entry: LeaderboardEntry;
  rank: number;
}) {
  const member = entry.members;
  const rs = rankStyle(rank);
  const avatar =
    member.avatar_url ??
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
      member.full_name ?? "?"
    )}&backgroundColor=0707f2&textColor=ffffff`;

  const profileHref = member.github_handle
    ? `/profile/${member.github_handle}`
    : null;

  const inner = (
    <motion.div
      whileHover={{ x: 3, y: -3 }}
      transition={{ duration: 0.15 }}
      className="flex items-center gap-4 bg-white border-4 border-slate-900 p-4 brutalist-shadow-hover transition-all duration-200 group cursor-pointer"
    >
      {/* Rank badge */}
      <div
        className={`flex-shrink-0 w-10 h-10 flex items-center justify-center border-4 ${rs.border} ${rs.bg} font-black text-lg ${rs.text}`}
      >
        {rank}
      </div>

      {/* Avatar */}
      <div className="flex-shrink-0 w-12 h-12 border-4 border-slate-900 overflow-hidden bg-slate-200">
        <img
          src={avatar}
          alt={member.full_name ?? "Member"}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src =
              `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(member.full_name ?? "?")}`;
          }}
        />
      </div>

      {/* Identity */}
      <div className="flex-1 min-w-0">
        <h3 className="font-black text-slate-900 uppercase tracking-tight truncate text-base md:text-lg leading-none">
          {member.full_name ?? "—"}
        </h3>
        {member.github_handle && (
          <span className="text-xs font-bold text-primary mt-0.5 inline-block">
            @{member.github_handle}
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="hidden sm:flex items-center gap-2 flex-wrap justify-end">
        <StatPill label="Score"    value={entry.total_score.toFixed(0)} />
        <StatPill label="LC"       value={entry.leetcode_total} />
        <StatPill label="Streak"   value={`${entry.current_streak}d`} />
        <StatPill label="Contests" value={entry.contests_attended} />
      </div>

      {/* Mobile score */}
      <div className="sm:hidden flex flex-col items-end">
        <span className="text-xl font-black text-primary">{entry.total_score.toFixed(0)}</span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">pts</span>
      </div>
    </motion.div>
  );

  return profileHref ? (
    <Link to={profileHref} className="block">{inner}</Link>
  ) : (
    inner
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────

function LeaderboardSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 bg-white border-4 border-slate-200 p-4 animate-pulse"
        >
          <div className="w-10 h-10 bg-slate-200 flex-shrink-0" />
          <div className="w-12 h-12 bg-slate-200 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-slate-200 rounded w-1/3" />
            <div className="h-3 bg-slate-100 rounded w-1/5" />
          </div>
          <div className="hidden sm:flex gap-2">
            {[1, 2, 3, 4].map((j) => (
              <div key={j} className="w-16 h-10 bg-slate-200" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────

function EmptyState() {
  const today = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <div className="border-4 border-slate-900 bg-white p-16 text-center brutalist-shadow">
      <span className="material-symbols-outlined text-6xl text-slate-300 mb-4 block">
        leaderboard
      </span>
      <h3 className="text-2xl font-black uppercase text-slate-900 mb-2">No Data Yet</h3>
      <p className="text-slate-500 font-medium max-w-sm mx-auto">
        The daily sync for <span className="font-bold text-slate-700">{today}</span> hasn't run
        yet. Data updates automatically at <span className="font-bold">00:00</span> and{" "}
        <span className="font-bold">12:00 UTC</span>.
      </p>
    </div>
  );
}

// ── Error state ───────────────────────────────────────────────────────────

function ErrorState({ message }: { message: string }) {
  return (
    <div className="border-4 border-red-500 bg-white p-12 text-center brutalist-shadow">
      <span className="material-symbols-outlined text-5xl text-red-400 mb-4 block">
        error
      </span>
      <h3 className="text-xl font-black uppercase text-red-600 mb-2">Failed to Load</h3>
      <p className="text-slate-500 text-sm font-medium max-w-md mx-auto">{message}</p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [clubStats, setClubStats] = useState<ClubStatsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const [lbData, statsData] = await Promise.all([
          getDailyLeaderboard(),
          getClubStatsSummary()
        ]);
        if (!cancelled) {
          setEntries(lbData);
          setClubStats(statsData);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return (
    <div className="bg-background-light min-h-screen font-display text-slate-900">
      <SEO
        title="Leaderboard | CODEX ITER"
        description="Daily coding leaderboard for CODEX ITER members. Track LeetCode, Codeforces, GitHub, CodeChef, GFG, and HackerRank scores."
      />

      <main className="max-w-5xl mx-auto px-6 md:px-20 py-16">

        {/* ── Hero ── */}
        <ScrollReveal className="mb-14">
          <div className="inline-block bg-primary text-white px-4 py-1 mb-4 font-bold uppercase tracking-widest text-xs border-2 border-slate-900">
            Daily Rankings
          </div>
          <h1 className="text-6xl md:text-8xl font-black text-slate-900 uppercase leading-none tracking-tighter mb-4 font-display">
            LEADER<br />
            <span className="text-primary italic">BOARD</span>
          </h1>
          <p className="text-xl font-medium max-w-xl text-slate-700 border-l-8 border-primary pl-6">
            Real-time developer rankings across GitHub, LeetCode, Codeforces, CodeChef,
            GeeksforGeeks, and HackerRank.
          </p>
        </ScrollReveal>

        {/* ── Club Command Center Banner ── */}
        {clubStats && (
          <ScrollReveal delay={0.05} className="mb-14">
            <div className="bg-[#0707f2] border-4 border-slate-900 brutalist-shadow flex flex-col">
              <div className="p-6 md:p-10 text-white flex flex-col md:flex-row items-center gap-8 md:gap-12 justify-between">
                <div>
                  <h2 className="text-lg font-bold uppercase tracking-widest text-slate-300 mb-2">Club Command Center</h2>
                  <div className="text-6xl md:text-8xl font-black leading-none uppercase tracking-tighter">
                    {clubStats.total_club_solved}
                  </div>
                  <div className="text-sm font-bold uppercase tracking-widest text-slate-300 mt-2">
                    Total Problems Solved
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 w-full md:w-auto">
                  <div className="border-2 border-white/20 p-4">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-300 mb-1">LeetCode</div>
                    <div className="text-2xl font-black leading-none">{clubStats.total_leetcode}</div>
                  </div>
                  <div className="border-2 border-white/20 p-4">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-300 mb-1">GeeksForGeeks</div>
                    <div className="text-2xl font-black leading-none">{clubStats.total_gfg}</div>
                  </div>
                  <div className="border-2 border-white/20 p-4">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-300 mb-1">Codeforces</div>
                    <div className="text-2xl font-black leading-none">{clubStats.total_codeforces}</div>
                  </div>
                  <div className="border-2 border-white/20 p-4">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-300 mb-1">CodeChef</div>
                    <div className="text-2xl font-black leading-none">{clubStats.total_codechef}</div>
                  </div>
                  <div className="border-2 border-white/20 p-4">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-300 mb-1">HackerRank</div>
                    <div className="text-2xl font-black leading-none">{clubStats.total_hackerrank_badges}</div>
                    <div className="text-[8px] font-bold uppercase tracking-widest text-slate-400 mt-1">Badges</div>
                  </div>
                </div>
              </div>

              {/* ── CLUB SKILL DISTRIBUTION ── */}
              {(() => {
                const totalSkill = clubStats.total_fundamentals + clubStats.total_dsa + clubStats.total_cp;
                if (totalSkill === 0) return null;
                return (
                  <div className="border-t-4 border-slate-900 p-6 md:p-10 bg-white text-slate-900">
                    <div className="mb-6">
                      <span className="bg-slate-900 text-white px-2 py-1 text-xs font-black uppercase tracking-widest mb-2 inline-block">Mastery</span>
                      <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900 border-b-4 border-slate-900 pb-2">Club Skill Distribution</h3>
                    </div>
                    
                    {/* Stacked Bar */}
                    <div className="w-full flex h-12 md:h-16 border-4 border-slate-900 bg-slate-100 mb-4 brutalist-shadow-sm">
                      {clubStats.total_fundamentals > 0 && (
                        <div 
                          className="bg-[#facc15] h-full flex items-center justify-center border-r-4 border-slate-900 last:border-r-0 transition-all duration-500 hover:brightness-110"
                          style={{ width: `${(clubStats.total_fundamentals / totalSkill) * 100}%` }}
                          title={`Fundamentals: ${clubStats.total_fundamentals}`}
                        />
                      )}
                      {clubStats.total_dsa > 0 && (
                        <div 
                          className="bg-[#38bdf8] h-full flex items-center justify-center border-r-4 border-slate-900 last:border-r-0 transition-all duration-500 hover:brightness-110"
                          style={{ width: `${(clubStats.total_dsa / totalSkill) * 100}%` }}
                          title={`DSA: ${clubStats.total_dsa}`}
                        />
                      )}
                      {clubStats.total_cp > 0 && (
                        <div 
                          className="bg-[#ef4444] h-full flex items-center justify-center border-r-4 border-slate-900 last:border-r-0 transition-all duration-500 hover:brightness-110"
                          style={{ width: `${(clubStats.total_cp / totalSkill) * 100}%` }}
                          title={`CP: ${clubStats.total_cp}`}
                        />
                      )}
                    </div>
                    
                    {/* Legend */}
                    <div className="flex flex-wrap gap-4 md:gap-8 mt-4">
                      {clubStats.total_fundamentals > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-[#facc15] border-2 border-slate-900" />
                          <div className="flex flex-col leading-none">
                            <span className="text-xs font-black uppercase tracking-widest text-slate-900">Fundamentals</span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase">{clubStats.total_fundamentals} problems ({Math.round((clubStats.total_fundamentals / totalSkill) * 100)}%)</span>
                          </div>
                        </div>
                      )}
                      {clubStats.total_dsa > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-[#38bdf8] border-2 border-slate-900" />
                          <div className="flex flex-col leading-none">
                            <span className="text-xs font-black uppercase tracking-widest text-slate-900">DSA</span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase">{clubStats.total_dsa} problems ({Math.round((clubStats.total_dsa / totalSkill) * 100)}%)</span>
                          </div>
                        </div>
                      )}
                      {clubStats.total_cp > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-[#ef4444] border-2 border-slate-900" />
                          <div className="flex flex-col leading-none">
                            <span className="text-xs font-black uppercase tracking-widest text-slate-900">Competitive</span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase">{clubStats.total_cp} problems ({Math.round((clubStats.total_cp / totalSkill) * 100)}%)</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </ScrollReveal>
        )}

        {/* ── Club Activity Calendar ── */}
        <ScrollReveal delay={0.08} className="mb-14">
          <ClubActivityCalendar />
        </ScrollReveal>

        {/* ── Date strip ── */}
        <ScrollReveal delay={0.12} className="mb-8">
          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-slate-900" />
            <span className="font-bold uppercase text-sm tracking-widest text-slate-500 whitespace-nowrap">
              {today}
            </span>
            <div className="h-px flex-1 bg-slate-900" />
          </div>
        </ScrollReveal>

        {/* ── Column header (desktop) ── */}
        {!loading && !error && entries.length > 0 && (
          <ScrollReveal delay={0.1}>
            <div className="hidden sm:flex items-center gap-4 px-4 pb-2 mb-2">
              <div className="w-10" />
              <div className="w-12" />
              <div className="flex-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Member
              </div>
              <div className="flex gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                <div className="w-16 text-center">Score</div>
                <div className="w-16 text-center">LC</div>
                <div className="w-16 text-center">Streak</div>
                <div className="w-16 text-center">Contests</div>
              </div>
            </div>
          </ScrollReveal>
        )}

        {/* ── Content ── */}
        <div className="space-y-3">
          {loading && <LeaderboardSkeleton />}

          {!loading && error && <ErrorState message={error} />}

          {!loading && !error && entries.length === 0 && <EmptyState />}

          {!loading && !error && entries.length > 0 && (
            <StaggerContainer className="space-y-3">
              {entries.map((entry, idx) => (
                <StaggerItem key={entry.id}>
                  <LeaderboardRow entry={entry} rank={idx + 1} />
                </StaggerItem>
              ))}
            </StaggerContainer>
          )}
        </div>

        {/* ── Footer note ── */}
        {!loading && !error && entries.length > 0 && (
          <ScrollReveal delay={0.1} className="mt-12 pt-8 border-t-4 border-slate-900">
            <div className="flex flex-wrap gap-6 text-xs font-bold uppercase tracking-widest text-slate-400">
              <span>Synced twice daily at 00:00 &amp; 12:00 UTC</span>
              <span>Score = LC(E×1+M×3+H×6) + CF + CC + GFG + GH + HR</span>
            </div>
          </ScrollReveal>
        )}

      </main>
    </div>
  );
}
