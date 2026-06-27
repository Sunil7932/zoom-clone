"use client";

import { Copy, Check, Loader2, Lock, Shield, ShieldCheck, Wifi, WifiOff, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { ChatPanel } from "./ChatPanel";
import { ControlBar } from "./ControlBar";
import { MeetingTimer } from "./MeetingTimer";
import { ParticipantsPanel } from "./ParticipantsPanel";
import { ReactionsOverlay } from "./ReactionsOverlay";
import { VideoGrid } from "./VideoGrid";
import { useMeeting } from "@/lib/useMeeting";
import { useActiveSpeaker } from "@/lib/useActiveSpeaker";
import { useToast } from "@/components/ui/Toast";
import { meetingLink } from "@/lib/config";
import { toDate } from "@/lib/format";
import type { Meeting } from "@/lib/types";

interface Props {
  meeting: Meeting;
  displayName: string;
  initialMic: boolean;
  initialCam: boolean;
}

type Panel = "none" | "participants" | "chat";

export function MeetingRoom({ meeting, displayName, initialMic, initialCam }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [panel, setPanel] = useState<Panel>("none");
  const [copied, setCopied] = useState(false);
  const [lastSeenChat, setLastSeenChat] = useState(0);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  // Meeting start time for the elapsed timer (server time if available).
  const [startedAt] = useState(() =>
    meeting.started_at ? toDate(meeting.started_at).getTime() : Date.now(),
  );

  const m = useMeeting({
    code: meeting.code,
    displayName,
    initialMic,
    initialCam,
    enabled: true,
  });

  // Who's currently talking (audio-level based), merged into self + peers.
  const speakingIds = useActiveSpeaker(m.localStream, m.peers);
  const selfSpeaking = speakingIds.has("self");
  const peersWithSpeaking = m.peers.map((p) => ({
    ...p,
    speaking: speakingIds.has(p.id),
  }));

  // Track unread chat while the chat panel is closed. lastSeen is updated in the
  // chat toggle handler (below) rather than an effect, to avoid extra renders.
  const unread =
    panel === "chat" ? 0 : Math.max(0, m.messages.length - lastSeenChat);

  const toggleChat = () => {
    setLastSeenChat(m.messages.length); // mark read on open or close
    setPanel((p) => (p === "chat" ? "none" : "chat"));
  };

  // If the host removed us, bounce to a friendly screen.
  const removedRef = useRef(false);
  useEffect(() => {
    if (m.removed && !removedRef.current) {
      removedRef.current = true;
      router.replace("/?removed=1");
    }
  }, [m.removed, router]);

  // Toast when peers join/leave (skips the initial population on entry).
  const prevPeersRef = useRef<Map<string, string>>(new Map());
  const peersInitedRef = useRef(false);
  useEffect(() => {
    const curr = new Map(m.peers.map((p) => [p.id, p.name]));
    if (!peersInitedRef.current) {
      peersInitedRef.current = true;
      prevPeersRef.current = curr;
      return;
    }
    const prev = prevPeersRef.current;
    curr.forEach((name, id) => {
      if (!prev.has(id)) toast.show(`${name} joined`);
    });
    prev.forEach((name, id) => {
      if (!curr.has(id)) toast.show(`${name} left`);
    });
    prevPeersRef.current = curr;
  }, [m.peers, toast]);

  // Keyboard shortcuts: M = toggle mic, V = toggle video (ignored while typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        m.toggleMic();
      } else if (e.key === "v" || e.key === "V") {
        e.preventDefault();
        m.toggleCam();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [m]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(meetingLink(meeting.code, meeting.invite_link));
      setCopied(true);
      toast.show("Invite link copied", "success");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* blocked */
    }
  };

  const leave = () => {
    m.leave();
    router.push("/");
  };

  // Host denied our entry — return to the dashboard.
  useEffect(() => {
    if (m.denied) router.replace("/");
  }, [m.denied, router]);

  // Lobby: waiting for the host to admit us.
  if (m.waiting) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-room-900 p-4 text-center text-white">
        <Loader2 className="mb-4 animate-spin text-zoom-blue-light" size={32} />
        <h1 className="text-xl font-semibold">Waiting for the host to let you in…</h1>
        <p className="mt-2 text-sm text-white/60">
          You&apos;re in the waiting room for &ldquo;{meeting.title}&rdquo;.
        </p>
        <button
          onClick={leave}
          className="mt-6 rounded-lg bg-room-700 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-room-tile"
        >
          Leave
        </button>
      </div>
    );
  }

  const muteAll = () => m.peers.forEach((p) => p.micOn && m.hostMute(p.id));

  return (
    <div className="relative flex h-screen flex-col bg-room-900">
      {/* Header */}
      <header className="flex items-center justify-between gap-3 border-b border-black/40 px-4 py-2.5 text-white">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex items-center gap-1.5 rounded-md bg-room-700 px-2 py-1 text-xs">
            <Lock size={12} className="text-green-400" /> Encrypted
          </span>
          <h1 className="hidden truncate text-sm font-medium sm:block">{meeting.title}</h1>
        </div>

        <div className="flex items-center gap-2 text-xs text-white/60">
          {m.status === "connected" ? (
            <Wifi size={14} className="text-green-400" />
          ) : (
            <WifiOff size={14} className="text-amber-400" />
          )}
          {m.status === "connecting" ? (
            <span className="text-amber-400">Reconnecting…</span>
          ) : (
            <span className="hidden sm:inline">
              <MeetingTimer startedAt={startedAt} />
            </span>
          )}
          {m.isHost && (
            <button
              onClick={m.toggleLock}
              aria-label={m.locked ? "Disable waiting room" : "Enable waiting room"}
              title={m.locked ? "Waiting room: on" : "Waiting room: off"}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-medium transition ${
                m.locked
                  ? "bg-zoom-blue text-white hover:bg-zoom-blue-dark"
                  : "bg-room-700 text-white hover:bg-room-tile"
              }`}
            >
              {m.locked ? <ShieldCheck size={13} /> : <Shield size={13} />}
              <span className="hidden sm:inline">{m.locked ? "Locked" : "Lock"}</span>
            </button>
          )}
          <button
            onClick={copyLink}
            className="ml-2 inline-flex items-center gap-1.5 rounded-md bg-room-700 px-2.5 py-1.5 font-medium text-white transition hover:bg-room-tile"
          >
            {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
            <span className="font-mono">{meeting.code}</span>
          </button>
        </div>
      </header>

      {/* Waiting-room knock requests (host) */}
      {m.isHost && m.knocks.length > 0 && (
        <div className="absolute left-1/2 top-16 z-40 w-[min(92vw,360px)] -translate-x-1/2 space-y-2">
          {m.knocks.map((k) => (
            <div
              key={k.id}
              className="flex items-center gap-3 rounded-xl bg-room-800 px-4 py-3 text-white shadow-2xl ring-1 ring-white/10"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">
                  <span className="font-semibold">{k.name}</span> wants to join
                </p>
              </div>
              <button
                onClick={() => m.admit(k.id)}
                className="inline-flex items-center gap-1 rounded-lg bg-zoom-blue px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-zoom-blue-dark"
              >
                <Check size={14} /> Admit
              </button>
              <button
                onClick={() => m.deny(k.id)}
                aria-label="Deny"
                className="inline-flex items-center gap-1 rounded-lg bg-room-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-room-tile"
              >
                <X size={14} /> Deny
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Body: grid + optional side panel */}
      <div className="relative flex min-h-0 flex-1">
        <main className="relative min-h-0 min-w-0 flex-1">
          <VideoGrid
            localStream={m.localStream}
            selfName={displayName}
            selfMic={m.micOn}
            selfCam={m.camOn}
            selfIsHost={m.isHost}
            selfHandRaised={m.handRaised}
            selfSpeaking={selfSpeaking}
            peers={peersWithSpeaking}
            pinnedId={pinnedId}
            onTogglePin={(id) => setPinnedId((prev) => (prev === id ? null : id))}
          />
          <ReactionsOverlay reactions={m.reactions} />
        </main>

        {panel !== "none" && (
          <div className="h-full border-l border-black/40">
            {panel === "participants" ? (
              <ParticipantsPanel
                selfName={displayName}
                selfMic={m.micOn}
                selfIsHost={m.isHost}
                selfHandRaised={m.handRaised}
                peers={peersWithSpeaking}
                onClose={() => setPanel("none")}
                onHostMute={m.hostMute}
                onHostRemove={m.hostRemove}
                onMuteAll={muteAll}
              />
            ) : (
              <ChatPanel
                messages={m.messages}
                onSend={m.sendChat}
                onClose={() => setPanel("none")}
              />
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <ControlBar
        micOn={m.micOn}
        camOn={m.camOn}
        sharing={m.sharing}
        handRaised={m.handRaised}
        participantsOpen={panel === "participants"}
        chatOpen={panel === "chat"}
        participantCount={m.peers.length + 1}
        unreadChat={unread > 0 ? unread : 0}
        onToggleMic={m.toggleMic}
        onToggleCam={m.toggleCam}
        onToggleShare={m.toggleScreenShare}
        onToggleHand={m.toggleHand}
        onReact={m.sendReaction}
        onToggleParticipants={() =>
          setPanel((p) => (p === "participants" ? "none" : "participants"))
        }
        onToggleChat={toggleChat}
        onLeave={leave}
      />
    </div>
  );
}
