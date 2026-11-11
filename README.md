# Atomic Typing — Vercel + Supabase

Atomic Typing is a responsive typing-learning site with ATAF branding, nine grade levels, and Beginner, Intermediate, and Master tracks (5,400 guided lessons total: 600 lessons per grade). Each track has ten original 20-lesson units per grade. Students unlock Intermediate and Master by completing the previous track and its required one-minute final assessment. The site also includes 13 arcade games, two practice games per unit, 12 selectable themes, student/teacher accounts, classroom codes and approval requests, configurable classroom chat, class assignments with comments, teacher-posted surprise one-minute tests with class results, and global/class leaderboards. The platform opens on a required sign-up/log-in screen; no lessons, games, tests, or classroom pages are available until a Supabase session is authenticated. The platform uses Supabase Auth for password accounts and Supabase Postgres for cloud data. Teacher accounts are routed to classroom management, can edit their own class settings including grade level, and can grant recognition awards to approved students in their classes. Admins cannot inspect classrooms or grant classroom awards; their workspace provides weekly leaderboard certificates, Atomic PSD safety review, and a restricted Command Terminal. Leaderboards show weekly scores and reset at Monday 00:00 UTC without deleting all-time score history; administrators can issue top-three certificates for completed global and class typing/game leaderboards. Lessons use original ATAF content, theme-matched character explanations of each stage objective and typing technique with read-aloud support, separate guide and focused-typing screens, a larger practice area with lesson choices kept available, visible “SP” space markers, keyboard-only multi-screen practice, locked sequential lesson progression, F/J hold drills, and a checkpoint game every ten lessons. Arcade games share a consistent play layout with game-specific art, objectives, progress indicators, and scoring. Keystroke Grand Prix displays its race callouts and supports CPU races, opt-in anonymous public race records, and server-timed classmate or public-rival challenges with cosmetic skin rewards.

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
   - For existing deployments, rerun the updated schema to add weekly leaderboards and certificates, class chat/comment settings, assignment/test features, and their security policies/functions.
5. Go to **Authentication → URL Configuration**.
   - Set **Site URL** to your deployed Atomic Typing URL.
   - Add redirect URLs for both local and production:
     - `http://localhost:8000/**`
     - `https://your-project.vercel.app/**`
6. Go to **Authentication → Providers**.
   - Enable **Email** for normal sign-up / sign-in.
   - Optionally enable **Google**.
   - Keep email confirmation enabled so email/password accounts must verify ownership before they can sign in.
   - Set Supabase's minimum password length to at least 12 characters.
7. For Google, create a Google OAuth client and add this exact authorized redirect URI in Google Cloud Console: `https://<project-ref>.supabase.co/auth/v1/callback`.
8. Paste that Google OAuth client ID and secret into Supabase **Authentication → Providers → Google** and enable the provider.
9. In Supabase URL Configuration, allow the local and deployed Atomic Typing URLs from step 5. This is the app destination after Supabase finishes Google authentication; do not use Google's callback URL as the app redirect.
10. Optionally set `SUPABASE_AUTH_REDIRECT_URL` in `config.js` to the canonical deployed app URL. Leave it empty to return users to the current app URL (query and fragment are removed).
11. Save the provider settings, then test both Google sign-in and email confirmation from the deployed site or `http://localhost:8000` (not by opening `index.html` directly).

Important: the app uses the Supabase `auth.users` table for accounts and the `public.profiles` table for role and user data. If a provider is not enabled in Supabase, the button will show as unavailable and the app will prompt you to configure it.
Email/password account creation uses Atomic PSD signup checks: a 12-character minimum, uppercase and lowercase letters, a number, a symbol, a matching confirmation, a unique 3–24 character username, and email verification. Users can sign in using `@username` and password or their email and password. Username lookup is performed by a Supabase Edge Function; it is not exposed as a public database lookup. Configure the matching minimum password length and email confirmation in Supabase too; frontend checks alone are not a security boundary.

## 2. Create your first teacher

1. Deploy the site (next section) and create a normal account using your email.
2. Verify the email if confirmation is enabled, then sign in once so the profile is created.
3. In Supabase **SQL Editor**, open `supabase/promote-teacher.example.sql`, replace `teacher@example.com` with that exact verified email, and run it as the project owner.
4. Sign out and back in. The profile will now have the teacher role and can create classes.

New accounts default to students, except verified email addresses on the server-side admin allowlist, which are promoted automatically. There is intentionally no public role selector: allowing users to choose “teacher” during signup would let students grant themselves teacher privileges.
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

### Username sign-in

After applying `supabase/schema.sql`, deploy both Edge Functions from the project root using the Supabase CLI:

```sh
supabase functions deploy username-sign-in
supabase functions deploy review-security-case
```

The username sign-in function uses Supabase's server-side `SUPABASE_SERVICE_ROLE_KEY` only to resolve a username to its verified account email, then asks Supabase Auth to verify the password. The security review function verifies the caller's active session and admin role before banning the account named in an open blocked-access report. Never put the service-role key in `config.js` or other browser code. Existing email accounts can sign in with email and password, then set a unique username from **My account**. If the username function has not been deployed, username login displays a setup message; email login remains available.

