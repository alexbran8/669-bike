create table public.session_shares (
  token uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.tension_sessions(id) on delete cascade,
  owner_uid text not null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index session_shares_owner_uid_idx on public.session_shares(owner_uid);
alter table public.session_shares enable row level security;
revoke all on public.session_shares from anon, authenticated;
