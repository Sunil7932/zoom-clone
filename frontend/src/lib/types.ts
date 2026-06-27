/** API types — mirror the backend Pydantic schemas. */

export type MeetingType = "instant" | "scheduled";
export type MeetingStatus = "scheduled" | "active" | "ended";
export type ParticipantRole = "host" | "participant";

export interface User {
  id: number;
  name: string;
  email: string;
  avatar_color: string;
}

export interface Meeting {
  id: number;
  code: string;
  title: string;
  description: string | null;
  type: MeetingType;
  status: MeetingStatus;
  host: User;
  scheduled_start: string | null;
  duration_minutes: number | null;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
  invite_link: string;
  participant_count: number;
}

export interface MeetingList {
  upcoming: Meeting[];
  recent: Meeting[];
}

export interface Participant {
  id: number;
  display_name: string;
  role: ParticipantRole;
  is_muted: boolean;
  is_video_on: boolean;
  joined_at: string;
  left_at: string | null;
}

export interface JoinResponse {
  meeting: Meeting;
  participant: Participant;
}

/** A live peer in the WebRTC mesh (client-side only). */
export interface Peer {
  id: string;
  name: string;
  micOn: boolean;
  camOn: boolean;
  isHost: boolean;
  stream?: MediaStream;
}

export interface ChatMessage {
  id: string;
  name: string;
  text: string;
  ts: string;
  self?: boolean;
}
