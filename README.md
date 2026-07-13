# Weekly Check-In Scheduler

A tiny scheduling app for a foster-youth nonprofit. Each case manager (CM) texts
their youth one link; youth open it on their phone (no login), see the CM's
current-week Mon–Fri calendar, and pick a meeting time identified only by their
**initials** (privacy: never full names). The CM logs in with an email magic
link and manages only their own weekly calendar.

Built with Next.js 15 (App Router, TypeScript) + Tailwind CSS + Supabase
(Postgres, Auth, Row-Level Security). Free to run on Vercel + Supabase, and
maintainable by one person.

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

### 4. Configure the app

```powershell
cd C:\Users\alanb\youth-scheduler
copy .env.local.example .env.local
```

Edit `.env.local` and paste in the three values. The `service_role` key is
secret — `.env.local` is already gitignored; never commit it.

### 5. Allow magic-link redirects (important)

1. In Supabase: **Authentication → URL Configuration**.
2. Set **Site URL** to `http://localhost:3000` for now.
3. Under **Redirect URLs**, add `http://localhost:3000/auth/callback`.
4. After you deploy (step below), come back and add your production URLs too:
   `https://YOUR-APP.vercel.app` and `https://YOUR-APP.vercel.app/auth/callback`.

### 6. Run it

```powershell
npm install
npm run dev
```

Open <http://localhost:3000>, enter your email, and click the sign-in link
Supabase emails you. Your first login creates your calendar and share link
automatically. Then:

- **/dashboard** — your Mon–Fri week: add, edit, remove meetings; mark them
  done or missed. Bookings made by youth show a **New** badge for two days.
- **/settings** — working hours, meeting length, buffer between meetings, plus
  your share link and a ready-to-send Monday message to copy into your phone.
- **/s/&lt;your token&gt;** — what youth see. Open your own share link on a
  phone to try it.

---

## Deploy free on Vercel

1. Push this folder to a GitHub repo (private is fine).
2. Go to <https://vercel.com>, sign up with GitHub, click **Add New → Project**,
   and import the repo. Framework is auto-detected (Next.js) — no build
   settings to change.
3. Under **Environment Variables**, add the same three values from
   `.env.local`, plus `TZ` set to your timezone (e.g. `America/Los_Angeles`)
   so "today" and past-time hiding behave correctly (Vercel servers run in UTC).
4. Deploy, then add the production redirect URLs in Supabase (step 5 above)
   and update the Supabase **Site URL** to your Vercel URL.

---

## How the pieces fit (for future you)

- `supabase/migrations/0001_init.sql` — schema + RLS. CMs can only touch rows
  where `auth_user_id = auth.uid()`. The public youth page never uses the
  logged-in path: it goes through server actions using the **service-role**
  key, always scoped to the one CM resolved from the link's unguessable
  `share_token`.
- `lib/slots.ts` — the buffer rule, in one pure module. A new meeting's start
  must be ≥ `buffer_minutes` from any existing meeting's start that day (both
  directions), and may never overlap. The same function generates the youth's
  slot grid **and** re-validates on submit, so two youth can't grab the same or
  too-close slots. A unique DB index on `(cm_id, meeting_date, start_time)` is
  the hard backstop for the exact-same-slot race.
- `lib/dates.ts` — weekday-only week math. Saturdays/Sundays roll forward to
  the next Monday everywhere.
- `app/s/[token]/` — the public youth page (mobile-first, no login).
- `app/dashboard/`, `app/settings/` — the CM side (magic-link auth, RLS).
- `lib/notify.ts` — **v2 TODO**: email the CM when a youth books. Stubbed, not
  built.

## Limits worth knowing

- Times are naive local times (no timezone column). Set `TZ` on Vercel and
  everyone — CMs and youth — is assumed to be in that one timezone. Fine for a
  single-region nonprofit.
- Supabase's built-in email service allows only a handful of magic-link emails
  per hour. Plenty for a few CMs; if you add many, wire up custom SMTP in
  Supabase Auth settings.
- Youth can book but not cancel (by design — they text their CM instead).
