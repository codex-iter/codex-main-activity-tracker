import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import type { LeaderboardMember } from "../../hooks/useLeaderboard";

interface LeaderboardPodiumProps {
  members: LeaderboardMember[];
}

export default function LeaderboardPodium({ members }: LeaderboardPodiumProps) {
  const top3 = members.slice(0, 3);
  if (top3.length === 0) return null;

  // Render Order: Rank 2 (Left), Rank 1 (Center), Rank 3 (Right)
  const podiumOrder = [
    top3[1] || null,
    top3[0] || null,
    top3[2] || null
  ];

  const podiumStyles = [
    {
      // Rank 2
      color: "silver",
      bgClass: "bg-slate-200",
      height: "h-[280px] md:h-[300px]",
      rank: 2,
    },
    {
      // Rank 1
      color: "gold",
      bgClass: "bg-[#FACC15]",
      height: "h-[320px] md:h-[340px]",
      rank: 1,
    },
    {
      // Rank 3
      color: "bronze",
      bgClass: "bg-orange-400",
      height: "h-[250px] md:h-[280px]",
      rank: 3,
    }
  ];

  return (
    <div className="relative w-full max-w-4xl mx-auto py-12 flex justify-center items-end gap-0 z-10 px-2 md:px-4">
      {podiumOrder.map((member, index) => {
        if (!member) return <div key={index} className="w-1/3 max-w-[240px] opacity-0" />;

        const style = podiumStyles[index];
        const isRank1 = style.rank === 1;
        const profileHref = member.handle ? `/profile/${member.handle}` : "#";

        return (
          <Link 
            key={member.id} 
            to={profileHref} 
            className="relative flex flex-col items-center w-1/3 max-w-[240px] group outline-none -mx-1"
            style={{ zIndex: isRank1 ? 20 : 10 - index }}
          >
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ease: "easeOut", duration: 0.4, delay: index * 0.1 }}
              className="w-full flex flex-col items-center"
            >
              {/* Avatar sitting ON TOP of the podium */}
              <div className="relative -mb-6 md:-mb-10 z-30 transition-transform duration-200 group-hover:-translate-y-4">
                {isRank1 && (
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-4xl md:text-5xl animate-bounce z-20 drop-shadow-md">
                    👑
                  </div>
                )}
                <div className={`w-20 h-20 md:w-28 md:h-28 rounded-full border-4 border-slate-900 p-0 relative z-10 bg-white brutalist-shadow`}>
                  <div className="w-full h-full overflow-hidden bg-white rounded-full flex items-center justify-center">
                    {member.avatar_url ? (
                      <img src={member.avatar_url} alt={member.handle} className="w-full h-full object-cover transition-all" />
                    ) : (
                      <span className="text-4xl md:text-5xl font-black text-slate-900">
                        {member.full_name ? member.full_name.charAt(0).toUpperCase() : member.handle?.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Physical Podium Block */}
              <div 
                className={`w-full ${style.height} rounded-none ${style.bgClass} border-4 border-slate-900 brutalist-shadow flex flex-col items-center justify-start pt-10 md:pt-16 pb-4 px-2 md:px-4 relative overflow-hidden`}
              >
                {/* 3D Top face illusion */}
                <div className="absolute top-0 left-0 w-full h-6 md:h-8 bg-black/10 border-b-4 border-slate-900" />

                {/* Identity / Trophy Face */}
                <div className="text-center z-10 w-full flex flex-col items-center mt-2">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-none border-4 border-slate-900 bg-white text-slate-900 flex items-center justify-center text-lg md:text-xl font-black brutalist-shadow mb-4">
                    {style.rank}
                  </div>
                  
                  <h3 className="font-black text-xs md:text-lg text-slate-900 truncate w-full max-w-[90%] bg-white/90 border-2 border-slate-900 p-1 md:p-2 brutalist-shadow">
                    {member.full_name || member.handle}
                  </h3>
                  
                  <div className="font-black text-sm md:text-2xl mt-4 tracking-widest text-slate-900 bg-white border-4 border-slate-900 p-1 md:p-2 w-full max-w-[95%] brutalist-shadow">
                    {member.total_score.toLocaleString()} XP
                  </div>
                </div>
                
              </div>
            </motion.div>
          </Link>
        );
      })}
    </div>
  );
}