## 4. Security posture and limits

No website can be guaranteed to be “the world’s most secure.” Atomic Typing is a static browser app backed by Supabase, so browser code and client-submitted typing scores are not trusted evidence. Grand Prix finish durations are measured by the database between race-session creation and completion; this does not independently prove that a person typed the callouts. Authorization and private data must be protected by Supabase Auth, database grants, row-level security, and carefully validated database functions.

- Vercel deployments use `vercel.json` for a Content Security Policy and security headers. The policy blocks inline JavaScript and limits scripts to this site and the Supabase SDK CDN; inline styles remain enabled because the current UI uses style attributes. Other hosting providers need equivalent headers configured separately.
- The lesson-completion RPC validates that lesson keys match the requested grade and track. This prevents malformed keys, but does not prove that a person actually typed a lesson or test; a browser-only app cannot provide that guarantee.
- `config.js` is downloaded by every visitor. It may contain only the Supabase public publishable/anon key, which is safe to expose only when RLS and database grants are correctly configured. Never put a service-role or secret key in this project.
- Keep Supabase redirect URLs restricted to the real site, require email confirmation, protect teacher/admin accounts with MFA where available, review database policies, and monitor Supabase logs. These are deployment responsibilities and are not enabled automatically by the frontend.
- The updated SQL has not been applied to or tested against your live Supabase project. Apply and validate it before relying on its protections.

## 5. Atomic PSD (Primary Security Drill)

- The home page advertises Atomic PSD while retaining the ChatterChap link.
- Classroom messages are stored in Supabase, readable only by the class teacher and approved members, and sent through a database function that verifies class access.
- The database function allows up to six messages per rolling 30 seconds and repeated messages. An additional message during that window is temporarily rejected but is not flagged as suspicious; blocked unauthorized chat access is logged.
- Admins can choose **Ban account** or **Mark false positive** for an open blocked-access report. A confirmed ban is applied through Supabase Auth for 100 years and recorded on the case; all verified admin-role accounts can issue bans. System-breach reports are manually submitted from the Command Terminal and cannot identify or ban a target account.
- The restricted Command Terminal accepts only `help`, `status`, `security queue`, `bandwidth test`, and `report breach <summary>`; it is not a shell. The bandwidth test fetches the hosted app page once and reports a rough download estimate, not a full ISP speed test.
- Security signals are not proof of hacking. Atomic PSD does not continuously monitor infrastructure, detect every breach, or automatically ban accounts.
- New accounts default to students; verified accounts on the configured admin email allowlist are promoted automatically. Grant teacher roles only to trusted accounts from the Supabase SQL Editor. To grant another trusted admin access outside the allowlist, run as project owner with the intended account's verified email:

  ```sql
  update public.profiles p
  set role = 'admin', updated_at = now()
  from auth.users u
  where p.id = u.id and lower(u.email) = lower('admin@example.com');
  ```

- Do not expose role changes or security-case review through direct table updates. Database policies, RPCs, and the review Edge Function restrict these actions.

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
- [ ] Students cannot open a later lesson/unit or grade before finishing the required earlier work; each unlocked unit displays two playable practice games
- [ ] Lesson practice has no text-entry box, advances screen-by-screen from keyboard input, and includes the F/J hold drills
- [ ] Lessons, tests, and games open as distinct animated screens; typing accuracy keeps incorrect-attempt penalties after deletion or retry
- [ ] Progress dashboard shows curriculum progress, seven-day practice activity, daily goal, earned badges, and recent typing-test results
- [ ] All 13 arcade games have launch cards and distinct visual scenes, with live score/streak/timer feedback, music controls, a pause/resume control, and fullscreen preview
- [ ] Bubble Pop has a 30-second round, three lives, and a per-bubble escape countdown; each game explains its own themed objective
- [ ] Students can choose a theme character for their XP companion; Birdies Bird uses Birdie the Bluebird and ATAF Midnight uses ATAFBot
- [ ] “Hear tip” uses an available English device voice at a conversational pace, with the browser default as a fallback
- [ ] Typing Frogs and Birdies Bird apply their theme colors and theme-specific lesson guides
- [ ] Intermediate and Master remain locked until the previous track is completed and its one-minute test is saved
- [ ] Lesson completion awards XP once per lesson and remains completed after sign-in on another device (5,400 lessons total)
- [ ] Typing test and game results save to the signed-in account
- [ ] Global and class leaderboards show weekly typing and game points and reset the score window at Monday 00:00 UTC
- [ ] Admin issues one-time certificates for the top three on completed global and class typing/game leaderboards; students can view them in Progress
- [ ] Student cannot approve themselves or create/delete a teacher classroom through direct table access
- [ ] Only an approved classroom member can read or send classroom chat messages
- [ ] A teacher can enable/disable student chat and assignment comments per classroom
- [ ] Teachers can post class assignments and surprise one-minute tests, see student test results, and moderate comments
- [ ] Six classroom messages in 30 seconds and repeated messages are accepted without creating security cases; additional messages in the window are rate-limited without a PSD case.
- [ ] A non-admin cannot read or review Atomic PSD security cases
- [ ] Any admin can review an open unauthorized-access report, ban its account through Supabase Auth, or mark it false positive; unauthorized callers are rejected by the Edge Function.
- [ ] Command Terminal accepts only its documented safe commands; bandwidth test performs one same-site page fetch; system-breach reports are explicitly manual
- [ ] Logged-out visitors are held on the sign-up/log-in screen; students can access learning only after authentication
- [ ] Teacher accounts are restricted to the classroom-management area; student-only navigation is hidden

