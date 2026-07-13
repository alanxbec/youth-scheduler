"use client";

import { useState } from "react";
import { useActionState } from "react";
import { signInWithPassword, signUpWithPassword, type LoginState } from "@/app/auth/actions";

export function LoginForm({ urlError }: { urlError?: string }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const action = mode === "signin" ? signInWithPassword : signUpWithPassword;
  const [state, formAction, pending] = useActionState<LoginState, FormData>(action, {});

  if (state.sent) {
    return (
      <div className="rise-in rounded-xl border border-line bg-surface p-5" role="status">
        <h2 className="font-medium">Confirm your email</h2>
        <p className="mt-1.5 text-sm text-muted leading-relaxed">
          We sent a confirmation link to finish creating your account. Click it, then come back
          here and sign in with your email and password.
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

      <div>
        <label htmlFor="password" className="field-label">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          required
          minLength={mode === "signup" ? 6 : undefined}
          placeholder="••••••••"
          className="field"
        />
      </div>

      {(state.error || urlError) && (
        <p className="text-sm text-danger" role="alert" aria-live="polite">
          {state.error ?? urlError}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary w-full py-2.5">
        {pending
          ? mode === "signin"
            ? "Signing in…"
            : "Creating account…"
          : mode === "signin"
            ? "Sign In"
            : "Create Account"}
      </button>

      <button
        type="button"
        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        className="text-sm text-muted hover:text-ink underline underline-offset-2 w-full text-center"
      >
        {mode === "signin"
          ? "New case manager? Create an account"
          : "Already have an account? Sign in"}
      </button>
    </form>
  );
}
