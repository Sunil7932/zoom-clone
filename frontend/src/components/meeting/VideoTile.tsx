"use client";

import { Hand, MicOff, Pin } from "lucide-react";
import { useEffect, useRef } from "react";

import { Avatar } from "@/components/ui/Avatar";

interface Props {
  name: string;
  stream?: MediaStream | null;
  muted?: boolean; // mute the <video> element (always true for self to avoid echo)
  micOn: boolean;
  camOn: boolean;
  isSelf?: boolean;
  isHost?: boolean;
  handRaised?: boolean;
  speaking?: boolean;
}

/** A single participant's video tile, with avatar fallback when camera is off. */
export function VideoTile({
  name,
  stream,
  muted,
  micOn,
  camOn,
  isSelf,
  isHost,
  handRaised,
  speaking,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (el && stream && el.srcObject !== stream) {
      el.srcObject = stream;
    }
  }, [stream]);

  return (
    <div
      className={`relative aspect-video w-full overflow-hidden rounded-xl bg-room-tile ${
        speaking && micOn ? "speaking-ring" : ""
      }`}
    >
      {/* Video element is always mounted so the stream attaches; hidden when cam off. */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted || isSelf}
        className={`h-full w-full object-cover ${camOn ? "" : "hidden"} ${
          isSelf ? "-scale-x-100" : ""
        }`}
      />

      {!camOn && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Avatar name={name} size={84} />
        </div>
      )}

      {/* Name + mic badge */}
      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-md bg-black/55 px-2 py-1 text-xs font-medium text-white">
        {!micOn && <MicOff size={13} className="text-danger" />}
        <span className="max-w-[160px] truncate">
          {name}
          {isSelf ? " (You)" : ""}
        </span>
      </div>

      {isHost && (
        <div className="absolute top-2 left-2 flex items-center gap-1 rounded-md bg-zoom-blue/90 px-2 py-0.5 text-[11px] font-semibold text-white">
          <Pin size={11} /> Host
        </div>
      )}

      {handRaised && (
        <div className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-amber-400 text-amber-900 shadow-lg">
          <Hand size={15} />
        </div>
      )}
    </div>
  );
}
