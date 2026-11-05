-- OPTIONAL ADMIN TASK. Run manually in Supabase SQL Editor as project owner.
-- Replace the email below with the verified account you want to make a teacher.
-- Do not add a public UI for changing roles.
update public.profiles p
set role = 'teacher', updated_at = now()
from auth.users u
where p.id = u.id
  and lower(u.email) = lower('teacher@example.com');

-- Verify the intended account was updated:
-- select u.email, p.display_name, p.role from public.profiles p join auth.users u on u.id=p.id
-- where lower(u.email)=lower('teacher@example.com');
