// Slot generation and the buffer rule.
//
// Buffer rule: a new meeting's start must be at least `buffer_minutes` away
// (in either direction) from the START of any existing meeting that day,
// AND the new meeting must not overlap an existing one.
// Example: buffer 30 + existing meeting at 10:00 -> next bookable start is 10:30.
//
// This module is pure (no I/O) so the exact same check runs when we render
// the youth's available slots AND when we re-validate on submit.

import type { Meeting } from "./types";

/** "HH:MM" or "HH:MM:SS" -> minutes since midnight. */
export function timeToMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/** Minutes since midnight -> "HH:MM". */
export function minToTime(min: number): string {
  const h = String(Math.floor(min / 60)).padStart(2, "0");
  const m = String(min % 60).padStart(2, "0");
  return `${h}:${m}`;
}

/** Minutes since midnight -> "9:30 AM" for humans. */
export function minToLabel(min: number): string {
  const h24 = Math.floor(min / 60);
  const m = min % 60;
  const period = h24 < 12 ? "AM" : "PM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

export interface DayMeeting {
  start: number; // minutes since midnight
  end: number;
}

export function toDayMeetings(meetings: Pick<Meeting, "start_time" | "end_time">[]): DayMeeting[] {
  return meetings.map((m) => ({ start: timeToMin(m.start_time), end: timeToMin(m.end_time) }));
}

/**
 * Does a proposed [start, end) conflict with the day's existing meetings,
 * given the CM's buffer? True = blocked.
 */
export function conflictsWithDay(
  start: number,
  end: number,
  existing: DayMeeting[],
  bufferMinutes: number
): boolean {
  return existing.some(
    (m) =>
      // overlap
      start < m.end && end > m.start
      // too close, start-to-start, either direction
      || Math.abs(start - m.start) < bufferMinutes
  );
}

export interface SlotConfig {
  workStart: string; // "HH:MM" / "HH:MM:SS"
  workEnd: string;
  slotMinutes: number;
  bufferMinutes: number;
}

/**
 * All bookable start times (minutes since midnight) for one day.
 * `notBeforeMin` hides slots already in the past for "today".
 */
export function availableSlots(
  cfg: SlotConfig,
  existing: DayMeeting[],
  notBeforeMin = 0
): number[] {
  const dayStart = timeToMin(cfg.workStart);
  const dayEnd = timeToMin(cfg.workEnd);
  const out: number[] = [];
  for (let start = dayStart; start + cfg.slotMinutes <= dayEnd; start += cfg.slotMinutes) {
    if (start < notBeforeMin) continue;
    if (conflictsWithDay(start, start + cfg.slotMinutes, existing, cfg.bufferMinutes)) continue;
    out.push(start);
  }
  return out;
}
