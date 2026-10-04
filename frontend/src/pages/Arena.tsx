import { useEffect, useState } from "react";
import { getMonthlyLeaderboard, MonthlyLeaderboardEntry } from "../services/codexApi";

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

  const dsaSorted = [...data].sort((a, b) => b.monthly_dsa_score - a.monthly_dsa_score);
  const devSorted = [...data].sort((a, b) => b.monthly_dev_score - a.monthly_dev_score);

  return (
    <div className="min-h-screen bg-slate-950 text-white font-mono p-6 sm:p-12 pb-24">
      {/* Header Section */}
      <div className="max-w-7xl mx-auto mb-16 border-4 border-red-500 p-8 shadow-[8px_8px_0px_0px_rgba(239,68,68,1)] bg-slate-900 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 opacity-10 rotate-12">
          <span className="material-symbols-outlined text-[300px] text-red-500">swords</span>
        </div>
        <div className="relative z-10">
          <h1 className="text-4xl sm:text-7xl font-black text-white tracking-tighter uppercase mb-6">
            THE ARENA: <span className="text-red-500">{monthName}</span> CONTEST
          </h1>
          <div className="inline-block bg-red-500 text-slate-900 font-black px-6 py-3 text-xl sm:text-2xl border-4 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
            TIME REMAINING: {daysRemaining} DAYS
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center text-red-500 font-black text-4xl animate-pulse uppercase tracking-widest mt-32">
          Entering The Arena...
        </div>
      ) : (
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Column 1: Algorithms */}
          <div className="flex flex-col gap-6">
            <h2 className="text-4xl font-black text-red-500 border-b-8 border-red-500 pb-3 uppercase tracking-tighter">
              Algorithms
            </h2>
            <div className="flex flex-col gap-4">
              {dsaSorted.map((member, idx) => {
                const isChamp = idx === 0 && member.monthly_dsa_score > 0;
                return (
                  <div
                    key={member.member_id}
                    className={`border-4 p-5 flex items-center justify-between transition-transform hover:-translate-y-1 ${
                      isChamp
                        ? "border-red-500 bg-[#351111] shadow-[6px_6px_0px_0px_rgba(239,68,68,1)]"
                        : "border-slate-800 bg-slate-900 shadow-[4px_4px_0px_0px_rgba(30,41,59,1)] hover:shadow-[6px_6px_0px_0px_rgba(239,68,68,0.5)] hover:border-red-500/50"
                    }`}
                  >
                    <div className="flex items-center gap-5">
                      <div
                        className={`text-3xl font-black w-10 text-center ${
                          isChamp ? "text-red-500" : "text-slate-600"
                        }`}
                      >
                        #{idx + 1}
                      </div>
                      <div>
                        <div className="font-bold text-xl text-white truncate max-w-[200px] sm:max-w-[280px] uppercase">
                          {member.full_name}
                        </div>
                        <div className={`text-sm font-bold ${isChamp ? "text-red-400" : "text-slate-400"}`}>
                          SOLVED: {member.monthly_problems_solved}
                        </div>
                      </div>
                    </div>
                    <div className={`text-3xl font-black ${isChamp ? "text-red-500" : "text-white"}`}>
                      {Math.floor(member.monthly_dsa_score)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Column 2: Development */}
          <div className="flex flex-col gap-6">
            <h2 className="text-4xl font-black text-[#00B4D8] border-b-8 border-[#00B4D8] pb-3 uppercase tracking-tighter">
              Development
            </h2>
            <div className="flex flex-col gap-4">
              {devSorted.map((member, idx) => {
                const isChamp = idx === 0 && member.monthly_dev_score > 0;
                return (
                  <div
                    key={member.member_id}
                    className={`border-4 p-5 flex items-center justify-between transition-transform hover:-translate-y-1 ${
                      isChamp
                        ? "border-[#00B4D8] bg-[#0c2f38] shadow-[6px_6px_0px_0px_rgba(0,180,216,1)]"
                        : "border-slate-800 bg-slate-900 shadow-[4px_4px_0px_0px_rgba(30,41,59,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,180,216,0.5)] hover:border-[#00B4D8]/50"
                    }`}
                  >
                    <div className="flex items-center gap-5">
                      <div
                        className={`text-3xl font-black w-10 text-center ${
                          isChamp ? "text-[#00B4D8]" : "text-slate-600"
                        }`}
                      >
                        #{idx + 1}
                      </div>
                      <div>
                        <div className="font-bold text-xl text-white truncate max-w-[200px] sm:max-w-[280px] uppercase">
                          {member.full_name}
                        </div>
                        <div className={`text-sm font-bold ${isChamp ? "text-[#00B4D8]" : "text-slate-400"}`}>
                          COMMITS: {member.monthly_commits} | PRS: {member.monthly_prs}
                        </div>
                      </div>
                    </div>
                    <div className={`text-3xl font-black ${isChamp ? "text-[#00B4D8]" : "text-white"}`}>
                      {Math.floor(member.monthly_dev_score)}
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
