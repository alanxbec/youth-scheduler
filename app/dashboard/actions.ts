"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateCm } from "@/lib/cm";
import { fromDateStr, isWeekday } from "@/lib/dates";
import { timeToMin, minToTime, toDayMeetings } from "@/lib/slots";
import type { Meeting, MeetingStatus } from "@/lib/types";

export interface ActionResult {
  ok?: boolean;
  error?: string;
}

async function requireCm() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  const cm = await getOrCreateCm(supabase, user);
  return { supabase, cm };
}

function parseMeetingFields(formData: FormData): {
  date: string;
  startMin: number;
  endMin: number;
  initials: string;
  notes: string | null;
  error?: string;
} {
  const date = String(formData.get("date") ?? "");
  const start = String(formData.get("start_time") ?? "");
  const duration = Number(formData.get("duration") ?? 0);
  const initials = String(formData.get("initials") ?? "")
    .trim()
    .toUpperCase();
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const bad = (error: string) => ({ date, startMin: 0, endMin: 0, initials, notes, error });

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return bad("Pick a date.");
  if (!isWeekday(fromDateStr(date))) return bad("Meetings are weekdays only (Mon–Fri).");
  if (!/^\d{2}:\d{2}$/.test(start)) return bad("Pick a start time.");
  if (!Number.isInteger(duration) || duration < 5 || duration > 240)
    return bad("Duration must be between 5 and 240 minutes.");
  if (!/^[A-Z]{1,4}$/.test(initials)) return bad("Initials: 1–4 letters (e.g. JD).");

  const startMin = timeToMin(start);
  const endMin = startMin + duration;
  if (endMin > 24 * 60) return bad("That meeting runs past midnight.");

  return { date, startMin, endMin, initials, notes };
}

/**
 * CM adds a meeting. CMs may place meetings anywhere (they can ignore their
 * own buffer on purpose), but overlapping an existing meeting is blocked.
 */
export async function addMeeting(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, cm } = await requireCm();
    const f = parseMeetingFields(formData);
    if (f.error) return { error: f.error };

    const { data: dayMeetings } = await supabase
      .from("meetings")
      .select("start_time,end_time")
      .eq("cm_id", cm.id)
      .eq("meeting_date", f.date);

    const overlaps = toDayMeetings(dayMeetings ?? []).some(
      (m) => f.startMin < m.end && f.endMin > m.start
    );
    if (overlaps) return { error: "That time overlaps an existing meeting." };

    const { error } = await supabase.from("meetings").insert({
      cm_id: cm.id,
      meeting_date: f.date,
      start_time: minToTime(f.startMin),
      end_time: minToTime(f.endMin),
      client_initials: f.initials,
      created_by: "cm",
      notes: f.notes,
    });
    if (error) {
      if (error.code === "23505") return { error: "A meeting already starts at that time." };
      return { error: error.message };
    }

    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function updateMeeting(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  try {
    const { supabase, cm } = await requireCm();
    const id = String(formData.get("id") ?? "");
    if (!id) return { error: "Missing meeting id." };

    const f = parseMeetingFields(formData);
    if (f.error) return { error: f.error };

    const { data: dayMeetings } = await supabase
      .from("meetings")
      .select("id,start_time,end_time")
      .eq("cm_id", cm.id)
      .eq("meeting_date", f.date)
      .neq("id", id);

    const overlaps = toDayMeetings((dayMeetings ?? []) as Pick<Meeting, "start_time" | "end_time">[]).some(
      (m) => f.startMin < m.end && f.endMin > m.start
    );
    if (overlaps) return { error: "That time overlaps an existing meeting." };

    const { error } = await supabase
      .from("meetings")
      .update({
        meeting_date: f.date,
        start_time: minToTime(f.startMin),
        end_time: minToTime(f.endMin),
        client_initials: f.initials,
        notes: f.notes,
      })
      .eq("id", id)
      .eq("cm_id", cm.id);
    if (error) return { error: error.message };

    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function setMeetingStatus(id: string, status: MeetingStatus): Promise<ActionResult> {
  try {
    const { supabase, cm } = await requireCm();
    if (!["scheduled", "completed", "missed"].includes(status)) return { error: "Bad status." };
    const { error } = await supabase
      .from("meetings")
      .update({ status })
      .eq("id", id)
      .eq("cm_id", cm.id);
    if (error) return { error: error.message };
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function deleteMeeting(id: string): Promise<ActionResult> {
  try {
    const { supabase, cm } = await requireCm();
    const { error } = await supabase.from("meetings").delete().eq("id", id).eq("cm_id", cm.id);
    if (error) return { error: error.message };
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}
