import type { SortCriteria } from "../../hooks/useLeaderboard";

interface LeaderboardControlsProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  sortBy: SortCriteria;
  setSortBy: (val: SortCriteria) => void;
}

export default function LeaderboardControls({
  searchQuery,
  setSearchQuery,
  sortBy,
  setSortBy,
}: LeaderboardControlsProps) {
  const sortOptions: SortCriteria[] = ["Score", "Problems Solved", "Streak", "Contests"];

  return (
    <div className="flex flex-col md:flex-row gap-4 mb-6">
      <input
        type="text"
        placeholder="SEARCH MEMBER OR HANDLE..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="flex-1 border-4 border-slate-900 p-3 font-bold uppercase focus:outline-none focus:ring-0 brutalist-shadow bg-white text-slate-900 placeholder:text-slate-400"
      />
      <div className="flex flex-wrap gap-2">
        {sortOptions.map((opt) => (
          <button
            key={opt}
            onClick={() => setSortBy(opt)}
            className={`border-4 border-slate-900 px-4 py-2 font-black uppercase text-xs md:text-sm transition-transform hover:-translate-y-1 brutalist-shadow focus:outline-none ${
              sortBy === opt ? "bg-primary text-white" : "bg-white text-slate-900"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
