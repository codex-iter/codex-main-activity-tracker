import React, { useState } from "react";
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
    <div className="w-full max-w-5xl mx-auto mt-8 bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-2xl relative z-10">
      
      {/* Table Header */}
      <div className="grid grid-cols-[flex-1_60px_80px_100px_80px] md:grid-cols-[1fr_80px_100px_120px_100px] gap-4 mb-4 pb-4 border-b border-slate-800 text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-400 px-4">
        <div>Member</div>
        <div className="text-center">Rank</div>
        <div className="text-right">Score</div>
        <div className="text-right">Questions</div>
        <div className="text-right hidden sm:block">Streak</div>
      </div>

      {/* Rows */}
      <div className="space-y-2">
        {currentMembers.map((member, idx) => {
          const profileHref = member.handle ? `/profile/${member.handle}` : "#";
          
          return (
            <Link key={member.id} to={profileHref} className="block group outline-none">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: (idx % 10) * 0.05 }}
                className="grid grid-cols-[flex-1_60px_80px_100px_80px] md:grid-cols-[1fr_80px_100px_120px_100px] gap-4 items-center p-2 md:px-4 md:py-2.5 rounded-xl hover:bg-slate-800/50 transition-colors"
              >
                {/* Member */}
                <div className="flex items-center gap-3 md:gap-4 min-w-0">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-full border border-slate-700 overflow-hidden bg-slate-800 flex-shrink-0">
                    {member.avatar_url ? (
                      <img src={member.avatar_url} alt={member.handle} className="w-full h-full object-cover" />
                    ) : (
                      <span className="material-symbols-outlined text-base md:text-xl relative top-1 md:top-2 text-slate-500 text-center block w-full">person</span>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 truncate">
                    <span className="font-semibold text-white truncate text-sm md:text-base group-hover:text-cyan-300 transition-colors">
                      {member.full_name || member.handle}
                    </span>
                  </div>
                </div>

                {/* Rank */}
                <div className="text-center">
                  <div className="inline-flex w-6 h-6 md:w-8 md:h-8 items-center justify-center rounded-full bg-slate-800 text-slate-300 font-medium text-xs md:text-sm">
                    {member.rank}
                  </div>
                </div>

                {/* Score */}
                <div className="text-right font-medium text-sm md:text-base text-slate-300">
                  {member.total_score.toLocaleString()}
                </div>

                {/* Questions (LC Solved) */}
                <div className="text-right font-medium text-sm md:text-base text-slate-300">
                  {member.leetcode_total}
                </div>

                {/* Streak */}
                <div className="text-right font-medium text-sm md:text-base text-slate-300 hidden sm:block">
                  {member.current_streak > 0 ? `${member.current_streak} d` : '-'}
                </div>
              </motion.div>
            </Link>
          );
        })}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8 pt-6 border-t border-slate-800">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-slate-800 text-slate-300 font-semibold uppercase text-xs tracking-wider rounded-lg disabled:opacity-30 hover:bg-slate-700 transition"
          >
            Prev
          </button>
          
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-[50vw] sm:max-w-none px-2 no-scrollbar">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={`flex-shrink-0 w-8 h-8 rounded-full font-bold text-xs transition ${
                  currentPage === i + 1 
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' 
                    : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700 hover:text-white border border-slate-700/50'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-slate-800 text-slate-300 font-semibold uppercase text-xs tracking-wider rounded-lg disabled:opacity-30 hover:bg-slate-700 transition"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
