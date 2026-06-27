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
