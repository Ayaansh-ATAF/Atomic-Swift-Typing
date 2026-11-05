-- ATAF Typing production schema. Run in Supabase SQL Editor on a fresh project.
-- Uses Supabase Auth for passwords; no password is ever stored in public tables.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Typist' check (char_length(display_name) between 1 and 60),
  role text not null default 'student' check (role in ('student','teacher','admin')),
  grade smallint not null default 1 check (grade between 1 and 9),
  xp integer not null default 0 check (xp >= 0),
  game_points integer not null default 0 check (game_points >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles drop constraint if exists profiles_grade_check;
alter table public.profiles add constraint profiles_grade_check check (grade between 1 and 9);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(nullif(left(trim(new.raw_user_meta_data ->> 'display_name'),60),''), 'Typist'),
    'student'
  )
  on conflict (id) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

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

create table if not exists public.security_cases (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id) on delete cascade,
  classroom_id uuid references public.classrooms(id) on delete set null,
  signal_type text not null check (signal_type in ('chat_rate_limit','chat_repeat','chat_unauthorized')),
  details text not null check (char_length(details) between 1 and 280),
  status text not null default 'open' check (status in ('open','reviewed','false_positive')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  review_note text check (review_note is null or char_length(review_note) <= 500)
);
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
create index if not exists typing_results_student_created_idx on public.typing_results(student_id,created_at desc);
create index if not exists game_results_student_created_idx on public.game_results(student_id,created_at desc);
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

-- All tables use RLS.
alter table public.profiles enable row level security;
alter table public.classrooms enable row level security;
alter table public.class_memberships enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.typing_results enable row level security;
alter table public.game_results enable row level security;
alter table public.track_assessments enable row level security;
alter table public.class_chat_messages enable row level security;
alter table public.class_assignments enable row level security;
alter table public.class_assignment_comments enable row level security;
alter table public.class_assignment_attempts enable row level security;
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
  teacher_id=auth.uid() and public.is_class_teacher(classroom_id)
);
drop policy if exists "Teachers update assignments" on public.class_assignments;
create policy "Teachers update assignments" on public.class_assignments for update to authenticated using (
  public.is_class_teacher(classroom_id)
) with check (teacher_id=auth.uid() and public.is_class_teacher(classroom_id));
drop policy if exists "Teachers delete assignments" on public.class_assignments;
create policy "Teachers delete assignments" on public.class_assignments for delete to authenticated using (
  public.is_class_teacher(classroom_id)
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

revoke all on public.security_cases from anon, authenticated;
grant select on public.security_cases to authenticated;
drop policy if exists "Admins read security cases" on public.security_cases;
create policy "Admins read security cases" on public.security_cases for select to authenticated using (
  exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin')
);

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
    if not exists(select 1 from public.security_cases s where s.actor_id=v_uid and s.signal_type='chat_rate_limit' and s.status='open' and s.created_at > now()-interval '5 minutes') then
      insert into public.security_cases(actor_id,classroom_id,signal_type,details)
      values(v_uid,p_classroom_id,'chat_rate_limit','More than six classroom chat messages were attempted within 30 seconds.');
    end if;
    return query select false,null::uuid,'rate_limited'::text;
    return;
  end if;

  if exists (
    select 1 from public.class_chat_messages m
    where m.sender_id=v_uid and m.classroom_id=p_classroom_id
      and lower(m.body)=lower(v_body) and m.created_at > now()-interval '60 seconds'
  ) then
    if not exists(select 1 from public.security_cases s where s.actor_id=v_uid and s.signal_type='chat_repeat' and s.status='open' and s.created_at > now()-interval '5 minutes') then
      insert into public.security_cases(actor_id,classroom_id,signal_type,details)
      values(v_uid,p_classroom_id,'chat_repeat','Repeated the same classroom chat message within 60 seconds.');
    end if;
    return query select false,null::uuid,'repeated_message'::text;
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
  if p_disposition not in ('reviewed','false_positive') then raise exception 'Invalid review disposition'; end if;
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
  teacher_id = auth.uid() and exists(select 1 from public.profiles p where p.id = auth.uid() and p.role in ('teacher','admin'))
);
drop policy if exists "Teacher updates own class" on public.classrooms;
create policy "Teacher updates own class" on public.classrooms for update to authenticated using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());
drop policy if exists "Teacher deletes own class" on public.classrooms;
create policy "Teacher deletes own class" on public.classrooms for delete to authenticated using (teacher_id = auth.uid());

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
  if auth.uid() is null or not exists(select 1 from public.classrooms where id=p_classroom_id and teacher_id=auth.uid()) then raise exception 'Only this classroom teacher can review requests'; end if;
  update public.class_memberships set status=case when p_approve then 'approved' else 'denied' end, reviewed_at=now()
  where classroom_id=p_classroom_id and student_id=p_student_id and status='pending';
  if not found then raise exception 'Pending request not found'; end if;
end; $$;
revoke all on function public.review_class_join(uuid,uuid,boolean) from public;
grant execute on function public.review_class_join(uuid,uuid,boolean) to authenticated;

create or replace function public.remove_class_student(p_classroom_id uuid,p_student_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not exists(select 1 from public.classrooms where id=p_classroom_id and teacher_id=auth.uid()) then raise exception 'Only this classroom teacher can remove students'; end if;
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

-- Admin-only SQL helper: run manually in SQL Editor with a trusted user's email.
-- update public.profiles p set role='teacher' from auth.users u where p.id=u.id and lower(u.email)=lower('teacher@example.com');
-- Never expose service_role credentials or permit users to set their own role.
