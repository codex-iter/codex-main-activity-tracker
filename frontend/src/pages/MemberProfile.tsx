import { useEffect, useState } from "react";
import React from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ScrollReveal, StaggerContainer, StaggerItem } from "../components/animations/ScrollReveal";
import SEO from "../components/SEO";
import { getMemberProfile, type MemberProfile } from "../services/codexApi";
import { GitHubCalendar } from "react-github-calendar";

// ── Helpers ────────────────────────────────────────────────────────────────

function avatar(member: MemberProfile) {
  return (
    member.avatar_url ??
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
      member.full_name ?? "?"
    )}&backgroundColor=0707f2&textColor=ffffff`
  );
}

// ── Reusable primitives ────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block bg-primary text-white px-3 py-0.5 font-bold uppercase tracking-widest text-[10px] border-2 border-slate-900">
      {children}
    </span>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 leading-none">
      {children}
    </h2>
  );
}

// ── Hero metric card ───────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  accent = false,
  unit,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
  unit?: string;
}) {
  return (
    <motion.div
      whileHover={{ x: -3, y: -3 }}
      transition={{ duration: 0.15 }}
      className="bg-white border-4 border-slate-900 p-5 brutalist-shadow flex flex-col justify-between min-h-[110px]"
    >
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
        {label}
      </span>
      <div className="flex items-end gap-1 mt-2">
        <span
          className={`text-4xl font-black leading-none ${
            accent ? "text-primary" : "text-slate-900"
          }`}
        >
          {value}
        </span>
        {unit && (
          <span className="text-sm font-bold text-slate-400 pb-1">{unit}</span>
        )}
      </div>
    </motion.div>
  );
}

// ── Difficulty bar row ────────────────────────────────────────────────────

function DiffBar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 text-[11px] font-black uppercase tracking-widest text-slate-500 flex-shrink-0">
        {label}
      </span>
      <div className="flex-1 h-5 bg-slate-100 border-2 border-slate-900 overflow-hidden">
        <motion.div
          className={`h-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
      <span className="w-10 text-right text-sm font-black text-slate-900">
        {value}
      </span>
    </div>
  );
}

// ── Platform stat pill ────────────────────────────────────────────────────

function PlatformPill({
  platform,
  value,
  unit,
}: {
  platform: string;
  value: string | number;
  unit?: string;
}) {
  return (
    <div className="flex flex-col border-4 border-slate-900 px-4 py-3 bg-white brutalist-shadow-sm">
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 leading-none mb-1">
        {platform}
      </span>
      <span className="text-2xl font-black text-slate-900 leading-tight">
        {value}
        {unit && (
          <span className="text-sm text-slate-400 font-bold ml-1">{unit}</span>
        )}
      </span>
    </div>
  );
}

// ── Platform Overview Card ────────────────────────────────────────────────

function PlatformCard({
  platform,
  children,
  href,
}: {
  platform: string;
  children: React.ReactNode;
  href?: string | null;
}) {
  return (
    <div className="border-4 border-slate-900 bg-white p-5 flex flex-col brutalist-shadow-sm hover:-translate-y-1 hover:-translate-x-1 transition-transform">
      <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 border-b-4 border-slate-900 pb-2 mb-4">
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-primary inline-flex items-center gap-1 group">
            {platform}
            <span className="text-base font-normal transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">↗</span>
          </a>
        ) : (
          platform
        )}
      </h3>
      <div className="flex-1 flex flex-col gap-3 justify-center">
        {children}
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-end gap-2 border-b-2 border-slate-100 pb-1 last:border-0 last:pb-0">
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 leading-none pb-0.5">
        {label}
      </span>
      <span className="text-sm font-black text-slate-900 leading-none text-right">
        {value}
      </span>
    </div>
  );
}

// ── Topic tag ─────────────────────────────────────────────────────────────

function TopicTag({ topic, count }: { topic: string; count: number }) {
  return (
    <div className="flex items-center gap-0 border-2 border-slate-900 overflow-hidden">
      <span className="px-3 py-1.5 text-xs font-black uppercase tracking-tight text-slate-900 bg-white">
        {topic}
      </span>
      <span className="px-3 py-1.5 text-xs font-black bg-primary text-white min-w-[32px] text-center">
        {String(count)}
      </span>
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────

function ProfileSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-48 bg-slate-200 border-4 border-slate-200" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-slate-200 border-4 border-slate-200" />
        ))}
      </div>
      <div className="h-40 bg-slate-200 border-4 border-slate-200" />
    </div>
  );
}

