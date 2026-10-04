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
    <div className="min-h-screen bg-background-light font-display p-6 sm:p-12 pb-24 relative selection:bg-black selection:text-white">
      {/* Header Section */}
      <div className="max-w-7xl mx-auto mb-16 border-4 border-black p-8 sm:p-12 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white relative overflow-hidden rounded-none z-10">
        <div className="absolute -right-10 -top-10 opacity-5 rotate-12 pointer-events-none">
          <span className="material-symbols-outlined text-[400px] text-black">swords</span>
        </div>
        <div className="relative z-10">
          <h1 className="text-5xl sm:text-8xl font-black text-black tracking-tighter uppercase mb-8">
            THE ARENA: <span className="text-red-500">{monthName}</span>
          </h1>
          <div className="inline-block bg-white text-black font-black px-8 py-4 text-2xl sm:text-3xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-none">
            TIME REMAINING: {daysRemaining} DAYS
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center text-black font-black text-5xl animate-pulse uppercase tracking-widest mt-32 relative z-10">
          ENTERING THE ARENA...
        </div>
      ) : (
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 relative z-10">
          {/* Column 1: Algorithms */}
          <div className="flex flex-col gap-8">
            <h2 className="text-5xl font-black text-red-500 border-b-8 border-red-500 pb-4 uppercase tracking-tighter">
              ALGORITHMS
            </h2>
            <div className="flex flex-col gap-6">
              {dsaSorted.map((member, idx) => {
                const isChamp = idx === 0 && (member.monthly_dsa_score || 0) > 0;
                return (
                  <div
                    key={member.member_id}
                    className={`p-6 flex items-center justify-between transition-transform rounded-none border-4 border-black ${
                      isChamp
                        ? "bg-red-500 text-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] scale-105 z-10"
                        : "bg-white text-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
                    }`}
                  >
                    <div className="flex items-center gap-6">
                      <div
                        className={`text-4xl font-black w-14 text-center ${
                          isChamp ? "text-white" : "text-slate-500"
                        }`}
                      >
                        #{idx + 1}
                      </div>
                      <div>
                        <div className="font-bold text-2xl truncate max-w-[160px] sm:max-w-[260px] uppercase">
                          {member.full_name}
                        </div>
                        <div className={`text-base font-bold mt-1 ${isChamp ? "text-white" : "text-slate-500"}`}>
                          SOLVED: {member.monthly_problems_solved || 0}
                        </div>
                      </div>
                    </div>
                    <div className="text-5xl font-black">
                      {Math.floor(member.monthly_dsa_score || 0)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Column 2: Development */}
          <div className="flex flex-col gap-8">
            <h2 className="text-5xl font-black text-blue-600 border-b-8 border-blue-600 pb-4 uppercase tracking-tighter">
              DEVELOPMENT
            </h2>
            <div className="flex flex-col gap-6">
              {devSorted.map((member, idx) => {
                const isChamp = idx === 0 && (member.monthly_dev_score || 0) > 0;
                return (
                  <div
                    key={member.member_id}
                    className={`p-6 flex items-center justify-between transition-transform rounded-none border-4 border-black ${
                      isChamp
                        ? "bg-blue-600 text-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] scale-105 z-10"
                        : "bg-white text-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
                    }`}
                  >
                    <div className="flex items-center gap-6">
                      <div
                        className={`text-4xl font-black w-14 text-center ${
                          isChamp ? "text-white" : "text-slate-500"
                        }`}
                      >
                        #{idx + 1}
                      </div>
                      <div>
                        <div className="font-bold text-2xl truncate max-w-[160px] sm:max-w-[260px] uppercase">
                          {member.full_name}
                        </div>
                        <div className={`text-base font-bold mt-1 ${isChamp ? "text-white" : "text-slate-500"}`}>
                          COMMITS: {member.monthly_commits || 0} | PRS: {member.monthly_prs || 0}
                        </div>
                      </div>
                    </div>
                    <div className="text-5xl font-black">
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
