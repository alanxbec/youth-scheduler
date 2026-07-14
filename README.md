# Weekly Check-In Scheduler

A tiny scheduling app for a foster-youth nonprofit. Each case manager (CM) texts
their youth one link; youth open it on their phone (no login), see the CM's
current-week Mon–Fri calendar, and pick a meeting time identified only by their
**initials** (privacy: never full names). The CM signs in with email +
password and manages only their own weekly calendar.

Built with Next.js 15 (App Router, TypeScript, Turbopack) + Tailwind CSS +
Supabase (Postgres, Auth, Row-Level Security) + Resend (email notifications).
Free to run on Vercel + Supabase, and maintainable by one person.

> **Status:** not currently deployed. The original Supabase project and
> Vercel deployment were torn down on purpose to stop paying-nothing-but-still
> sitting there; the code here is a complete, working v1 kept for portfolio
> purposes and to spin back up later. See **Deploy free on Vercel** below —
> it's the same setup flow either way.

---

## What's built (v1)

- **CM auth**: email + password (Supabase Auth). First sign-in auto-creates
  the CM's calendar row and a unique share link. No magic links — switched
  away from that design because Supabase's shared email sender rate-limits
  hard (a handful of emails/hour), and password login sends **zero** email on
  every sign-in. Recommended: turn off "Confirm email" in Supabase's Email
  provider settings so account creation sends no email either — this is an
  internal tool for trusted CMs, not a public signup flow.
- **/dashboard**: the CM's Mon–Fri week, any week (prev/next navigation).
  Add, edit, remove meetings; mark done or missed. Bookings made by youth
  show a **New** badge for two days.
- **/settings**: working hours, meeting length, buffer between meetings, plus
  the CM's share link and a ready-to-send Monday message to copy into their
  phone.
- **/s/&lt;token&gt;**: the public youth page. No login — the unguessable
  token in the URL resolves exactly one CM. Mobile-first: pick a day, pick a
  slot, enter initials, confirm.
- **Buffer rule**: a new meeting's start must be ≥ `buffer_minutes` from any
  existing meeting's start that day (both directions), and may never overlap.
  Enforced when generating available slots **and** re-validated on submit, so
  two youth can't grab the same or too-close slots.
- **Timezone-safe "today"**: `appNow()` in `lib/dates.ts` computes wall-clock
  "now" in a fixed timezone directly in code (not via the server's own
  clock), so same-day availability is correct no matter what timezone the
  hosting platform's servers run in. (Vercel runs UTC and also reserves the
  `TZ` env var, so this couldn't be solved by just setting `TZ`.)
- **CM email notifications**: the CM gets emailed (via Resend) the instant a
  youth books a slot. Uses Next.js 15's `after()` so the notification attempt
  survives past the response — a bare fire-and-forget call gets killed by
  Vercel's serverless runtime before the email request completes.
- **Row-Level Security**: CMs can only ever see/edit their own meetings. The
  public youth page never touches the logged-in path — it goes through
  server actions using the service-role key, scoped strictly to the one CM
  resolved from the share token.

### Not built yet

- Emailing/texting the **youth** (not just the CM) — e.g. a 1-hour-before
  reminder with a 1–5 readiness confirmation. Blocked on Resend's shared
  sender only being allowed to deliver to your own signup address; needs
  either a verified custom domain in Resend, or a different provider with
  single-sender verification (e.g. Brevo, free tier).
- Real SMS to youth (as opposed to email) — would need Twilio + mandatory
  A2P 10DLC carrier registration (real cost, approval wait).
- Youth cancelling/rescheduling their own booking (by design — they text
  their CM instead).

---

## One-time setup (about 15 minutes)

Everything below is a human step — none of it can be automated from this repo.

### 1. Create a Supabase project

1. Go to <https://supabase.com>, sign up (free), and click **New project**.
2. Pick any name (e.g. `youth-scheduler`), a database password (save it
   somewhere), and the region closest to you.

### 2. Run the database migration

1. In the Supabase dashboard, open **SQL Editor**.
2. Open `supabase/migrations/0001_init.sql` from this repo, paste the whole
   file into the editor, and click **Run**.
3. You should see "Success. No rows returned". That created the two tables
   (`case_managers`, `meetings`) and their Row-Level Security policies.

### 3. Get your API keys

1. In the Supabase dashboard: **Project Settings → API**.
2. Copy three values: the **Project URL**, the **anon public** key, and the
   **service_role** key (click reveal).

### 4. Turn off email confirmation (recommended)

