/**
 * ICE server configuration for WebRTC.
 *
 * Public STUN servers are enough for most networks (same LAN, typical home
 * NATs). For peers behind symmetric/corporate NATs a TURN relay is required —
 * add TURN credentials via NEXT_PUBLIC_TURN_* env vars in production.
 */
export function getIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ];

  const turnUrl = process.env.NEXT_PUBLIC_TURN_URL;
  const turnUser = process.env.NEXT_PUBLIC_TURN_USERNAME;
  const turnCred = process.env.NEXT_PUBLIC_TURN_CREDENTIAL;
  if (turnUrl && turnUser && turnCred) {
    servers.push({ urls: turnUrl, username: turnUser, credential: turnCred });
  }
  return servers;
}
