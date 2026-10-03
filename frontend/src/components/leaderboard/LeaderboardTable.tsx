import { ScrollReveal, StaggerContainer, StaggerItem } from "../animations/ScrollReveal";
import LeaderboardRow from "./LeaderboardRow";
import type { LeaderboardMember } from "../../hooks/useLeaderboard";

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

interface LeaderboardTableProps {
  members: LeaderboardMember[];
  loading: boolean;
  error: string | null;
}

export default function LeaderboardTable({ members, loading, error }: LeaderboardTableProps) {
  if (loading) return <LeaderboardSkeleton />;
  if (error) return <ErrorState message={error} />;
  if (members.length === 0) return <EmptyState />;

  return (
    <div className="space-y-3">
      {/* ── Column header (desktop) ── */}
      <ScrollReveal delay={0.1}>
        <div className="hidden sm:flex items-center gap-4 px-4 pb-2 mb-2">
          <div className="w-10 text-center text-[11px] font-bold uppercase tracking-widest text-slate-400">#</div>
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

      <StaggerContainer className="space-y-3">
        {members.map((member, idx) => (
          <StaggerItem key={member.id}>
            <LeaderboardRow member={member} rank={idx + 1} />
          </StaggerItem>
        ))}
      </StaggerContainer>
    </div>
  );
}
