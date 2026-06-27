"use client";

import { LogOut, Moon, Settings, Sun, Video } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Avatar } from "@/components/ui/Avatar";
import type { User } from "@/lib/types";
import { todayLong } from "@/lib/format";
import { getTheme, toggleTheme, type Theme } from "@/lib/theme";

interface Props {
  user: User | null;
  displayName: string;
  onOpenSettings: () => void;
  onSignOut: () => void;
}

/** Top navigation bar: brand, date, theme toggle, settings + profile menu. */
export function Navbar({ user, displayName, onOpenSettings, onSignOut }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setThemeState] = useState<Theme>(() => getTheme());
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const iconBtn =
    "rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white";

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/90 backdrop-blur dark:border-white/10 dark:bg-room-800/90">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zoom-blue text-white">
            <Video size={20} />
          </div>
          <span className="text-lg font-bold tracking-tight text-zoom-ink dark:text-white">
            Zoom<span className="text-zoom-blue">Clone</span>
          </span>
        </div>

        <div className="hidden text-sm text-zoom-gray sm:block">{todayLong()}</div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setThemeState(toggleTheme())}
            aria-label="Toggle dark mode"
            className={iconBtn}
            suppressHydrationWarning
          >
            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button onClick={onOpenSettings} aria-label="Settings" className={iconBtn}>
            <Settings size={20} />
          </button>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 transition hover:bg-gray-100 dark:hover:bg-white/10"
            >
              <Avatar name={displayName} color={user?.avatar_color} size={32} />
              <span className="hidden text-sm font-medium text-zoom-ink sm:block dark:text-white">
                {displayName}
              </span>
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-xl dark:border-white/10 dark:bg-room-800"
              >
                <div className="border-b border-gray-100 px-4 py-3 dark:border-white/10">
                  <p className="truncate text-sm font-semibold text-zoom-ink dark:text-white">
                    {displayName}
                  </p>
                  {user?.email && (
                    <p className="truncate text-xs text-zoom-gray">{user.email}</p>
                  )}
                </div>
                <button
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenSettings();
                  }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-zoom-ink transition hover:bg-gray-50 dark:text-white dark:hover:bg-white/10"
                >
                  <Settings size={16} className="text-gray-500 dark:text-gray-300" /> Settings
                </button>
                <button
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onSignOut();
                  }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 transition hover:bg-red-50 dark:hover:bg-red-500/10"
                >
                  <LogOut size={16} /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