1. In Supabase: **Authentication → Providers → Email**.
2. Turn **off** "Confirm email". This is an internal tool for trusted CMs —
   there's no real security benefit to confirming addresses, and leaving it
   on means every new CM account sends one email through Supabase's
   rate-limited built-in sender.

### 5. Configure the app

```powershell
cd C:\path\to\this\project
copy .env.local.example .env.local
```

Edit `.env.local` and paste in the three Supabase values from step 3.
Optionally add `RESEND_API_KEY` (from <https://resend.com> → API Keys) to
enable the CM booking-notification email — leave it blank to skip that
feature entirely, nothing else breaks. The `service_role` and Resend keys
are secret — `.env.local` is already gitignored; never commit it.

### 6. Run it

```powershell
npm install
npm run dev
```

Open <http://localhost:3000>, click **"New case manager? Create an
account,"** enter your email + a password (6+ characters). Your first
sign-in creates your calendar and share link automatically. Then:

- **/dashboard** — your Mon–Fri week: add, edit, remove meetings; mark them
  done or missed.
- **/settings** — working hours, meeting length, buffer between meetings,
  plus your share link and the copyable Monday message.
- **/s/&lt;your token&gt;** — what youth see. Open your own share link on a
  phone to try it.

---

## Deploy free on Vercel

1. Push this folder to a GitHub repo (private or public — see note below).
2. Go to <https://vercel.com>, sign up with GitHub, click **Add New → Project**,
   and import the repo. Framework is auto-detected (Next.js) — no build
   settings to change.
3. Under **Environment Variables**, add the same values from `.env.local`
   (the three Supabase values, plus `RESEND_API_KEY` if using it). No `TZ`
   variable — Vercel reserves that name; the app handles timezone in code
   instead (see `lib/dates.ts`).
4. Deploy. That's it — email + password auth needs no redirect-URL
   configuration in Supabase, unlike the old magic-link design.

If you ever re-enable email confirmation or add a password-reset flow,
you'll need to add your Vercel URL to Supabase's **Authentication → URL
Configuration → Redirect URLs** at that point (`https://YOUR-APP.vercel.app/auth/callback`).

**Public repo note:** this repo has been audited and is safe to make public
— no `.env*` files are tracked, no secrets appear anywhere in the commit
history, and the public `NEXT_PUBLIC_*` Supabase values are meant to be
exposed (protected by RLS, not secrecy).

---

## How the pieces fit (for future you)

- `supabase/migrations/0001_init.sql` — schema + RLS. CMs can only touch rows
  where `auth_user_id = auth.uid()`. The public youth page never uses the
  logged-in path: it goes through server actions using the **service-role**
  key, always scoped to the one CM resolved from the link's unguessable
  `share_token`.
- `lib/slots.ts` — the buffer rule, in one pure module. The same function
  generates the youth's slot grid **and** re-validates on submit. A unique DB
  index on `(cm_id, meeting_date, start_time)` is the hard backstop for the
  exact-same-slot race.
- `lib/dates.ts` — weekday-only week math, plus `appNow()`: computes
  wall-clock "now" in a fixed timezone (`America/Los_Angeles` by default,
  edit the `APP_TIMEZONE` constant to change it) regardless of what timezone
  the server itself runs in. Saturdays/Sundays roll forward to the next
  Monday everywhere.
- `app/auth/actions.ts` — email + password sign-in/sign-up server actions.
- `app/s/[token]/` — the public youth page (mobile-first, no login).
- `app/dashboard/`, `app/settings/` — the CM side (email+password auth, RLS).
- `lib/notify.ts` — emails the CM (via Resend's HTTP API, called through
  Next.js's `after()`) the moment a youth books. Requires `RESEND_API_KEY`;
  skipped silently if unset. Uses Resend's shared sender, which can only
  deliver to your own Resend signup address — fine here, since the CM is the
  account owner. Emailing *youth* (arbitrary addresses) would need a
  verified custom domain in Resend first.

## Limits worth knowing

- Times are naive local times (no timezone column). Everyone — CMs and
  youth — is assumed to be in the single timezone set in `lib/dates.ts`
  (`APP_TIMEZONE`). Fine for a single-region nonprofit; edit that constant
  if you ever need a different one.
- Supabase's built-in email service allows only a handful of emails per
  hour, shared across every kind of auth email. Turning off "Confirm email"
  (step 4 above) avoids this entirely for normal use; wire up custom SMTP in
  Supabase's Auth settings if you ever need more email volume than that.
- Youth can book but not cancel (by design — they text their CM instead).
- No notification reaches youth yet (see "Not built yet" above) — only the
  CM gets emailed.
