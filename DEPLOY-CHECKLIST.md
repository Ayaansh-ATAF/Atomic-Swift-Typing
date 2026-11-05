# ATAF Typing deployment checklist

## Before deploying
- [ ] Create a Supabase project.
- [ ] Replace the two placeholders in `config.js` with the project URL and publishable/anon key.
- [ ] Run `supabase/schema.sql` in the Supabase SQL Editor.
- [ ] Push this folder's contents to a GitHub repository.
- [ ] Import the repository in Vercel and deploy as a static site.
- [ ] Confirm the deployed response includes the CSP, HSTS, and other security headers from `vercel.json`.
- [ ] Set Supabase Auth Site URL and Redirect URLs to the exact Vercel URL.
- [ ] Configure email confirmation and SMTP for production password reset/verification emails.
- [ ] Require MFA for trusted teacher/admin accounts where available, and review Supabase Auth/database logs.
- [ ] Confirm RLS is enabled and tested on every exposed table; verify students cannot read or modify another student's private data.
- [ ] Create and verify your first account, then promote that account with `supabase/promote-teacher.example.sql`.

## Test with two separate accounts
- [ ] Teacher can create a classroom and share the code.
- [ ] Student can request to join using that code.
- [ ] Teacher can approve or deny a pending request.
- [ ] Student can see the class only after approval.
- [ ] Teacher can change grade/track, remove students, and delete their own class.
- [ ] Lesson completion and typing/game results update the student's online profile and survive sign-out/device changes.
- [ ] Global and class leaderboards show real profiles.
- [ ] Student cannot assign themselves a teacher role or approve their own request.
- [ ] Confirm lesson keys with a mismatched grade or track are rejected by the database function.

The website is not connected to your external accounts until you perform these steps. The browser app cannot prove that a typing score is genuine; never use client-submitted scores as high-stakes evidence. Never publish a Supabase service-role or secret key.
