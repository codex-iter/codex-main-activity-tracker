import { StaggerItem } from "../animations/ScrollReveal";
import type { DerivedStats } from "../../hooks/useMemberProfile";
import { Label, SectionTitle } from "./SharedStyles";

export function SkillDistribution({ derived }: { derived: DerivedStats }) {
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
