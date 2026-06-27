"use client";

import type { Reaction } from "@/lib/types";

/** Deterministic horizontal offset (8%–68%) derived from the reaction key. */
function offsetFor(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return 8 + (h % 60);
}

/** Floating emoji reactions that drift upward and fade (rendered over the grid). */
export function ReactionsOverlay({ reactions }: { reactions: Reaction[] }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      {reactions.map((r) => (
        <div
          key={r.key}
          className="reaction-float absolute bottom-24 flex flex-col items-center"
          style={{ left: `${offsetFor(r.key)}%` }}
        >
          <span className="text-4xl drop-shadow-lg">{r.emoji}</span>
          <span className="mt-1 rounded-full bg-black/50 px-2 py-0.5 text-[11px] font-medium text-white">
            {r.name}
          </span>
        </div>
      ))}
    </div>
  );
}
