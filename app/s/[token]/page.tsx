// Public youth booking page. No login — the unguessable token in the URL
// resolves exactly one case manager. All reads/writes go through the
// service-role server code in actions.ts, never the client-side anon key.

import type { Metadata } from "next";
import { appNow, mondayOf, weekLabel } from "@/lib/dates";
import { getWeekAvailability } from "./actions";
import { createAdminClient } from "@/lib/supabase/admin";
import { Booking } from "./booking";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pick a time — Weekly Check-In",
  robots: { index: false, follow: false },
};

export default async function YouthBookingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  let cmName: string | null = null;
  if (/^[a-f0-9]{16,64}$/i.test(token)) {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("case_managers")
      .select("name")
      .eq("share_token", token)
      .maybeSingle();
    cmName = data?.name ?? null;
  }

  if (!cmName) {
    return (
      <main className="min-h-dvh flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center">
          <p aria-hidden="true" className="text-4xl mb-4">
            🔗
          </p>
          <h1 className="text-lg font-semibold">This link isn&apos;t working</h1>
          <p className="mt-2 text-sm text-muted leading-relaxed">
            It may have been typed out wrong or replaced. Text your case manager and ask them to
            send the link again.
          </p>
        </div>
      </main>
    );
  }

  const days = await getWeekAvailability(token);
  const monday = mondayOf(appNow());
  const firstName = cmName.split(" ")[0];

  return (
    <Booking
      token={token}
      cmFirstName={firstName}
      weekText={weekLabel(monday)}
      initialDays={days ?? []}
    />
  );
}
