import type { ClubStatsSummary } from "../../services/codexApi";

export default function ClubCommandCenter({ stats }: { stats: ClubStatsSummary }) {
  return (
    <div className="bg-[#0707f2] border-4 border-slate-900 brutalist-shadow flex flex-col">
      <div className="p-6 md:p-10 text-white flex flex-col md:flex-row items-center gap-8 md:gap-12 justify-between">
        <div>
          <h2 className="text-lg font-bold uppercase tracking-widest text-slate-300 mb-2">Club Command Center</h2>
          <div className="text-6xl md:text-8xl font-black leading-none uppercase tracking-tighter">
            {stats.total_club_solved}
          </div>
          <div className="text-sm font-bold uppercase tracking-widest text-slate-300 mt-2">
            Total Problems Solved
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 w-full md:w-auto">
          <div className="border-2 border-white/20 p-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-300 mb-1">Contests</div>
            <div className="text-2xl font-black leading-none">{stats.total_club_contests}</div>
            <div className="text-[8px] font-bold uppercase tracking-widest text-slate-400 mt-1">Fought</div>
          </div>
          <div className="border-2 border-white/20 p-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-300 mb-1">LeetCode</div>
            <div className="text-2xl font-black leading-none">{stats.total_leetcode}</div>
          </div>
          <div className="border-2 border-white/20 p-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-300 mb-1">GeeksForGeeks</div>
            <div className="text-2xl font-black leading-none">{stats.total_gfg}</div>
          </div>
          <div className="border-2 border-white/20 p-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-300 mb-1">Codeforces</div>
            <div className="text-2xl font-black leading-none">{stats.total_codeforces}</div>
          </div>
          <div className="border-2 border-white/20 p-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-300 mb-1">CodeChef</div>
            <div className="text-2xl font-black leading-none">{stats.total_codechef}</div>
          </div>
          <div className="border-2 border-white/20 p-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-300 mb-1">HackerRank</div>
            <div className="text-2xl font-black leading-none">{stats.total_hackerrank_badges}</div>
            <div className="text-[8px] font-bold uppercase tracking-widest text-slate-400 mt-1">Badges</div>
          </div>
        </div>
      </div>
    </div>
  );
}
