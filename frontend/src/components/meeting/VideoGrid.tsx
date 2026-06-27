"use client";

import { VideoTile } from "./VideoTile";
import type { Peer } from "@/lib/types";

interface Props {
  localStream: MediaStream | null;
  selfName: string;
  selfMic: boolean;
  selfCam: boolean;
  selfIsHost: boolean;
  selfHandRaised: boolean;
  selfSpeaking: boolean;
  peers: Peer[];
  pinnedId: string | null;
  onTogglePin: (id: string) => void;
}

/** A normalised tile descriptor for both self and remote peers. */
interface TileData {
  id: string;
  name: string;
  stream?: MediaStream | null;
  micOn: boolean;
  camOn: boolean;
  isSelf: boolean;
  isHost: boolean;
  handRaised?: boolean;
  speaking?: boolean;
}

function gridColsClass(count: number): string {
  if (count <= 1) return "grid-cols-1";
  if (count <= 2) return "grid-cols-1 sm:grid-cols-2";
  if (count <= 4) return "grid-cols-2";
  if (count <= 6) return "grid-cols-2 lg:grid-cols-3";
  if (count <= 9) return "grid-cols-2 sm:grid-cols-3";
  return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4";
}

export function VideoGrid({
  localStream,
  selfName,
  selfMic,
  selfCam,
  selfIsHost,
  selfHandRaised,
  selfSpeaking,
  peers,
  pinnedId,
  onTogglePin,
}: Props) {
  const tiles: TileData[] = [
    {
      id: "self",
      name: selfName,
      stream: localStream,
      micOn: selfMic,
      camOn: selfCam,
      isSelf: true,
      isHost: selfIsHost,
      handRaised: selfHandRaised,
      speaking: selfSpeaking,
    },
    ...peers.map((p) => ({
      id: p.id,
      name: p.name,
      stream: p.stream,
      micOn: p.micOn,
      camOn: p.camOn,
      isSelf: false,
      isHost: p.isHost,
      handRaised: p.handRaised,
      speaking: p.speaking,
    })),
  ];

  const render = (t: TileData) => (
    <VideoTile
      key={t.id}
      name={t.name}
      stream={t.stream}
      micOn={t.micOn}
      camOn={t.camOn}
      isSelf={t.isSelf}
      isHost={t.isHost}
      handRaised={t.handRaised}
      speaking={t.speaking}
      pinned={pinnedId === t.id}
      onTogglePin={() => onTogglePin(t.id)}
    />
  );

  const pinned = pinnedId ? tiles.find((t) => t.id === pinnedId) : undefined;

  // --- Speaker (spotlight) view ---------------------------------------- //
  if (pinned) {
    const others = tiles.filter((t) => t.id !== pinned.id);
    return (
      <div className="flex h-full w-full flex-col gap-3 p-3 sm:p-4">
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <div className="h-full max-h-full w-full max-w-5xl">{render(pinned)}</div>
        </div>
        {others.length > 0 && (
          <div className="dark-scroll flex shrink-0 gap-3 overflow-x-auto pb-1">
            {others.map((t) => (
              <div key={t.id} className="w-40 shrink-0 sm:w-48">
                {render(t)}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // --- Gallery view ----------------------------------------------------- //
  return (
    <div className="flex h-full w-full items-center justify-center p-3 sm:p-4">
      <div className={`grid w-full max-w-6xl gap-3 ${gridColsClass(tiles.length)}`}>
        {tiles.map(render)}
      </div>
    </div>
  );
}
