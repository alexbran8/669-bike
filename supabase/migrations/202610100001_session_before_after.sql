alter table public.tension_sessions
  add column is_new_wheel boolean not null default false;

alter table public.spoke_measurements
  add column measurement_stage text not null default 'after'
  check (measurement_stage in ('before', 'after'));

alter table public.spoke_measurements
  drop constraint spoke_measurements_session_id_side_position_index_key;

alter table public.spoke_measurements
  add constraint spoke_measurements_session_stage_side_position_key
  unique (session_id, measurement_stage, side, position_index);

create unique index tension_sessions_one_new_wheel_per_wheel_idx
  on public.tension_sessions(wheel_id)
  where is_new_wheel;
