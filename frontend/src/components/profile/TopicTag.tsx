

export function TopicTag({ topic, count }: { topic: string; count: number }) {
  return (
    <div className="flex items-center gap-0 border-2 border-slate-900 overflow-hidden">
      <span className="px-3 py-1.5 text-xs font-black uppercase tracking-tight text-slate-900 bg-white">
        {topic}
      </span>
      <span className="px-3 py-1.5 text-xs font-black bg-primary text-white min-w-[32px] text-center">
        {String(count)}
      </span>
    </div>
  );
}
