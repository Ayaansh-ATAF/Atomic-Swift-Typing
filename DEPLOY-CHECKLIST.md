# ATAF Typing deployment checklist

## Before deploying
- [ ] Create a Supabase project.
- [ ] Replace the two placeholders in `config.js` with the project URL and publishable/anon key.
- [ ] Run `supabase/schema.sql` in the Supabase SQL Editor.
- [ ] Deploy both `username-sign-in` and `review-security-case` Supabase Edge Functions; never expose service-role keys in browser code.
- [ ] Push this folder's contents to a GitHub repository.
- [ ] Import the repository in Vercel and deploy as a static site.
- [ ] Confirm the deployed response includes the CSP, HSTS, and other security headers from `vercel.json`.
- [ ] Set Supabase Auth Site URL and Redirect URLs to the exact Vercel URL.
- [ ] Configure email confirmation and SMTP for production password reset/verification emails.
- [ ] Enable the Google provider in Supabase; configure Google's OAuth client callback as `https://<project-ref>.supabase.co/auth/v1/callback`.
- [ ] Confirm Google sign-in returns to the deployed Atomic Typing URL (optional `SUPABASE_AUTH_REDIRECT_URL` in `config.js`).
- [ ] Set the Supabase minimum password length to 12 or more and require email confirmation for email/password signup.
- [ ] Require MFA for trusted teacher/admin accounts where available, and review Supabase Auth/database logs.
- [ ] Confirm RLS is enabled and tested on every exposed table; verify students cannot read or modify another student's private data.
- [ ] Create and verify your first account, then promote that account with `supabase/promote-teacher.example.sql`.

## Test with two separate accounts
- [ ] Teacher can create a classroom and share the code.
- [ ] Student can request to join using that code.
- [ ] Teacher can approve or deny a pending request.
- [ ] Student can see the class only after approval.
- [ ] Teacher can change grade/track, remove students, and delete their own class.
- [ ] Admin workspace has no classroom directory or classroom-award form, and database policies prevent admins from reading classroom and membership records.
- [ ] A classroom teacher can grant an award only to an approved student in their own class; an admin cannot grant classroom awards.
- [ ] Lesson completion and typing/game results update the student's online profile and survive sign-out/device changes.
- [ ] Global and class typing/game leaderboards show this week's dated scores and start a fresh UTC week every Monday without deleting lifetime scores.
- [ ] Admin can award certificates to the top three for the last completed global and class typing/game leaderboards; students can view their certificates in Progress.
- [ ] Any admin can explicitly ban the account from an open unauthorized-access report through Supabase Auth or mark the report false positive; all non-admin calls are denied.
- [ ] Command Terminal only runs its listed safe commands; bandwidth test makes one same-site request; breach reports are manual, not automatic detection.
- [ ] Student cannot assign themselves a teacher role or approve their own request.
- [ ] Confirm lesson keys with a mismatched grade or track are rejected by the database function.
- [ ] Email signup rejects weak passwords and mismatched confirmations; unverified email accounts cannot sign in.
- [ ] Favicon loads from `assets/favicon.svg` on the deployed site.

The website is not connected to your external accounts until you perform these steps. The browser app cannot prove that a typing score is genuine; never use client-submitted scores as high-stakes evidence. Never publish a Supabase service-role or secret key.
