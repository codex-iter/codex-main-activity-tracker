import { useState } from "react";
import React from "react";
import { GitHubCalendar } from "react-github-calendar";
import { StaggerItem } from "../animations/ScrollReveal";
import { Label, SectionTitle } from "./SharedStyles";

export function OpenSourceContributions({ handle }: { handle: string | null }) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; activity: any; } | null>(null);

  if (!handle) return null;
  return (
    <StaggerItem>
      <div className="border-4 border-slate-900 bg-white p-6 md:p-8 brutalist-shadow relative z-0">
        <div className="mb-6">
          <Label>Open Source</Label>
          <SectionTitle>Contributions</SectionTitle>
        </div>
        
        <div className="w-full overflow-x-auto relative z-10" style={{ cursor: 'crosshair' }}>
          <div className="min-w-[800px] pb-4">
            <GitHubCalendar 
              username={handle}
              colorScheme="light"
              blockSize={15}
              blockMargin={5}
              blockRadius={0}
              fontSize={14}
              theme={{ light: ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"] }}
              style={{ fontFamily: "'Space Grotesk', sans-serif", width: "100%" }}
              transformData={(data) => [...data].reverse()}
              renderBlock={(block, activity) =>
                React.cloneElement(block as any, {
                  onMouseEnter: (e: React.MouseEvent) => {
                    const rect = (e.target as Element).getBoundingClientRect();
                    setTooltip({ x: rect.left + rect.width / 2, y: rect.top, activity });
                  },
                  onMouseLeave: () => setTooltip(null),
                  className: "transition-all duration-150 hover:scale-150 hover:-translate-y-1 hover:z-20",
                  style: { transformBox: 'fill-box', transformOrigin: 'center' }
                })
              }
            />
          </div>
        </div>

        {tooltip && (
          <div
            className="fixed pointer-events-none z-50 bg-slate-900 text-white px-3 py-2 text-xs font-black uppercase tracking-widest border-2 border-white shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
            style={{
              left: tooltip.x,
              top: tooltip.y - 10,
              transform: 'translate(-50%, -100%)'
            }}
          >
            {tooltip.activity.count} COMMITS ON {new Date(tooltip.activity.date).toLocaleDateString()}
            <div className="absolute w-3 h-3 bg-slate-900 border-b-2 border-r-2 border-white rotate-45 left-1/2 -bottom-[7px] -translate-x-1/2" />
          </div>
        )}
      </div>
    </StaggerItem>
  );
}

