"use client";

import { Mic, MicOff, Video, VideoOff } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Avatar } from "@/components/ui/Avatar";
import { getDeviceIds, getJoinPrefs, setDeviceIds } from "@/lib/identity";
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
  const [cams, setCams] = useState<MediaDeviceInfo[]>([]);
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [camId, setCamId] = useState(() => getDeviceIds().camId);
  const [micId, setMicId] = useState(() => getDeviceIds().micId);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const refreshDeviceList = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setCams(devices.filter((d) => d.kind === "videoinput"));
      setMics(devices.filter((d) => d.kind === "audioinput"));
    } catch {
      /* ignore */
    }
  };

  // Acquire the preview stream (honouring saved device choices) once.
  useEffect(() => {
    let cancelled = false;
    const saved = getDeviceIds();
    navigator.mediaDevices
      .getUserMedia({
        video: saved.camId ? { deviceId: { ideal: saved.camId } } : true,
        audio: saved.micId ? { deviceId: { ideal: saved.micId } } : true,
      })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        stream.getVideoTracks().forEach((t) => (t.enabled = camOn));
        stream.getAudioTracks().forEach((t) => (t.enabled = micOn));
        // Reflect the actual devices in use.
        const vid = stream.getVideoTracks()[0]?.getSettings().deviceId;
        const aud = stream.getAudioTracks()[0]?.getSettings().deviceId;
        if (vid) setCamId(vid);
        if (aud) setMicId(aud);
        refreshDeviceList();
      })
      .catch(() => setPermissionError(true));
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    streamRef.current?.getVideoTracks().forEach((t) => (t.enabled = camOn));
  }, [camOn]);
  useEffect(() => {
    streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = micOn));
  }, [micOn]);

  // Switch camera/microphone: re-acquire the preview with the chosen devices.
  const switchDevices = async (nextCam: string, nextMic: string) => {
    setCamId(nextCam);
    setMicId(nextMic);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: nextCam ? { deviceId: { exact: nextCam } } : true,
        audio: nextMic ? { deviceId: { exact: nextMic } } : true,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      stream.getVideoTracks().forEach((t) => (t.enabled = camOn));
      stream.getAudioTracks().forEach((t) => (t.enabled = micOn));
    } catch {
      setPermissionError(true);
    }
  };

  const join = () => {
    if (!name.trim()) return;
    try {
      localStorage.setItem("zoom.displayName", name.trim());
    } catch {
      /* storage blocked */
    }
    setDeviceIds({ camId, micId }); // remember device choices for the room
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

          {/* Device selection */}
          {(cams.length > 0 || mics.length > 0) && (
            <div className="mt-4 grid grid-cols-1 gap-3">
              {cams.length > 0 && (
                <label className="block">
                  <span className="mb-1 flex items-center gap-1.5 text-xs font-medium text-white/60">
                    <Video size={13} /> Camera
                  </span>
                  <select
                    value={camId}
                    onChange={(e) => switchDevices(e.target.value, micId)}
                    className="w-full rounded-lg border border-white/15 bg-room-800 px-3 py-2 text-sm text-white outline-none focus:border-zoom-blue"
                  >
                    {cams.map((d, i) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || `Camera ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {mics.length > 0 && (
                <label className="block">
                  <span className="mb-1 flex items-center gap-1.5 text-xs font-medium text-white/60">
                    <Mic size={13} /> Microphone
                  </span>
                  <select
                    value={micId}
                    onChange={(e) => switchDevices(camId, e.target.value)}
                    className="w-full rounded-lg border border-white/15 bg-room-800 px-3 py-2 text-sm text-white outline-none focus:border-zoom-blue"
                  >
                    {mics.map((d, i) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || `Microphone ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          )}

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
