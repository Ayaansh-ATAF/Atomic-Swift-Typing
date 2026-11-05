# ATAF Typing Academy Project Report

## Project structure

The app is organized as a static front-end project with:

- root files for the site entry point and configuration
- `assets/` for JavaScript and CSS logic
- `supabase/` for database schema and auth setup SQL
- `docs/` for project notes and reports

## Issues found and fixed

1. Lesson progress sync issue
   - The app saved lesson completions with the correct lesson key, but the restore logic compared against the wrong pattern.
   - Fixed by normalizing stored Supabase lesson keys back to the correct lesson index before marking a lesson complete in the UI.

2. Duplicate sign-out handler
   - Two separate click handlers were attached for the same sign-out button.
   - Removed the duplicate to keep auth behavior in one place.

3. Project hygiene
   - Added a `.gitignore` file so local editor, OS, and environment artifacts are not tracked.

## Current status

- JavaScript syntax check passes.
- Project structure is clean and static-site friendly.
- Supabase-backed lesson persistence and auth flow are in place for a real production setup.
- Atomic Typing has 5,400 original lessons: 600 per grade across grades 1–9, split into Beginner, Intermediate, and Master tracks with ten 20-lesson units apiece.
- Students unlock each subsequent track only after completing all 200 lessons and its required one-minute final assessment.
- Course navigation groups each 20-lesson unit and preserves the original lesson IDs and indexes for grades 1–6 so existing progress remains valid.
- ChatterChap is presented as branding for the classroom chat built into Atomic Typing; the separate sponsor listing remains an external advertisement.
- Teachers configure classroom chat and student comments, post assignments or surprise one-minute tests, and review class comments.
- The curriculum uses nine distinct grade themes and twelve typing games; styling retains the existing red-and-blue visual language.
- Lesson guides now follow the selected visual theme: ATAFBot for ATAF Midnight and a theme-specific character for each other theme. Guides cycle through key, lesson, posture, and accuracy advice and can read the current tip aloud where browser speech is available.
- Vercel deployments receive a restrictive script Content Security Policy and standard security headers. Lesson keys are validated against the requested grade and track by the Supabase completion function.
- Browser-submitted typing results remain untrusted; the client cannot prove that a lesson or test was genuinely typed. Live Supabase policies and deployment headers still need to be applied and verified.
- Lesson, keyboard, navigation, and achievement animations respect the reduced-motion accessibility preference.

## Next recommended steps

- Configure the Supabase project URL and anon key in `config.js`.
- Run `supabase/schema.sql` in the Supabase SQL Editor.
- Enable Email and, optionally, Google auth in Supabase.
- Add the production redirect URL and deploy to Vercel or Netlify.
