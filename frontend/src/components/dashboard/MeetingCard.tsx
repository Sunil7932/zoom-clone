"use client";

import { Clock, Copy, Check, Users, Video } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

import type { Meeting } from "@/lib/types";
import { formatDuration, formatMeetingTime, formatRelative } from "@/lib/format";
import { meetingLink } from "@/lib/config";

interface Props {
  meeting: Meeting;
  variant: "upcoming" | "recent";
}

export function MeetingCard({ meeting, variant }: Props) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const copyLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(meetingLink(meeting.code, meeting.invite_link));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked */
    }
  };

  const timeLabel =
    variant === "upcoming"
      ? formatMeetingTime(meeting.scheduled_start || meeting.created_at)
      : formatRelative(meeting.started_at || meeting.created_at);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition hover:shadow-md sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-zoom-blue">
          <Video size={20} />
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold text-zoom-ink">{meeting.title}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zoom-gray">
            <span className="inline-flex items-center gap-1">
              <Clock size={14} /> {timeLabel}
              {meeting.duration_minutes
                ? ` · ${formatDuration(meeting.duration_minutes)}`
                : ""}
            </span>
            {variant === "recent" && (
              <span className="inline-flex items-center gap-1">
                <Users size={14} /> {meeting.participant_count}
              </span>
            )}
          </div>
          <p className="mt-1 font-mono text-xs text-gray-400">{meeting.code}</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={copyLink}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
        >
          {copied ? <Check size={15} className="text-green-600" /> : <Copy size={15} />}
          {copied ? "Copied" : "Copy"}
        </button>
        {variant === "upcoming" && (
          <button
            onClick={() => router.push(`/meeting/${meeting.code}`)}
            className="rounded-lg bg-zoom-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-zoom-blue-dark"
          >
            Start
          </button>
        )}
      </div>
    </div>
  );
}
