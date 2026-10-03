import type { ClubStatsSummary } from "../../services/codexApi";

export default function ClubSkillDistribution({ stats }: { stats: ClubStatsSummary }) {
  const totalSkill = stats.total_fundamentals + stats.total_dsa + stats.total_cp;
  if (totalSkill === 0) return null;

  return (
    <div className="border-t-4 border-slate-900 p-6 md:p-10 bg-white text-slate-900">
      <div className="mb-6">
        <span className="bg-slate-900 text-white px-2 py-1 text-xs font-black uppercase tracking-widest mb-2 inline-block">Mastery</span>
        <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900 border-b-4 border-slate-900 pb-2">Club Skill Distribution</h3>
      </div>
      
      {/* Stacked Bar */}
      <div className="w-full flex h-12 md:h-16 border-4 border-slate-900 bg-slate-100 mb-4 brutalist-shadow-sm">
        {stats.total_fundamentals > 0 && (
          <div 
            className="bg-[#facc15] h-full flex items-center justify-center border-r-4 border-slate-900 last:border-r-0 transition-all duration-500 hover:brightness-110"
            style={{ width: `${(stats.total_fundamentals / totalSkill) * 100}%` }}
            title={`Fundamentals: ${stats.total_fundamentals}`}
          />
        )}
        {stats.total_dsa > 0 && (
          <div 
            className="bg-[#38bdf8] h-full flex items-center justify-center border-r-4 border-slate-900 last:border-r-0 transition-all duration-500 hover:brightness-110"
            style={{ width: `${(stats.total_dsa / totalSkill) * 100}%` }}
            title={`DSA: ${stats.total_dsa}`}
          />
        )}
        {stats.total_cp > 0 && (
          <div 
            className="bg-[#ef4444] h-full flex items-center justify-center border-r-4 border-slate-900 last:border-r-0 transition-all duration-500 hover:brightness-110"
            style={{ width: `${(stats.total_cp / totalSkill) * 100}%` }}
            title={`CP: ${stats.total_cp}`}
          />
        )}
      </div>
      
      {/* Legend */}
      <div className="flex flex-wrap gap-4 md:gap-8 mt-4">
        {stats.total_fundamentals > 0 && (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[#facc15] border-2 border-slate-900" />
            <div className="flex flex-col leading-none">
              <span className="text-xs font-black uppercase tracking-widest text-slate-900">Fundamentals</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase">{stats.total_fundamentals} problems ({Math.round((stats.total_fundamentals / totalSkill) * 100)}%)</span>
            </div>
          </div>
        )}
        {stats.total_dsa > 0 && (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[#38bdf8] border-2 border-slate-900" />
            <div className="flex flex-col leading-none">
              <span className="text-xs font-black uppercase tracking-widest text-slate-900">DSA</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase">{stats.total_dsa} problems ({Math.round((stats.total_dsa / totalSkill) * 100)}%)</span>
            </div>
          </div>
        )}
        {stats.total_cp > 0 && (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[#ef4444] border-2 border-slate-900" />
            <div className="flex flex-col leading-none">
              <span className="text-xs font-black uppercase tracking-widest text-slate-900">Competitive</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase">{stats.total_cp} problems ({Math.round((stats.total_cp / totalSkill) * 100)}%)</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
