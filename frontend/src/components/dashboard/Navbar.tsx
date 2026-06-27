"use client";

import { Settings, Video } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import type { User } from "@/lib/types";
import { todayLong } from "@/lib/format";

/** Top navigation bar: brand, current date, settings + profile placeholders. */
export function Navbar({ user }: { user: User | null }) {
  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zoom-blue text-white">
            <Video size={20} />
          </div>
          <span className="text-lg font-bold tracking-tight text-zoom-ink">
            Zoom<span className="text-zoom-blue">Clone</span>
          </span>
        </div>

        <div className="hidden text-sm text-zoom-gray sm:block">{todayLong()}</div>

        <div className="flex items-center gap-2">
          <button
            aria-label="Settings"
            className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
          >
            <Settings size={20} />
          </button>
          <div className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 transition hover:bg-gray-100">
            <Avatar name={user?.name || "Guest"} color={user?.avatar_color} size={32} />
            <span className="hidden text-sm font-medium text-zoom-ink sm:block">
              {user?.name || "Guest"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
