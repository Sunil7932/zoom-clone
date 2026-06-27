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
}

/**
 * Responsive video grid. Column count adapts to participant count so tiles stay
 * as large as possible — similar to Zoom's gallery view.
 */
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
}: Props) {
  const total = peers.length + 1;

  return (
    <div className="flex h-full w-full items-center justify-center p-3 sm:p-4">
      <div
        className={`grid w-full max-w-6xl gap-3 ${gridColsClass(total)}`}
      >
        <VideoTile
          name={selfName}
          stream={localStream}
          micOn={selfMic}
          camOn={selfCam}
          isSelf
          isHost={selfIsHost}
          handRaised={selfHandRaised}
          speaking={selfSpeaking}
        />
        {peers.map((p) => (
          <VideoTile
            key={p.id}
            name={p.name}
            stream={p.stream}
            micOn={p.micOn}
            camOn={p.camOn}
            isHost={p.isHost}
            handRaised={p.handRaised}
            speaking={p.speaking}
          />
        ))}
      </div>
    </div>
  );
}
