"use client";

/**
 * useActiveSpeaker — detects who is currently talking by sampling audio levels.
 *
 * Creates one Web Audio AnalyserNode per stream (local = "self", plus each
 * remote peer) and, on a short interval, computes RMS volume to decide who is
 * "speaking". Returns a Set of ids so tiles can highlight the active speaker —
 * exactly like Zoom's speaking ring. State only updates when the set changes,
 * so it does not cause render churn.
 */
import { useEffect, useRef, useState } from "react";

import type { Peer } from "./types";

const SPEAKING_THRESHOLD = 0.045; // RMS above this = talking
const SAMPLE_MS = 250;

interface Analysed {
  source: MediaStreamAudioSourceNode;
  analyser: AnalyserNode;
  buf: Uint8Array<ArrayBuffer>;
}

export function useActiveSpeaker(
  localStream: MediaStream | null,
  peers: Peer[],
): Set<string> {
  const [speaking, setSpeaking] = useState<Set<string>>(new Set());
  const ctxRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<Map<string, Analysed>>(new Map());

  useEffect(() => {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;

    if (!ctxRef.current) ctxRef.current = new AudioCtx();
    const ctx = ctxRef.current;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});

    // Desired streams keyed by id.
    const wanted = new Map<string, MediaStream>();
    if (localStream && localStream.getAudioTracks().length) {
      wanted.set("self", localStream);
    }
    for (const p of peers) {
      if (p.stream && p.stream.getAudioTracks().length) wanted.set(p.id, p.stream);
    }

    // Add analysers for new streams.
    for (const [id, stream] of wanted) {
      if (nodesRef.current.has(id)) continue;
      try {
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        nodesRef.current.set(id, {
          source,
          analyser,
          buf: new Uint8Array(analyser.fftSize),
        });
      } catch {
        /* stream may have no analysable audio */
      }
    }
    // Remove analysers for streams that are gone.
    for (const id of [...nodesRef.current.keys()]) {
      if (!wanted.has(id)) {
        nodesRef.current.get(id)?.source.disconnect();
        nodesRef.current.delete(id);
      }
    }

    const interval = setInterval(() => {
      const now = new Set<string>();
      for (const [id, { analyser, buf }] of nodesRef.current) {
        analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = (buf[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / buf.length);
        if (rms > SPEAKING_THRESHOLD) now.add(id);
      }
      setSpeaking((prev) => {
        if (prev.size === now.size && [...now].every((id) => prev.has(id))) {
          return prev; // unchanged — skip re-render
        }
        return now;
      });
    }, SAMPLE_MS);

    return () => clearInterval(interval);
  }, [localStream, peers]);

  // Tear down the audio context on unmount. Capture the stable refs locally.
  useEffect(() => {
    const nodes = nodesRef.current;
    return () => {
      nodes.forEach((n) => n.source.disconnect());
      nodes.clear();
      ctxRef.current?.close().catch(() => {});
      ctxRef.current = null;
    };
  }, []);

  return speaking;
}
