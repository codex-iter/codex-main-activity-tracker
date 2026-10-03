import { ScrollReveal } from "../components/animations/ScrollReveal";
import SEO from "../components/SEO";
import ClubActivityCalendar from "../components/ClubActivityCalendar";
import { useLeaderboard } from "../hooks/useLeaderboard";
import ClubCommandCenter from "../components/leaderboard/ClubCommandCenter";
import ClubSkillDistribution from "../components/leaderboard/ClubSkillDistribution";
import LeaderboardControls from "../components/leaderboard/LeaderboardControls";
import LeaderboardTable from "../components/leaderboard/LeaderboardTable";

export default function Leaderboard() {
  const {
    members,
    clubSummary,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
  } = useLeaderboard();

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

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

        {/* ── Club Command Center & Skill Distribution ── */}
        {clubSummary && (
          <ScrollReveal delay={0.05} className="mb-14">
            <ClubCommandCenter stats={clubSummary} />
            <ClubSkillDistribution stats={clubSummary} />
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

        {/* ── Controls ── */}
        <ScrollReveal delay={0.15}>
          <LeaderboardControls
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            sortBy={sortBy}
            setSortBy={setSortBy}
          />
        </ScrollReveal>

        {/* ── Leaderboard Table ── */}
        <LeaderboardTable members={members} loading={loading} error={error} />

        {/* ── Footer note ── */}
        {!loading && !error && members.length > 0 && (
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
