import { redirect } from "next/navigation";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  if (!hasSupabaseEnv()) {
    return (
      <main className="min-h-dvh flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <h1 className="text-xl font-semibold">Almost there — connect Supabase</h1>
          <p className="mt-3 text-sm text-muted leading-relaxed">
            This app needs Supabase credentials before anyone can sign in. Copy{" "}
            <code className="bg-surface px-1.5 py-0.5 rounded text-ink">.env.local.example</code>{" "}
            to <code className="bg-surface px-1.5 py-0.5 rounded text-ink">.env.local</code>, fill
            in your project&apos;s URL and keys, and restart the dev server. Full steps are in the
            README.
          </p>
        </div>
      </main>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <main className="min-h-dvh flex items-center justify-center p-6">
      <div className="max-w-sm w-full">
        <div className="flex items-center gap-2.5 mb-8">
          <span
            aria-hidden="true"
            className="grid place-items-center size-9 rounded-xl bg-primary text-white text-base font-semibold"
          >
            W
          </span>
          <div>
            <h1 className="font-semibold leading-tight">Weekly Check-In</h1>
            <p className="text-sm text-muted leading-tight">Case manager sign in</p>
          </div>
        </div>

        <LoginForm urlError={error} />

        <p className="mt-8 text-xs text-muted leading-relaxed">
          No password needed — we email you a one-time sign-in link. First time here? Signing in
          creates your calendar automatically.
        </p>
      </div>
    </main>
  );
}
