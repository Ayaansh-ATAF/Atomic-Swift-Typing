-- ATAF Typing production schema. Run in Supabase SQL Editor on a fresh project.
-- Uses Supabase Auth for passwords; no password is ever stored in public tables.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Typist' check (char_length(display_name) between 1 and 60),
  username text,
  role text not null default 'student' check (role in ('student','teacher','admin')),
  grade smallint not null default 1 check (grade between 1 and 9),
  xp integer not null default 0 check (xp >= 0),
  game_points integer not null default 0 check (game_points >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles add column if not exists username text;
alter table public.profiles drop constraint if exists profiles_username_format_check;
alter table public.profiles add constraint profiles_username_format_check
  check (username is null or username ~ '^[a-z0-9_]{3,24}$');
create unique index if not exists profiles_username_unique_idx
  on public.profiles(username) where username is not null;
alter table public.profiles drop constraint if exists profiles_grade_check;
alter table public.profiles add constraint profiles_grade_check check (grade between 1 and 9);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name, username, role)
  values (
    new.id,
    coalesce(nullif(left(trim(new.raw_user_meta_data ->> 'display_name'),60),''), 'Typist'),
    nullif(lower(trim(new.raw_user_meta_data ->> 'username')),''),
    case
      when new.email_confirmed_at is not null
        and lower(btrim(new.email)) in (
          'ayaansh.atomic810@gmail.com',
          'atomic2103@gmail.com',
          'darsh.jhun@gmail.com',
          'amol.ayaansh@gmail.com'
        )
      then 'admin'
      else 'student'
    end
  )
  on conflict (id) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.grant_allowlisted_admin_role()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.email_confirmed_at is not null
    and lower(btrim(new.email)) in (
      'ayaansh.atomic810@gmail.com',
      'atomic2103@gmail.com',
      'darsh.jhun@gmail.com',
      'amol.ayaansh@gmail.com'
    )
  then
    update public.profiles
    set role='admin'
    where id=new.id and role is distinct from 'admin';
  elsif tg_op='UPDATE'
    and lower(btrim(old.email)) in (
      'ayaansh.atomic810@gmail.com',
      'atomic2103@gmail.com',
      'darsh.jhun@gmail.com',
      'amol.ayaansh@gmail.com'
    )
    and lower(btrim(new.email)) not in (
      'ayaansh.atomic810@gmail.com',
      'atomic2103@gmail.com',
      'darsh.jhun@gmail.com',
      'amol.ayaansh@gmail.com'
    )
  then
    update public.profiles
    set role='student'
    where id=new.id and role='admin';
  end if;
  return new;
end; $$;
revoke all on function public.grant_allowlisted_admin_role() from public, anon, authenticated;
drop trigger if exists grant_allowlisted_admin_role_trigger on auth.users;
create trigger grant_allowlisted_admin_role_trigger
after insert or update of email,email_confirmed_at on auth.users
for each row execute procedure public.grant_allowlisted_admin_role();

update public.profiles p
set role='admin'
from auth.users u
where p.id=u.id
  and u.email_confirmed_at is not null
  and lower(btrim(u.email)) in (
    'ayaansh.atomic810@gmail.com',
    'atomic2103@gmail.com',
    'darsh.jhun@gmail.com',
    'amol.ayaansh@gmail.com'
  )
  and p.role is distinct from 'admin';

create or replace function public.lookup_auth_email_for_username(p_username text)
returns text language sql stable security definer set search_path = '' as $$
  select u.email
  from auth.users u
  join public.profiles p on p.id = u.id
  where p.username = lower(trim(regexp_replace(p_username, '^@', '')))
    and u.email_confirmed_at is not null
  limit 1;
$$;
revoke all on function public.lookup_auth_email_for_username(text) from public, anon, authenticated;
grant execute on function public.lookup_auth_email_for_username(text) to service_role;

create table if not exists public.classrooms (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  code text not null unique default upper(substr(encode(gen_random_bytes(8),'hex'),1,6)),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  grade smallint not null check (grade between 1 and 9),
  track text not null default 'Basic' check (track in ('Basic','Intermediate','Master')),
  description text not null default '' check (char_length(description) <= 500),
  created_at timestamptz not null default now()
);
alter table public.classrooms add column if not exists student_chat_enabled boolean not null default false;
alter table public.classrooms add column if not exists student_comments_enabled boolean not null default true;
alter table public.classrooms drop constraint if exists classrooms_grade_check;
alter table public.classrooms add constraint classrooms_grade_check check (grade between 1 and 9);
alter table public.classrooms drop constraint if exists classrooms_track_check;
alter table public.classrooms add constraint classrooms_track_check check (track in ('Basic','Intermediate','Master'));
create index if not exists classrooms_teacher_id_idx on public.classrooms(teacher_id);

create table if not exists public.class_memberships (
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','denied')),
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  primary key (classroom_id, student_id)
);
create index if not exists memberships_student_idx on public.class_memberships(student_id,status);

create table if not exists public.class_chat_messages (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 300),
  created_at timestamptz not null default now()
);
create index if not exists class_chat_messages_class_created_idx on public.class_chat_messages(classroom_id,created_at desc);
create index if not exists class_chat_messages_sender_created_idx on public.class_chat_messages(sender_id,created_at desc);

