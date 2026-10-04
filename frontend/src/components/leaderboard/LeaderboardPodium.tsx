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
      color: "blue",
      boxShadow: "shadow-[0_0_30px_rgba(59,130,246,0.15)] hover:shadow-[0_0_40px_rgba(59,130,246,0.3)]",
      borderColor: "border-blue-500/40",
      avatarBorder: "border-blue-400",
      textColor: "text-blue-400",
      height: "h-[300px]",
      badgeBg: "bg-blue-900 border-blue-500",
      glowClass: "from-blue-500/30",
      auroraClass: "bg-[conic-gradient(from_90deg_at_50%_50%,#00000000_50%,#0a0a0a_100%),radial-gradient(circle_at_50%_50%,#3b82f6_0%,#0ea5e9_25%,#06b6d4_50%,transparent_80%)]",
      rank: 2,
    },
    {
      // Rank 1
      color: "yellow",
      boxShadow: "shadow-[0_0_40px_rgba(234,179,8,0.2)] hover:shadow-[0_0_50px_rgba(234,179,8,0.4)]",
      borderColor: "border-yellow-500/50",
      avatarBorder: "border-yellow-400",
      textColor: "text-yellow-400",
      height: "h-[340px]",
      badgeBg: "bg-yellow-900 border-yellow-500",
      glowClass: "from-yellow-500/30",
      auroraClass: "bg-[conic-gradient(from_90deg_at_50%_50%,#00000000_50%,#0a0a0a_100%),radial-gradient(circle_at_50%_50%,#eab308_0%,#f59e0b_25%,#fbbf24_50%,transparent_80%)]",
      rank: 1,
    },
    {
      // Rank 3
      color: "purple",
      boxShadow: "shadow-[0_0_30px_rgba(168,85,247,0.15)] hover:shadow-[0_0_40px_rgba(168,85,247,0.3)]",
      borderColor: "border-purple-500/40",
      avatarBorder: "border-purple-400",
      textColor: "text-purple-400",
      height: "h-[280px]",
      badgeBg: "bg-purple-900 border-purple-500",
      glowClass: "from-purple-500/30",
      auroraClass: "bg-[conic-gradient(from_90deg_at_50%_50%,#00000000_50%,#0a0a0a_100%),radial-gradient(circle_at_50%_50%,#a855f7_0%,#d946ef_25%,#e879f9_50%,transparent_80%)]",
      rank: 3,
    }
  ];

  return (
    <div className="relative w-full max-w-4xl mx-auto py-12 flex justify-center items-end gap-4 md:gap-8 z-10 px-4">
      {podiumOrder.map((member, index) => {
        if (!member) return <div key={index} className="w-1/3 max-w-[240px] opacity-0" />;

        const style = podiumStyles[index];
        const isRank1 = style.rank === 1;
        const profileHref = member.handle ? `/profile/${member.handle}` : "#";

        return (
          <Link 
            key={member.id} 
            to={profileHref} 
            className="relative flex flex-col items-center w-1/3 max-w-[240px] group outline-none"
          >
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ease: "easeOut", duration: 0.6, delay: index * 0.1 }}
              className="w-full"
            >
              {/* Rank Badge overlapping top border */}
              <div className={`absolute -top-3 left-1/2 -translate-x-1/2 z-20 w-6 h-6 rounded-full border ${style.badgeBg} text-white flex items-center justify-center text-xs font-bold shadow-md`}>
                {style.rank}
              </div>

              {/* Glass Card */}
              <div 
                className={`w-full ${style.height} rounded-2xl bg-slate-900/40 backdrop-blur-xl border ${style.borderColor} ${style.boxShadow} transition-all duration-500 flex flex-col items-center pt-10 pb-6 px-4 relative overflow-hidden group/card`}
              >
                {/* Aurora Hover Effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
                  <div className={`absolute -top-[50%] -left-[50%] w-[200%] h-[200%] ${style.auroraClass} opacity-30 blur-3xl group-hover:animate-[spin_6s_linear_infinite]`} />
                </div>

                {/* Subtle top gradient glow inside the card */}
                <div className={`absolute top-0 left-0 w-full h-[60%] bg-gradient-to-b ${style.glowClass} to-transparent pointer-events-none z-0`} />

                {/* Avatar area */}
                <div className="relative mb-6">
                  {isRank1 && (
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-3xl animate-pulse z-20 drop-shadow-[0_0_10px_rgba(234,179,8,0.8)]">
                      👑
                    </div>
                  )}
                  <div className={`w-20 h-20 md:w-24 md:h-24 rounded-full border-2 ${style.avatarBorder} p-1 relative z-10 bg-slate-900/50`}>
                    <div className="w-full h-full rounded-full overflow-hidden bg-slate-800">
                      {member.avatar_url ? (
                        <img src={member.avatar_url} alt={member.handle} className="w-full h-full object-cover" />
                      ) : (
                        <span className="material-symbols-outlined text-4xl mt-4 md:mt-5 text-slate-500 text-center block w-full">person</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Identity */}
                <div className="text-center z-10 w-full mt-auto">
                  <h3 className="font-semibold text-lg md:text-xl text-white truncate px-1">
                    {member.full_name || member.handle}
                  </h3>
                  <div className={`font-bold text-lg md:text-2xl mt-1 tracking-wide ${style.textColor} drop-shadow-md`}>
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
