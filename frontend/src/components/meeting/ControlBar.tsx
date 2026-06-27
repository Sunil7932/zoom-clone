"use client";

import {
  MessageSquare,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  Users,
  Video,
  VideoOff,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/cn";

interface Props {
  micOn: boolean;
  camOn: boolean;
  sharing: boolean;
  participantsOpen: boolean;
  chatOpen: boolean;
  participantCount: number;
  unreadChat: number;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onToggleShare: () => void;
  onToggleParticipants: () => void;
  onToggleChat: () => void;
  onLeave: () => void;
}

export function ControlBar(props: Props) {
  return (
    <div className="flex items-center justify-center gap-2 border-t border-black/40 bg-control-bar px-3 py-3 sm:gap-3">
      <ControlButton
        icon={props.micOn ? Mic : MicOff}
        label={props.micOn ? "Mute" : "Unmute"}
        active={props.micOn}
        danger={!props.micOn}
        onClick={props.onToggleMic}
      />
      <ControlButton
        icon={props.camOn ? Video : VideoOff}
        label={props.camOn ? "Stop Video" : "Start Video"}
        active={props.camOn}
        danger={!props.camOn}
        onClick={props.onToggleCam}
      />
      <ControlButton
        icon={MonitorUp}
        label={props.sharing ? "Stop Share" : "Share"}
        active={props.sharing}
        highlight={props.sharing}
        onClick={props.onToggleShare}
        className="hidden sm:flex"
      />
      <ControlButton
        icon={Users}
        label="Participants"
        active={props.participantsOpen}
        badge={props.participantCount}
        onClick={props.onToggleParticipants}
      />
      <ControlButton
        icon={MessageSquare}
        label="Chat"
        active={props.chatOpen}
        badge={props.unreadChat || undefined}
        badgeColor="bg-danger"
        onClick={props.onToggleChat}
      />

      <button
        onClick={props.onLeave}
        className="ml-1 flex h-12 items-center gap-2 rounded-lg bg-danger px-4 text-sm font-semibold text-white transition hover:bg-red-700 sm:ml-3"
      >
        <PhoneOff size={18} />
        <span className="hidden sm:inline">Leave</span>
      </button>
    </div>
  );
}

interface CBProps {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  danger?: boolean;
  highlight?: boolean;
  badge?: number;
  badgeColor?: string;
  className?: string;
  onClick: () => void;
}

function ControlButton({
  icon: Icon,
  label,
  active,
  danger,
  highlight,
  badge,
  badgeColor = "bg-zoom-blue",
  className,
  onClick,
}: CBProps) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn(
        "relative flex h-12 min-w-[56px] flex-col items-center justify-center gap-0.5 rounded-lg px-2 text-[11px] font-medium text-white/90 transition",
        highlight
          ? "bg-zoom-blue hover:bg-zoom-blue-dark"
          : danger
            ? "bg-room-700 hover:bg-room-tile"
            : "hover:bg-room-700",
        className,
      )}
    >
      <Icon size={20} className={danger ? "text-danger" : ""} />
      <span className="hidden sm:block">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span
          className={cn(
            "absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white",
            badgeColor,
          )}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
