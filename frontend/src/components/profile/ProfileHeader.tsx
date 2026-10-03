import { StaggerItem } from "../animations/ScrollReveal";
import type { MemberProfile } from "../../services/codexApi";

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

export function ProfileHeader({ profile }: { profile: MemberProfile }) {
  return (
    <StaggerItem>
      <div className="bg-background-dark border-4 border-slate-900 p-6 md:p-10 brutalist-shadow flex flex-col sm:flex-row gap-6 items-start">
        <div className="flex-shrink-0 w-24 h-24 border-4 border-white overflow-hidden bg-slate-700">
          <img
            src={avatar(profile)}
            alt={`${profile.full_name} avatar`}
            loading="lazy"
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
