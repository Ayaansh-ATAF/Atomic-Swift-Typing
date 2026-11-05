# Atomic Typing — Vercel + Supabase

Atomic Typing is a responsive typing-learning site with ATAF branding, nine grade levels, and Beginner, Intermediate, and Master tracks (5,400 guided lessons total: 600 lessons per grade). Each track has ten original 20-lesson units per grade. Students unlock Intermediate and Master by completing the previous track and its required one-minute final assessment. The site also includes 12 mini-games, nine grade themes, student/teacher accounts, classroom codes and approval requests, configurable classroom chat, class assignments with comments, teacher-posted surprise one-minute tests with class results, and global/class leaderboards. The platform opens on a required sign-up/log-in screen; no lessons, games, tests, or classroom pages are available until a Supabase session is authenticated. The platform uses Supabase Auth for password accounts and Supabase Postgres for cloud data. Teacher accounts are routed to classroom management only; student accounts can access learning activities and join classes. Lessons use original ATAF content, interactive theme-matched typing guides with key and posture tips plus read-aloud support, automatic completion when the full prompt is typed correctly, and a checkpoint game every ten lessons.

## Files

- `index.html` — website UI and client-side application logic
- `config.js` — public Supabase URL and publishable/anon key placeholders
- `supabase/schema.sql` — tables, indexes, RLS policies, and secure database RPC functions (for SQL Editor setup)
- `supabase/config.toml` and `supabase/migrations/` — Supabase CLI project config and initial migration
- `supabase/promote-teacher.example.sql` — manual trusted-admin teacher promotion example
- `vercel.json` — basic security headers and static hosting config

## 1. Supabase Authentication Setup (required before sign-in works)

Follow these steps in order:

1. Create a new project in <https://supabase.com/dashboard>.
2. Go to **Project Settings → API** and copy:
   - **Project URL**
   - **anon / publishable key**
3. Open `config.js` and paste those values into `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
   - This is a browser-safe public key.
   - Do not paste a `service_role` or secret key here.
4. Go to **SQL Editor** and run the full `supabase/schema.sql` script once.
   - This creates the `profiles`, classroom, assignment/comment, assessment, leaderboard, and typing-related tables.
   - It also adds the row-level security rules, protected classroom chat, and Atomic PSD review queue.
   - For existing deployments, run the updated schema again to add the classroom chat/comment settings, assignments, surprise-test results, track assessments, and their security policies/functions.
5. Go to **Authentication → URL Configuration**.
   - Set **Site URL** to your local app first, for example: `http://localhost:8000`
   - Add redirect URLs for both local and production:
     - `http://localhost:8000/**`
     - `https://your-project.vercel.app/**`
6. Go to **Authentication → Providers**.
   - Enable **Email** for normal sign-up / sign-in.
   - Optionally enable **Google**.
7. For Google, add the OAuth client ID and secret from Google Cloud Console.
8. In the provider setup, use the same redirect URL values as above, especially the final deployed domain.
9. Save the provider settings, then reload the app and test sign-up/sign-in.

Important: the app uses the Supabase `auth.users` table for accounts and the `public.profiles` table for role and user data. If a provider is not enabled in Supabase, the button will show as unavailable and the app will prompt you to configure it.

## 2. Create your first teacher

1. Deploy the site (next section) and create a normal account using your email.
2. Verify the email if confirmation is enabled, then sign in once so the profile is created.
3. In Supabase **SQL Editor**, open `supabase/promote-teacher.example.sql`, replace `teacher@example.com` with that exact verified email, and run it as the project owner.
4. Sign out and back in. The profile will now have the teacher role and can create classes.

New accounts always start as students. There is intentionally no public role selector: allowing users to choose “teacher” during signup would let students grant themselves teacher privileges.
Existing profiles keep their current role when the updated schema is applied. Before reopening a deployment that previously allowed self-selected roles, review all teacher/admin profiles and manually demote any role that was not granted by a trusted owner.

```sql
select u.email, p.role
from public.profiles p
join auth.users u on u.id = p.id
where p.role in ('teacher', 'admin')
order by p.role, u.email;
```

## 3. Email/password and Google auth notes

- Email sign-up uses Supabase Auth and can send a confirmation email if enabled.
- Google is handled by Supabase Auth; you do not need to build your own OAuth flow.

## 4. Security posture and limits

No website can be guaranteed to be “the world’s most secure.” Atomic Typing is a static browser app backed by Supabase, so browser code and client-submitted typing scores are not trusted evidence. Authorization and private data must be protected by Supabase Auth, database grants, row-level security, and carefully validated database functions.

- Vercel deployments use `vercel.json` for a Content Security Policy and security headers. The policy blocks inline JavaScript and limits scripts to this site and the Supabase SDK CDN; inline styles remain enabled because the current UI uses style attributes. Other hosting providers need equivalent headers configured separately.
- The lesson-completion RPC validates that lesson keys match the requested grade and track. This prevents malformed keys, but does not prove that a person actually typed a lesson or test; a browser-only app cannot provide that guarantee.
- `config.js` is downloaded by every visitor. It may contain only the Supabase public publishable/anon key, which is safe to expose only when RLS and database grants are correctly configured. Never put a service-role or secret key in this project.
- Keep Supabase redirect URLs restricted to the real site, require email confirmation, protect teacher/admin accounts with MFA where available, review database policies, and monitor Supabase logs. These are deployment responsibilities and are not enabled automatically by the frontend.
- The updated SQL has not been applied to or tested against your live Supabase project. Apply and validate it before relying on its protections.

