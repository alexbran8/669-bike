create extension if not exists pgcrypto;

create table public.wheels (
  id uuid primary key default gen_random_uuid(),
  owner_uid text not null,
  name text,
  position text check (position in ('front', 'rear')),
  spoke_count integer not null check (spoke_count between 3 and 100),
  rim text,
  hub text,
  target_left numeric check (target_left > 0),
  target_right numeric check (target_right > 0),
  tension_unit text not null default 'kgf' check (tension_unit = 'kgf'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tension_sessions (
  id uuid primary key default gen_random_uuid(),
  wheel_id uuid not null references public.wheels(id) on delete cascade,
  owner_uid text not null,
  notes text check (char_length(notes) <= 2000),
  created_at timestamptz not null default now()
);

create table public.spoke_measurements (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.tension_sessions(id) on delete cascade,
  spoke_number integer not null check (spoke_number > 0),
  side text not null check (side in ('left', 'right')),
  position_index integer not null check (position_index >= 0),
  tension numeric not null check (tension > 0 and tension <= 500),
  created_at timestamptz not null default now(),
  unique (session_id, side, position_index)
);

create index wheels_owner_uid_idx on public.wheels(owner_uid);
create index tension_sessions_owner_uid_idx on public.tension_sessions(owner_uid);
create index tension_sessions_wheel_id_idx on public.tension_sessions(wheel_id);
create index spoke_measurements_session_id_idx on public.spoke_measurements(session_id);

alter table public.wheels enable row level security;
alter table public.tension_sessions enable row level security;
alter table public.spoke_measurements enable row level security;

-- The service role intentionally bypasses RLS. Netlify Functions must scope every
-- operation to the UID from a verified Firebase token; no browser receives this key.
revoke all on public.wheels, public.tension_sessions, public.spoke_measurements from anon, authenticated;
