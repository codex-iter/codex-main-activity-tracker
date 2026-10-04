import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import type { LeaderboardMember } from "../../hooks/useLeaderboard";

interface LeaderboardListProps {
  members: LeaderboardMember[];
}

export default function LeaderboardList({ members }: LeaderboardListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  if (members.length === 0) return null;

  const totalPages = Math.ceil(members.length / itemsPerPage);
  const currentMembers = members.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  if (members.length === 0) return null;

  return (
    <div className="w-full max-w-5xl mx-auto mt-8 bg-white border-4 border-slate-900 rounded-none p-6 brutalist-shadow relative z-10 transition-all">
      
      {/* Table Header */}
      <div className="grid grid-cols-[flex-1_60px_80px_100px_80px] md:grid-cols-[1fr_80px_100px_120px_100px] gap-4 mb-4 pb-4 border-b-4 border-slate-900 text-[10px] md:text-sm font-black uppercase tracking-widest text-slate-900 px-4">
        <div>Member</div>
        <div className="text-center">Rank</div>
        <div className="text-right">Score</div>
        <div className="text-right">Questions</div>
        <div className="text-right hidden sm:block">Streak</div>
      </div>

      {/* Rows */}
      <div className="space-y-4">
        {currentMembers.map((member, idx) => {
          const profileHref = member.handle ? `/profile/${member.handle}` : "#";
          
          return (
            <Link key={member.id} to={profileHref} className="block group outline-none relative hover:z-50">
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.2, delay: (idx % 10) * 0.05 }}
                className="grid grid-cols-[flex-1_60px_80px_100px_80px] md:grid-cols-[1fr_80px_100px_120px_100px] gap-4 items-center p-3 md:px-4 md:py-3 bg-slate-100 border-2 border-transparent group-hover:border-slate-900 group-hover:bg-[#FACC15] group-hover:shadow-[4px_4px_0px_0px_#0f172a] group-hover:-translate-y-1 group-active:translate-y-0 group-active:shadow-none transition-all cursor-pointer relative"
              >
                
                {/* Desktop Scorecard Tooltip on Hover */}
                <div className="absolute right-2 md:right-[5%] -top-20 md:-top-28 hidden md:flex opacity-0 group-hover:opacity-100 group-hover:-translate-y-2 pointer-events-none scale-95 group-hover:scale-100 transition-all duration-200 z-[100] bg-white border-4 border-slate-900 brutalist-shadow flex-col p-4 w-72 text-left">
                  <div className="flex items-center gap-3 border-b-2 border-slate-200 pb-2 mb-2">
                    <div className="w-10 h-10 border-2 border-slate-900 bg-slate-100 flex items-center justify-center font-black text-slate-900 overflow-hidden">
                       {member.avatar_url ? (
                         <img src={member.avatar_url} alt="" className="w-full h-full object-cover" />
                       ) : (
                         member.full_name ? member.full_name.charAt(0).toUpperCase() : member.handle?.charAt(0).toUpperCase()
                       )}
                    </div>
                    <div>
                      <div className="font-black text-sm md:text-base text-slate-900 truncate">{member.full_name || member.handle}</div>
                      <div className="text-slate-500 font-bold text-xs truncate">@{member.handle}</div>
                    </div>
                    <div className="ml-auto w-8 h-8 rounded-none bg-slate-900 text-white font-black flex items-center justify-center">
                      #{member.rank}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-slate-800 font-bold">
                    <div className="flex items-center justify-between bg-slate-100 p-1 border-2 border-slate-900">
                      <span>XP</span>
                      <span className="text-slate-900">{member.total_score.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between bg-slate-100 p-1 border-2 border-slate-900">
                      <span>Streak</span>
                      <span className="text-slate-900">{member.current_streak}</span>
                    </div>
                    <div className="flex items-center justify-between bg-slate-100 p-1 border-2 border-slate-900">
                      <span>Solved</span>
                      <span className="text-slate-900">{member.leetcode_total}</span>
                    </div>
                  </div>
                </div>

                {/* Member */}
                <div className="flex items-center gap-3 md:gap-4 min-w-0">
                  <div className="w-10 h-10 md:w-12 md:h-12 border-2 border-slate-900 overflow-hidden bg-white flex-shrink-0 flex items-center justify-center">
                    {member.avatar_url ? (
                      <img src={member.avatar_url} alt={member.handle} className="w-full h-full object-cover transition-all" />
                    ) : (
                      <span className="font-black text-xl text-slate-900">
                        {member.full_name ? member.full_name.charAt(0).toUpperCase() : member.handle?.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 truncate">
                    <span className="font-black text-slate-900 truncate text-sm md:text-lg tracking-tight">
                      {member.full_name || member.handle}
                    </span>
                  </div>
                </div>

                {/* Rank */}
                <div className="text-center">
                  <div className="inline-flex w-8 h-8 md:w-10 md:h-10 items-center justify-center border-2 border-slate-400 bg-white text-slate-900 group-hover:border-slate-900 group-hover:bg-white group-hover:text-black font-black text-sm md:text-base transition-colors">
                    #{member.rank}
                  </div>
                </div>

                {/* Score */}
                <div className="text-right font-bold text-base md:text-xl text-slate-900">
                  {member.total_score.toLocaleString()}
                </div>

                {/* Questions (LC Solved) */}
                <div className="text-right font-bold text-base md:text-xl text-slate-700 group-hover:text-slate-900">
                  {member.leetcode_total}
                </div>

                {/* Streak */}
                <div className="text-right font-bold text-base md:text-xl text-slate-700 group-hover:text-slate-900 hidden sm:block">
                  {member.current_streak > 0 ? `${member.current_streak} d` : '-'}
                </div>
              </motion.div>
            </Link>
          );
        })}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-8 pt-6 border-t-4 border-slate-900">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-white border-2 border-slate-900 text-slate-900 font-black uppercase tracking-widest text-xs hover:bg-[#FACC15] hover:shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 active:translate-y-0 active:shadow-none disabled:opacity-50 disabled:pointer-events-none transition-all"
          >
            Prev
          </button>
          
          <div className="flex items-center gap-2 overflow-x-auto max-w-[50vw] sm:max-w-none p-2 no-scrollbar">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={`flex-shrink-0 w-10 h-10 flex items-center justify-center border-2 border-slate-900 font-black text-sm transition-all ${
                  currentPage === i + 1 
                    ? 'bg-[#0707f2] text-white shadow-[4px_4px_0px_0px_#0f172a] -translate-y-1' 
                    : 'bg-white text-slate-900 hover:bg-[#FACC15] hover:shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 active:translate-y-0 active:shadow-none'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-white border-2 border-slate-900 text-slate-900 font-black uppercase tracking-widest text-xs hover:bg-[#FACC15] hover:shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 active:translate-y-0 active:shadow-none disabled:opacity-50 disabled:pointer-events-none transition-all"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
