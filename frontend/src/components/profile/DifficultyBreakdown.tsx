import { StaggerItem } from "../animations/ScrollReveal";
import type { MemberSnapshot } from "../../services/codexApi";
import type { DerivedStats } from "../../hooks/useMemberProfile";
import { SectionTitle } from "./SharedStyles";
import { DiffBar } from "./DiffBar";

export interface DifficultyBreakdownProps {
  stats: MemberSnapshot;
  derived: DerivedStats;
}

export function DifficultyBreakdown({ stats, derived }: DifficultyBreakdownProps) {
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
