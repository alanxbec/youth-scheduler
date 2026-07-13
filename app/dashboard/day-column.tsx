"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import {
  addMeeting,
  deleteMeeting,
  setMeetingStatus,
  updateMeeting,
  type ActionResult,
} from "./actions";
import { fromDateStr } from "@/lib/dates";
import { minToLabel, timeToMin } from "@/lib/slots";
import type { Meeting, MeetingStatus } from "@/lib/types";

const NEW_WINDOW_MS = 48 * 60 * 60 * 1000;

function timeLabel(t: string): string {
  return minToLabel(timeToMin(t));
}

function isNewBooking(m: Meeting): boolean {
  return m.created_by === "client" && Date.now() - new Date(m.created_at).getTime() < NEW_WINDOW_MS;
}

/* ------------------------------------------------------------------ */

export function DayColumn({
  dateStr,
  isToday,
  meetings,
  defaultDuration,
  workStart,
}: {
  dateStr: string;
  isToday: boolean;
  meetings: Meeting[];
  defaultDuration: number;
  workStart: string;
}) {
  const [adding, setAdding] = useState(false);
  const day = fromDateStr(dateStr);
  const weekday = day.toLocaleDateString("en-US", { weekday: "short" });
  const dayNum = day.getDate();

  return (
    <section
      aria-label={day.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
      className={`rounded-xl border ${isToday ? "border-primary" : "border-line"} bg-surface/60 flex flex-col`}
    >
      <header className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
        <h2 className="text-sm font-semibold flex items-baseline gap-1.5">
          {weekday}
          <span
            className={
              isToday
                ? "grid place-items-center size-6 rounded-full bg-primary text-white text-xs"
                : "text-muted font-normal"
            }
          >
            {dayNum}
          </span>
        </h2>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          aria-expanded={adding}
          className="btn-quiet text-xs -mr-1"
        >
          {adding ? "Close" : "+ Add"}
        </button>
      </header>

      <div className="px-2 pb-2 space-y-1.5 grow">
        {adding && (
          <MeetingForm
            dateStr={dateStr}
            defaultDuration={defaultDuration}
            defaultStart={workStart.slice(0, 5)}
            onDone={() => setAdding(false)}
          />
        )}

        {meetings.length === 0 && !adding && (
          <p className="text-xs text-muted px-1.5 py-3">No meetings yet.</p>
        )}

        {meetings.map((m) => (
          <MeetingCard key={m.id} meeting={m} defaultDuration={defaultDuration} />
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function MeetingCard({ meeting, defaultDuration }: { meeting: Meeting; defaultDuration: number }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const m = meeting;
  const isNew = isNewBooking(m);

  const tone =
    m.status === "missed"
      ? "bg-danger-soft text-danger border-danger/25"
      : m.status === "completed"
        ? "bg-bg text-muted border-line"
        : "bg-primary-soft text-primary-soft-ink border-primary/20";

  function run(fn: () => Promise<ActionResult>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res.error) setError(res.error);
    });
  }

  if (editing) {
    return (
      <MeetingForm
        meeting={m}
        dateStr={m.meeting_date}
        defaultDuration={defaultDuration}
        onDone={() => {
          setEditing(false);
          setOpen(false);
        }}
      />
    );
  }

  return (
    <div className={`rounded-lg border ${tone} ${pending ? "opacity-60" : ""}`}>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setConfirmRemove(false);
        }}
        aria-expanded={open}
        className="w-full text-left px-2.5 py-2 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
      >
        <span className="flex items-center justify-between gap-2">
          <span className="text-xs">
            {timeLabel(m.start_time)} – {timeLabel(m.end_time)}
          </span>
          {isNew && m.status === "scheduled" && (
            <span className="rounded-full bg-accent-soft text-accent-ink px-1.5 py-px text-[11px] font-medium">
              New
            </span>
          )}
          {m.status === "missed" && (
            <span className="text-[11px] font-semibold uppercase tracking-wide">Missed</span>
          )}
          {m.status === "completed" && (
            <span aria-label="Completed" className="text-[11px] font-medium">
              Done ✓
            </span>
          )}
        </span>
        <span className={`block mt-0.5 font-semibold ${m.status === "completed" ? "line-through" : ""}`}>
          {m.client_initials}
        </span>
        {m.notes && <span className="block mt-0.5 text-xs opacity-80 truncate">{m.notes}</span>}
      </button>

      {open && (
        <div className="px-2.5 pb-2.5 rise-in">
          <div className="flex flex-wrap gap-1 pt-1 border-t border-current/10">
            {m.status !== "completed" && (
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => setMeetingStatus(m.id, "completed"))}
                className="btn-quiet text-xs"
              >
                Mark done
              </button>
            )}
            {m.status !== "missed" && (
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => setMeetingStatus(m.id, "missed"))}
                className="btn-quiet text-xs text-danger hover:text-danger"
              >
                Missed
              </button>
            )}
            {m.status !== "scheduled" && (
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => setMeetingStatus(m.id, "scheduled"))}
                className="btn-quiet text-xs"
              >
                Undo
              </button>
            )}
            <button type="button" onClick={() => setEditing(true)} className="btn-quiet text-xs">
              Edit
            </button>
            {confirmRemove ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => deleteMeeting(m.id))}
                className="btn text-xs bg-danger text-white px-2.5 py-1.5 hover:opacity-90"
              >
                Really remove?
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmRemove(true)}
                className="btn-quiet text-xs"
              >
                Remove
              </button>
            )}
          </div>
          {error && (
            <p className="mt-1.5 text-xs text-danger" role="alert" aria-live="polite">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

const DURATIONS = [15, 20, 30, 45, 60, 90];

function MeetingForm({
  dateStr,
  meeting,
  defaultDuration,
  defaultStart,
  onDone,
}: {
  dateStr: string;
  meeting?: Meeting;
  defaultDuration: number;
  defaultStart?: string;
  onDone: () => void;
}) {
  const action = meeting ? updateMeeting : addMeeting;
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(action, {});
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    if (state.ok) doneRef.current();
  }, [state.ok]);

  const startDefault = meeting ? meeting.start_time.slice(0, 5) : (defaultStart ?? "09:00");
  const durationDefault = meeting
    ? timeToMin(meeting.end_time) - timeToMin(meeting.start_time)
    : defaultDuration;
  const durations = DURATIONS.includes(durationDefault)
    ? DURATIONS
    : [...DURATIONS, durationDefault].sort((a, b) => a - b);

  return (
    <form action={formAction} className="rounded-lg border border-line bg-bg p-2.5 space-y-2 rise-in">
      {meeting && <input type="hidden" name="id" value={meeting.id} />}
      <input type="hidden" name="date" value={dateStr} />

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor={`start-${dateStr}-${meeting?.id ?? "new"}`} className="field-label text-xs">
            Start
          </label>
          <input
            id={`start-${dateStr}-${meeting?.id ?? "new"}`}
            name="start_time"
            type="time"
            required
            defaultValue={startDefault}
            className="field text-xs px-2"
          />
        </div>
        <div>
          <label htmlFor={`dur-${dateStr}-${meeting?.id ?? "new"}`} className="field-label text-xs">
            Length
          </label>
          <select
            id={`dur-${dateStr}-${meeting?.id ?? "new"}`}
            name="duration"
            defaultValue={durationDefault}
            className="field text-xs px-2"
          >
            {durations.map((d) => (
              <option key={d} value={d}>
                {d} min
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor={`ini-${dateStr}-${meeting?.id ?? "new"}`} className="field-label text-xs">
          Initials
        </label>
        <input
          id={`ini-${dateStr}-${meeting?.id ?? "new"}`}
          name="initials"
          required
          maxLength={4}
          pattern="[A-Za-z]{1,4}"
          placeholder="JD"
          defaultValue={meeting?.client_initials ?? ""}
          className="field text-xs px-2 uppercase"
          autoComplete="off"
        />
      </div>

      <div>
        <label htmlFor={`notes-${dateStr}-${meeting?.id ?? "new"}`} className="field-label text-xs">
          Notes <span className="text-muted font-normal">(optional)</span>
        </label>
        <input
          id={`notes-${dateStr}-${meeting?.id ?? "new"}`}
          name="notes"
          maxLength={200}
          defaultValue={meeting?.notes ?? ""}
          className="field text-xs px-2"
          autoComplete="off"
        />
      </div>

      {state.error && (
        <p className="text-xs text-danger" role="alert" aria-live="polite">
          {state.error}
        </p>
      )}

      <div className="flex gap-1.5">
        <button type="submit" disabled={pending} className="btn-primary text-xs px-3 py-1.5">
          {pending ? "Saving…" : meeting ? "Save" : "Add"}
        </button>
        <button type="button" onClick={onDone} className="btn-quiet text-xs">
          Cancel
        </button>
      </div>
    </form>
  );
}
