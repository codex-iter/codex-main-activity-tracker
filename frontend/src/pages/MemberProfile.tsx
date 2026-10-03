import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { GitHubCalendar } from "react-github-calendar";
import { ScrollReveal, StaggerContainer, StaggerItem } from "../components/animations/ScrollReveal";
import SEO from "../components/SEO";
import { type MemberProfile } from "../services/codexApi";
import { useMemberProfile } from "../hooks/useMemberProfile";

import { MetricCard } from "../components/profile/MetricCard";
import { PlatformCard, StatRow } from "../components/profile/PlatformCard";
import { PlatformPill } from "../components/profile/PlatformPill";
import { DiffBar } from "../components/profile/DiffBar";
import { TopicTag } from "../components/profile/TopicTag";
import { ProfileSkeleton, NotFound, ErrorState } from "../components/profile/ProfileStates";

// ── Helpers ────────────────────────────────────────────────────────────────

function avatar(member: MemberProfile) {
  return (
    member.avatar_url ??
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
      member.full_name ?? "?"
    )}&backgroundColor=0707f2&textColor=ffffff`
  );
}

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

// ── Section Modules ────────────────────────────────────────────────────────

function ProfileHeader({ profile }: { profile: MemberProfile }) {
  return (
    <StaggerItem>
      <div className="bg-background-dark border-4 border-slate-900 p-6 md:p-10 brutalist-shadow flex flex-col sm:flex-row gap-6 items-start">
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
          <div className="flex flex-wrap gap-3 mt-4">
            {profile.github_handle && (
              <a href={profile.github_url || `https://github.com/${profile.github_handle}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 border-2 border-white/30 bg-slate-800 px-3 py-1.5 text-xs font-black text-white uppercase tracking-widest hover:bg-white hover:text-slate-900 transition-colors">
                <span className="material-symbols-outlined text-base leading-none">code</span>GitHub
              </a>
            )}
            {profile.linkedin_url && (
              <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 border-2 border-white/30 bg-slate-800 px-3 py-1.5 text-xs font-black text-white uppercase tracking-widest hover:bg-white hover:text-slate-900 transition-colors">
                <span className="material-symbols-outlined text-base leading-none">work</span>LinkedIn
              </a>
            )}
            {profile.portfolio_url && (
              <a href={profile.portfolio_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 border-2 border-white/30 bg-slate-800 px-3 py-1.5 text-xs font-black text-white uppercase tracking-widest hover:bg-white hover:text-slate-900 transition-colors">
                <span className="material-symbols-outlined text-base leading-none">language</span>Portfolio
              </a>
            )}
          </div>
        </div>
      </div>
    </StaggerItem>
  );
}

