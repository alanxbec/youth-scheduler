// Week helpers. The app is weekdays-only (Mon–Fri); Saturday and Sunday
// always roll forward to the upcoming Monday, so a youth opening the link
// on a Sunday night sees the week that's about to start.

export const WEEKDAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

// The org's fixed timezone. Hardcoded here (not an env var) because Vercel
// reserves the TZ environment variable and won't let it be set from the
// dashboard. appNow() computes wall-clock "now" in this zone directly, so
// "today"/"current time" checks are correct no matter what timezone the
// server process itself happens to be running in.
const APP_TIMEZONE = "America/Los_Angeles";

/** Current wall-clock instant in APP_TIMEZONE, as a Date whose local getters
 *  (getFullYear/getHours/etc.) read back that timezone's date and time. */
export function appNow(): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return new Date(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second")
  );
}

/** Local YYYY-MM-DD (no UTC shifting). */
export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parse YYYY-MM-DD as a local date (midnight local time). */
export function fromDateStr(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

/**
 * Monday of the week this date belongs to.
 * Sat/Sun belong to the *next* week (the app has no weekend days).
 */
export function mondayOf(d: Date): Date {
  const day = d.getDay(); // 0 Sun .. 6 Sat
  const base = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (day === 0) return addDays(base, 1); // Sunday -> tomorrow
  if (day === 6) return addDays(base, 2); // Saturday -> Monday
  return addDays(base, 1 - day);
}

/** The five weekday Dates (Mon..Fri) for the week starting at `monday`. */
export function weekDays(monday: Date): Date[] {
  return [0, 1, 2, 3, 4].map((i) => addDays(monday, i));
}

export function isWeekday(d: Date): boolean {
  const day = d.getDay();
  return day >= 1 && day <= 5;
}

/** "Jul 13" style short label. */
export function shortDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** "Monday, July 13" style label. */
export function longDate(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

/** Range label for a week: "Jul 13 – Jul 17". */
export function weekLabel(monday: Date): string {
  return `${shortDate(monday)} – ${shortDate(addDays(monday, 4))}`;
}
