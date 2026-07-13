"use client";

import { useActionState } from "react";
import { updateSettings, type SettingsState } from "./actions";
import type { CaseManager } from "@/lib/types";

const BUFFERS = [0, 15, 30, 45, 60];
const SLOTS = [15, 20, 30, 45, 60];

export function SettingsForm({ cm }: { cm: CaseManager }) {
  const [state, formAction, pending] = useActionState<SettingsState, FormData>(updateSettings, {});

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label htmlFor="name" className="field-label">
          Your name
        </label>
        <input
          id="name"
          name="name"
          required
          maxLength={80}
          defaultValue={cm.name}
          className="field max-w-sm"
        />
        <p className="mt-1 text-xs text-muted">Youth see this on the booking page.</p>
      </div>

      <fieldset>
        <legend className="field-label">Working hours</legend>
        <div className="flex items-center gap-2 max-w-sm">
          <input
            name="work_start"
            type="time"
            required
            aria-label="Day starts at"
            defaultValue={cm.work_start.slice(0, 5)}
            className="field"
          />
          <span className="text-muted text-sm">to</span>
          <input
            name="work_end"
            type="time"
            required
            aria-label="Day ends at"
            defaultValue={cm.work_end.slice(0, 5)}
            className="field"
          />
        </div>
        <p className="mt-1 text-xs text-muted">Youth can only book inside these hours, Mon–Fri.</p>
      </fieldset>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-sm">
        <div>
          <label htmlFor="slot_minutes" className="field-label">
            Meeting length
          </label>
          <select id="slot_minutes" name="slot_minutes" defaultValue={cm.slot_minutes} className="field">
            {SLOTS.map((s) => (
              <option key={s} value={s}>
                {s} minutes
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="buffer_minutes" className="field-label">
            Buffer between meetings
          </label>
          <select
            id="buffer_minutes"
            name="buffer_minutes"
            defaultValue={cm.buffer_minutes}
            className="field"
          >
            {BUFFERS.map((b) => (
              <option key={b} value={b}>
                {b === 0 ? "None" : `${b} minutes`}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Saving…" : "Save settings"}
        </button>
        <span aria-live="polite" className="text-sm">
          {state.saved && <span className="text-primary font-medium">Saved.</span>}
          {state.error && <span className="text-danger">{state.error}</span>}
        </span>
      </div>
    </form>
  );
}
