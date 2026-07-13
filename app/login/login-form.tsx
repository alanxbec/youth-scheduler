"use client";

import { useActionState } from "react";
import { sendMagicLink, type LoginState } from "@/app/auth/actions";

export function LoginForm({ urlError }: { urlError?: string }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(sendMagicLink, {});

  if (state.sent) {
    return (
      <div className="rise-in rounded-xl border border-line bg-surface p-5" role="status">
        <h2 className="font-medium">Check your email</h2>
        <p className="mt-1.5 text-sm text-muted leading-relaxed">
          We sent you a sign-in link. Open it on this device and you&apos;ll land on your
          dashboard. The link expires after a while, so use it soon.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="email" className="field-label">
          Work email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@yourorg.org"
          className="field"
        />
      </div>

      {(state.error || urlError) && (
        <p className="text-sm text-danger" role="alert" aria-live="polite">
          {state.error ?? urlError}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary w-full py-2.5">
        {pending ? "Sending link…" : "Email me a sign-in link"}
      </button>
    </form>
  );
}
