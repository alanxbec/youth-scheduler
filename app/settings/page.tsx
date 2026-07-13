import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateCm } from "@/lib/cm";
import { signOut } from "@/app/auth/actions";
import { SettingsForm } from "./settings-form";
import { CopyButton } from "./copy-button";

async function siteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cm = await getOrCreateCm(supabase, user);
  const origin = await siteOrigin();
  const shareLink = `${origin}/s/${cm.share_token}`;
  const weeklyMessage = `Hope you had a good weekend! Pick a time to meet this week: ${shareLink}`;

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
            <Link href="/dashboard" className="btn-quiet">
              Dashboard
            </Link>
            <form action={signOut}>
              <button type="submit" className="btn-quiet">
                Sign out
              </button>
            </form>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-10">
        <section aria-labelledby="share-heading">
          <h1 id="share-heading" className="text-lg font-semibold">
            Your booking link
          </h1>
          <p className="mt-1 text-sm text-muted leading-relaxed">
            Anyone with this link can book time with you — youth only ever enter their initials,
            never a name. Text it out at the start of each week.
          </p>

          <div className="mt-4 flex items-center gap-2">
            <input
              readOnly
              value={shareLink}
              aria-label="Your booking link"
              className="field font-mono text-xs"
            />
            <CopyButton text={shareLink} label="Copy link" />
          </div>

          <div className="mt-4 rounded-xl border border-line bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-medium">Ready-to-send Monday message</h2>
                <p className="mt-2 text-sm text-ink leading-relaxed">{weeklyMessage}</p>
              </div>
              <CopyButton text={weeklyMessage} label="Copy message" />
            </div>
          </div>
        </section>

        <section aria-labelledby="settings-heading">
          <h2 id="settings-heading" className="text-lg font-semibold mb-4">
            Scheduling settings
          </h2>
          <SettingsForm cm={cm} />
        </section>
      </main>
    </div>
  );
}