## 5. Atomic PSD (Primary Security Drill)

- The home page advertises Atomic PSD while retaining the ChatterChap link.
- Classroom messages are stored in Supabase, readable only by the class teacher and approved members, and sent through a database function that verifies class access.
- The database function limits an account to six messages per 30 seconds and flags repeated messages within 60 seconds. Security cases are deduplicated per signal and account for five minutes.
- Trusted admins can review open cases in the Atomic PSD review page and mark them reviewed or false positive. Signals are not proof of hacking; the system does not automatically ban accounts and does not identify every bot or attack.
- New accounts are always students. Grant teacher/admin roles only to trusted accounts from the Supabase SQL Editor. To grant admin access, run as project owner with the intended account's verified email:

  ```sql
  update public.profiles p
  set role = 'admin', updated_at = now()
  from auth.users u
  where p.id = u.id and lower(u.email) = lower('admin@example.com');
  ```

- Do not expose role changes or security-case review through direct table updates. The database policies and review RPC restrict these actions.

## 6. Deploy to Vercel

1. Put the contents of this folder at the root of a Git repository. `index.html`, `config.js`, `vercel.json`, and `supabase/` should be at the repository root.
2. Push the repository to GitHub.
3. At <https://vercel.com/new>, import the repository.
4. This is a static site: no framework preset or build command is required. If Vercel asks for an output directory, use `.`.
5. Deploy, then set the final Vercel URL in Supabase Authentication → URL Configuration.
6. If you edit `config.js` after deploying, commit and push the change to redeploy.

## 6. First-run verification checklist

Use two separate accounts (one promoted teacher, one student):

- [ ] Student signup, email confirmation (if enabled), sign-in, sign-out, and password reset
- [ ] Teacher creates a classroom and shares its code
- [ ] Student requests to join using the code
- [ ] Teacher approves the request; student can then see the classroom
- [ ] Teacher can deny a pending request, remove an approved student, edit class grade/track, and delete their own classroom
- [ ] Each of nine grades presents 600 lessons (200 each in Beginner, Intermediate, and Master), grouped into ten 20-lesson units per track
- [ ] Intermediate and Master remain locked until the previous track is completed and its one-minute test is saved
- [ ] Lesson completion awards XP once per lesson and remains completed after sign-in on another device (5,400 lessons total)
- [ ] Typing test and game results save to the signed-in account
- [ ] Global and class leaderboards show the online profiles' XP/game points
- [ ] Student cannot approve themselves or create/delete a teacher classroom through direct table access
- [ ] Only an approved classroom member can read or send classroom chat messages
- [ ] A teacher can enable/disable student chat and assignment comments per classroom
- [ ] Teachers can post class assignments and surprise one-minute tests, see student test results, and moderate comments
- [ ] A burst or repeated chat message is blocked and creates an admin review case
- [ ] A non-admin cannot read or review Atomic PSD security cases
- [ ] Logged-out visitors are held on the sign-up/log-in screen; students can access learning only after authentication
- [ ] Teacher accounts are restricted to the classroom-management area; student-only navigation is hidden

## Security and production notes

- Passwords are handled by Supabase Auth; ATAF never stores raw passwords in its own tables.
- All application tables have Row Level Security (RLS). Classroom join requests, teacher approvals/removals, lesson rewards, result rewards, classroom chat, and security-case review use controlled database functions.
- Public client config contains only the project URL and publishable/anon key. Keep service-role/secret keys private.
- Teacher promotion is a trusted manual administrator action. Do not expose it as a user-facing feature.
- The client calculates typing metrics, so score submissions are not cheat-proof against a determined user. For high-stakes competitive rankings, add server-side anti-cheat/rate limits and consider validating typing sessions server-side.
- Supabase free-tier settings, email delivery, backup/retention, and privacy requirements should be reviewed before inviting real students. For children, collect as little personal information as possible and obtain any required parent/school consent.
- This package is a complete starter integration, but you must run the SQL in your own Supabase project, add your public config values, deploy it, and complete the verification checklist. I cannot create or access your external Vercel/Supabase accounts from this chat.

## Curriculum and typing-speed goals

Each grade (1–9) has 200 lessons in each of the Beginner, Intermediate, and Master tracks. Every track contains ten 20-lesson units with a focused one- or two-key practice pattern and game checkpoints every ten lessons. Students must complete a track and its one-minute final test to unlock the next. The original lesson keys and indexes for grades 1–6 remain stable so saved progress continues to match.

Lessons and speed tests report **WPM** (words per minute) and **CPM** (correct characters per minute). ATAF estimates WPM as correct characters divided by five. The grade-level speed and accuracy targets shown in the site are suggested practice goals, not official standards or pass/fail rules.
