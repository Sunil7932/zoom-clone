"use client";

import { Mic, MicOff, Video, VideoOff } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Avatar } from "@/components/ui/Avatar";
import { getJoinPrefs } from "@/lib/identity";
import type { Meeting } from "@/lib/types";

interface Props {
  meeting: Meeting;
  defaultName: string;
  onJoin: (name: string, micOn: boolean, camOn: boolean) => void;
}

/**
 * Device-check screen shown before entering the room: live camera preview,
 * mic/camera toggles, and a required display name (Zoom's "Join" gate).
 */
export function PreJoin({ meeting, defaultName, onJoin }: Props) {
  // Remember the last-used name across sessions (falls back to the logged-in user).
  const [name, setName] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem("zoom.displayName") || defaultName;
      } catch {
        /* storage blocked */
      }
    }
    return defaultName;
  });
  const [micOn, setMicOn] = useState(() => getJoinPrefs().mic);
  const [camOn, setCamOn] = useState(() => getJoinPrefs().cam);
  const [permissionError, setPermissionError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Acquire a preview stream once; toggle tracks with the buttons.
  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => setPermissionError(true));
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useEffect(() => {
    streamRef.current?.getVideoTracks().forEach((t) => (t.enabled = camOn));
  }, [camOn]);
  useEffect(() => {
    streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = micOn));
  }, [micOn]);

  const join = () => {
    if (!name.trim()) return;
    try {
      localStorage.setItem("zoom.displayName", name.trim());
    } catch {
      /* storage blocked */
    }
    streamRef.current?.getTracks().forEach((t) => t.stop()); // free device for the room
    onJoin(name.trim(), micOn, camOn);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-room-900 p-4">
      <div className="grid w-full max-w-4xl gap-8 lg:grid-cols-2">
        {/* Preview */}
        <div className="relative aspect-video overflow-hidden rounded-2xl bg-room-tile">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`h-full w-full -scale-x-100 object-cover ${camOn && !permissionError ? "" : "hidden"}`}
          />
          {(!camOn || permissionError) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <Avatar name={name || "You"} size={96} />
              {permissionError && (
                <p className="px-6 text-center text-sm text-white/60">
                  Camera/mic unavailable. You can still join.
                </p>
              )}
            </div>
          )}

          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-3">
            <PreToggle on={micOn} onClick={() => setMicOn((v) => !v)} OnIcon={Mic} OffIcon={MicOff} label="mic" />
            <PreToggle on={camOn} onClick={() => setCamOn((v) => !v)} OnIcon={Video} OffIcon={VideoOff} label="camera" />
          </div>
        </div>

        {/* Join form */}
        <div className="flex flex-col justify-center text-white">
          <p className="text-sm font-medium text-zoom-blue-light">Ready to join?</p>
          <h1 className="mt-1 text-2xl font-bold">{meeting.title}</h1>
          <p className="mt-1 font-mono text-sm text-white/50">Meeting ID: {meeting.code}</p>

          <label htmlFor="name" className="mt-6 mb-1 block text-sm font-medium text-white/70">
            Your name
          </label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && join()}
            placeholder="Enter your name"
            className="w-full rounded-lg border border-white/15 bg-room-800 px-4 py-3 text-white outline-none transition focus:border-zoom-blue focus:ring-2 focus:ring-zoom-blue/30"
          />

          <button
            onClick={join}
            disabled={!name.trim()}
            className="mt-4 w-full rounded-lg bg-zoom-blue py-3 font-semibold text-white transition hover:bg-zoom-blue-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            Join Meeting
          </button>
          <Link
            href="/"
            className="mt-3 text-center text-sm text-white/50 transition hover:text-white"
          >
            ← Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

function PreToggle({
  on,
  onClick,
  OnIcon,
  OffIcon,
  label,
}: {
  on: boolean;
  onClick: () => void;
  OnIcon: typeof Mic;
  OffIcon: typeof MicOff;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={`${on ? "Turn off" : "Turn on"} ${label}`}
      className={`flex h-12 w-12 items-center justify-center rounded-full transition ${
        on ? "bg-white/15 text-white hover:bg-white/25" : "bg-danger text-white hover:bg-red-700"
      }`}
    >
      {on ? <OnIcon size={20} /> : <OffIcon size={20} />}
    </button>
  );
}
