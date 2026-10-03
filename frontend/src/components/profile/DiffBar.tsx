
import { motion } from "framer-motion";

export function DiffBar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 text-[11px] font-black uppercase tracking-widest text-slate-500 flex-shrink-0">
        {label}
      </span>
      <div className="flex-1 h-5 bg-slate-100 border-2 border-slate-900 overflow-hidden">
        <motion.div
          className={`h-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
      <span className="w-10 text-right text-sm font-black text-slate-900">
        {value}
      </span>
    </div>
  );
}
