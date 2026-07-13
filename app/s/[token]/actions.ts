"use server";

// Public booking action. Runs with the service-role key (bypasses RLS) but is
// scoped to exactly one CM: the one resolved from the unguessable share_token.
// Everything the client sends is re-validated here — including the buffer
// rule — so two youth can't grab the same or too-close slots (race guard).

import { createAdminClient } from "@/lib/supabase/admin";
import { addDays, fromDateStr, isWeekday, mondayOf, toDateStr } from "@/lib/dates";
import { availableSlots, conflictsWithDay, minToTime, timeToMin, toDayMeetings } from "@/lib/slots";
import type { CaseManager, Meeting } from "@/lib/types";

export interface BookResult {
  ok?: boolean;
  error?: string;
}

export async function bookSlot(
  token: string,
  date: string,
  startMin: number,
  rawInitials: string
): Promise<BookResult> {
  const initials = rawInitials.trim().toUpperCase();

  if (!/^[a-f0-9]{16,64}$/i.test(token)) return { error: "This link isn't valid." };
  if (!/^[A-Z]{1,4}$/.test(initials))
    return { error: "Please enter your initials — 1 to 4 letters." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isInteger(startMin))
    return { error: "That time didn't come through right. Please try again." };

  const supabase = createAdminClient();

  const { data: cmRow } = await supabase
    .from("case_managers")
    .select("id, buffer_minutes, work_start, work_end, slot_minutes")
    .eq("share_token", token)
    .maybeSingle();
  if (!cmRow) return { error: "This link isn't valid anymore. Ask your case manager for a new one." };
  const cm = cmRow as Pick<
    CaseManager,
    "id" | "buffer_minutes" | "work_start" | "work_end" | "slot_minutes"
  >;

  // Date must be a weekday inside the current Mon–Fri week, and not in the past.
  const day = fromDateStr(date);
  const monday = mondayOf(new Date());
  const friday = addDays(monday, 4);
  const todayStr = toDateStr(new Date());
  if (!isWeekday(day)) return { error: "Meetings are Monday to Friday only." };
  if (date < toDateStr(monday) || date > toDateStr(friday))
    return { error: "That day isn't in this week. Refresh and pick again." };
  if (date < todayStr) return { error: "That day has already passed. Pick another one." };

  // Time must sit on the CM's slot grid, inside working hours, not in the past.
  const workStart = timeToMin(cm.work_start);
  const workEnd = timeToMin(cm.work_end);
  const endMin = startMin + cm.slot_minutes;
  if (
    startMin < workStart ||
    endMin > workEnd ||
    (startMin - workStart) % cm.slot_minutes !== 0
  ) {
    return { error: "That time isn't available. Refresh and pick again." };
  }
  if (date === todayStr) {
    const now = new Date();
    if (startMin <= now.getHours() * 60 + now.getMinutes())
      return { error: "That time already passed today. Pick a later one." };
  }

  // Re-validate the buffer rule against the latest meetings (race guard).
  const { data: dayMeetings, error: fetchError } = await supabase
    .from("meetings")
    .select("start_time,end_time")
    .eq("cm_id", cm.id)
    .eq("meeting_date", date);
  if (fetchError) return { error: "Something went wrong. Please try again." };

  const existing = toDayMeetings((dayMeetings ?? []) as Pick<Meeting, "start_time" | "end_time">[]);
  if (conflictsWithDay(startMin, endMin, existing, cm.buffer_minutes)) {
    return { error: "Someone just grabbed a time close to that one. Pick another slot." };
  }

  const { error: insertError } = await supabase.from("meetings").insert({
    cm_id: cm.id,
    meeting_date: date,
    start_time: minToTime(startMin),
    end_time: minToTime(endMin),
    client_initials: initials,
    created_by: "client",
  });

  if (insertError) {
    // Unique index (cm_id, meeting_date, start_time): the same-slot race backstop.
    if (insertError.code === "23505")
      return { error: "Someone just took that exact time. Pick another slot." };
    return { error: "Couldn't save your time. Please try again." };
  }

  // v2 TODO (lib/notify.ts): email the CM about this new booking.

  return { ok: true };
}

export interface DaySlots {
  date: string; // YYYY-MM-DD
  slots: number[]; // available start times, minutes since midnight
}

/** Fresh availability for the current week — used to re-render after a taken-slot error. */
export async function getWeekAvailability(token: string): Promise<DaySlots[] | null> {
  if (!/^[a-f0-9]{16,64}$/i.test(token)) return null;

  const supabase = createAdminClient();
  const { data: cmRow } = await supabase
    .from("case_managers")
    .select("id, buffer_minutes, work_start, work_end, slot_minutes")
    .eq("share_token", token)
    .maybeSingle();
  if (!cmRow) return null;
  const cm = cmRow as Pick<
    CaseManager,
    "id" | "buffer_minutes" | "work_start" | "work_end" | "slot_minutes"
  >;

  const monday = mondayOf(new Date());
  const dates = [0, 1, 2, 3, 4].map((i) => toDateStr(addDays(monday, i)));

  const { data: meetings } = await supabase
    .from("meetings")
    .select("meeting_date,start_time,end_time")
    .eq("cm_id", cm.id)
    .gte("meeting_date", dates[0])
    .lte("meeting_date", dates[4]);

  const byDate = new Map<string, { start_time: string; end_time: string }[]>();
  for (const m of meetings ?? []) {
    const list = byDate.get(m.meeting_date) ?? [];
    list.push(m);
    byDate.set(m.meeting_date, list);
  }

  const now = new Date();
  const todayStr = toDateStr(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();

  return dates.map((date) => {
    if (date < todayStr) return { date, slots: [] };
    const notBefore = date === todayStr ? nowMin + 1 : 0;
    return {
      date,
      slots: availableSlots(
        {
          workStart: cm.work_start,
          workEnd: cm.work_end,
          slotMinutes: cm.slot_minutes,
          bufferMinutes: cm.buffer_minutes,
        },
        toDayMeetings(byDate.get(date) ?? []),
        notBefore
      ),
    };
  });
}
