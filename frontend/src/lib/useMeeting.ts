"use client";

/**
 * useMeeting — the client-side meeting engine.
 *
 * Responsibilities:
 *  - Acquire local camera/mic and expose toggles + screen-share.
 *  - Maintain the signaling WebSocket to the backend.
 *  - Build a WebRTC *mesh*: one RTCPeerConnection per remote peer.
 *  - Track remote peers + their media streams/state for rendering.
 *  - Relay and surface chat messages and host controls.
 *
 * Mesh negotiation rule (avoids "glare"): the **newcomer** sends the offer to
 * every peer already in the room; existing peers only ever answer. New arrivals
 * after us announce via "peer-joined" and will send *us* their offer.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import { wsBaseUrl } from "./config";
import { getIceServers } from "./iceServers";
import { getDeviceIds } from "./identity";
import type { ChatMessage, Peer, Reaction } from "./types";

export type ConnStatus = "connecting" | "connected" | "error" | "closed";

interface PeerConn {
  pc: RTCPeerConnection;
  info: Peer;
}

interface UseMeetingArgs {
  code: string;
  displayName: string;
  initialMic: boolean;
  initialCam: boolean;
  enabled: boolean;
}

export function useMeeting({
  code,
  displayName,
  initialMic,
  initialCam,
  enabled,
}: UseMeetingArgs) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [micOn, setMicOn] = useState(initialMic);
  const [camOn, setCamOn] = useState(initialCam);
  const [sharing, setSharing] = useState(false);
  const [selfId, setSelfId] = useState<string>("");
  const [isHost, setIsHost] = useState(false);
  const [status, setStatus] = useState<ConnStatus>("connecting");
  const [forceMuted, setForceMuted] = useState(false);
  const [removed, setRemoved] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  // Waiting-room state.
  const [waiting, setWaiting] = useState(false);
  const [denied, setDenied] = useState(false);
  const [locked, setLocked] = useState(false);
  const [knocks, setKnocks] = useState<{ id: string; name: string }[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const pcsRef = useRef<Map<string, PeerConn>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null);
  const selfIdRef = useRef("");
  const micRef = useRef(initialMic);
  const camRef = useRef(initialCam);
  // Reconnection bookkeeping.
  const userLeftRef = useRef(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptsRef = useRef(0);

  // --- helpers ------------------------------------------------------------ //
  const syncPeers = useCallback(() => {
    setPeers(Array.from(pcsRef.current.values()).map((p) => p.info));
  }, []);

  const send = useCallback((msg: Record<string, unknown>) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  }, []);

  // Create (or fetch) a peer connection for a remote peer id.
  const ensurePc = useCallback(
    (peer: Peer): PeerConn => {
      const existing = pcsRef.current.get(peer.id);
      if (existing) return existing;

      const pc = new RTCPeerConnection({ iceServers: getIceServers() });

      // Push our local tracks to this peer.
      const stream = localStreamRef.current;
      if (stream) {
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      }

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          send({ type: "signal", to: peer.id, data: { candidate: e.candidate } });
        }
      };

      pc.ontrack = (e) => {
        const conn = pcsRef.current.get(peer.id);
        if (conn) {
          conn.info = { ...conn.info, stream: e.streams[0] };
          pcsRef.current.set(peer.id, conn);
          syncPeers();
        }
      };

      pc.onconnectionstatechange = () => {
        if (
          pc.connectionState === "failed" ||
          pc.connectionState === "closed"
        ) {
          // Leave cleanup to peer-left; failed connections may recover via ICE.
        }
      };

      const conn: PeerConn = { pc, info: { ...peer } };
      pcsRef.current.set(peer.id, conn);
      syncPeers();
      return conn;
    },
    [send, syncPeers],
  );

  const closePc = useCallback(
    (id: string) => {
      const conn = pcsRef.current.get(id);
      if (conn) {
        try {
          conn.pc.close();
        } catch {
          /* noop */
        }
        pcsRef.current.delete(id);
        syncPeers();
      }
    },
    [syncPeers],
  );

  // As the newcomer, send an SDP offer to every peer already in the room.
  const offerToPeers = useCallback(
    async (peerList: Peer[]) => {
      for (const p of peerList) {
        const { pc } = ensurePc(p);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        send({ type: "signal", to: p.id, data: { sdp: pc.localDescription } });
      }
    },
    [ensurePc, send],
  );

  // --- main effect: media + websocket ------------------------------------ //
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    userLeftRef.current = false;
    attemptsRef.current = 0;
    // The Map identity is stable for the effect's lifetime (we only mutate it),
    // so capturing it here is safe to use in the cleanup below.
    const pcs = pcsRef.current;

    async function start() {
      // 1) Acquire local media (best-effort: audio-only if no camera).
      //    Honour the user's selected camera/mic from the pre-join screen.
      const { camId, micId } = getDeviceIds();
      const videoConstraint: MediaTrackConstraints | boolean = camId
        ? { deviceId: { ideal: camId } }
        : true;
      const audioConstraint: MediaTrackConstraints | boolean = micId
        ? { deviceId: { ideal: micId } }
        : true;
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraint,
          audio: audioConstraint,
        });
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch {
          stream = new MediaStream();
        }
      }
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      // Apply initial mic/cam preferences.
      stream.getAudioTracks().forEach((t) => (t.enabled = micRef.current));
      stream.getVideoTracks().forEach((t) => (t.enabled = camRef.current));
      cameraTrackRef.current = stream.getVideoTracks()[0] || null;
      localStreamRef.current = stream;
      setLocalStream(stream);

      // 2) Connect the signaling socket (auto-reconnects on unexpected drop).
      connect();
    }

    function scheduleReconnect() {
      if (cancelled || userLeftRef.current) {
        setStatus("closed");
        return;
      }
      // Tear down stale peer connections; the mesh rebuilds after we rejoin.
      pcsRef.current.forEach((c) => c.pc.close());
      pcsRef.current.clear();
      syncPeers();
      attemptsRef.current += 1;
      const delay = Math.min(1000 * 2 ** attemptsRef.current, 8000); // capped backoff
      setStatus("connecting");
      reconnectTimerRef.current = setTimeout(connect, delay);
    }

    function connect() {
      const ws = new WebSocket(`${wsBaseUrl()}/ws/meeting/${code}`);
      wsRef.current = ws;

      ws.onopen = () => {
        attemptsRef.current = 0;
        setStatus("connected");
        send({
          type: "join",
          name: displayName,
          micOn: micRef.current,
          camOn: camRef.current,
        });
      };

      ws.onerror = () => setStatus("error");
      ws.onclose = () => {
        if (cancelled || userLeftRef.current) {
          setStatus("closed");
        } else {
          scheduleReconnect();
        }
      };

      ws.onmessage = async (event) => {
        const msg = JSON.parse(event.data);
        switch (msg.type) {
          case "welcome": {
            setSelfId(msg.selfId);
            selfIdRef.current = msg.selfId;
            setIsHost(!!msg.isHost);
            setLocked(!!msg.locked);
            await offerToPeers(msg.peers as Peer[]);
            break;
          }

          case "waiting":
            setWaiting(true);
            break;

          case "admitted": {
            setWaiting(false);
            setSelfId(msg.selfId);
            selfIdRef.current = msg.selfId;
            setIsHost(!!msg.isHost);
            setLocked(!!msg.locked);
            await offerToPeers(msg.peers as Peer[]);
            break;
          }

          case "denied":
            setDenied(true);
            userLeftRef.current = true; // host rejected — do not reconnect
            ws.close();
            break;

          case "error":
            // Server rejected the connection (e.g. meeting ended) — don't retry.
            setDenied(true);
            userLeftRef.current = true;
            ws.close();
            break;

          case "knock":
            setKnocks((prev) =>
              prev.some((k) => k.id === msg.id)
                ? prev
                : [...prev, { id: msg.id, name: msg.name }],
            );
            break;

          case "locked":
            setLocked(!!msg.locked);
            break;

          case "peer-joined": {
            // Someone arrived after us — prepare a pc; they will offer to us.
            ensurePc(msg.peer as Peer);
            // If they were in our knock list (just admitted), clear it.
            setKnocks((prev) => prev.filter((k) => k.id !== msg.peer.id));
            break;
          }

          case "signal": {
            const from = msg.from as string;
            const data = msg.data;
            let conn = pcsRef.current.get(from);
            if (!conn) {
              conn = ensurePc({
                id: from,
                name: "Participant",
                micOn: true,
                camOn: true,
                isHost: false,
              });
            }
            const pc = conn.pc;
            if (data.sdp) {
              await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
              if (data.sdp.type === "offer") {
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                send({ type: "signal", to: from, data: { sdp: pc.localDescription } });
              }
            } else if (data.candidate) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
              } catch {
                /* candidate may arrive before remote desc; browser queues most */
              }
            }
            break;
          }

          case "media-state": {
            const conn = pcsRef.current.get(msg.id);
            if (conn) {
              conn.info = { ...conn.info, micOn: msg.micOn, camOn: msg.camOn };
              pcsRef.current.set(msg.id, conn);
              syncPeers();
            }
            break;
          }

          case "hand": {
            const conn = pcsRef.current.get(msg.id);
            if (conn) {
              conn.info = { ...conn.info, handRaised: msg.raised };
              pcsRef.current.set(msg.id, conn);
              syncPeers();
            }
            break;
          }

          case "reaction": {
            const key = `${msg.id}-${Date.now()}-${Math.random()}`;
            setReactions((prev) => [
              ...prev,
              { key, id: msg.id, name: msg.name, emoji: msg.emoji },
            ]);
            // Auto-remove after the float animation.
            setTimeout(
              () => setReactions((prev) => prev.filter((r) => r.key !== key)),
              4000,
            );
            break;
          }

          case "peer-left":
            closePc(msg.id);
            break;

          case "host-changed":
            if (msg.id === selfIdRef.current) setIsHost(true);
            break;

          case "chat":
            setMessages((prev) => [
              ...prev,
              {
                id: msg.id,
                name: msg.name,
                text: msg.text,
                ts: msg.ts,
                self: msg.id === selfIdRef.current,
              },
            ]);
            break;

          case "force-mute":
            setForceMuted(true);
            localStreamRef.current
              ?.getAudioTracks()
              .forEach((t) => (t.enabled = false));
            micRef.current = false;
            setMicOn(false);
            send({ type: "media-state", micOn: false, camOn: camRef.current });
            break;

          case "removed":
            setRemoved(true);
            userLeftRef.current = true; // host kicked us — do not reconnect
            ws.close();
            break;
        }
      };
    }

    start();

    return () => {
      cancelled = true;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      try {
        wsRef.current?.send(JSON.stringify({ type: "leave" }));
      } catch {
        /* noop */
      }
      wsRef.current?.close();
      pcs.forEach((c) => c.pc.close());
      pcs.clear();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, code]);

  // --- controls ----------------------------------------------------------- //
  const toggleMic = useCallback(() => {
    if (forceMuted) setForceMuted(false);
    const next = !micRef.current;
    micRef.current = next;
    setMicOn(next);
    localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = next));
    send({ type: "media-state", micOn: next, camOn: camRef.current });
  }, [forceMuted, send]);

  const toggleCam = useCallback(() => {
    const next = !camRef.current;
    camRef.current = next;
    setCamOn(next);
    localStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = next));
    send({ type: "media-state", micOn: micRef.current, camOn: next });
  }, [send]);

  const toggleScreenShare = useCallback(async () => {
    if (sharing) {
      // Restore camera track on all peers.
      const camTrack = cameraTrackRef.current;
      pcsRef.current.forEach(({ pc }) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (sender && camTrack) sender.replaceTrack(camTrack);
      });
      if (camTrack && localStreamRef.current) {
        // already in stream
      }
      setSharing(false);
      return;
    }
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = display.getVideoTracks()[0];
      pcsRef.current.forEach(({ pc }) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (sender) sender.replaceTrack(screenTrack);
      });
      // Show screen locally too.
      if (localStreamRef.current) {
        const oldVideo = localStreamRef.current.getVideoTracks()[0];
        if (oldVideo) localStreamRef.current.removeTrack(oldVideo);
        localStreamRef.current.addTrack(screenTrack);
        setLocalStream(
          new MediaStream(localStreamRef.current.getTracks()),
        );
      }
      setSharing(true);
      screenTrack.onended = () => {
        const camTrack = cameraTrackRef.current;
        pcsRef.current.forEach(({ pc }) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === "video");
          if (sender && camTrack) sender.replaceTrack(camTrack);
        });
        if (localStreamRef.current && camTrack) {
          localStreamRef.current
            .getVideoTracks()
            .forEach((t) => localStreamRef.current?.removeTrack(t));
          localStreamRef.current.addTrack(camTrack);
          setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
        }
        setSharing(false);
      };
    } catch {
      /* user cancelled the picker */
    }
  }, [sharing]);

  const sendChat = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (trimmed) send({ type: "chat", text: trimmed });
    },
    [send],
  );

  const toggleHand = useCallback(() => {
    setHandRaised((prev) => {
      const next = !prev;
      send({ type: "raise-hand", raised: next });
      return next;
    });
  }, [send]);

  const sendReaction = useCallback(
    (emoji: string) => send({ type: "reaction", emoji }),
    [send],
  );

  const toggleLock = useCallback(() => {
    setLocked((prev) => {
      const next = !prev;
      send({ type: "lock", locked: next });
      return next;
    });
  }, [send]);

  const admit = useCallback(
    (id: string) => {
      send({ type: "admit", id });
      setKnocks((prev) => prev.filter((k) => k.id !== id));
    },
    [send],
  );

  const deny = useCallback(
    (id: string) => {
      send({ type: "deny", id });
      setKnocks((prev) => prev.filter((k) => k.id !== id));
    },
    [send],
  );

  const hostMute = useCallback(
    (peerId: string) => send({ type: "host:mute", target: peerId }),
    [send],
  );
  const hostRemove = useCallback(
    (peerId: string) => send({ type: "host:remove", target: peerId }),
    [send],
  );

  const leave = useCallback(() => {
    userLeftRef.current = true; // intentional exit — suppress auto-reconnect
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    try {
      wsRef.current?.send(JSON.stringify({ type: "leave" }));
    } catch {
      /* noop */
    }
    wsRef.current?.close();
  }, []);

  return {
    localStream,
    peers,
    messages,
    micOn,
    camOn,
    sharing,
    selfId,
    isHost,
    status,
    forceMuted,
    removed,
    handRaised,
    reactions,
    waiting,
    denied,
    locked,
    knocks,
    displayName,
    toggleMic,
    toggleCam,
    toggleScreenShare,
    toggleHand,
    sendReaction,
    sendChat,
    toggleLock,
    admit,
    deny,
    hostMute,
    hostRemove,
    leave,
  };
}
