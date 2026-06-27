"use client";

import { Loader2, VideoOff } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { MeetingRoom } from "@/components/meeting/MeetingRoom";
import { PreJoin } from "@/components/meeting/PreJoin";
import { api } from "@/lib/api";
import type { Meeting } from "@/lib/types";

type JoinState = { name: string; micOn: boolean; camOn: boolean } | null;

export default function MeetingPage() {
  const params = useParams<{ code: string }>();
  const code = params?.code as string;

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [defaultName, setDefaultName] = useState("Guest");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [joined, setJoined] = useState<JoinState>(null);

  useEffect(() => {
    if (!code) return;
    let active = true;
    (async () => {
      try {
        // Resolve the meeting and the default user together so the pre-join
        // screen renders with the correct prefilled name (no stale "Guest").
        const [m, u] = await Promise.all([
          api.getMeeting(code),
          api.me().catch(() => null),
        ]);
        if (!active) return;
        setMeeting(m);
        if (u) setDefaultName(u.name);
      } catch (err) {
        const e = err as { status?: number; message?: string };
        setError(
          e.status === 404
            ? "This meeting doesn't exist. Check the Meeting ID and try again."
            : e.status === 410
              ? "This meeting has already ended."
              : e.message || "Could not load the meeting.",
        );
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [code]);

  const handleJoin = async (name: string, micOn: boolean, camOn: boolean) => {
    // Register the participant against the meeting (also activates it).
    try {
      await api.join(code, name);
    } catch {
      /* non-fatal: still let them into the realtime room */
    }
    setJoined({ name, micOn, camOn });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-room-900 text-white">
        <div className="flex items-center gap-2 text-white/70">
          <Loader2 className="animate-spin" size={20} /> Loading meeting…
        </div>
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-room-900 p-4 text-white">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-room-700">
            <VideoOff size={26} className="text-white/70" />
          </div>
          <h1 className="text-lg font-semibold">Can&apos;t join this meeting</h1>
          <p className="mt-2 text-sm text-white/60">{error}</p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-lg bg-zoom-blue px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zoom-blue-dark"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!joined) {
    return <PreJoin meeting={meeting} defaultName={defaultName} onJoin={handleJoin} />;
  }

  return (
    <MeetingRoom
      meeting={meeting}
      displayName={joined.name}
      initialMic={joined.micOn}
      initialCam={joined.camOn}
    />
  );
}
