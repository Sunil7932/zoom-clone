/**
 * Runtime configuration. The API base URL is injected at build time via
 * NEXT_PUBLIC_API_URL so the same frontend bundle can point at localhost in
 * development and the deployed backend in production.
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8000";

/** Derive the websocket origin (ws:// or wss://) from the API base URL. */
export function wsBaseUrl(): string {
  return API_BASE_URL.replace(/^http/, "ws");
}

/**
 * Build the shareable meeting link from the *frontend's own* origin. This keeps
 * invite links correct on any deployment (localhost, Vercel, custom domain)
 * without depending on a backend-configured URL. Falls back to the backend's
 * value during SSR where `window` is unavailable.
 */
export function meetingLink(code: string, fallback?: string): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/meeting/${code}`;
  }
  return fallback ?? `/meeting/${code}`;
}
