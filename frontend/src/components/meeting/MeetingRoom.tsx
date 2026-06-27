"use client";

import { Copy, Check, Lock, Wifi, WifiOff } from "lucide-react";
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
  const [panel, setPanel] = useState<Panel>("none");
  const [copied, setCopied] = useState(false);
  const [lastSeenChat, setLastSeenChat] = useState(0);
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
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* blocked */
    }
  };

  const leave = () => {
    m.leave();
    router.push("/");
  };

  const muteAll = () => m.peers.forEach((p) => p.micOn && m.hostMute(p.id));

  return (
    <div className="flex h-screen flex-col bg-room-900">
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
          <button
            onClick={copyLink}
            className="ml-2 inline-flex items-center gap-1.5 rounded-md bg-room-700 px-2.5 py-1.5 font-medium text-white transition hover:bg-room-tile"
          >
            {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
            <span className="font-mono">{meeting.code}</span>
          </button>
        </div>
      </header>

      {/* Body: grid + optional side panel */}
      <div className="flex min-h-0 flex-1">
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