## Security and production notes

- Passwords are handled by Supabase Auth; ATAF never stores raw passwords in its own tables.
- All application tables have Row Level Security (RLS). Classroom join requests, teacher approvals/removals, lesson rewards, result rewards, classroom chat, and security-case review use controlled database functions.
- Public client config contains only the project URL and publishable/anon key. Keep service-role/secret keys private.
- Admin role assignment is server-side: the schema promotes accounts with the configured admin email allowlist only after Supabase confirms the email. Running the schema also promotes matching, already-confirmed accounts. Users cannot assign themselves privileged roles.
- Admins cannot inspect classrooms or grant classroom awards. Classroom teachers manage their own classes, assignments, and recognition awards. Database RLS and teacher-only RPCs enforce this separation.
- Weekly leaderboard windows start Monday 00:00 UTC. Historical profile XP and game scores are preserved; weekly scores are calculated from dated lesson, test, and game results. The admin can issue one-time certificates for the top three on global and per-class typing and game boards for the last completed week.
- Apply the latest `supabase/schema.sql` and deploy both documented Edge Functions before using weekly leaderboards, certificates, teacher classroom awards, or Atomic PSD bans; these operations are enforced with database RLS, RPCs, and server-side authorization.
- Teacher promotion remains a trusted manual administrator action. Do not expose it as a user-facing feature.
- The client calculates typing metrics, so score submissions are not cheat-proof against a determined user. For high-stakes competitive rankings, add server-side anti-cheat/rate limits and consider validating typing sessions server-side.
- Supabase free-tier settings, email delivery, backup/retention, and privacy requirements should be reviewed before inviting real students. For children, collect as little personal information as possible and obtain any required parent/school consent.
- This package is a complete starter integration, but you must run the SQL in your own Supabase project, add your public config values, deploy it, and complete the verification checklist. I cannot create or access your external Vercel/Supabase accounts from this chat.

## Curriculum and typing-speed goals

Each grade (1–9) has 200 lessons in each of the Beginner, Intermediate, and Master tracks. Every track contains ten 20-lesson units with a focused one- or two-key practice pattern, two optional unit games, optional game breaks after lessons 5 and 15, and a checkpoint game every ten lessons. Game breaks unlock after their preceding lesson is completed and use words from that unit. The first two lessons in each unit use focused no-space key drills; later lessons introduce words, sentences, and spaces where they fit the skill. Each lesson makes its progression visible: learn the technique, practice keys and words, apply the skill in longer text, then try a fluency challenge. Theme-matched coaching explains finger placement, while the focused typing screen gives immediate correctness, accuracy, and speed feedback. Short listen-and-type drills hide the phrase until it is typed and provide slow, replayable speech without a timer. The writing lab adds untimed career typing, introductory MLA formatting practice, and a story studio that saves drafts on the current device. Later lessons and units remain locked until earlier lessons are completed. The first unit includes exercises that hold F or J while typing the other home-row key. Students must complete a track and its one-minute final test to unlock the next. The original lesson keys and indexes for grades 1–6 remain stable so saved progress continues to match.

Lessons and speed tests report **WPM** (words per minute) and **CPM** (correct characters per minute). ATAF estimates WPM as correct characters divided by five. Lesson accuracy is shown as unrated until the first typing attempt, then includes mistakes even when a student deletes and corrects them; it is tracked across the lesson's guided screens. The grade-level speed and accuracy targets shown in the site are suggested practice goals, not official standards or pass/fail rules. “Hear tip” uses a suitable English speech voice when the browser provides one; voice quality and availability depend on the student's device.

The Progress page summarizes completed lessons, level XP, the active practice streak, course progress by grade and track, daily goal progress, achievements, seven-day activity, and recent typing tests. Activity and recent-test history are stored in this browser; they are not a cross-device cloud history. The XP companion is selected with its matching theme, including ATAFBot for ATAF Midnight and Birdie the Bluebird for Birdies Bird. All 13 arcade games have visible launch cards and themed objectives. Bubble Pop gives players three lives, a 30-second round, and a countdown for each bubble; Cipher Quest shows scrambled clues, Treasure Tap collects three keys per chest, and Keystroke Grand Prix displays four callouts for CPU races or server-timed challenges against classmates and anonymous public rivals. Public CPU times require the player's opt-in, public rivals are anonymized, and a class-only result is not shared publicly unless the player separately opts in to a public race. Beating a classmate or public rival can unlock a cosmetic kart skin. Ordinary arcade games can be paused; server-timed races cannot.
