export type MeetingStatus = "scheduled" | "completed" | "missed";

export interface CaseManager {
  id: string;
  auth_user_id: string;
  name: string;
  email: string;
  share_token: string;
  buffer_minutes: number;
  work_start: string; // "HH:MM:SS" from Postgres time
  work_end: string;
  slot_minutes: number;
  created_at: string;
}

export interface Meeting {
  id: string;
  cm_id: string;
  meeting_date: string; // "YYYY-MM-DD"
  start_time: string; // "HH:MM:SS"
  end_time: string;
  client_initials: string;
  status: MeetingStatus;
  created_by: "client" | "cm";
  notes: string | null;
  created_at: string;
}
