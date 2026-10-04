interface LeaderboardControlsProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
}

export default function LeaderboardControls({
  searchQuery,
  setSearchQuery,
}: LeaderboardControlsProps) {
  return (
    <div className="flex flex-col gap-4 mb-6">
      <input
        type="text"
        placeholder="SEARCH MEMBER OR HANDLE..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full border-4 border-slate-900 p-3 font-bold uppercase focus:outline-none focus:ring-0 brutalist-shadow bg-white text-slate-900 placeholder:text-slate-400"
      />
    </div>
  );
}
