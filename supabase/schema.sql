-- TripMate AI — database schema
--
-- Run this once in your Supabase project:
--   Dashboard  ->  SQL Editor  ->  New query  ->  paste  ->  Run
--
-- Safe to run more than once.

create table if not exists trips (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid        not null references auth.users (id) on delete cascade,
  title          text        not null,
  from_location  text        not null,
  destination    text        not null,
  departure_date date        not null,
  -- What the user asked to spend.
  budget           integer   not null,
  -- What the plan actually costs, as estimated by the AI. These differ, and
  -- the gap is what budget_warning explains.
  estimated_budget integer   not null,
  days           integer     not null,
  itinerary      jsonb       not null,
  travel_tips    jsonb       not null,
  budget_warning text,
  created_at     timestamptz not null default now()
);

-- For anyone who ran an earlier version of this file.
alter table trips add column if not exists estimated_budget integer not null default 0;

-- My Trips lists a single user's trips, newest first.
create index if not exists trips_user_created_idx
  on trips (user_id, created_at desc);


-- Row Level Security -------------------------------------------------------
--
-- Supabase denies every query by default once RLS is on. These four policies
-- are what make the table usable, and they are also what keeps one user from
-- reading another user's trips: every rule is scoped to auth.uid().

alter table trips enable row level security;

drop policy if exists "users read own trips"   on trips;
drop policy if exists "users insert own trips" on trips;
drop policy if exists "users update own trips" on trips;
drop policy if exists "users delete own trips" on trips;

create policy "users read own trips"
  on trips for select
  to authenticated
  using (auth.uid() = user_id);

-- `with check` runs on the row being written, so a user cannot insert a trip
-- under someone else's user_id even by editing the request.
create policy "users insert own trips"
  on trips for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users update own trips"
  on trips for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users delete own trips"
  on trips for delete
  to authenticated
  using (auth.uid() = user_id);
