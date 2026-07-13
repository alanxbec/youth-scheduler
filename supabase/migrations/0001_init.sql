-- Weekly Check-In Scheduler — initial schema + Row-Level Security
-- Run this in the Supabase SQL editor (or `supabase db push`) once per project.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- case_managers: one row per logged-in CM. share_token is the unguessable
-- key used in the public /s/<token> link.
-- ---------------------------------------------------------------------------
create table public.case_managers (
  id             uuid primary key default gen_random_uuid(),
  auth_user_id   uuid not null unique references auth.users (id) on delete cascade,
  name           text not null,
  email          text not null,
  share_token    text not null unique default encode(gen_random_bytes(16), 'hex'),
  buffer_minutes int  not null default 30 check (buffer_minutes between 0 and 240),
  work_start     time not null default '09:00',
  work_end       time not null default '17:00',
  slot_minutes   int  not null default 30 check (slot_minutes in (15, 20, 30, 45, 60)),
  created_at     timestamptz not null default now(),
  check (work_start < work_end)
);

-- ---------------------------------------------------------------------------
-- meetings: youth self-identify by initials only (privacy — never full names).
-- ---------------------------------------------------------------------------
create table public.meetings (
  id              uuid primary key default gen_random_uuid(),
  cm_id           uuid not null references public.case_managers (id) on delete cascade,
  meeting_date    date not null,
  start_time      time not null,
  end_time        time not null,
  client_initials text not null check (char_length(trim(client_initials)) between 1 and 4),
  status          text not null default 'scheduled' check (status in ('scheduled', 'completed', 'missed')),
  created_by      text not null default 'cm' check (created_by in ('client', 'cm')),
  notes           text,
  created_at      timestamptz not null default now(),
  check (end_time > start_time),
  -- Weekdays only (Postgres dow: 0 = Sunday, 6 = Saturday)
  check (extract(dow from meeting_date) between 1 and 5)
);

create index meetings_cm_date_idx on public.meetings (cm_id, meeting_date);

-- Race guard: two bookings can never land on the exact same start slot.
-- (Buffer spacing is re-validated in the server action right before insert;
-- this index is the hard backstop for the same-slot race.)
create unique index meetings_unique_start on public.meetings (cm_id, meeting_date, start_time);

-- ---------------------------------------------------------------------------
-- Row-Level Security
--
-- CMs (logged in via Supabase Auth) can only touch their own rows.
-- The public youth page NEVER hits these tables with the anon key — it goes
-- through a server action using the service-role key (which bypasses RLS),
-- scoped to the single CM resolved from the link's share_token.
-- ---------------------------------------------------------------------------
alter table public.case_managers enable row level security;
alter table public.meetings enable row level security;

create policy "cm can read own profile"
  on public.case_managers for select
  using (auth_user_id = auth.uid());

create policy "cm can create own profile"
  on public.case_managers for insert
  with check (auth_user_id = auth.uid());

create policy "cm can update own profile"
  on public.case_managers for update
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

create policy "cm can manage own meetings"
  on public.meetings for all
  using (
    cm_id in (select id from public.case_managers where auth_user_id = auth.uid())
  )
  with check (
    cm_id in (select id from public.case_managers where auth_user_id = auth.uid())
  );
