"use client";

// The youth booking flow. Mobile-first: one decision per screen region,
// 44px+ touch targets, no login, no jargon.

import { useMemo, useState, useTransition } from "react";
import { bookSlot, getWeekAvailability, type DaySlots } from "./actions";
import { fromDateStr, longDate, toDateStr } from "@/lib/dates";
import { minToLabel } from "@/lib/slots";

interface DoneInfo {
  date: string;
  slot: number;
  initials: string;
}

export function Booking({
  token,
  cmFirstName,
  weekText,
  initialDays,
}: {
  token: string;
  cmFirstName: string;
  weekText: string;
  initialDays: DaySlots[];
}) {
  const [days, setDays] = useState<DaySlots[]>(initialDays);
  const todayStr = toDateStr(new Date());

  const firstOpenDate = useMemo(() => {
    const open = days.find((d) => d.slots.length > 0);
    return open?.date ?? days[0]?.date ?? todayStr;
  }, [days, todayStr]);

  const [selectedDate, setSelectedDate] = useState(firstOpenDate);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [initials, setInitials] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<DoneInfo | null>(null);
  const [pending, startTransition] = useTransition();

  const selectedDay = days.find((d) => d.date === selectedDate);
  const anySlotsThisWeek = days.some((d) => d.slots.length > 0);

  function pickDay(date: string) {
    setSelectedDate(date);
    setSelectedSlot(null);
    setError(null);
  }

  function confirm() {
    if (selectedSlot === null) return;
    const cleaned = initials.trim().toUpperCase();
    if (!/^[A-Z]{1,4}$/.test(cleaned)) {
      setError("Enter your initials — just letters, like JD.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await bookSlot(token, selectedDate, selectedSlot, cleaned);
      if (res.ok) {
        setDone({ date: selectedDate, slot: selectedSlot, initials: cleaned });
        return;
      }
      setError(res.error ?? "Something went wrong. Please try again.");
      // The slot may be gone — pull fresh availability so the grid is honest.
      const fresh = await getWeekAvailability(token);
      if (fresh) {
        setDays(fresh);
        setSelectedSlot(null);
      }
    });
  }

  /* ---------------------------------------------------------------- */

  if (done) {
    const day = fromDateStr(done.date);
    return (
      <main className="min-h-dvh flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center pop-in">
          <span
            aria-hidden="true"
            className="mx-auto grid place-items-center size-16 rounded-full bg-primary text-white"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M5 12.5l4.5 4.5L19 7.5"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <h1 className="mt-5 text-2xl font-semibold">You&apos;re set</h1>
          <p className="mt-2 text-base leading-relaxed">
            {longDate(day)} at <span className="font-semibold">{minToLabel(done.slot)}</span>
          </p>
          <p className="mt-1 text-sm text-muted">Booked as {done.initials}</p>
          <p className="mt-6 text-sm text-muted leading-relaxed">
            {cmFirstName} can see it now — all you have to do is show up. If something changes,
            just text {cmFirstName}.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh max-w-md mx-auto px-4 pt-8 pb-44">
      <header>
        <h1 className="text-2xl font-semibold leading-tight">
          Meet with {cmFirstName} this week
        </h1>
        <p className="mt-1.5 text-sm text-muted">
          {weekText} · Tap a day, pick a time. Takes about 30 seconds.
        </p>
      </header>

      {!anySlotsThisWeek ? (
        <div className="mt-10 rounded-xl border border-line bg-surface p-5 text-center">
          <h2 className="font-medium">No times left this week</h2>
          <p className="mt-1.5 text-sm text-muted leading-relaxed">
            {cmFirstName}&apos;s week is full. Text {cmFirstName} directly and they&apos;ll find a
            time for you.
          </p>
        </div>
      ) : (
        <>
          {/* Day picker */}
          <div role="group" aria-label="Pick a day" className="mt-6 grid grid-cols-5 gap-1.5">
            {days.map((d) => {
              const day = fromDateStr(d.date);
              const isSelected = d.date === selectedDate;
              const isPast = d.date < todayStr;
              const empty = d.slots.length === 0;
              return (
                <button
                  key={d.date}
                  type="button"
                  onClick={() => pickDay(d.date)}
                  disabled={isPast}
                  aria-pressed={isSelected}
                  className={`min-h-14 rounded-xl border text-center transition-colors duration-150
                    focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring
                    ${
                      isSelected
                        ? "bg-primary border-primary text-white"
                        : isPast
                          ? "border-line text-muted opacity-45"
                          : "border-line bg-bg hover:border-line-strong"
                    }`}
                >
                  <span className={`block text-[11px] ${isSelected ? "text-white/85" : "text-muted"}`}>
                    {day.toLocaleDateString("en-US", { weekday: "short" })}
                  </span>
                  <span className="block text-base font-semibold leading-tight">
                    {day.getDate()}
                  </span>
                  {!isPast && (
                    <span
                      className={`block text-[10px] leading-tight ${
                        isSelected ? "text-white/85" : empty ? "text-muted" : "text-primary-soft-ink"
                      }`}
                    >
                      {empty ? "full" : `${d.slots.length} open`}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Time slots for the selected day */}
          <section
            aria-label={`Available times for ${longDate(fromDateStr(selectedDate))}`}
            className="mt-6"
          >
            <h2 className="text-sm font-medium text-muted mb-2.5">
              {longDate(fromDateStr(selectedDate))}
            </h2>

            {!selectedDay || selectedDay.slots.length === 0 ? (
              <p className="text-sm text-muted rounded-xl border border-line bg-surface px-4 py-5 text-center">
                No times left this day — try another one.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {selectedDay.slots.map((slot) => {
                  const isSelected = selectedSlot === slot;
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => {
                        setSelectedSlot(isSelected ? null : slot);
                        setError(null);
                      }}
                      aria-pressed={isSelected}
                      className={`min-h-12 rounded-xl border text-sm font-medium transition-colors duration-150
                        focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring
                        ${
                          isSelected
                            ? "bg-primary border-primary text-white"
                            : "border-line-strong bg-bg hover:bg-surface"
                        }`}
                    >
                      {minToLabel(slot)}
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}

      {/* Confirm sheet */}
      {selectedSlot !== null && (
        <div className="fixed inset-x-0 bottom-0 z-10">
          <div className="max-w-md mx-auto rounded-t-2xl border border-b-0 border-line bg-bg shadow-[0_-8px_30px_rgb(0_0_0_/_0.08)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] rise-in">
            <p className="text-sm">
              <span className="font-semibold">
                {fromDateStr(selectedDate).toLocaleDateString("en-US", {
                  weekday: "long",
                })}{" "}
                at {minToLabel(selectedSlot)}
              </span>{" "}
              <span className="text-muted">with {cmFirstName}</span>
            </p>

            <div className="mt-3 flex gap-2">
              <div className="w-28 shrink-0">
                <label htmlFor="initials" className="sr-only">
                  Your initials
                </label>
                <input
                  id="initials"
                  value={initials}
                  onChange={(e) => setInitials(e.target.value.toUpperCase())}
                  placeholder="Initials"
                  maxLength={4}
                  autoCapitalize="characters"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  className="field min-h-12 text-center text-base font-semibold tracking-widest uppercase"
                />
              </div>
              <button
                type="button"
                onClick={confirm}
                disabled={pending}
                className="btn-primary grow min-h-12 text-base"
              >
                {pending ? "Locking it in…" : "Lock it in"}
              </button>
            </div>

            <p className="mt-2 text-xs text-muted">
              Just your initials — like JD. No name, no login.
            </p>

            {error && (
              <p role="alert" aria-live="assertive" className="mt-2 text-sm text-danger">
                {error}
              </p>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
