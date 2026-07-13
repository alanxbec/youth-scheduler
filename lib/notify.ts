// v2 TODO: email the case manager when a youth books a slot.
//
// Plan: call this from bookSlot() in app/s/[token]/actions.ts right after a
// successful insert. Use Resend (free tier) or Supabase Edge Functions +
// an SMTP provider. Keep it fire-and-forget so a mail failure never blocks
// a booking.
//
// export async function notifyCmOfBooking(cmEmail: string, meeting: Meeting) { ... }

export {};
