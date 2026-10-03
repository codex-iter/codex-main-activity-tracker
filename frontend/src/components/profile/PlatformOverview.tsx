import { StaggerItem } from "../animations/ScrollReveal";
import type { MemberProfile, MemberSnapshot } from "../../services/codexApi";
import { Label, SectionTitle } from "./SharedStyles";
import { PlatformPill } from "./PlatformPill";
import { PlatformCard, StatRow } from "./PlatformCard";

export interface PlatformOverviewProps {
  profile: MemberProfile;
  stats: MemberSnapshot;
}

export function PlatformOverview({ profile, stats }: PlatformOverviewProps) {
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
            
            <div className="flex flex-wrap gap-4 mt-4">
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
        )}
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          <PlatformCard platform="Codeforces" href={profile.codeforces_handle ? `https://codeforces.com/profile/${profile.codeforces_handle}` : null}>
            <StatRow label="Rank" value={stats.codeforces_rating > 0 ? "Rated" : "Unrated"} />
            <StatRow label="Rating" value={stats.codeforces_rating || 0} />
            <StatRow label="Max Rating" value={stats.codeforces_max_rating || 0} />
            <StatRow label="Solved" value={stats.codeforces_solved || 0} />
          </PlatformCard>
          
          <PlatformCard platform="CodeChef" href={profile.codechef_handle ? `https://www.codechef.com/users/${profile.codechef_handle}` : null}>
            <StatRow label="Rating" value={stats.codechef_rating || 0} />
            <StatRow label="Max Rating" value={stats.codechef_max_rating || 0} />
            <StatRow label="Solved" value={stats.codechef_solved || 0} />
          </PlatformCard>

          <PlatformCard platform="LeetCode" href={profile.leetcode_handle ? `https://leetcode.com/u/${profile.leetcode_handle}/` : null}>
            <StatRow label="Total Solved" value={stats.leetcode_total || 0} />
            <StatRow label="Contest Rating" value={Math.round(stats.leetcode_rating) || 0} />
            <StatRow label="Max Rating" value={Math.round(stats.leetcode_max_rating) || 0} />
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