create table if not exists public.class_assignments (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  assignment_type text not null default 'assignment' check (assignment_type in ('assignment','surprise_test')),
  due_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists class_assignments_class_created_idx on public.class_assignments(classroom_id,created_at desc);
create table if not exists public.class_assignment_comments (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.class_assignments(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists class_assignment_comments_assignment_created_idx on public.class_assignment_comments(assignment_id,created_at);
create table if not exists public.class_assignment_attempts (
  assignment_id uuid not null references public.class_assignments(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  wpm integer not null check (wpm between 0 and 500),
  accuracy numeric(5,2) not null check (accuracy between 0 and 100),
  completed_at timestamptz not null default now(),
  primary key (assignment_id,student_id)
);
create index if not exists class_assignment_attempts_student_idx on public.class_assignment_attempts(student_id,completed_at desc);
create table if not exists public.class_awards (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  granted_by uuid not null references public.profiles(id) on delete restrict,
  award_key text not null check (award_key in ('accuracy_star','practice_streak','helpful_classmate','great_effort')),
  note text not null default '' check (char_length(btrim(note)) <= 240),
  created_at timestamptz not null default now()
);
create index if not exists class_awards_student_created_idx on public.class_awards(student_id,created_at desc);
create index if not exists class_awards_class_created_idx on public.class_awards(classroom_id,created_at desc);

create table if not exists public.leaderboard_certificates (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  classroom_id uuid references public.classrooms(id) on delete cascade,
  board_scope text not null check (board_scope in ('global','class')),
  board_type text not null check (board_type in ('typing','game')),
  game_key text,
  scope_key text not null,
  period_start date not null,
  place smallint not null check (place between 1 and 3),
  score bigint not null check (score > 0),
  created_at timestamptz not null default now(),
  check ((board_scope='global' and classroom_id is null) or (board_scope='class' and classroom_id is not null)),
  check (board_type='game' or game_key is null),
  unique(scope_key,period_start,student_id)
);
create index if not exists leaderboard_certificates_student_period_idx
  on public.leaderboard_certificates(student_id,period_start desc);
create index if not exists leaderboard_certificates_scope_period_idx
  on public.leaderboard_certificates(scope_key,period_start desc);
create table if not exists public.leaderboard_certificate_periods (
  period_start date primary key,
  issued_at timestamptz not null default now()
);
revoke all on public.leaderboard_certificate_periods from public, anon, authenticated;

create table if not exists public.security_cases (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete cascade,
  reported_by uuid references public.profiles(id) on delete set null,
  classroom_id uuid references public.classrooms(id) on delete set null,
  signal_type text not null check (signal_type in ('chat_rate_limit','chat_repeat','chat_unauthorized')),
  details text not null check (char_length(details) between 1 and 280),
  status text not null default 'open' check (status in ('open','reviewed','false_positive')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  review_note text check (review_note is null or char_length(review_note) <= 500)
);
alter table public.security_cases alter column actor_id drop not null;
alter table public.security_cases add column if not exists reported_by uuid references public.profiles(id) on delete set null;
alter table public.security_cases drop constraint if exists security_cases_signal_type_check;
alter table public.security_cases add constraint security_cases_signal_type_check
  check (signal_type in ('chat_rate_limit','chat_repeat','chat_unauthorized','system_breach'));
alter table public.security_cases drop constraint if exists security_cases_status_check;
alter table public.security_cases add constraint security_cases_status_check
  check (status in ('open','reviewed','false_positive','banned'));
create index if not exists security_cases_open_created_idx on public.security_cases(status,created_at desc);
create index if not exists security_cases_actor_created_idx on public.security_cases(actor_id,created_at desc);

create table if not exists public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  grade smallint not null check (grade between 1 and 9),
  track text not null check (track in ('Basic','Intermediate','Master')),
  lesson_key text not null check (char_length(lesson_key) between 1 and 100),
  completed_at timestamptz not null default now(),
  unique(student_id, lesson_key)
);
alter table public.lesson_progress drop constraint if exists lesson_progress_grade_check;
alter table public.lesson_progress add constraint lesson_progress_grade_check check (grade between 1 and 9);
alter table public.lesson_progress drop constraint if exists lesson_progress_track_check;
alter table public.lesson_progress add constraint lesson_progress_track_check check (track in ('Basic','Intermediate','Master'));
create table if not exists public.typing_results (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  wpm integer not null default 0 check (wpm between 0 and 500),
  accuracy numeric(5,2) not null default 0 check (accuracy between 0 and 100),
  duration_seconds smallint not null default 30 check (duration_seconds in (15,30,60,120)),
  created_at timestamptz not null default now()
);
create table if not exists public.game_results (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  game_key text not null check (char_length(game_key) between 1 and 40),
  points integer not null default 0 check (points between 0 and 5000),
  created_at timestamptz not null default now()
);
create table if not exists public.race_results (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique references public.profiles(id) on delete cascade,
  finish_ms integer not null check (finish_ms between 5000 and 90000),
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.race_results
  add column if not exists is_public boolean not null default true;
alter table public.race_results alter column is_public set default false;
create table if not exists public.race_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  scope text not null check (scope in ('solo','class','public')),
  opponent_race_id uuid references public.race_results(id) on delete set null,
  opponent_finish_ms integer check (opponent_finish_ms between 5000 and 90000),
  started_at timestamptz not null default clock_timestamp(),
  completed_at timestamptz,
  check ((scope='solo' and opponent_race_id is null and opponent_finish_ms is null)
    or (scope in ('class','public') and opponent_race_id is not null and opponent_finish_ms is not null))
);
create index if not exists race_sessions_student_idx on public.race_sessions(student_id);
create table if not exists public.race_skins (
  student_id uuid not null references public.profiles(id) on delete cascade,
  skin_id text not null check (skin_id in ('comet','neon','nebula','gold')),
  earned_from_race uuid not null references public.race_results(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (student_id,skin_id)
);
create index if not exists typing_results_student_created_idx on public.typing_results(student_id,created_at desc);
create index if not exists typing_results_created_student_idx on public.typing_results(created_at,student_id);
create index if not exists game_results_student_created_idx on public.game_results(student_id,created_at desc);
create index if not exists game_results_created_student_idx on public.game_results(created_at,student_id);
create index if not exists lesson_progress_completed_student_idx on public.lesson_progress(completed_at,student_id);
create index if not exists race_results_student_finish_idx on public.race_results(student_id,finish_ms,created_at desc);
create table if not exists public.track_assessments (
  student_id uuid not null references public.profiles(id) on delete cascade,
  grade smallint not null check (grade between 1 and 9),
  track text not null check (track in ('Basic','Intermediate','Master')),
  wpm integer not null check (wpm between 0 and 500),
  accuracy numeric(5,2) not null check (accuracy between 0 and 100),
  completed_at timestamptz not null default now(),
  primary key (student_id,grade,track)
);

-- Keep privileged fields and totals out of direct browser updates.
create or replace function public.protect_profile_privileges()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user not in ('postgres','service_role') and auth.uid() is not null then
    if new.role is distinct from old.role or new.xp is distinct from old.xp or new.game_points is distinct from old.game_points then
      raise exception 'role and score fields can only be changed by trusted database functions';
    end if;
  end if;
  new.updated_at = now();
  return new;
end; $$;
drop trigger if exists protect_profile_privileges_trigger on public.profiles;
create trigger protect_profile_privileges_trigger before update on public.profiles
for each row execute procedure public.protect_profile_privileges();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin');
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
create or replace function public.is_teacher()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='teacher');
$$;
revoke all on function public.is_teacher() from public, anon;
grant execute on function public.is_teacher() to authenticated;

revoke all on public.leaderboard_certificates from anon, authenticated;
grant select on public.leaderboard_certificates to authenticated;
drop policy if exists "Students and admins read leaderboard certificates" on public.leaderboard_certificates;
create policy "Students and admins read leaderboard certificates" on public.leaderboard_certificates
  for select to authenticated using (student_id=auth.uid() or public.is_admin());

create or replace function public.issue_previous_week_leaderboard_certificates()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_start date := date_trunc('week',now() at time zone 'UTC')::date-7;
  period_claimed integer;
  inserted_count integer;
begin
  insert into public.leaderboard_certificate_periods(period_start)
  values(v_start) on conflict(period_start) do nothing;
  get diagnostics period_claimed = row_count;
  if period_claimed=0 then return 0; end if;

  with typing_events as (
    select lp.student_id,25::bigint score
    from public.lesson_progress lp
    where lp.completed_at >= v_start::timestamp at time zone 'UTC'
      and lp.completed_at < (v_start+7)::timestamp at time zone 'UTC'
    union all
    select tr.student_id,least(250,greatest(0,round(tr.wpm*tr.accuracy/100.0)::integer))::bigint
    from public.typing_results tr
    where tr.created_at >= v_start::timestamp at time zone 'UTC'
      and tr.created_at < (v_start+7)::timestamp at time zone 'UTC'
    union all
    select gr.student_id,least(250,round(gr.points/2.0)::integer)::bigint
    from public.game_results gr
    where gr.created_at >= v_start::timestamp at time zone 'UTC'
      and gr.created_at < (v_start+7)::timestamp at time zone 'UTC'
  ),
  typing_scores as (
    select e.student_id,sum(e.score)::bigint score from typing_events e group by e.student_id
  ),
  game_scores as (
    select gr.student_id,gr.game_key,sum(gr.points)::bigint score
    from public.game_results gr
    where gr.created_at >= v_start::timestamp at time zone 'UTC'
      and gr.created_at < (v_start+7)::timestamp at time zone 'UTC'
    group by gr.student_id,gr.game_key
  ),
  game_boards as (
    select gs.student_id,gs.game_key,gs.score from game_scores gs
    union all
    select gs.student_id,null::text,sum(gs.score)::bigint from game_scores gs group by gs.student_id
  ),
  candidates as (
    select 'global'::text board_scope,null::uuid classroom_id,'typing'::text board_type,
      null::text game_key,p.id student_id,p.display_name,coalesce(ts.score,0)::bigint score
    from public.profiles p left join typing_scores ts on ts.student_id=p.id
    where p.role='student'
    union all
    select 'global',null,'game',gb.game_key,p.id,p.display_name,gb.score
    from game_boards gb join public.profiles p on p.id=gb.student_id
    where p.role='student'
    union all
    select 'class',m.classroom_id,'typing',null,p.id,p.display_name,coalesce(ts.score,0)::bigint
    from public.class_memberships m
      join public.profiles p on p.id=m.student_id and p.role='student'
      left join typing_scores ts on ts.student_id=p.id
    where m.status='approved'
    union all
    select 'class',m.classroom_id,'game',gb.game_key,p.id,p.display_name,gb.score
    from public.class_memberships m
      join public.profiles p on p.id=m.student_id and p.role='student'
      join game_boards gb on gb.student_id=p.id
    where m.status='approved'
  ),
  ranked as (
    select c.*,
      row_number() over (
        partition by c.board_scope,c.classroom_id,c.board_type,c.game_key
        order by c.score desc,c.display_name,c.student_id
      )::smallint place
    from candidates c
    where c.score>0
  )
  insert into public.leaderboard_certificates(
    student_id,classroom_id,board_scope,board_type,game_key,scope_key,period_start,place,score
  )
  select r.student_id,r.classroom_id,r.board_scope,r.board_type,r.game_key,
    case when r.board_scope='global' then 'global:'||r.board_type||':'||coalesce(r.game_key,'all')
      else 'class:'||r.classroom_id::text||':'||r.board_type||':'||coalesce(r.game_key,'all') end,
    v_start,r.place,r.score
  from ranked r
  where r.place<=3
  on conflict(scope_key,period_start,student_id) do nothing;
  get diagnostics inserted_count = row_count;
  return inserted_count;
end; $$;
revoke all on function public.issue_previous_week_leaderboard_certificates() from public, anon, authenticated;

create or replace function public.get_weekly_leaderboard(
  p_board_type text,
  p_scope text,
  p_classroom_id uuid,
  p_game_key text
)
returns table(student_id uuid,display_name text,score bigint,place bigint,week_start date)
language plpgsql security definer set search_path = '' as $$
declare
  v_start date := date_trunc('week',now() at time zone 'UTC')::date;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  if p_board_type is null or p_scope is null
    or p_board_type not in ('typing','game') or p_scope not in ('global','class') then
    raise exception 'Invalid leaderboard';
  end if;
  if (p_scope='global' and p_classroom_id is not null) or (p_scope='class' and p_classroom_id is null) then
    raise exception 'Invalid leaderboard scope';
  end if;
  if p_scope='class' and not (
    public.is_admin() or public.is_class_teacher(p_classroom_id) or public.is_approved_class_member(p_classroom_id)
  ) then raise exception 'Only approved class members and the classroom teacher can view this class leaderboard'; end if;
  if p_game_key is not null and (p_board_type<>'game' or char_length(p_game_key) not between 1 and 40) then
    raise exception 'Invalid game leaderboard';
  end if;

  return query
  with eligible as (
    select p.id,p.display_name
    from public.profiles p
    where p.role='student' and (
      (p_scope='global') or exists(
        select 1 from public.class_memberships m
        where m.classroom_id=p_classroom_id and m.student_id=p.id and m.status='approved'
      )
    )
  ),
  events as (
    select lp.student_id,25::bigint score
    from public.lesson_progress lp
    where p_board_type='typing'
      and lp.completed_at >= v_start::timestamp at time zone 'UTC'
      and lp.completed_at < (v_start+7)::timestamp at time zone 'UTC'
    union all
    select tr.student_id,least(250,greatest(0,round(tr.wpm*tr.accuracy/100.0)::integer))::bigint
    from public.typing_results tr
    where p_board_type='typing'
      and tr.created_at >= v_start::timestamp at time zone 'UTC'
      and tr.created_at < (v_start+7)::timestamp at time zone 'UTC'
    union all
    select gr.student_id,
      case when p_board_type='typing' then least(250,round(gr.points/2.0)::integer)::bigint else gr.points::bigint end
    from public.game_results gr
    where gr.created_at >= v_start::timestamp at time zone 'UTC'
      and gr.created_at < (v_start+7)::timestamp at time zone 'UTC'
      and (p_board_type='typing' or p_game_key is null or gr.game_key=p_game_key)
  ),
  totals as (
    select e.id,e.display_name,coalesce(sum(ev.score),0)::bigint score
    from eligible e left join events ev on ev.student_id=e.id
    group by e.id,e.display_name
  )
  select t.id,t.display_name,t.score,
    row_number() over(order by t.score desc,t.display_name,t.id),v_start
  from totals t
  where t.score>0
  order by t.score desc,t.display_name,t.id;
end; $$;
revoke all on function public.get_weekly_leaderboard(text,text,uuid,text) from public, anon;
grant execute on function public.get_weekly_leaderboard(text,text,uuid,text) to authenticated;

create or replace function public.award_weekly_leaderboard_certificates()
returns integer language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Only a trusted admin can award weekly leaderboard certificates';
  end if;
  return public.issue_previous_week_leaderboard_certificates();
end; $$;
revoke all on function public.award_weekly_leaderboard_certificates() from public, anon;
grant execute on function public.award_weekly_leaderboard_certificates() to authenticated;

-- All tables use RLS.
alter table public.profiles enable row level security;
alter table public.classrooms enable row level security;
alter table public.class_memberships enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.typing_results enable row level security;
alter table public.game_results enable row level security;
alter table public.race_results enable row level security;
alter table public.race_sessions enable row level security;
alter table public.race_skins enable row level security;
alter table public.track_assessments enable row level security;
alter table public.class_chat_messages enable row level security;
alter table public.class_assignments enable row level security;
alter table public.class_assignment_comments enable row level security;
alter table public.class_assignment_attempts enable row level security;
alter table public.class_awards enable row level security;
alter table public.leaderboard_certificates enable row level security;
alter table public.leaderboard_certificate_periods enable row level security;
alter table public.security_cases enable row level security;

drop policy if exists "Profiles leaderboard read" on public.profiles;
create policy "Profiles leaderboard read" on public.profiles for select to authenticated using (true);
drop policy if exists "Users update own safe profile fields" on public.profiles;
create policy "Users update own safe profile fields" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- SECURITY DEFINER helpers avoid circular RLS evaluation between classrooms and memberships.
create or replace function public.is_class_teacher(p_classroom_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.classrooms c where c.id=p_classroom_id and c.teacher_id=auth.uid());
$$;
create or replace function public.is_approved_class_member(p_classroom_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.class_memberships m where m.classroom_id=p_classroom_id and m.student_id=auth.uid() and m.status='approved');
$$;
revoke all on function public.is_class_teacher(uuid) from public;
revoke all on function public.is_approved_class_member(uuid) from public;
grant execute on function public.is_class_teacher(uuid) to authenticated;
grant execute on function public.is_approved_class_member(uuid) to authenticated;

revoke all on public.class_chat_messages from anon, authenticated;
grant select on public.class_chat_messages to authenticated;
drop policy if exists "Class members read chat" on public.class_chat_messages;
create policy "Class members read chat" on public.class_chat_messages for select to authenticated using (
  public.is_class_teacher(classroom_id) or (
    public.is_approved_class_member(classroom_id) and exists(
      select 1 from public.classrooms c where c.id=classroom_id and c.student_chat_enabled
    )
  )
);

revoke all on public.class_assignments, public.class_assignment_comments, public.class_assignment_attempts from anon, authenticated;
grant select,insert,update,delete on public.class_assignments to authenticated;
grant select,insert,delete on public.class_assignment_comments to authenticated;
grant select on public.class_assignment_attempts to authenticated;
drop policy if exists "Class members read assignments" on public.class_assignments;
create policy "Class members read assignments" on public.class_assignments for select to authenticated using (
  public.is_class_teacher(classroom_id) or public.is_approved_class_member(classroom_id)
);
drop policy if exists "Teachers create assignments" on public.class_assignments;
create policy "Teachers create assignments" on public.class_assignments for insert to authenticated with check (
  public.is_teacher() and teacher_id=auth.uid() and public.is_class_teacher(classroom_id)
);
drop policy if exists "Teachers update assignments" on public.class_assignments;
create policy "Teachers update assignments" on public.class_assignments for update to authenticated using (
  public.is_teacher() and public.is_class_teacher(classroom_id)
) with check (public.is_teacher() and teacher_id=auth.uid() and public.is_class_teacher(classroom_id));
drop policy if exists "Teachers delete assignments" on public.class_assignments;
create policy "Teachers delete assignments" on public.class_assignments for delete to authenticated using (
  public.is_teacher() and public.is_class_teacher(classroom_id)
);
drop policy if exists "Members read assignment comments" on public.class_assignment_comments;
create policy "Members read assignment comments" on public.class_assignment_comments for select to authenticated using (
  exists(select 1 from public.class_assignments a join public.classrooms c on c.id=a.classroom_id
    where a.id=assignment_id and (
      public.is_class_teacher(a.classroom_id) or
      (public.is_approved_class_member(a.classroom_id) and (c.student_comments_enabled or author_id=c.teacher_id))
    )
  )
);
drop policy if exists "Members comment on assignments" on public.class_assignment_comments;
create policy "Members comment on assignments" on public.class_assignment_comments for insert to authenticated with check (
  author_id=auth.uid() and exists(
    select 1 from public.class_assignments a join public.classrooms c on c.id=a.classroom_id
    where a.id=assignment_id and (
      public.is_class_teacher(a.classroom_id) or
      (c.student_comments_enabled and public.is_approved_class_member(a.classroom_id))
    )
  )
);
drop policy if exists "Authors or teachers delete assignment comments" on public.class_assignment_comments;
create policy "Authors or teachers delete assignment comments" on public.class_assignment_comments for delete to authenticated using (
  author_id=auth.uid() or exists(
    select 1 from public.class_assignments a where a.id=assignment_id and public.is_class_teacher(a.classroom_id)
  )
);
drop policy if exists "Teachers and students read own test attempts" on public.class_assignment_attempts;
create policy "Teachers and students read own test attempts" on public.class_assignment_attempts for select to authenticated using (
  student_id=auth.uid() or exists(
    select 1 from public.class_assignments a where a.id=assignment_id and public.is_class_teacher(a.classroom_id)
  )
);

revoke all on public.class_awards from anon, authenticated;
grant select on public.class_awards to authenticated;
drop policy if exists "Students read their class awards" on public.class_awards;
create policy "Students read their class awards" on public.class_awards for select to authenticated using (
  student_id=auth.uid() or public.is_class_teacher(classroom_id)
);
create or replace function public.grant_class_award(
  p_classroom_id uuid,
  p_student_id uuid,
  p_award_key text,
  p_note text default ''
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  new_award_id uuid;
begin
  if auth.uid() is null or not public.is_teacher()
    or not exists(select 1 from public.classrooms c where c.id=p_classroom_id and c.teacher_id=auth.uid()) then
    raise exception 'Only this classroom teacher can grant awards';
  end if;
  if p_award_key not in ('accuracy_star','practice_streak','helpful_classmate','great_effort') then
    raise exception 'Choose a supported award';
  end if;
  if char_length(btrim(coalesce(p_note,'')))>240 then
    raise exception 'Award note must be 240 characters or fewer';
  end if;
  if not exists(
    select 1
    from public.class_memberships m
    join public.profiles p on p.id=m.student_id
    where m.classroom_id=p_classroom_id and m.student_id=p_student_id
      and m.status='approved' and p.role='student'
  ) then
    raise exception 'Choose an approved student in this classroom';
  end if;
  insert into public.class_awards(classroom_id,student_id,granted_by,award_key,note)
  values(p_classroom_id,p_student_id,auth.uid(),p_award_key,btrim(coalesce(p_note,'')))
  returning id into new_award_id;
  return new_award_id;
end; $$;
revoke all on function public.grant_class_award(uuid,uuid,text,text) from public, anon;
grant execute on function public.grant_class_award(uuid,uuid,text,text) to authenticated;

revoke all on public.security_cases from anon, authenticated;
drop policy if exists "Admins read security cases" on public.security_cases;
create policy "Admins read security cases" on public.security_cases for select to authenticated using (
  exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin')
);
grant select (id,actor_id,reported_by,signal_type,details,status,created_at,reviewed_at,reviewed_by,review_note)
  on public.security_cases to authenticated;

update public.security_cases
set status='false_positive',
    review_note='Legacy message burst/repeat signals are not treated as suspicious activity.',
    reviewed_at=now()
where status='open' and signal_type in ('chat_rate_limit','chat_repeat');

create or replace function public.report_system_breach(p_details text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  new_case_id uuid;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Only a trusted admin can report a system breach';
  end if;
  if p_details is null or char_length(btrim(p_details)) not between 1 and 280 then
    raise exception 'Report details must contain 1 to 280 characters';
  end if;
  insert into public.security_cases(reported_by,signal_type,details)
  values(auth.uid(),'system_breach',btrim(p_details))
  returning id into new_case_id;
  return new_case_id;
end; $$;
revoke all on function public.report_system_breach(text) from public, anon;
grant execute on function public.report_system_breach(text) to authenticated;

create or replace function public.send_class_chat_message(p_classroom_id uuid,p_body text)
returns table(accepted boolean,message_id uuid,reason text)
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_body text := btrim(coalesce(p_body,''));
  v_recent_count integer;
  v_message_id uuid;
begin
  if v_uid is null then raise exception 'Sign in required'; end if;
  if char_length(v_body) not between 1 and 300 then raise exception 'Message must contain 1 to 300 characters'; end if;

  perform pg_advisory_xact_lock(hashtextextended(v_uid::text,0));

  if not exists (
    select 1 from public.classrooms c
    where c.id=p_classroom_id and (
      c.teacher_id=v_uid or exists (
        select 1 from public.class_memberships m
        where m.classroom_id=c.id and m.student_id=v_uid and m.status='approved'
      )
    )
  ) then
    if not exists(select 1 from public.security_cases s where s.actor_id=v_uid and s.signal_type='chat_unauthorized' and s.status='open' and s.created_at > now()-interval '5 minutes') then
      insert into public.security_cases(actor_id,classroom_id,signal_type,details)
      values(v_uid,p_classroom_id,'chat_unauthorized','Attempted to send a classroom chat message without class access.');
    end if;
    return query select false,null::uuid,'not_authorized'::text;
    return;
  end if;

  if not exists(select 1 from public.classrooms c where c.id=p_classroom_id and (c.teacher_id=v_uid or c.student_chat_enabled)) then
    return query select false,null::uuid,'chat_disabled'::text;
    return;
  end if;

  select count(*) into v_recent_count from public.class_chat_messages m
  where m.sender_id=v_uid and m.created_at > now()-interval '30 seconds';
  if v_recent_count >= 6 then
    return query select false,null::uuid,'rate_limited'::text;
    return;
  end if;

  insert into public.class_chat_messages(classroom_id,sender_id,body)
  values(p_classroom_id,v_uid,v_body) returning id into v_message_id;
  return query select true,v_message_id,null::text;
end; $$;
revoke all on function public.send_class_chat_message(uuid,text) from public;
grant execute on function public.send_class_chat_message(uuid,text) to authenticated;

create or replace function public.review_security_case(p_case_id uuid,p_disposition text,p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin') then
    raise exception 'Only a trusted admin can review security cases';
  end if;
  if p_disposition is distinct from 'false_positive' then raise exception 'Invalid review disposition'; end if;
  if p_note is not null and char_length(p_note)>500 then raise exception 'Review note is too long'; end if;
  update public.security_cases
  set status=p_disposition,review_note=nullif(btrim(p_note),''),reviewed_at=now(),reviewed_by=auth.uid()
  where id=p_case_id and status='open';
  if not found then raise exception 'Open security case not found'; end if;
end; $$;
revoke all on function public.review_security_case(uuid,text,text) from public;
grant execute on function public.review_security_case(uuid,text,text) to authenticated;

drop policy if exists "Teacher or approved member reads class" on public.classrooms;
create policy "Teacher or approved member reads class" on public.classrooms for select to authenticated using (
  teacher_id = auth.uid() or public.is_approved_class_member(id)
);
drop policy if exists "Teacher creates class" on public.classrooms;
create policy "Teacher creates class" on public.classrooms for insert to authenticated with check (
  teacher_id = auth.uid() and public.is_teacher()
);
drop policy if exists "Teacher updates own class" on public.classrooms;
create policy "Teacher updates own class" on public.classrooms for update to authenticated using (public.is_teacher() and teacher_id = auth.uid()) with check (public.is_teacher() and teacher_id = auth.uid());
drop policy if exists "Admins update classrooms" on public.classrooms;
drop policy if exists "Teacher deletes own class" on public.classrooms;
create policy "Teacher deletes own class" on public.classrooms for delete to authenticated using (public.is_teacher() and teacher_id = auth.uid());

drop policy if exists "Student or class teacher reads membership" on public.class_memberships;
create policy "Student or class teacher reads membership" on public.class_memberships for select to authenticated using (
  student_id = auth.uid() or public.is_class_teacher(classroom_id)
);
drop policy if exists "Student requests own membership" on public.class_memberships;
create policy "Student requests own membership" on public.class_memberships for insert to authenticated with check (student_id = auth.uid() and status = 'pending');
-- Updates/deletes are intentionally RPC-only so students cannot approve themselves.

drop policy if exists "Student reads own lessons" on public.lesson_progress;
create policy "Student reads own lessons" on public.lesson_progress for select to authenticated using (student_id = auth.uid());
drop policy if exists "Student reads own test results" on public.typing_results;
create policy "Student reads own test results" on public.typing_results for select to authenticated using (student_id = auth.uid());
drop policy if exists "Student reads own game results" on public.game_results;
create policy "Student reads own game results" on public.game_results for select to authenticated using (student_id = auth.uid());
revoke all on public.race_results from anon, authenticated;
revoke all on public.race_sessions from anon, authenticated;
revoke all on public.race_skins from anon, authenticated;
grant select on public.race_skins to authenticated;
drop policy if exists "Students read their own race skins" on public.race_skins;
create policy "Students read their own race skins" on public.race_skins for select to authenticated using (student_id=auth.uid());
revoke all on public.track_assessments from anon, authenticated;
grant select on public.track_assessments to authenticated;
drop policy if exists "Students read own track assessments" on public.track_assessments;
create policy "Students read own track assessments" on public.track_assessments for select to authenticated using (student_id=auth.uid());

-- Join requests are made by class code without exposing the directory of class codes.
create or replace function public.join_class_by_code(p_code text)
returns table(classroom_id uuid, classroom_name text, membership_status text)
language plpgsql security definer set search_path = '' as $$
declare c public.classrooms%rowtype;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  select * into c from public.classrooms where code = upper(trim(p_code)) limit 1;
  if not found then raise exception 'Class code not found'; end if;
  if c.teacher_id = auth.uid() then raise exception 'You already teach this class'; end if;
  insert into public.class_memberships(classroom_id,student_id,status)
  values(c.id,auth.uid(),'pending')
  on conflict(classroom_id,student_id) do update set status='pending', requested_at=now(), reviewed_at=null
  where public.class_memberships.status <> 'approved';
  return query select c.id,c.name,m.status from public.class_memberships m where m.classroom_id=c.id and m.student_id=auth.uid();
end; $$;
revoke all on function public.join_class_by_code(text) from public;
grant execute on function public.join_class_by_code(text) to authenticated;

create or replace function public.review_class_join(p_classroom_id uuid,p_student_id uuid,p_approve boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_teacher() or not exists(select 1 from public.classrooms where id=p_classroom_id and teacher_id=auth.uid()) then raise exception 'Only this classroom teacher can review requests'; end if;
  update public.class_memberships set status=case when p_approve then 'approved' else 'denied' end, reviewed_at=now()
  where classroom_id=p_classroom_id and student_id=p_student_id and status='pending';
  if not found then raise exception 'Pending request not found'; end if;
end; $$;
revoke all on function public.review_class_join(uuid,uuid,boolean) from public;
grant execute on function public.review_class_join(uuid,uuid,boolean) to authenticated;

create or replace function public.remove_class_student(p_classroom_id uuid,p_student_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_teacher() or not exists(select 1 from public.classrooms where id=p_classroom_id and teacher_id=auth.uid()) then raise exception 'Only this classroom teacher can remove students'; end if;
  delete from public.class_memberships where classroom_id=p_classroom_id and student_id=p_student_id;
end; $$;
revoke all on function public.remove_class_student(uuid,uuid) from public;
grant execute on function public.remove_class_student(uuid,uuid) to authenticated;

create or replace function public.complete_typing_lesson(p_grade smallint,p_track text,p_lesson_key text)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  inserted_count integer;
  awarded integer := 25;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  if p_grade is null or p_track is null or p_lesson_key is null
    or p_grade not between 1 and 9 or p_track not in ('Basic','Intermediate','Master')
    or p_lesson_key !~ ('^g'||p_grade::text||'-'||lower(p_track)||'-(0[1-9]|[1-9][0-9]|1[0-9][0-9]|200)$') then
    raise exception 'Invalid lesson key for this grade and track';
  end if;
  insert into public.lesson_progress(student_id,grade,track,lesson_key) values(auth.uid(),p_grade,p_track,p_lesson_key) on conflict(student_id,lesson_key) do nothing;
  get diagnostics inserted_count = row_count;
  if inserted_count > 0 then update public.profiles set xp=xp+awarded, grade=greatest(grade,p_grade) where id=auth.uid(); return awarded; end if;
  return 0;
end; $$;
revoke all on function public.complete_typing_lesson(smallint,text,text) from public;
grant execute on function public.complete_typing_lesson(smallint,text,text) to authenticated;

create or replace function public.save_typing_test(p_wpm integer,p_accuracy numeric,p_duration smallint)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  result_id uuid;
  reward integer;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  if p_wpm not between 0 and 500 or p_accuracy not between 0 and 100 or p_duration not in (15,30,60,120) then raise exception 'Invalid test result'; end if;
  insert into public.typing_results(student_id,wpm,accuracy,duration_seconds) values(auth.uid(),p_wpm,p_accuracy,p_duration) returning id into result_id;
  reward := least(250,greatest(0,round(p_wpm * p_accuracy / 100.0)::integer));
  update public.profiles set xp=xp+reward where id=auth.uid();
  return result_id;
end; $$;
revoke all on function public.save_typing_test(integer,numeric,smallint) from public;
grant execute on function public.save_typing_test(integer,numeric,smallint) to authenticated;

create or replace function public.complete_track_assessment(p_grade smallint,p_track text,p_wpm integer,p_accuracy numeric,p_duration smallint)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  if p_grade not between 1 and 9 or p_track not in ('Basic','Intermediate','Master') then raise exception 'Invalid grade or track'; end if;
  if p_wpm not between 0 and 500 or p_accuracy not between 0 and 100 or p_duration is distinct from 60 then raise exception 'A completed one-minute test is required'; end if;
  if (select count(distinct lesson_key) from public.lesson_progress where student_id=auth.uid() and grade=p_grade and track=p_track) < 200 then
    raise exception 'Finish all 200 lessons in this track before completing its final test';
  end if;
  insert into public.track_assessments(student_id,grade,track,wpm,accuracy)
  values(auth.uid(),p_grade,p_track,p_wpm,p_accuracy)
  on conflict(student_id,grade,track) do update set wpm=excluded.wpm,accuracy=excluded.accuracy,completed_at=now();
end; $$;
revoke all on function public.complete_track_assessment(smallint,text,integer,numeric,smallint) from public;
grant execute on function public.complete_track_assessment(smallint,text,integer,numeric,smallint) to authenticated;

create or replace function public.complete_class_surprise_test(p_assignment_id uuid,p_wpm integer,p_accuracy numeric,p_duration smallint)
returns void language plpgsql security definer set search_path = '' as $$
declare v_classroom_id uuid;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  if p_wpm not between 0 and 500 or p_accuracy not between 0 and 100 or p_duration is distinct from 60 then raise exception 'A completed one-minute test is required'; end if;
  select classroom_id into v_classroom_id from public.class_assignments where id=p_assignment_id and assignment_type='surprise_test';
  if not found then raise exception 'Surprise test not found'; end if;
  if not (public.is_class_teacher(v_classroom_id) or public.is_approved_class_member(v_classroom_id)) then raise exception 'Only approved class members can submit this test'; end if;
  insert into public.class_assignment_attempts(assignment_id,student_id,wpm,accuracy)
  values(p_assignment_id,auth.uid(),p_wpm,p_accuracy)
  on conflict(assignment_id,student_id) do update set wpm=excluded.wpm,accuracy=excluded.accuracy,completed_at=now();
end; $$;
revoke all on function public.complete_class_surprise_test(uuid,integer,numeric,smallint) from public;
grant execute on function public.complete_class_surprise_test(uuid,integer,numeric,smallint) to authenticated;

create or replace function public.save_typing_game(p_game_key text,p_points integer)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  result_id uuid;
  safe_points integer;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  if char_length(p_game_key) not between 1 and 40 or p_points < 0 then raise exception 'Invalid game result'; end if;
  safe_points := least(5000,p_points);
  insert into public.game_results(student_id,game_key,points) values(auth.uid(),p_game_key,safe_points) returning id into result_id;
  update public.profiles set game_points=game_points+safe_points, xp=xp+least(250,round(safe_points/2.0)::integer) where id=auth.uid();
  return result_id;
end; $$;
revoke all on function public.save_typing_game(text,integer) from public;
grant execute on function public.save_typing_game(text,integer) to authenticated;

create or replace function public.get_race_opponents(p_scope text)
returns table(race_id uuid,rival_name text,finish_ms integer)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  if p_scope is null or p_scope not in ('class','public') then raise exception 'Invalid race scope'; end if;
  if p_scope='class' and not exists(
    select 1 from public.class_memberships mine
    where mine.student_id=auth.uid() and mine.status='approved'
  ) then raise exception 'Join an approved classroom to challenge classmates'; end if;

  return query
  with best_runs as (
    select distinct on (rr.student_id) rr.id,rr.student_id,rr.finish_ms,rr.created_at
    from public.race_results rr
    where rr.student_id<>auth.uid()
      and rr.created_at>=now()-interval '90 days'
      and (
        (p_scope='public' and rr.is_public)
        or exists(
          select 1
          from public.class_memberships mine
          join public.class_memberships rival on rival.classroom_id=mine.classroom_id
          where mine.student_id=auth.uid() and mine.status='approved'
            and rival.student_id=rr.student_id and rival.status='approved'
        )
      )
    order by rr.student_id,rr.finish_ms asc,rr.created_at desc
  )
  select best_runs.id,
    case when p_scope='public'
      then 'Public rival '||upper(substr(replace(best_runs.id::text,'-',''),1,5))
      else left(profiles.display_name,40)
    end,
    best_runs.finish_ms
  from best_runs
  join public.profiles on profiles.id=best_runs.student_id
  order by best_runs.finish_ms asc
  limit 20;
end; $$;
revoke all on function public.get_race_opponents(text) from public;
grant execute on function public.get_race_opponents(text) to authenticated;

drop function if exists public.record_race_result(integer,uuid,text);
drop function if exists public.record_solo_race(integer);

create or replace function public.begin_race_challenge(p_scope text,p_opponent_race_id uuid default null)
returns table(race_session_id uuid,rival_name text,rival_finish_ms integer)
language plpgsql security definer set search_path = '' as $$
declare
  opponent_student_id uuid;
  opponent_finish_ms integer;
  opponent_name text;
  new_session_id uuid;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  if p_scope is null or p_scope not in ('solo','class','public') then raise exception 'Invalid race scope'; end if;
  if p_scope='solo' and p_opponent_race_id is not null then raise exception 'Solo races do not have an opponent record'; end if;
  if p_scope in ('class','public') and p_opponent_race_id is null then raise exception 'Choose a race opponent'; end if;

  if p_scope in ('class','public') then
    select rr.student_id,rr.finish_ms,profiles.display_name
    into opponent_student_id,opponent_finish_ms,opponent_name
    from public.race_results rr
    join public.profiles on profiles.id=rr.student_id
    where rr.id=p_opponent_race_id
      and rr.created_at>=now()-interval '90 days'
      and (p_scope='class' or rr.is_public);
    if opponent_student_id is null or opponent_student_id=auth.uid() then raise exception 'Race opponent not found'; end if;
    if p_scope='class' and not exists(
      select 1
      from public.class_memberships mine
      join public.class_memberships rival on rival.classroom_id=mine.classroom_id
      where mine.student_id=auth.uid() and mine.status='approved'
        and rival.student_id=opponent_student_id and rival.status='approved'
    ) then raise exception 'This classmate is no longer available'; end if;
  end if;

  delete from public.race_sessions where student_id=auth.uid();
  insert into public.race_sessions(student_id,scope,opponent_race_id,opponent_finish_ms)
  values(auth.uid(),p_scope,p_opponent_race_id,opponent_finish_ms)
  returning id into new_session_id;

  return query select new_session_id,
    case when p_scope='public' and p_opponent_race_id is not null
      then 'Public rival '||upper(substr(replace(p_opponent_race_id::text,'-',''),1,5))
      else coalesce(left(opponent_name,40),'CPU racers')
    end,
    opponent_finish_ms;
end; $$;
revoke all on function public.begin_race_challenge(text,uuid) from public;
grant execute on function public.begin_race_challenge(text,uuid) to authenticated;

create or replace function public.complete_race_challenge(p_race_session_id uuid)
returns table(won boolean,skin_id text,rival_name text,finish_ms integer)
language plpgsql security definer set search_path = '' as $$
declare
  race_session public.race_sessions%rowtype;
  measured_finish_ms integer;
  opponent_student_id uuid;
  opponent_name text;
  new_race_id uuid;
  awarded_skin text;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  select * into race_session from public.race_sessions
  where id=p_race_session_id and student_id=auth.uid()
  for update;
  if not found or race_session.completed_at is not null then raise exception 'Race session is not available'; end if;

  measured_finish_ms=floor(extract(epoch from (clock_timestamp()-race_session.started_at))*1000)::integer;
  if measured_finish_ms not between 5000 and 90000 then raise exception 'Race took too long to save'; end if;
  update public.race_sessions set completed_at=clock_timestamp() where id=race_session.id;

  if race_session.scope in ('class','public') then
    select rr.student_id,profiles.display_name
    into opponent_student_id,opponent_name
    from public.race_results rr
    join public.profiles on profiles.id=rr.student_id
    where rr.id=race_session.opponent_race_id;
    if opponent_student_id is null or opponent_student_id=auth.uid() then raise exception 'Race opponent is no longer available'; end if;
    if race_session.scope='class' and not exists(
      select 1
      from public.class_memberships mine
      join public.class_memberships rival on rival.classroom_id=mine.classroom_id
      where mine.student_id=auth.uid() and mine.status='approved'
        and rival.student_id=opponent_student_id and rival.status='approved'
    ) then raise exception 'This classmate is no longer available'; end if;
  end if;

  insert into public.race_results as existing(student_id,finish_ms,is_public)
  values(auth.uid(),measured_finish_ms,race_session.scope in ('solo','public'))
  on conflict (student_id) do update
    set finish_ms=least(existing.finish_ms,excluded.finish_ms),
      is_public=existing.is_public or excluded.is_public,
      created_at=now()
  returning id into new_race_id;

  if race_session.scope in ('class','public') and measured_finish_ms<race_session.opponent_finish_ms then
    select candidate.skin into awarded_skin
    from unnest(array['comet','neon','nebula','gold']::text[]) with ordinality as candidate(skin,position)
    where not exists(
      select 1 from public.race_skins owned
      where owned.student_id=auth.uid() and owned.skin_id=candidate.skin
    )
    order by candidate.position
    limit 1;
    if awarded_skin is not null then
      insert into public.race_skins(student_id,skin_id,earned_from_race)
      values(auth.uid(),awarded_skin,new_race_id);
    end if;
  end if;

  return query select
    race_session.scope in ('class','public') and measured_finish_ms<race_session.opponent_finish_ms,
    awarded_skin,
    case when race_session.scope='public'
      then 'Public rival '||upper(substr(replace(race_session.opponent_race_id::text,'-',''),1,5))
      else coalesce(left(opponent_name,40),'CPU racers')
    end,
    measured_finish_ms;
end; $$;
revoke all on function public.complete_race_challenge(uuid) from public;
grant execute on function public.complete_race_challenge(uuid) to authenticated;

-- Admin-only SQL helper: run manually in SQL Editor with a trusted user's email.
-- update public.profiles p set role='teacher' from auth.users u where p.id=u.id and lower(u.email)=lower('teacher@example.com');
-- Never expose service_role credentials or permit users to set their own role.