// ── Not found ─────────────────────────────────────────────────────────────

function NotFound({ handle }: { handle: string }) {
  return (
    <div className="border-4 border-slate-900 bg-white p-16 text-center brutalist-shadow">
      <span className="material-symbols-outlined text-6xl text-slate-300 mb-4 block">
        person_off
      </span>
      <h3 className="text-3xl font-black uppercase text-slate-900 mb-2">
        Member Not Found
      </h3>
      <p className="text-slate-500 font-medium max-w-sm mx-auto mb-6">
        No member with handle{" "}
        <span className="font-black text-primary">"{handle}"</span> exists in
        the CODEX database.
      </p>
      <Link
        to="/leaderboard"
        className="inline-block border-4 border-slate-900 bg-primary text-white px-6 py-3 font-black uppercase tracking-widest text-sm brutalist-shadow hover:bg-slate-900 transition-colors"
      >
        ← Back to Leaderboard
      </Link>
    </div>
  );
}

// ── Error ─────────────────────────────────────────────────────────────────

function ErrorState({ message }: { message: string }) {
  return (
    <div className="border-4 border-red-500 bg-white p-12 text-center brutalist-shadow">
      <span className="material-symbols-outlined text-5xl text-red-400 mb-4 block">
        error
      </span>
      <h3 className="text-xl font-black uppercase text-red-600 mb-2">
        Failed to Load Profile
      </h3>
      <p className="text-slate-500 text-sm font-medium max-w-md mx-auto">
        {message}
      </p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function MemberProfile() {
  const { handle = "" } = useParams<{ handle: string }>();
  const [profile, setProfile] = useState<MemberProfile | null | undefined>(
    undefined // undefined = loading, null = not found
  );
  const [error, setError] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; activity: any } | null>(null);

  useEffect(() => {
    if (!handle) return;
    let cancelled = false;

    (async () => {
      try {
        setProfile(undefined);
        setError(null);
        const data = await getMemberProfile(handle);
        if (!cancelled) setProfile(data); // null → not found
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unknown error");
          setProfile(null);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [handle]);

  const loading = profile === undefined && !error;
  const s = profile?.snapshot ?? null;

  // LeetCode totals for bar calc
  const lcTotal = s ? s.leetcode_easy + s.leetcode_medium + s.leetcode_hard : 0;
  // GFG totals
  const gfgTotal = s
    ? s.gfg_school + s.gfg_basic + s.gfg_easy + s.gfg_medium + s.gfg_hard
    : 0;

  // Individual Total Solved across platforms
  const individualTotalSolved = s
    ? (s.leetcode_total || 0) + (s.codeforces_solved || 0) + (s.codechef_solved || 0) + (s.gfg_solved || 0)
    : 0;

  // Skill Distribution Categories
  const skillFundamentals = s ? (s.gfg_school || 0) + (s.gfg_basic || 0) + (s.gfg_easy || 0) : 0;
  const skillDsa = s ? (s.leetcode_easy || 0) + (s.leetcode_medium || 0) + (s.gfg_medium || 0) + (s.gfg_hard || 0) : 0;
  const skillCp = s ? (s.codeforces_solved || 0) + (s.codechef_solved || 0) + (s.leetcode_hard || 0) : 0;
  const totalSkill = skillFundamentals + skillDsa + skillCp;

  // Safely extract numeric counts from topic_stats regardless of nesting depth.
  function toCount(val: unknown): number {
    if (typeof val === "number") return val;
    if (val && typeof val === "object") {
      const obj = val as Record<string, unknown>;
      for (const key of ["count", "total", "solved", "value", "problems"]) {
        if (typeof obj[key] === "number") return obj[key] as number;
      }
      const nums = Object.values(obj).filter((v) => typeof v === "number") as number[];
      if (nums.length > 0) return nums.reduce((a, b) => a + b, 0);
    }
    return 0;
  }

  function aggregateTopics(stats: unknown): [string, number][] {
    if (!stats || typeof stats !== "object") return [];
    const counts = new Map<string, number>();
    
    // stats is grouped by platform: { "gfg": { "Arrays": 15 }, "codechef": { "arrays": 5 } }
    for (const platformData of Object.values(stats as Record<string, unknown>)) {
      if (platformData && typeof platformData === "object") {
        for (const [rawTopic, val] of Object.entries(platformData as Record<string, unknown>)) {
          const count = toCount(val);
          if (count > 0) {
            const normalized = rawTopic
              .replace(/[-_]/g, " ")
              .split(" ")
              .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
              .join(" ")
              .trim();
            counts.set(normalized, (counts.get(normalized) || 0) + count);
          }
        }
      }
    }
    return Array.from(counts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20); // Top 20 topics
  }

  const sortedTopics = aggregateTopics(s?.topic_stats);
  const badges = (s?.badges_detail as Array<{ platform: string; name: string }>) || [];

  return (
    <div className="bg-background-light min-h-screen font-display text-slate-900">
      {profile && (
        <SEO
          title={`${profile.full_name} | CODEX ITER`}
          description={`Solo coding profile for ${profile.full_name} — streaks, LeetCode, GFG, GitHub, and more.`}
        />
      )}
      {!profile && !loading && (
        <SEO
          title="Member Not Found | CODEX ITER"
          description="This CODEX member profile does not exist."
        />
      )}

      <main className="max-w-5xl mx-auto px-6 md:px-20 py-16">

        {/* ── Back link ── */}
        <ScrollReveal className="mb-10">
          <Link
            to="/leaderboard"
            className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-500 hover:text-primary transition-colors group"
          >
            <span className="group-hover:-translate-x-1 transition-transform">←</span>
            Leaderboard
          </Link>
        </ScrollReveal>

        {loading && <ProfileSkeleton />}
        {!loading && error && <ErrorState message={error} />}
        {!loading && !error && profile === null && <NotFound handle={handle} />}

        {!loading && !error && profile && (
          <StaggerContainer className="space-y-12">

            {/* ── HEADER CARD ── */}
            <StaggerItem>
              <div className="bg-background-dark border-4 border-slate-900 p-6 md:p-10 brutalist-shadow flex flex-col sm:flex-row gap-6 items-start">
                {/* Avatar */}
                <div className="flex-shrink-0 w-24 h-24 border-4 border-white overflow-hidden bg-slate-700">
                  <img
                    src={avatar(profile)}
                    alt={profile.full_name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(profile.full_name ?? "?")}`;
                    }}
                  />
                </div>

                {/* Identity */}
                <div className="flex-1 min-w-0">
                  <Label>CODEX Member</Label>
                  <h1 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter leading-none mt-3 mb-1">
                    {profile.full_name}
                  </h1>
                  {profile.roll_number && (
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">
                      {profile.roll_number}
                    </p>
                  )}
                  {profile.bio && (
                    <p className="text-slate-300 font-mono text-sm italic mb-4 max-w-lg">
                      {profile.bio}
                    </p>
                  )}

                  {/* Social links */}
                  <div className="flex flex-wrap gap-3 mt-4">
                    {profile.github_handle && (
                      <a
                        href={profile.github_url || `https://github.com/${profile.github_handle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 border-2 border-white/30 bg-slate-800 px-3 py-1.5 text-xs font-black text-white uppercase tracking-widest hover:bg-white hover:text-slate-900 transition-colors"
                      >
                        <span className="material-symbols-outlined text-base leading-none">
                          code
                        </span>
                        GitHub
                      </a>
                    )}
                    {profile.linkedin_url && (
                      <a
                        href={profile.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 border-2 border-white/30 bg-slate-800 px-3 py-1.5 text-xs font-black text-white uppercase tracking-widest hover:bg-white hover:text-slate-900 transition-colors"
                      >
                        <span className="material-symbols-outlined text-base leading-none">
                          work
                        </span>
                        LinkedIn
                      </a>
                    )}
                    {profile.portfolio_url && (
                      <a
                        href={profile.portfolio_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 border-2 border-white/30 bg-slate-800 px-3 py-1.5 text-xs font-black text-white uppercase tracking-widest hover:bg-white hover:text-slate-900 transition-colors"
                      >
                        <span className="material-symbols-outlined text-base leading-none">
                          language
                        </span>
                        Portfolio
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </StaggerItem>

            {/* ── HERO METRICS ── */}
            {s && (
              <StaggerItem>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <motion.div
                    whileHover={{ x: -3, y: -3 }}
                    transition={{ duration: 0.15 }}
                    className="bg-[#0707f2] text-white border-4 border-slate-900 p-5 brutalist-shadow flex flex-col justify-between min-h-[110px]"
                  >
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">
                      Total Solved
                    </span>
                    <div className="flex items-end gap-1 mt-2">
                      <span className="text-4xl font-black leading-none">
                        {individualTotalSolved}
                      </span>
                    </div>
                  </motion.div>
                  <MetricCard
                    label="Total Score"
                    value={Math.round(s.total_score)}
                    accent
                  />
                  <MetricCard
                    label="Current Streak"
                    value={s.current_streak}
                    unit="days"
                  />
                  <MetricCard
                    label="Max Streak"
                    value={s.max_streak}
                    unit="days"
                  />
                  <MetricCard
                    label="Active Days"
                    value={s.active_days}
                    unit="days"
                  />
                </div>
              </StaggerItem>
            )}

            {/* ── SKILL DISTRIBUTION ── */}
            {totalSkill > 0 && (
              <StaggerItem>
                <div className="border-4 border-slate-900 bg-white p-6 md:p-8 brutalist-shadow">
                  <div className="mb-6">
                    <Label>Mastery</Label>
                    <SectionTitle>Skill Distribution</SectionTitle>
                  </div>
                  
                  {/* Stacked Bar */}
                  <div className="w-full flex h-12 md:h-16 border-4 border-slate-900 bg-slate-100 mb-4 brutalist-shadow-sm">
                    {skillFundamentals > 0 && (
                      <div 
                        className="bg-[#facc15] h-full flex items-center justify-center border-r-4 border-slate-900 last:border-r-0 transition-all duration-500 hover:brightness-110"
                        style={{ width: `${(skillFundamentals / totalSkill) * 100}%` }}
                        title={`Fundamentals: ${skillFundamentals}`}
                      />
                    )}
                    {skillDsa > 0 && (
                      <div 
                        className="bg-[#38bdf8] h-full flex items-center justify-center border-r-4 border-slate-900 last:border-r-0 transition-all duration-500 hover:brightness-110"
                        style={{ width: `${(skillDsa / totalSkill) * 100}%` }}
                        title={`DSA: ${skillDsa}`}
                      />
                    )}
                    {skillCp > 0 && (
                      <div 
                        className="bg-[#ef4444] h-full flex items-center justify-center border-r-4 border-slate-900 last:border-r-0 transition-all duration-500 hover:brightness-110"
                        style={{ width: `${(skillCp / totalSkill) * 100}%` }}
                        title={`CP: ${skillCp}`}
                      />
                    )}
                  </div>
                  
                  {/* Legend */}
                  <div className="flex flex-wrap gap-4 md:gap-8 mt-4">
                    {skillFundamentals > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-[#facc15] border-2 border-slate-900" />
                        <div className="flex flex-col leading-none">
                          <span className="text-xs font-black uppercase tracking-widest text-slate-900">Fundamentals</span>
                          <span className="text-[10px] font-bold text-slate-500 uppercase">{skillFundamentals} problems ({Math.round((skillFundamentals / totalSkill) * 100)}%)</span>
                        </div>
                      </div>
                    )}
                    {skillDsa > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-[#38bdf8] border-2 border-slate-900" />
                        <div className="flex flex-col leading-none">
                          <span className="text-xs font-black uppercase tracking-widest text-slate-900">DSA</span>
                          <span className="text-[10px] font-bold text-slate-500 uppercase">{skillDsa} problems ({Math.round((skillDsa / totalSkill) * 100)}%)</span>
                        </div>
                      </div>
                    )}
                    {skillCp > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-[#ef4444] border-2 border-slate-900" />
                        <div className="flex flex-col leading-none">
                          <span className="text-xs font-black uppercase tracking-widest text-slate-900">Competitive</span>
                          <span className="text-[10px] font-bold text-slate-500 uppercase">{skillCp} problems ({Math.round((skillCp / totalSkill) * 100)}%)</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </StaggerItem>
            )}

            {/* ── CONTEST RANKINGS ── */}
            {s && (
              <StaggerItem>
                <div className="border-4 border-slate-900 bg-white p-6 md:p-8 brutalist-shadow">
                  <div className="mb-6">
                    <Label>Competitive</Label>
                    <SectionTitle>Contest Rankings</SectionTitle>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="border-4 border-slate-900 p-5 flex flex-col items-center justify-center text-center brutalist-shadow-sm hover:-translate-y-1 transition-transform bg-white">
                      <span className="text-sm font-black uppercase tracking-widest text-slate-500 mb-2">LeetCode</span>
                      <span className={`font-black leading-none ${s.leetcode_rating ? 'text-6xl text-slate-900' : 'text-5xl text-slate-400'}`}>
                        {s.leetcode_rating || "UNRATED"}
                      </span>
                      {s.leetcode_max_rating > 0 && (
                        <span className="text-xs font-bold uppercase text-slate-500 mt-2">
                          (max: {s.leetcode_max_rating})
                        </span>
                      )}
                    </div>
                    <div className="border-4 border-slate-900 p-5 flex flex-col items-center justify-center text-center brutalist-shadow-sm hover:-translate-y-1 transition-transform bg-white">
                      <span className="text-sm font-black uppercase tracking-widest text-slate-500 mb-2">CodeChef</span>
                      <span className={`font-black leading-none ${s.codechef_rating ? 'text-6xl text-slate-900' : 'text-5xl text-slate-400'}`}>
                        {s.codechef_rating || "UNRATED"}
                      </span>
                      {s.codechef_max_rating > 0 && (
                        <span className="text-xs font-bold uppercase text-slate-500 mt-2">
                          (max: {s.codechef_max_rating})
                        </span>
                      )}
                    </div>
                    <div className="border-4 border-slate-900 p-5 flex flex-col items-center justify-center text-center brutalist-shadow-sm hover:-translate-y-1 transition-transform bg-white">
                      <span className="text-sm font-black uppercase tracking-widest text-slate-500 mb-2">Codeforces</span>
                      <span className={`font-black leading-none ${s.codeforces_rating ? 'text-6xl text-slate-900' : 'text-5xl text-slate-400'}`}>
                        {s.codeforces_rating || "UNRATED"}
                      </span>
                      {s.codeforces_max_rating > 0 && (
                        <span className="text-xs font-bold uppercase text-slate-500 mt-2">
                          (max: {s.codeforces_max_rating})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </StaggerItem>
            )}

            {/* ── DIFFICULTY BREAKDOWN ── */}
            {s && (lcTotal > 0 || gfgTotal > 0) && (
              <StaggerItem>
                <div className="border-4 border-slate-900 bg-white p-6 md:p-8 brutalist-shadow">
                  <div className="grid md:grid-cols-2 gap-10">

                    {/* LeetCode */}
                    {lcTotal > 0 && (
                      <div>
                        <div className="flex items-center gap-3 mb-5">
                          <SectionTitle>LeetCode</SectionTitle>
                          <span className="text-sm font-black text-slate-400">
                            {lcTotal} solved
                          </span>
                        </div>
                        <div className="space-y-3">
                          <DiffBar label="Easy"   value={s.leetcode_easy}   total={lcTotal} color="bg-emerald-500" />
                          <DiffBar label="Medium" value={s.leetcode_medium} total={lcTotal} color="bg-yellow-400" />
                          <DiffBar label="Hard"   value={s.leetcode_hard}   total={lcTotal} color="bg-red-500" />
                        </div>
                        {/* Tag summary */}
                        <div className="flex gap-2 flex-wrap mt-5">
                          {[
                            { l: "Easy",   v: s.leetcode_easy,   cls: "bg-emerald-100 text-emerald-800 border-emerald-400" },
                            { l: "Medium", v: s.leetcode_medium, cls: "bg-yellow-100 text-yellow-800 border-yellow-400" },
                            { l: "Hard",   v: s.leetcode_hard,   cls: "bg-red-100 text-red-800 border-red-400" },
                          ].map(({ l, v, cls }) => (
                            <span
                              key={l}
                              className={`border-2 px-3 py-1 text-xs font-black uppercase ${cls}`}
                            >
                              {l}: {v}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* GFG */}
                    {gfgTotal > 0 && (
                      <div>
                        <div className="flex items-center gap-3 mb-5">
                          <SectionTitle>GFG</SectionTitle>
                          <span className="text-sm font-black text-slate-400">
                            {gfgTotal} solved
                          </span>
                        </div>
                        <div className="space-y-3">
                          <DiffBar label="School" value={s.gfg_school}  total={gfgTotal} color="bg-sky-400" />
                          <DiffBar label="Basic"  value={s.gfg_basic}   total={gfgTotal} color="bg-emerald-400" />
                          <DiffBar label="Easy"   value={s.gfg_easy}    total={gfgTotal} color="bg-emerald-600" />
                          <DiffBar label="Medium" value={s.gfg_medium}  total={gfgTotal} color="bg-yellow-400" />
                          <DiffBar label="Hard"   value={s.gfg_hard}    total={gfgTotal} color="bg-red-500" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </StaggerItem>
            )}

            {/* ── PLATFORM OVERVIEW ── */}
            {s && (
              <StaggerItem>
                <div className="border-4 border-slate-900 bg-white p-6 md:p-8 brutalist-shadow">
                  <div className="mb-6 flex justify-between items-end gap-4 flex-wrap">
                    <div>
                      <Label>Platforms</Label>
                      <SectionTitle>Platform Overview</SectionTitle>
                    </div>
                    <div className="flex gap-2">
                      <PlatformPill platform="Contests" value={s.contests_attended ?? 0} />
                    </div>
                  </div>

                  {/* ── OPEN SOURCE CONTRIBUTIONS ── */}
                  <div className="mb-10">
                    <div className="mb-6">
                      <Label>Open Source</Label>
                      <SectionTitle>Contributions</SectionTitle>
                    </div>
                    {profile.github_handle ? (
                      <div className="border-4 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] p-6 md:p-8 overflow-x-auto bg-white flex justify-center w-full min-w-0">
                        <GitHubCalendar 
                          username={profile.github_handle} 
                          colorScheme="light"
                          theme={{
                            light: ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"] // classic github green
                          }}
                          style={{
                            fontFamily: "'Space Grotesk', sans-serif",
                            width: "100%",
                          }}
                          renderBlock={(block, activity) =>
                            React.cloneElement(block as React.ReactElement, {
                              onMouseEnter: (e: React.MouseEvent) => {
                                const rect = (e.target as Element).getBoundingClientRect();
                                setTooltip({
                                  x: rect.left + rect.width / 2,
                                  y: rect.top,
                                  activity: activity,
                                });
                              },
                              onMouseLeave: () => setTooltip(null),
                              className: "transition-all duration-150 hover:scale-150 hover:-translate-y-1 hover:z-20 cursor-crosshair",
                              style: { transformBox: 'fill-box', transformOrigin: 'center' }
                            })
                          }
                        />
                      </div>
                    ) : (
                      <div className="border-4 border-slate-900 border-dashed p-6 text-center shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
                        <span className="text-sm font-black uppercase tracking-widest text-slate-400">
                          NO GITHUB HANDLE LINKED
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Tooltip Portal */}
                  {tooltip && (
                    <div
                      className="fixed z-[100] pointer-events-none -translate-x-1/2 -translate-y-[120%]"
                      style={{ left: tooltip.x, top: tooltip.y }}
                    >
                      <div className="bg-slate-900 text-white font-mono uppercase text-xs tracking-wider border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] px-3 py-2 z-50 flex flex-col items-center text-center whitespace-nowrap">
                        <span className="border-b-2 border-slate-700 pb-1 mb-1 w-full text-slate-400">
                          {new Date(tooltip.activity.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}
                        </span>
                        <span className="font-bold">
                          {tooltip.activity.count} PROBLEMS
                        </span>
                      </div>
                    </div>
                  )}

                  {/* ── PLATFORM VOLUME BREAKDOWN ── */}
                  {(() => {
                    const lc = s.leetcode_total || 0;
                    const gfg = s.gfg_solved || 0;
                    const cf = s.codeforces_solved || 0;
                    const cc = s.codechef_solved || 0;
                    const totalVol = lc + gfg + cf + cc;
                    
                    if (totalVol === 0) return null;
                    
                    return (
                      <div className="mb-10">
                        <h4 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-3">Solved Volume By Platform</h4>
                        
                        {/* Stacked Bar */}
                        <div className="w-full flex h-12 md:h-16 border-4 border-slate-900 bg-slate-100 mb-4 brutalist-shadow-sm cursor-crosshair">
                          {lc > 0 && (
                            <div 
                              className="bg-yellow-400 h-full flex items-center justify-center border-r-4 border-slate-900 last:border-r-0 transition-all hover:brightness-110"
                              style={{ width: `${(lc / totalVol) * 100}%` }}
                              title={`LeetCode: ${lc}`}
                            />
                          )}
                          {gfg > 0 && (
                            <div 
                              className="bg-green-500 h-full flex items-center justify-center border-r-4 border-slate-900 last:border-r-0 transition-all hover:brightness-110"
                              style={{ width: `${(gfg / totalVol) * 100}%` }}
                              title={`GeeksForGeeks: ${gfg}`}
                            />
                          )}
                          {cf > 0 && (
                            <div 
                              className="bg-red-500 h-full flex items-center justify-center border-r-4 border-slate-900 last:border-r-0 transition-all hover:brightness-110"
                              style={{ width: `${(cf / totalVol) * 100}%` }}
                              title={`Codeforces: ${cf}`}
                            />
                          )}
                          {cc > 0 && (
                            <div 
                              className="bg-purple-500 h-full flex items-center justify-center border-r-4 border-slate-900 last:border-r-0 transition-all hover:brightness-110"
                              style={{ width: `${(cc / totalVol) * 100}%` }}
                              title={`CodeChef: ${cc}`}
                            />
                          )}
                        </div>
                        
                        {/* Legend */}
                        <div className="flex flex-wrap gap-3">
                          {lc > 0 && (
                            <div className="border-2 border-slate-900 bg-white px-3 py-1.5 flex items-center gap-2 brutalist-shadow-sm">
                              <div className="w-3 h-3 bg-yellow-400 border-2 border-slate-900" />
                              <span className="text-xs font-black uppercase tracking-widest text-slate-900">
                                LeetCode: {lc} ({Math.round((lc / totalVol) * 100)}%)
                              </span>
                            </div>
                          )}
                          {gfg > 0 && (
                            <div className="border-2 border-slate-900 bg-white px-3 py-1.5 flex items-center gap-2 brutalist-shadow-sm">
                              <div className="w-3 h-3 bg-green-500 border-2 border-slate-900" />
                              <span className="text-xs font-black uppercase tracking-widest text-slate-900">
                                GFG: {gfg} ({Math.round((gfg / totalVol) * 100)}%)
                              </span>
                            </div>
                          )}
                          {cf > 0 && (
                            <div className="border-2 border-slate-900 bg-white px-3 py-1.5 flex items-center gap-2 brutalist-shadow-sm">
                              <div className="w-3 h-3 bg-red-500 border-2 border-slate-900" />
                              <span className="text-xs font-black uppercase tracking-widest text-slate-900">
                                Codeforces: {cf} ({Math.round((cf / totalVol) * 100)}%)
                              </span>
                            </div>
                          )}
                          {cc > 0 && (
                            <div className="border-2 border-slate-900 bg-white px-3 py-1.5 flex items-center gap-2 brutalist-shadow-sm">
                              <div className="w-3 h-3 bg-purple-500 border-2 border-slate-900" />
                              <span className="text-xs font-black uppercase tracking-widest text-slate-900">
                                CodeChef: {cc} ({Math.round((cc / totalVol) * 100)}%)
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    <PlatformCard 
                      platform="Codeforces" 
                      href={profile.codeforces_handle ? `https://codeforces.com/profile/${profile.codeforces_handle}` : null}
                    >
                      <StatRow label="Rank" value={s.codeforces_rank_title || "Unrated"} />
                      <StatRow label="Rating" value={s.codeforces_rating || 0} />
                      <StatRow label="Max Rating" value={s.codeforces_max_rating || 0} />
                      <StatRow label="Solved" value={s.codeforces_solved || 0} />
                    </PlatformCard>
                    
                    <PlatformCard 
                      platform="CodeChef"
                      href={profile.codechef_handle ? `https://www.codechef.com/users/${profile.codechef_handle}` : null}
                    >
                      <StatRow label="Rating" value={s.codechef_rating || 0} />
                      <StatRow label="Max Rating" value={s.codechef_max_rating || 0} />
                      <StatRow label="Solved" value={s.codechef_solved || 0} />
                    </PlatformCard>

                    <PlatformCard 
                      platform="LeetCode"
                      href={profile.leetcode_handle ? `https://leetcode.com/u/${profile.leetcode_handle}/` : null}
                    >
                      <StatRow label="Total Solved" value={s.leetcode_total || 0} />
                      <StatRow label="Max Rating" value={s.leetcode_max_rating || 0} />
                    </PlatformCard>

                    <PlatformCard 
                      platform="GeeksForGeeks"
                      href={profile.gfg_handle ? `https://www.geeksforgeeks.org/user/${profile.gfg_handle}/` : null}
                    >
                      <StatRow label="Coding Score" value={s.gfg_score || 0} />
                      <StatRow label="Total Solved" value={s.gfg_solved || 0} />
                    </PlatformCard>

                    <PlatformCard 
                      platform="GitHub"
                      href={profile.github_handle ? (profile.github_url || `https://github.com/${profile.github_handle}`) : null}
                    >
                      <StatRow label="Contributions" value={s.github_contributions || 0} />
                    </PlatformCard>

                    <PlatformCard 
                      platform="HackerRank"
                      href={profile.hackerrank_handle ? `https://www.hackerrank.com/profile/${profile.hackerrank_handle}` : null}
                    >
                      <StatRow label="Badges" value={s.hackerrank_badges || 0} />
                    </PlatformCard>
                  </div>
                </div>
              </StaggerItem>
            )}

            {/* ── TOPIC ANALYTICS ── */}
            {sortedTopics.length > 0 && (
              <StaggerItem>
                <div className="border-4 border-slate-900 bg-white p-6 md:p-8 brutalist-shadow">
                  <div className="mb-6">
                    <Label>Analytics</Label>
                    <SectionTitle>Topic Breakdown</SectionTitle>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {sortedTopics.map(([topic, count]) => (
                      <TopicTag key={topic} topic={topic} count={count} />
                    ))}
                  </div>
                </div>
              </StaggerItem>
            )}

            {/* ── EARNED BADGES ── */}
            {s && (
              <StaggerItem>
                <div className="border-4 border-slate-900 bg-white p-6 md:p-8 brutalist-shadow">
                  <div className="mb-6">
                    <Label>Achievements</Label>
                    <SectionTitle>Earned Badges</SectionTitle>
                  </div>
                  {badges.length > 0 ? (
                    <div className="flex flex-wrap gap-4">
                      {badges.map((badge, idx) => (
                        <div key={idx} className="border-2 border-slate-900 px-4 py-2 flex flex-col justify-center bg-slate-100 brutalist-shadow-sm">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                            {badge.platform}
                          </span>
                          <span className="text-sm font-black uppercase tracking-tighter text-slate-900">
                            {badge.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="border-2 border-slate-300 border-dashed p-6 text-center">
                      <span className="text-sm font-black uppercase tracking-widest text-slate-400">
                        NO BADGES EARNED YET
                      </span>
                    </div>
                  )}
                </div>
              </StaggerItem>
            )}

            {/* ── NO SNAPSHOT FALLBACK ── */}
            {!s && (
              <StaggerItem>
                <div className="border-4 border-slate-300 bg-white p-12 text-center">
                  <span className="material-symbols-outlined text-5xl text-slate-300 mb-3 block">
                    hourglass_empty
                  </span>
                  <h3 className="text-xl font-black uppercase text-slate-400">
                    No Activity Data Yet
                  </h3>
                  <p className="text-slate-400 text-sm mt-2">
                    Stats will appear after the next scheduled sync.
                  </p>
                </div>
              </StaggerItem>
            )}

          </StaggerContainer>
        )}
      </main>
    </div>
  );
}
