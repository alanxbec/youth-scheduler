import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateCm } from "@/lib/cm";
import { signOut } from "@/app/auth/actions";
import {
  addDays,
  fromDateStr,
  mondayOf,
  toDateStr,
  weekDays,
  weekLabel,
} from "@/lib/dates";
import type { Meeting } from "@/lib/types";
import { DayColumn } from "./day-column";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ w?: string }>;
}) {
  const { w } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cm = await getOrCreateCm(supabase, user);

  const anchor = w && /^\d{4}-\d{2}-\d{2}$/.test(w) ? fromDateStr(w) : new Date();
  const monday = mondayOf(anchor);
  const days = weekDays(monday);
  const thisMonday = mondayOf(new Date());

  const { data: meetings } = await supabase
    .from("meetings")
    .select("*")
    .eq("cm_id", cm.id)
    .gte("meeting_date", toDateStr(days[0]))
    .lte("meeting_date", toDateStr(days[4]))
    .order("start_time");

  const byDate = new Map<string, Meeting[]>();
  for (const m of (meetings ?? []) as Meeting[]) {
    const list = byDate.get(m.meeting_date) ?? [];
    list.push(m);
    byDate.set(m.meeting_date, list);
  }

  const todayStr = toDateStr(new Date());
  const prev = toDateStr(addDays(monday, -7));
  const next = toDateStr(addDays(monday, 7));
  const isThisWeek = toDateStr(monday) === toDateStr(thisMonday);

  return (
    <div className="min-h-dvh">
      <header className="border-b border-line">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              aria-hidden="true"
              className="grid place-items-center size-7 rounded-lg bg-primary text-white text-sm font-semibold shrink-0"
            >
              W
            </span>
            <span className="font-semibold truncate">Weekly Check-In</span>
          </div>
          <nav className="flex items-center gap-1">
            <Link href="/settings" className="btn-quiet">
              Settings
            </Link>
            <form action={signOut}>
              <button type="submit" className="btn-quiet">
                Sign out
              </button>
            </form>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-lg font-semibold">
              {isThisWeek ? "This week" : weekLabel(monday)}
            </h1>
            <p className="text-sm text-muted">
              {isThisWeek ? weekLabel(monday) : " "}
            </p>
          </div>
          <nav aria-label="Week navigation" className="flex items-center gap-1.5">
            <Link href={`/dashboard?w=${prev}`} className="btn-ghost" aria-label="Previous week">
              ← Prev
            </Link>
            {!isThisWeek && (
              <Link href="/dashboard" className="btn-ghost">
                Today
              </Link>
            )}
            <Link href={`/dashboard?w=${next}`} className="btn-ghost" aria-label="Next week">
              Next →
            </Link>
          </nav>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {days.map((day) => {
            const dateStr = toDateStr(day);
            return (
              <DayColumn
                key={dateStr}
                dateStr={dateStr}
                isToday={dateStr === todayStr}
                meetings={byDate.get(dateStr) ?? []}
                defaultDuration={cm.slot_minutes}
                workStart={cm.work_start}
              />
            );
          })}
        </div>

        <p className="mt-6 text-xs text-muted">
          Meetings youth booked themselves are marked{" "}
          <span className="inline-block rounded-full bg-accent-soft text-accent-ink px-2 py-0.5 font-medium">
            New
          </span>{" "}
          for two days. Share your booking link from Settings.
        </p>
      </main>
    </div>
  );
}
