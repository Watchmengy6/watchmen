// Real schema types are generated into ./database.generated.ts via
//   npx supabase gen types typescript --project-id <ref> --schema public
// `Database` is re-exported here for INCREMENTAL adoption (type a specific
// query/module as needed). It is NOT yet wired as the generic on the
// Supabase client factories: doing that globally surfaced ~429 pre-existing
// type mismatches (client/postgrest-js version + this codebase's untyped
// query style), so a global switch needs a dedicated refactor. Adopt per
// call-site. The hand-written enums + interfaces below remain for existing
// imports and narrow union typing.
export type { Database, Json } from "./database.generated";

export type UserRole = "super_admin" | "admin" | "member";
export type UserStatus = "pending" | "approved" | "rejected";
export type EventStatus = "draft" | "published" | "cancelled" | "completed";
export type RsvpStatus = "going" | "maybe" | "not_going";
export type ChatType = "main" | "event";
export type MediaType = "none" | "image" | "video";

export interface Profile {
  id: string;
  auth_user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  profile_photo_url: string | null;
  bio: string | null;
  occupation: string | null;
  company: string | null;
  instagram_url: string | null;
  interests: string[];
  role: UserRole;
  status: UserStatus;
  points_total: number;
  invited_by_user_id: string | null;
  invite_code: string;
  created_at: string;
  updated_at: string;
  last_active_at: string | null;
  // App Store readiness columns (migration 00019)
  disclaimer_accepted_at?: string | null;
  deleted_at?: string | null;
}

export interface Event {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  location_name: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  image_url: string | null;
  created_by_user_id: string;
  status: EventStatus;
  created_at: string;
  updated_at: string;
}

export interface EventRsvp {
  id: string;
  event_id: string;
  user_id: string;
  status: RsvpStatus;
  checked_in: boolean;
  checked_in_at: string | null;
  checkin_latitude: number | null;
  checkin_longitude: number | null;
  created_at: string;
}

export interface Chat {
  id: string;
  type: ChatType;
  event_id: string | null;
  title: string;
  created_at: string;
}

export interface Message {
  id: string;
  chat_id: string;
  user_id: string;
  content: string | null;
  media_url: string | null;
  media_type: MediaType;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  reaction_type: string;
  created_at: string;
}

export interface Poll {
  id: string;
  chat_id: string | null;
  event_id: string | null;
  question: string;
  created_by_user_id: string;
  created_at: string;
  closes_at: string | null;
}

export interface PollOption {
  id: string;
  poll_id: string;
  option_text: string;
  created_at: string;
}

export interface PollVote {
  id: string;
  poll_id: string;
  poll_option_id: string;
  user_id: string;
  created_at: string;
}

export interface PointsLedgerEntry {
  id: string;
  user_id: string;
  action_type: string;
  points: number;
  related_entity_type: string | null;
  related_entity_id: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  read: boolean;
  related_entity_type: string | null;
  related_entity_id: string | null;
  created_at: string;
}
