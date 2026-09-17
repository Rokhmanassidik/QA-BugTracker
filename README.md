# QA Bug Tracker

Internal bug tracker for a single project, shared by three roles: **PM**, **DEV**, and **QA**. There is no multi-project switcher, but authentication is standard username/password: anyone on the team creates their own account on `/signup` and chooses their role, then signs in on `/login`.

QA (or PM/DEV) can describe a bug in plain language, in any language, and Azure OpenAI turns it into a structured report: title, description, priority, severity, steps to reproduce, actual result, and expected result. An optional Test Case ID field lets a report be traced back to the test case that found it. A bug can be assigned to one person or to a whole team (PM, DEV, or QA); assigning to a team notifies every member of it. Photo and video evidence can be attached to any bug, and the team can discuss each bug in a comment thread, with real-time notifications for assignment, status changes, and new comments.

## Stack

- **Next.js (App Router) + TypeScript + Tailwind + shadcn/ui**
- **Supabase**: Postgres database, Auth (username/password, via a synthetic email under the hood), Storage (bug evidence), Realtime (notifications)
- **Azure OpenAI**: generates the structured bug report from a free-text description
- **Vercel**: hosting

## 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL Editor, run the migrations in order:
   - [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) — creates the `profiles`, `bugs`, and `bug_evidence` tables, enables RLS (any authenticated user has full read/write access, since this is a small internal tool rather than a multi-tenant app), and creates a private `bug-evidence` storage bucket.
   - [`supabase/migrations/0002_bug_comments.sql`](supabase/migrations/0002_bug_comments.sql) — adds the `bug_comments` table used by the comment thread on each bug.
   - [`supabase/migrations/0003_notifications.sql`](supabase/migrations/0003_notifications.sql) — adds the `notifications` table and enables Realtime on it for the notification bell.
   - [`supabase/migrations/0004_dev_role_and_signup.sql`](supabase/migrations/0004_dev_role_and_signup.sql) — adds the `DEV` role.
   - [`supabase/migrations/0005_username_login.sql`](supabase/migrations/0005_username_login.sql) — adds the `username` column used for login.
   - [`supabase/migrations/0006_assignee_notifications.sql`](supabase/migrations/0006_assignee_notifications.sql) — allows the `assigned` notification type.
   - [`supabase/migrations/0007_test_case_id.sql`](supabase/migrations/0007_test_case_id.sql) — adds the optional `test_case_id` column to `bugs`.
   - [`supabase/migrations/0008_assignee_team.sql`](supabase/migrations/0008_assignee_team.sql) — adds the `assignee_team` column so a bug can be assigned to a whole team instead of one person.
3. From **Project Settings → API**, copy the project URL, anon key, and service role key into `.env.local` (see `.env.local.example`).

Supabase Auth requires an email address, so sign-up derives a synthetic, never-emailed address from the chosen username (e.g. `alice@users.qa-bugtracker.internal`) and creates the account through the **Admin API** with `email_confirm: true`. This means no confirmation email is ever sent, and the project's "Confirm email" setting does not need to be changed.

> **Note:** sign-up is open to anyone who can reach `/signup`, and every signed-in user has full read/write access to all bugs (create, edit, assign, delete, comment) regardless of role — `role` is informational only. This is intended for a small trusted team, not public access. If this is deployed somewhere reachable outside the team, put it behind something like Vercel's password protection or an IP allowlist.

## 2. Set up Azure OpenAI

1. Create an **Azure OpenAI** resource in the Azure Portal, then deploy a chat model (e.g. `gpt-4o`) from Azure AI Foundry.
2. From the resource's **Keys and Endpoint** page, copy the endpoint and one of the keys.
3. Fill in `.env.local`:
   - `AZURE_OPENAI_ENDPOINT`
   - `AZURE_OPENAI_API_KEY`
   - `AZURE_OPENAI_DEPLOYMENT` — the **deployment name** chosen in Azure AI Foundry, not the base model name.
   - `AZURE_OPENAI_API_VERSION` — defaults to `2024-10-21`; change only if a different version is required.

## 3. Run locally

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`. Unauthenticated requests are redirected to `/login`. Follow the "Sign up" link to create the first account, choosing PM, DEV, or QA.

## 4. Deploy to Vercel

1. Push this repository to GitHub and import it into Vercel.
2. Add the same environment variables from `.env.local` to the Vercel project (Project Settings → Environment Variables).
3. Deploy.

## How the AI bug report generation works

The "New Bug Report" page has a free-text box where the reporter describes the bug in their own words, in any language. Selecting **Generate with AI** sends that text to `/api/ai/generate-bug-report`, which calls Azure OpenAI and requests a structured JSON report (title, description, priority, severity, steps to reproduce, actual result, expected result), translated into English regardless of the input language. The generated fields populate the form and remain fully editable before saving; the AI never writes directly to the database.

## Bug workflow

Status: `Open → In Progress → Resolved → Closed`, with `Reopened` available if a closed bug resurfaces. All roles have the same permissions (create, edit, assign, change status, comment, delete) — there is no role-based restriction on bug actions. `role` is informational only, shown next to each user's name and used for assignment.
