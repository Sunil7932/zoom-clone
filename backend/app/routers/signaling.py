"""WebRTC signaling + in-meeting realtime layer (WebSocket).

The browsers do the actual media (a WebRTC *mesh*: every peer connects directly
to every other peer). This server is the **signaling channel** that lets peers
find each other and exchange the SDP offers/answers and ICE candidates needed to
establish those direct connections. It also relays lightweight room events:
media-state changes, chat messages and host controls.

Message protocol (JSON, both directions)
----------------------------------------
Client -> Server:
  {type: "join", name, micOn, camOn}            announce presence
  {type: "signal", to, data}                     relay SDP/ICE to one peer
  {type: "media-state", micOn, camOn}            broadcast my mic/cam state
  {type: "chat", text}                           send a chat message
  {type: "host:mute", target}                    ask a peer to mute (host only)
  {type: "host:remove", target}                  remove a peer (host only)
  {type: "leave"}                                graceful disconnect

Server -> Client:
  {type: "welcome", selfId, peers:[...]}         your id + everyone already here
  {type: "peer-joined", peer}                    someone new arrived
  {type: "peer-left", id}                        someone left
  {type: "signal", from, data}                   relayed SDP/ICE
  {type: "media-state", id, micOn, camOn}        a peer changed media state
  {type: "chat", id, name, text, ts}             a chat message
  {type: "force-mute"}                           host asked you to mute
  {type: "removed"}                              host removed you (then close)
  {type: "host-changed", id}                     host role moved to a peer
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Dict, List

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter(tags=["signaling"])


class Peer:
    def __init__(self, ws: WebSocket, name: str, mic_on: bool, cam_on: bool):
        self.id = uuid.uuid4().hex[:12]
        self.ws = ws
        self.name = name
        self.mic_on = mic_on
        self.cam_on = cam_on
        self.is_host = False
        self.hand_raised = False

    def public(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "micOn": self.mic_on,
            "camOn": self.cam_on,
            "isHost": self.is_host,
            "handRaised": self.hand_raised,
        }


class Room:
    """In-memory set of connected peers for one meeting code."""

    def __init__(self, code: str):
        self.code = code
        self.peers: Dict[str, Peer] = {}

    async def broadcast(self, message: dict, exclude: str | None = None) -> None:
        for pid, peer in list(self.peers.items()):
            if pid == exclude:
                continue
            await _safe_send(peer.ws, message)

    async def send_to(self, peer_id: str, message: dict) -> None:
        peer = self.peers.get(peer_id)
        if peer:
            await _safe_send(peer.ws, message)


class RoomManager:
    def __init__(self):
        self.rooms: Dict[str, Room] = {}

    def get(self, code: str) -> Room:
        if code not in self.rooms:
            self.rooms[code] = Room(code)
        return self.rooms[code]

    def cleanup(self, code: str) -> None:
        room = self.rooms.get(code)
        if room and not room.peers:
            self.rooms.pop(code, None)


manager = RoomManager()


async def _safe_send(ws: WebSocket, message: dict) -> None:
    try:
        await ws.send_json(message)
    except Exception:
        # Peer socket already closed; broadcast loops tolerate this.
        pass


@router.websocket("/ws/meeting/{code}")
async def meeting_socket(websocket: WebSocket, code: str):
    await websocket.accept()
    room = manager.get(code)
    peer: Peer | None = None

    try:
        while True:
            msg = await websocket.receive_json()
            mtype = msg.get("type")

            # ---- join: first message establishes the peer ------------------ #
            if mtype == "join" and peer is None:
                peer = Peer(
                    websocket,
                    name=str(msg.get("name", "Guest"))[:120],
                    mic_on=bool(msg.get("micOn", True)),
                    cam_on=bool(msg.get("camOn", True)),
                )
                # First peer in the room is the host.
                peer.is_host = len(room.peers) == 0
                existing = [p.public() for p in room.peers.values()]
                room.peers[peer.id] = peer

                await _safe_send(
                    websocket,
                    {"type": "welcome", "selfId": peer.id, "peers": existing,
                     "isHost": peer.is_host},
                )
                await room.broadcast(
                    {"type": "peer-joined", "peer": peer.public()},
                    exclude=peer.id,
                )
                continue

            if peer is None:
                continue  # ignore anything before a valid join

            # ---- relay SDP / ICE to a specific peer ------------------------ #
            if mtype == "signal":
                target = msg.get("to")
                await room.send_to(
                    target,
                    {"type": "signal", "from": peer.id, "data": msg.get("data")},
                )

            # ---- broadcast my mic/cam state -------------------------------- #
            elif mtype == "media-state":
                peer.mic_on = bool(msg.get("micOn", peer.mic_on))
                peer.cam_on = bool(msg.get("camOn", peer.cam_on))
                await room.broadcast(
                    {"type": "media-state", "id": peer.id,
                     "micOn": peer.mic_on, "camOn": peer.cam_on},
                    exclude=peer.id,
                )

            # ---- chat ------------------------------------------------------- #
            elif mtype == "chat":
                text = str(msg.get("text", "")).strip()[:2000]
                if text:
                    await room.broadcast({
                        "type": "chat",
                        "id": peer.id,
                        "name": peer.name,
                        "text": text,
                        "ts": datetime.now(timezone.utc).isoformat(),
                    })

            # ---- raise / lower hand ---------------------------------------- #
            elif mtype == "raise-hand":
                peer.hand_raised = bool(msg.get("raised", False))
                await room.broadcast(
                    {"type": "hand", "id": peer.id, "raised": peer.hand_raised}
                )

            # ---- emoji reactions ------------------------------------------- #
            elif mtype == "reaction":
                emoji = str(msg.get("emoji", ""))[:8]
                if emoji:
                    await room.broadcast(
                        {"type": "reaction", "id": peer.id, "name": peer.name, "emoji": emoji}
                    )

            # ---- host controls --------------------------------------------- #
            elif mtype == "host:mute" and peer.is_host:
                await room.send_to(msg.get("target"), {"type": "force-mute"})

            elif mtype == "host:remove" and peer.is_host:
                target_id = msg.get("target")
                await room.send_to(target_id, {"type": "removed"})
                removed = room.peers.pop(target_id, None)
                if removed:
                    await room.broadcast({"type": "peer-left", "id": target_id})

            elif mtype == "leave":
                break

    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        if peer is not None:
            room.peers.pop(peer.id, None)
            await room.broadcast({"type": "peer-left", "id": peer.id})
            # If the host left, promote the next peer so host controls survive.
            if peer.is_host and room.peers:
                new_host = next(iter(room.peers.values()))
                new_host.is_host = True
                await room.broadcast({"type": "host-changed", "id": new_host.id})
        manager.cleanup(code)
