# Weekly Check-In Scheduler — Implementation Plan

## Context

Alan (Case Manager at New Alternatives Inc, a San Diego foster-youth transitional
housing nonprofit) needs a lightweight web app so each case manager (CM) can send
their youth a link to self-schedule a weekly check-in meeting. Today, tracking these
meetings is manual and scattered. The app centralizes it: youth pick a slot from the
CM's live weekly calendar (identified by initials, weekdays only, spaced apart), and
the CM sees and controls their own calendar.

**Decisions locked with the user:**
- **Texting:** App generates the scheduling link + a ready-to-send weekly message the
  CM copies into their own phone. No automated SMS in v1. CM sees new bookings in the
  dashboard, with an optional email ping.
- **Travel time between clients:** Handled by a configurable buffer (30/45/60 min) plus
  the CM's manual edit control — no zones or maps API in v1.
- **v1 scope:** Client scheduling page + CM dashboard with per-CM login and data
  isolation. Notifications (v2) and 1-hour reminders + 1–5 confirmation scoring (v3)
  come later.
- **Stack:** My pick — a modern, low-cost, one-person-maintainable web app.

## Recommended Stack

- **Next.js 15** (App Router, TypeScript, React) — one deployable web app, mobile-first
  (youth open the link on phones).
- **Supabase** — Postgres + Auth + Row-Level Security in one service (free tier). RLS is
  a clean fit for "each CM sees only their own meetings."
- **Tailwind CSS** for styling; polish the youth-facing page with the `impeccable` /
  `project-polish` skills.
- **Deploy:** Vercel (free) + Supabase (free). Optional **Resend** (free tier) for the
  email ping in v2.
- **Project location:** create at `C:\Users\alanb\youth-scheduler` (NOT system32).

## Data Model (Supabase / Postgres)

- **case_managers**: `id`, `auth_user_id` (Supabase auth), `name`, `email`,
  `share_token` (unguessable, used in the public link), `buffer_minutes` (default 30),
  `work_start` (default 09:00), `work_end` (default 17:00), `slot_minutes` (default 30),
  `created_at`.
- **meetings**: `id`, `cm_id` (FK), `meeting_date`, `start_time`, `end_time`,
  `client_initials`, `status` (`scheduled` | `completed` | `missed`),
  `created_by` (`client` | `cm`), `notes`, `created_at`.

No separate clients table in v1 — youth self-identify by initials on the shared link
(privacy-conscious: initials, not full names). A client roster is a natural v2 addition.

**RLS:** meetings/case_managers policies restrict rows to
`auth_user_id = auth.uid()`. The public client page never uses the logged-in path — it
reads/writes through a **server action using the service-role key**, scoped strictly to
the one CM resolved from the link's `share_token`.

## Core Business Rules

- **Weekdays only:** week view and slot generation cover Mon–Fri (Sat/Sun excluded).
- **Working hours:** default 09:00–17:00, `slot_minutes` granularity (per-CM configurable).
- **Buffer spacing:** a new meeting's start must be ≥ `buffer_minutes` from any existing
  meeting that day, both directions (e.g. buffer 30, existing 10:00 → 10:30 is the next
  bookable start). Enforced when generating the client's available slots **and**
  re-validated server-side on submit (guards against two youth grabbing the same slot).
- **Isolation:** every CM query filters by their `cm_id`; RLS enforces it at the DB.

## Build Steps

1. **Scaffold** `youth-scheduler`: `create-next-app` (TS, Tailwind, App Router); add
   Supabase client libs; env vars for Supabase URL/anon key/service-role key.
2. **Supabase project + schema:** create tables above via SQL migration; enable RLS;
   write policies; add a DB trigger/function or app-side check for buffer validation.
3. **Auth (CM):** Supabase Auth (email magic link — simplest, no password storage).
   On first login, create the CM's `case_managers` row + generate `share_token`.
4. **CM dashboard** (`/dashboard`): weekly Mon–Fri calendar, week navigation, shows the
   CM's meetings with initials + status color. Actions: add / edit / remove meeting,
   and **flag missed** (sets `status = missed`, visual marker).
5. **CM settings** (`/settings`): edit `buffer_minutes`, working hours; **view/copy the
   share link** and a **prewritten weekly message** ("Hope you had a good weekend! Pick a
   time to meet this week: <link>") to paste into their phone.
6. **Client scheduling page** (`/s/[token]`): resolve CM by `share_token`; render current
   week Mon–Fri with available slots (working hours minus taken/buffered); pick a slot →
   enter initials → confirm. Server action re-validates and inserts
   (`created_by = client`) → success screen. Mobile-first, no login.
7. **Booking feedback to CM:** new client bookings appear in the dashboard (optionally
   highlighted as "new"). Email ping is stubbed/flagged for v2.
8. **Polish pass** on the client page and dashboard using the design skills.

## Later Phases (not built in v1)
- **v2:** optional email ping to CM on booking (Resend); simple client roster.
- **v3:** 1-hour-before reminder + youth confirms by ranking readiness 1–5, score
  pushed to the CM. (Reminders need a scheduler — a Vercel Cron job — and revisit the
  SMS-vs-email channel decision then.)

## Execution Approach

- Build is delegated to a **Fable 5** agent running **autonomously (background/auto mode)**.
- The agent **loads the `impeccable` skill** first and applies it to the youth-facing
  scheduling page and the CM dashboard so the UI is polished, accessible, and mobile-first.
- The agent scaffolds in `C:\Users\alanb\youth-scheduler`, follows the build steps above,
  and reports back what it created + how to run it. Supabase project creation / API keys
  may need Alan's hands (external signup) — the agent will flag anything it can't do
  headlessly and leave clear setup instructions.

## Verification

- **CM auth + isolation:** create two test CM accounts; confirm each sees only their own
  meetings (seed rows for both, verify no cross-leak — the critical privacy check).
- **Client booking:** open `/s/[token]` in an incognito window, book a slot with
  initials; confirm it appears on that CM's dashboard and is absent from the other CM's.
- **Buffer rule:** with buffer 30 and a 10:00 meeting, confirm 10:00–10:29 slots are
  hidden/rejected and 10:30 is bookable; change buffer to 60 and re-verify.
- **Weekday exclusion:** confirm no Saturday/Sunday slots ever render.
- **CM edits:** add, move, remove, and flag-missed a meeting; confirm the client page
  reflects freed/taken slots after a change.
- **Race guard:** attempt to book a slot server-side that was just taken; confirm the
  re-validation rejects it cleanly.
- Run locally with `npm run dev` against the Supabase project before deploying to Vercel.
