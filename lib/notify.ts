// Emails the CM the moment a youth books a slot. Uses Resend's HTTP API
// directly (one fetch call — not worth adding the SDK dependency for this).
//
// Sends from Resend's shared onboarding@resend.dev sender, which can only
// deliver to the Resend account's own signup address. That's fine here:
// the recipient IS the CM, i.e. the account owner. A future feature that
// emails youth (arbitrary addresses) would need a verified custom domain.
//
// Fire-and-forget: a notification failure must never block a booking.

import { longDate } from "./dates";
import { minToLabel } from "./slots";

export async function notifyCmOfBooking(
  cmEmail: string,
  meeting: { meeting_date: string; start_min: number; client_initials: string }
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return; // not configured — skip silently

  const [y, m, d] = meeting.meeting_date.split("-").map(Number);
  const dateLabel = longDate(new Date(y, m - 1, d));
  const timeLabel = minToLabel(meeting.start_min);

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Weekly Check-In <onboarding@resend.dev>",
        to: cmEmail,
        subject: `${meeting.client_initials} booked ${dateLabel}`,
        html: `<p><strong>${meeting.client_initials}</strong> just booked a meeting for <strong>${dateLabel} at ${timeLabel}</strong>.</p>`,
      }),
    });
  } catch {
    // Network/provider failure — booking already succeeded, nothing to roll back.
  }
}
