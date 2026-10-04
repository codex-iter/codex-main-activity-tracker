import { useEffect, useState } from "react";
import { getMonthlyLeaderboard } from "../services/codexApi";
import type { MonthlyLeaderboardEntry } from "../services/codexApi";

export default function Arena() {
  const [data, setData] = useState<MonthlyLeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await getMonthlyLeaderboard();
        setData(res);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const now = new Date();
  const monthName = now.toLocaleString("default", { month: "long" }).toUpperCase();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const diff = endOfMonth.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diff / (1000 * 3600 * 24));

  const dsaSorted = [...data].sort((a, b) => (b.monthly_dsa_score || 0) - (a.monthly_dsa_score || 0));
  const devSorted = [...data].sort((a, b) => (b.monthly_dev_score || 0) - (a.monthly_dev_score || 0));

  return (
    <div className="min-h-screen bg-black text-white font-mono p-6 sm:p-12 pb-24 relative selection:bg-red-600 selection:text-white">
      {/* Background Web/Grid Texture */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ef444415_1px,transparent_1px),linear-gradient(to_bottom,#ef444415_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

      {/* Header Section */}
      <div className="max-w-7xl mx-auto mb-16 border-8 border-red-600 p-8 sm:p-12 shadow-[12px_12px_0px_0px_rgba(220,38,38,1)] bg-black relative overflow-hidden rounded-none z-10">
        <div className="absolute -right-10 -top-10 opacity-20 rotate-12 pointer-events-none">
          <span className="material-symbols-outlined text-[400px] text-red-600">swords</span>
        </div>
        <div className="relative z-10">
          <h1 className="text-5xl sm:text-8xl font-black text-white tracking-tighter uppercase mb-8 font-sans">
            THE ARENA: <span className="text-red-600">{monthName}</span>
          </h1>
          <div className="inline-block bg-red-600 text-black font-black px-8 py-4 text-2xl sm:text-3xl border-4 border-red-950 shadow-[6px_6px_0px_0px_rgba(153,27,27,1)] rounded-none font-mono">
            TIME REMAINING: {daysRemaining} DAYS
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center text-red-600 font-black text-5xl animate-pulse uppercase tracking-widest mt-32 font-sans relative z-10">
          ENTERING THE ARENA...
        </div>
      ) : (
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 relative z-10">
          {/* Column 1: Algorithms */}
          <div className="flex flex-col gap-8">
            <h2 className="text-5xl font-black text-red-600 border-b-8 border-red-600 pb-4 uppercase tracking-tighter font-sans">
              ALGORITHMS
            </h2>
            <div className="flex flex-col gap-6">
              {dsaSorted.map((member, idx) => {
                const isChamp = idx === 0 && (member.monthly_dsa_score || 0) > 0;
                return (
                  <div
                    key={member.member_id}
                    className={`p-6 flex items-center justify-between transition-transform rounded-none ${
                      isChamp
                        ? "border-8 border-red-600 bg-red-600 text-black shadow-[12px_12px_0px_0px_rgba(153,27,27,1)] scale-105 z-10"
                        : "border-4 border-slate-900 bg-black shadow-[6px_6px_0px_0px_rgba(220,38,38,0.5)] hover:-translate-y-1 hover:border-red-600"
                    }`}
                  >
                    <div className="flex items-center gap-6">
                      <div
                        className={`text-4xl font-black w-14 text-center font-mono ${
                          isChamp ? "text-black" : "text-slate-600"
                        }`}
                      >
                        #{idx + 1}
                      </div>
                      <div>
                        <div className="font-bold text-2xl truncate max-w-[160px] sm:max-w-[260px] uppercase font-sans">
                          {member.full_name}
                        </div>
                        <div className={`text-base font-black font-mono mt-1 ${isChamp ? "text-red-950" : "text-slate-400"}`}>
                          SOLVED: {member.monthly_problems_solved || 0}
                        </div>
                      </div>
                    </div>
                    <div className={`text-5xl font-black font-mono ${isChamp ? "text-black" : "text-white"}`}>
                      {Math.floor(member.monthly_dsa_score || 0)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Column 2: Development */}
          <div className="flex flex-col gap-8">
            <h2 className="text-5xl font-black text-cyan-400 border-b-8 border-cyan-400 pb-4 uppercase tracking-tighter font-sans">
              DEVELOPMENT
            </h2>
            <div className="flex flex-col gap-6">
              {devSorted.map((member, idx) => {
                const isChamp = idx === 0 && (member.monthly_dev_score || 0) > 0;
                return (
                  <div
                    key={member.member_id}
                    className={`p-6 flex items-center justify-between transition-transform rounded-none ${
                      isChamp
                        ? "border-8 border-cyan-400 bg-cyan-400 text-black shadow-[12px_12px_0px_0px_rgba(8,145,178,1)] scale-105 z-10"
                        : "border-4 border-slate-900 bg-black shadow-[6px_6px_0px_0px_rgba(34,211,238,0.5)] hover:-translate-y-1 hover:border-cyan-400"
                    }`}
                  >
                    <div className="flex items-center gap-6">
                      <div
                        className={`text-4xl font-black w-14 text-center font-mono ${
                          isChamp ? "text-black" : "text-slate-600"
                        }`}
                      >
                        #{idx + 1}
                      </div>
                      <div>
                        <div className="font-bold text-2xl truncate max-w-[160px] sm:max-w-[260px] uppercase font-sans">
                          {member.full_name}
                        </div>
                        <div className={`text-base font-black font-mono mt-1 ${isChamp ? "text-cyan-950" : "text-slate-400"}`}>
                          COMMITS: {member.monthly_commits || 0} | PRS: {member.monthly_prs || 0}
                        </div>
                      </div>
                    </div>
                    <div className={`text-5xl font-black font-mono ${isChamp ? "text-black" : "text-white"}`}>
                      {Math.floor(member.monthly_dev_score || 0)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
