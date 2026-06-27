"use client";

import { Calendar, Plus, Video } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Action {
  key: string;
  label: string;
  sublabel: string;
  icon: LucideIcon;
  color: string;
  onClick: () => void;
}

interface Props {
  onNewMeeting: () => void;
  onJoin: () => void;
  onSchedule: () => void;
}

/** The four primary Zoom actions, rendered as large coloured tiles. */
export function ActionTiles({ onNewMeeting, onJoin, onSchedule }: Props) {
  const actions: Action[] = [
    {
      key: "new",
      label: "New Meeting",
      sublabel: "Start an instant meeting",
      icon: Video,
      color: "bg-[#ff7a59]",
      onClick: onNewMeeting,
    },
    {
      key: "join",
      label: "Join",
      sublabel: "Via meeting ID or link",
      icon: Plus,
      color: "bg-zoom-blue",
      onClick: onJoin,
    },
    {
      key: "schedule",
      label: "Schedule",
      sublabel: "Plan a meeting ahead",
      icon: Calendar,
      color: "bg-[#7a5cff]",
      onClick: onSchedule,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {actions.map((a) => {
        const Icon = a.icon;
        return (
          <button
            key={a.key}
            onClick={a.onClick}
            className="group flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-zoom-blue dark:border-white/10 dark:bg-room-800"
          >
            <span
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-white transition group-hover:scale-105 ${a.color}`}
            >
              <Icon size={26} />
            </span>
            <span>
              <span className="block text-base font-semibold text-zoom-ink dark:text-white">
                {a.label}
              </span>
              <span className="block text-sm text-zoom-gray">{a.sublabel}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