function HeroMetrics({ stats, derived }: { stats: any, derived: any }) {
  if (!stats) return null;
  return (
    <StaggerItem>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-[#0707f2] text-white border-4 border-slate-900 p-5 brutalist-shadow flex flex-col justify-between min-h-[110px] hover:-translate-y-1 hover:-translate-x-1 transition-transform">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">Total Solved</span>
          <div className="flex items-end gap-1 mt-2">
            <span className="text-4xl font-black leading-none">{derived.individualTotalSolved}</span>
          </div>
        </div>
        <MetricCard label="Total Score" value={Math.round(stats.total_score)} accent />
        <MetricCard label="Current Streak" value={stats.current_streak} unit="days" />
        <MetricCard label="Max Streak" value={stats.max_streak} unit="days" />
        <MetricCard label="Active Days" value={stats.active_days} unit="days" />
      </div>
    </StaggerItem>
  );
}

function SkillDistribution({ derived }: { derived: any }) {
  if (derived.totalSkill === 0) return null;
  return (
    <StaggerItem>
      <div className="border-4 border-slate-900 bg-white p-6 md:p-8 brutalist-shadow">
        <div className="mb-6">
          <Label>Mastery</Label>
          <SectionTitle>Skill Distribution</SectionTitle>
        </div>
        
        <div className="w-full flex h-12 md:h-16 border-4 border-slate-900 bg-slate-100 mb-4 brutalist-shadow-sm">
          {derived.skillFundamentals > 0 && (
            <div className="bg-[#facc15] h-full flex items-center justify-center border-r-4 border-slate-900 last:border-r-0 transition-all duration-500 hover:brightness-110" style={{ width: `${(derived.skillFundamentals / derived.totalSkill) * 100}%` }} title={`Fundamentals: ${derived.skillFundamentals}`} />
          )}
          {derived.skillDsa > 0 && (
            <div className="bg-[#38bdf8] h-full flex items-center justify-center border-r-4 border-slate-900 last:border-r-0 transition-all duration-500 hover:brightness-110" style={{ width: `${(derived.skillDsa / derived.totalSkill) * 100}%` }} title={`DSA: ${derived.skillDsa}`} />
          )}
          {derived.skillCp > 0 && (
            <div className="bg-[#ef4444] h-full flex items-center justify-center border-r-4 border-slate-900 last:border-r-0 transition-all duration-500 hover:brightness-110" style={{ width: `${(derived.skillCp / derived.totalSkill) * 100}%` }} title={`CP: ${derived.skillCp}`} />
          )}
        </div>
        
        <div className="flex flex-wrap gap-4 md:gap-8 mt-4">
          {derived.skillFundamentals > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-[#facc15] border-2 border-slate-900" />
              <div className="flex flex-col leading-none">
                <span className="text-xs font-black uppercase tracking-widest text-slate-900">Fundamentals</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase">{derived.skillFundamentals} problems ({Math.round((derived.skillFundamentals / derived.totalSkill) * 100)}%)</span>
              </div>
            </div>
          )}
          {derived.skillDsa > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-[#38bdf8] border-2 border-slate-900" />
              <div className="flex flex-col leading-none">
                <span className="text-xs font-black uppercase tracking-widest text-slate-900">DSA</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase">{derived.skillDsa} problems ({Math.round((derived.skillDsa / derived.totalSkill) * 100)}%)</span>
              </div>
            </div>
          )}
          {derived.skillCp > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-[#ef4444] border-2 border-slate-900" />
              <div className="flex flex-col leading-none">
                <span className="text-xs font-black uppercase tracking-widest text-slate-900">Competitive</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase">{derived.skillCp} problems ({Math.round((derived.skillCp / derived.totalSkill) * 100)}%)</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </StaggerItem>
  );
}

function ContestRankings({ stats }: { stats: any }) {
  if (!stats) return null;
  return (
    <StaggerItem>
      <div className="border-4 border-slate-900 bg-white p-6 md:p-8 brutalist-shadow">
        <div className="mb-6">
          <Label>Competitive</Label>
          <SectionTitle>Contest Rankings</SectionTitle>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border-4 border-slate-900 p-5 flex flex-col items-center justify-center text-center brutalist-shadow-sm hover:-translate-y-1 transition-transform bg-white">
            <span className="text-sm font-black uppercase tracking-widest text-slate-500 mb-2">LeetCode</span>
            <span className={`font-black leading-none ${stats.leetcode_rating ? 'text-6xl text-slate-900' : 'text-5xl text-slate-400'}`}>
              {stats.leetcode_rating || "UNRATED"}
            </span>
            {stats.leetcode_max_rating > 0 && (
              <span className="text-xs font-bold uppercase text-slate-500 mt-2">
                (max: {stats.leetcode_max_rating})
              </span>
            )}
            <div className="mt-4 pt-3 border-t-2 border-slate-200 w-full">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Contests Fought</span>
              <span className="text-xl font-black text-slate-900 leading-none">{stats.leetcode_contests || 0}</span>
            </div>
          </div>
          <div className="border-4 border-slate-900 p-5 flex flex-col items-center justify-center text-center brutalist-shadow-sm hover:-translate-y-1 transition-transform bg-white">
            <span className="text-sm font-black uppercase tracking-widest text-slate-500 mb-2">CodeChef</span>
            <span className={`font-black leading-none ${stats.codechef_rating ? 'text-6xl text-slate-900' : 'text-5xl text-slate-400'}`}>
              {stats.codechef_rating || "UNRATED"}
            </span>
            {stats.codechef_max_rating > 0 && (
              <span className="text-xs font-bold uppercase text-slate-500 mt-2">
                (max: {stats.codechef_max_rating})
              </span>
            )}
            <div className="mt-4 pt-3 border-t-2 border-slate-200 w-full">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Contests Fought</span>
              <span className="text-xl font-black text-slate-900 leading-none">{stats.codechef_contests || 0}</span>
            </div>
          </div>
          <div className="border-4 border-slate-900 p-5 flex flex-col items-center justify-center text-center brutalist-shadow-sm hover:-translate-y-1 transition-transform bg-white">
            <span className="text-sm font-black uppercase tracking-widest text-slate-500 mb-2">Codeforces</span>
            <span className={`font-black leading-none ${stats.codeforces_rating ? 'text-6xl text-slate-900' : 'text-5xl text-slate-400'}`}>
              {stats.codeforces_rating || "UNRATED"}
            </span>
            {stats.codeforces_max_rating > 0 && (
              <span className="text-xs font-bold uppercase text-slate-500 mt-2">
                (max: {stats.codeforces_max_rating})
              </span>
            )}
            <div className="mt-4 pt-3 border-t-2 border-slate-200 w-full">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Contests Fought</span>
              <span className="text-xl font-black text-slate-900 leading-none">{stats.codeforces_contests || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </StaggerItem>
  );
}

function DifficultyBreakdown({ stats, derived }: { stats: any, derived: any }) {
  if (!stats || (derived.lcTotal === 0 && derived.gfgTotal === 0)) return null;
  return (
    <StaggerItem>
      <div className="border-4 border-slate-900 bg-white p-6 md:p-8 brutalist-shadow">
        <div className="grid md:grid-cols-2 gap-10">
          {derived.lcTotal > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-5">
                <SectionTitle>LeetCode</SectionTitle>
                <span className="text-sm font-black text-slate-400">{derived.lcTotal} solved</span>
              </div>
              <div className="space-y-3">
                <DiffBar label="Easy" value={stats.leetcode_easy} total={derived.lcTotal} color="bg-emerald-500" />
                <DiffBar label="Medium" value={stats.leetcode_medium} total={derived.lcTotal} color="bg-yellow-400" />
                <DiffBar label="Hard" value={stats.leetcode_hard} total={derived.lcTotal} color="bg-red-500" />
              </div>
              <div className="flex gap-2 flex-wrap mt-5">
                {[
                  { l: "Easy", v: stats.leetcode_easy, cls: "bg-emerald-100 text-emerald-800 border-emerald-400" },
                  { l: "Medium", v: stats.leetcode_medium, cls: "bg-yellow-100 text-yellow-800 border-yellow-400" },
                  { l: "Hard", v: stats.leetcode_hard, cls: "bg-red-100 text-red-800 border-red-400" },
                ].map(({ l, v, cls }) => (
                  <span key={l} className={`border-2 px-3 py-1 text-xs font-black uppercase ${cls}`}>
                    {l}: {v}
                  </span>
                ))}
              </div>
            </div>
          )}
          {derived.gfgTotal > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-5">
                <SectionTitle>GFG</SectionTitle>
                <span className="text-sm font-black text-slate-400">{derived.gfgTotal} solved</span>
              </div>
              <div className="space-y-3">
                <DiffBar label="School" value={stats.gfg_school} total={derived.gfgTotal} color="bg-sky-400" />
                <DiffBar label="Basic" value={stats.gfg_basic} total={derived.gfgTotal} color="bg-emerald-400" />
                <DiffBar label="Easy" value={stats.gfg_easy} total={derived.gfgTotal} color="bg-emerald-600" />
                <DiffBar label="Medium" value={stats.gfg_medium} total={derived.gfgTotal} color="bg-yellow-400" />
                <DiffBar label="Hard" value={stats.gfg_hard} total={derived.gfgTotal} color="bg-red-500" />
              </div>
            </div>
          )}
        </div>
      </div>
    </StaggerItem>
  );
}

function OpenSourceContributions({ handle }: { handle: string | null }) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; activity: any } | null>(null);

  return (
    <StaggerItem>
      <div className="border-4 border-slate-900 bg-white p-6 md:p-8 brutalist-shadow">
        <div className="mb-6">
          <Label>Open Source</Label>
          <SectionTitle>Contributions</SectionTitle>
        </div>
        {handle ? (
          <div className="border-4 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] p-6 md:p-8 overflow-x-auto bg-white flex justify-center w-full min-w-0">
            <GitHubCalendar 
              username={handle} 
              colorScheme="light"
              theme={{ light: ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"] }}
              style={{ fontFamily: "'Space Grotesk', sans-serif", width: "100%" }}
              renderBlock={(block, activity) =>
                React.cloneElement(block as any, {
                  onMouseEnter: (e: React.MouseEvent) => {
                    const rect = (e.target as Element).getBoundingClientRect();
                    setTooltip({ x: rect.left + rect.width / 2, y: rect.top, activity });
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
            <span className="text-sm font-black uppercase tracking-widest text-slate-400">NO GITHUB HANDLE LINKED</span>
          </div>
        )}
        
        {tooltip && (
          <div className="fixed z-[100] pointer-events-none -translate-x-1/2 -translate-y-[120%]" style={{ left: tooltip.x, top: tooltip.y }}>
            <div className="bg-slate-900 text-white font-mono uppercase text-xs tracking-wider border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] px-3 py-2 z-50 flex flex-col items-center text-center whitespace-nowrap">
              <span className="border-b-2 border-slate-700 pb-1 mb-1 w-full text-slate-400">
                {new Date(tooltip.activity.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}
              </span>
              <span className="font-bold">{tooltip.activity.count} PROBLEMS</span>
            </div>
          </div>
        )}
      </div>
    </StaggerItem>
  );
}

function AchievementsAndBadges({ badges }: { badges: any[] }) {
  return (
    <StaggerItem>
      <div className="border-4 border-slate-900 bg-white p-6 md:p-8 brutalist-shadow">
        <div className="mb-6 flex justify-between items-end gap-4 flex-wrap">
          <div>
            <Label>Rewards</Label>
            <SectionTitle>Achievements & Badges</SectionTitle>
          </div>
        </div>
        {badges.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {badges.map((badge, idx) => (
              <div key={`${badge.platform}-${badge.id}-${idx}`} className="border-4 border-slate-900 bg-white p-4 flex flex-col items-center justify-center text-center brutalist-shadow-sm hover:-translate-y-1 transition-transform group">
                {badge.icon ? (
                  <img src={badge.icon} alt={badge.name} className="w-16 h-16 object-contain mb-3 group-hover:scale-110 transition-transform" />
                ) : (
                  <div className="w-16 h-16 bg-slate-100 border-2 border-slate-900 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-3xl text-slate-400">workspace_premium</span>
                  </div>
                )}
                <span className="text-xs font-black uppercase tracking-tight text-slate-900 leading-tight">
                  {badge.name}
                </span>
                <span className="text-[10px] font-bold text-slate-500 uppercase mt-1">
                  {badge.platform}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="border-4 border-slate-900 border-dashed p-8 text-center bg-slate-50">
            <span className="material-symbols-outlined text-4xl text-slate-300 mb-2 block">military_tech</span>
            <span className="text-sm font-black uppercase tracking-widest text-slate-400">
              No Badges Earned Yet
            </span>
          </div>
        )}
      </div>
    </StaggerItem>
  );
}

function PlatformOverview({ profile, stats }: { profile: MemberProfile, stats: any }) {
  if (!stats) return null;
  const lc = stats.leetcode_total || 0;
  const gfg = stats.gfg_solved || 0;
  const cf = stats.codeforces_solved || 0;
  const cc = stats.codechef_solved || 0;
  const totalVol = lc + gfg + cf + cc;

  return (
    <StaggerItem>
      <div className="border-4 border-slate-900 bg-white p-6 md:p-8 brutalist-shadow">
        <div className="mb-6 flex justify-between items-end gap-4 flex-wrap">
          <div>
            <Label>Platforms</Label>
            <SectionTitle>Platform Overview</SectionTitle>
          </div>
          <div className="flex gap-2">
            <PlatformPill platform="Contests" value={stats.contests_attended ?? 0} />
          </div>
        </div>

        {totalVol > 0 && (
          <div className="mb-10">
            <h4 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-3">Solved Volume By Platform</h4>
            <div className="w-full flex h-12 md:h-16 border-4 border-slate-900 bg-slate-100 mb-4 brutalist-shadow-sm cursor-crosshair">
              {lc > 0 && <div className="bg-yellow-400 h-full flex items-center justify-center border-r-4 border-slate-900 last:border-r-0 transition-all hover:brightness-110" style={{ width: `${(lc / totalVol) * 100}%` }} title={`LeetCode: ${lc}`} />}
              {gfg > 0 && <div className="bg-green-500 h-full flex items-center justify-center border-r-4 border-slate-900 last:border-r-0 transition-all hover:brightness-110" style={{ width: `${(gfg / totalVol) * 100}%` }} title={`GeeksForGeeks: ${gfg}`} />}
              {cf > 0 && <div className="bg-red-500 h-full flex items-center justify-center border-r-4 border-slate-900 last:border-r-0 transition-all hover:brightness-110" style={{ width: `${(cf / totalVol) * 100}%` }} title={`Codeforces: ${cf}`} />}
              {cc > 0 && <div className="bg-purple-500 h-full flex items-center justify-center border-r-4 border-slate-900 last:border-r-0 transition-all hover:brightness-110" style={{ width: `${(cc / totalVol) * 100}%` }} title={`CodeChef: ${cc}`} />}
            </div>
            <div className="flex flex-wrap gap-3">
              {lc > 0 && (
                <div className="border-2 border-slate-900 bg-white px-3 py-1.5 flex items-center gap-2 brutalist-shadow-sm">
                  <div className="w-3 h-3 bg-yellow-400 border-2 border-slate-900" />
                  <span className="text-xs font-black uppercase tracking-widest text-slate-900">LeetCode: {lc} ({Math.round((lc / totalVol) * 100)}%)</span>
                </div>
              )}
              {gfg > 0 && (
                <div className="border-2 border-slate-900 bg-white px-3 py-1.5 flex items-center gap-2 brutalist-shadow-sm">
                  <div className="w-3 h-3 bg-green-500 border-2 border-slate-900" />
                  <span className="text-xs font-black uppercase tracking-widest text-slate-900">GFG: {gfg} ({Math.round((gfg / totalVol) * 100)}%)</span>
                </div>
              )}
              {cf > 0 && (
                <div className="border-2 border-slate-900 bg-white px-3 py-1.5 flex items-center gap-2 brutalist-shadow-sm">
                  <div className="w-3 h-3 bg-red-500 border-2 border-slate-900" />
                  <span className="text-xs font-black uppercase tracking-widest text-slate-900">Codeforces: {cf} ({Math.round((cf / totalVol) * 100)}%)</span>
                </div>
              )}
              {cc > 0 && (
                <div className="border-2 border-slate-900 bg-white px-3 py-1.5 flex items-center gap-2 brutalist-shadow-sm">
                  <div className="w-3 h-3 bg-purple-500 border-2 border-slate-900" />
                  <span className="text-xs font-black uppercase tracking-widest text-slate-900">CodeChef: {cc} ({Math.round((cc / totalVol) * 100)}%)</span>
                </div>
              )}
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          <PlatformCard platform="Codeforces" href={profile.codeforces_handle ? `https://codeforces.com/profile/${profile.codeforces_handle}` : null}>
            <StatRow label="Rank" value={stats.codeforces_rank_title || "Unrated"} />
            <StatRow label="Rating" value={stats.codeforces_rating || 0} />
            <StatRow label="Max Rating" value={stats.codeforces_max_rating || 0} />
            <StatRow label="Solved" value={stats.codeforces_solved || 0} />
          </PlatformCard>
          <PlatformCard platform="LeetCode" href={profile.leetcode_handle ? `https://leetcode.com/u/${profile.leetcode_handle}` : null}>
            <StatRow label="Total Solved" value={stats.leetcode_total || 0} />
            <StatRow label="Contest Rating" value={Math.round(stats.leetcode_rating || 0)} />
            <StatRow label="Max Rating" value={Math.round(stats.leetcode_max_rating || 0)} />
          </PlatformCard>
          <PlatformCard platform="CodeChef" href={profile.codechef_handle ? `https://www.codechef.com/users/${profile.codechef_handle}` : null}>
            <StatRow label="Rating" value={stats.codechef_rating || 0} />
            <StatRow label="Max Rating" value={stats.codechef_max_rating || 0} />
            <StatRow label="Solved" value={stats.codechef_solved || 0} />
          </PlatformCard>
          <PlatformCard platform="GeeksForGeeks" href={profile.gfg_handle ? `https://auth.geeksforgeeks.org/user/${profile.gfg_handle}` : null}>
            <StatRow label="Score" value={stats.gfg_score || 0} />
            <StatRow label="Solved" value={stats.gfg_solved || 0} />
            <StatRow label="Coding Score" value={stats.gfg_score || 0} />
          </PlatformCard>
          <PlatformCard platform="GitHub" href={profile.github_handle ? (profile.github_url || `https://github.com/${profile.github_handle}`) : null}>
            <StatRow label="Contributions" value={stats.github_contributions || 0} />
          </PlatformCard>
          <PlatformCard platform="HackerRank" href={profile.hackerrank_handle ? `https://www.hackerrank.com/profile/${profile.hackerrank_handle}` : null}>
            <StatRow label="Badges" value={stats.hackerrank_badges || 0} />
          </PlatformCard>
        </div>
      </div>
    </StaggerItem>
  );
}

function TopicBreakdown({ sortedTopics }: { sortedTopics: [string, number][] }) {
  if (sortedTopics.length === 0) return null;
  return (
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
  );
}

// ── Page Main Component ───────────────────────────────────────────────────

export default function MemberProfile() {
  const { handle = "" } = useParams<{ handle: string }>();
  const {
    profile,
    latestSnapshot,
    loading,
    error,
    derivedStats,
    sortedTopics,
    badges,
  } = useMemberProfile(handle);

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
            <ProfileHeader profile={profile} />

            {!latestSnapshot && (
              <StaggerItem>
                <div className="border-4 border-slate-300 bg-white p-12 text-center mt-12">
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

            {latestSnapshot && (
              <>
                <HeroMetrics stats={latestSnapshot} derived={derivedStats} />
                <SkillDistribution derived={derivedStats} />
                <ContestRankings stats={latestSnapshot} />
                <DifficultyBreakdown stats={latestSnapshot} derived={derivedStats} />
                <OpenSourceContributions handle={profile.github_handle} />
                <AchievementsAndBadges badges={badges} />
                <PlatformOverview profile={profile} stats={latestSnapshot} />
                <TopicBreakdown sortedTopics={sortedTopics} />
              </>
            )}
          </StaggerContainer>
        )}
      </main>
    </div>
  );
}
