/** Thin, typed REST client for the backend API. */
import { API_BASE_URL } from "./config";
import type {
  JoinResponse,
  Meeting,
  MeetingList,
  User,
} from "./types";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
      cache: "no-store",
    });
  } catch {
    throw new ApiError(0, "Cannot reach the server. Is the backend running?");
  }

  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, detail);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  me: () => request<User>("/api/me"),

  listMeetings: () => request<MeetingList>("/api/meetings"),

  getMeeting: (code: string) => request<Meeting>(`/api/meetings/${code}`),

  createInstant: (title?: string) =>
    request<Meeting>("/api/meetings/instant", {
      method: "POST",
      body: JSON.stringify(title ? { title } : {}),
    }),

  schedule: (data: {
    title: string;
    description?: string;
    scheduled_start: string;
    duration_minutes: number;
  }) =>
    request<Meeting>("/api/meetings/schedule", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  join: (code: string, display_name: string) =>
    request<JoinResponse>(`/api/meetings/${code}/join`, {
      method: "POST",
      body: JSON.stringify({ display_name }),
    }),

  end: (code: string) =>
    request<Meeting>(`/api/meetings/${code}/end`, { method: "POST" }),
};
