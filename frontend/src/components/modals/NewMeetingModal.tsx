"use client";

import { Check, Copy, Loader2, Video } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Modal } from "@/components/ui/Modal";
import { api } from "@/lib/api";
import { meetingLink } from "@/lib/config";
import type { Meeting } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * Creates an instant meeting on open (generating a unique ID + invite link),
 * lets the host copy the link, then redirects them into the meeting room.
 */
export function NewMeetingModal({ open, onClose }: Props) {
  const router = useRouter();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // Mounted only while open (parent conditionally renders it), so create the
  // instant meeting once on mount.
  useEffect(() => {
    let active = true;
    api
      .createInstant()
      .then((m) => active && setMeeting(m))
      .catch((e) => active && setError(e.message || "Could not create meeting"));
    return () => {
      active = false;
    };
  }, []);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* blocked */
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Start a new meeting">
      {error ? (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
      ) : !meeting ? (
        <div className="flex items-center justify-center gap-2 py-8 text-zoom-gray">
          <Loader2 className="animate-spin" size={20} /> Creating your meeting…
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center gap-3 rounded-xl bg-blue-50 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-zoom-blue text-white">
              <Video size={22} />
            </div>
            <div>
              <p className="text-sm text-zoom-gray">Meeting ID</p>
              <p className="font-mono text-lg font-semibold tracking-wide text-zoom-ink">
                {meeting.code}
              </p>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-600">
              Invite link
            </label>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={meetingLink(meeting.code, meeting.invite_link)}
                className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700"
              />
              <button
                onClick={() => copy(meetingLink(meeting.code, meeting.invite_link))}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
              >
                {copied ? <Check size={15} className="text-green-600" /> : <Copy size={15} />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>

          <button
            onClick={() => router.push(`/meeting/${meeting.code}`)}
            className="w-full rounded-lg bg-zoom-blue py-3 text-sm font-semibold text-white transition hover:bg-zoom-blue-dark"
          >
            Start Meeting
          </button>
        </div>
      )}
    </Modal>
  );
}
