"use client";

import { MicOff, Mic, MoreVertical, UserX, X } from "lucide-react";
import { useState } from "react";

import { Avatar } from "@/components/ui/Avatar";
import type { Peer } from "@/lib/types";

interface Props {
  selfName: string;
  selfMic: boolean;
  selfIsHost: boolean;
  peers: Peer[];
  onClose: () => void;
  onHostMute: (id: string) => void;
  onHostRemove: (id: string) => void;
  onMuteAll: () => void;
}

/** Side panel listing everyone in the meeting, with host controls. */
export function ParticipantsPanel({
  selfName,
  selfMic,
  selfIsHost,
  peers,
  onClose,
  onHostMute,
  onHostRemove,
  onMuteAll,
}: Props) {
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const total = peers.length + 1;

  return (
    <aside className="flex h-full w-full flex-col bg-room-800 text-white sm:w-80">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h3 className="font-semibold">Participants ({total})</h3>
        <button
          onClick={onClose}
          aria-label="Close participants"
          className="rounded p-1 text-white/60 hover:bg-white/10 hover:text-white"
        >
          <X size={18} />
        </button>
      </div>

      <div className="dark-scroll flex-1 overflow-y-auto px-2 py-2">
        {/* Self */}
        <Row name={`${selfName} (You)`} micOn={selfMic} host={selfIsHost} />

        {/* Peers */}
        {peers.map((p) => (
          <div key={p.id} className="group relative">
            <Row
              name={p.name}
              micOn={p.micOn}
              host={p.isHost}
              onMenu={selfIsHost ? () => setMenuFor(menuFor === p.id ? null : p.id) : undefined}
            />
            {selfIsHost && menuFor === p.id && (
              <div className="absolute right-2 top-12 z-10 w-40 overflow-hidden rounded-lg bg-room-700 py-1 shadow-xl ring-1 ring-white/10">
                <button
                  onClick={() => {
                    onHostMute(p.id);
                    setMenuFor(null);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-white/10"
                >
                  <MicOff size={15} /> Mute
                </button>
                <button
                  onClick={() => {
                    onHostRemove(p.id);
                    setMenuFor(null);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-white/10"
                >
                  <UserX size={15} /> Remove
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {selfIsHost && peers.length > 0 && (
        <div className="border-t border-white/10 p-3">
          <button
            onClick={onMuteAll}
            className="w-full rounded-lg bg-room-700 py-2 text-sm font-medium text-white transition hover:bg-room-tile"
          >
            Mute all
          </button>
        </div>
      )}
    </aside>
  );
}

function Row({
  name,
  micOn,
  host,
  onMenu,
}: {
  name: string;
  micOn: boolean;
  host?: boolean;
  onMenu?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/5">
      <Avatar name={name.replace(" (You)", "")} size={36} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{name}</p>
        {host && <p className="text-xs text-zoom-blue-light">Host</p>}
      </div>
      {micOn ? (
        <Mic size={16} className="text-white/60" />
      ) : (
        <MicOff size={16} className="text-danger" />
      )}
      {onMenu && (
        <button
          onClick={onMenu}
          aria-label="Participant options"
          className="rounded p-1 text-white/50 hover:bg-white/10 hover:text-white"
        >
          <MoreVertical size={16} />
        </button>
      )}
    </div>
  );
}
