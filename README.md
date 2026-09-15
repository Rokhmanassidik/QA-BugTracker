# QA Bug Tracker

Internal bug tracker for a single project, used by two roles: **PM** and **QA**. There is no sign-up page, no email/password form, and no multi-project switcher by design — the login page has two buttons, "Continue as PM" and "Continue as QA", each signing in to a pre-created Supabase account behind the scenes.

QA (or PM) can describe a bug in plain language, in any language, and Azure OpenAI turns it into a structured report: title, description, priority, severity, steps to reproduce, actual result, and expected result. Photo and video evidence can be attached to any bug, and PM/QA can discuss each bug in a comment thread.

## Stack

- **Next.js (App Router) + TypeScript + Tailwind + shadcn/ui**
- **Supabase**: Postgres database, Auth (email/password), Storage (bug evidence)
- **Azure OpenAI**: generates the structured bug report from a free-text description
- **Vercel**: hosting

## 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL Editor, run the migrations in order:
   - [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) — creates the `profiles`, `bugs`, and `bug_evidence` tables, enables RLS (any authenticated user has full read/write access, since this is a small internal tool rather than a multi-tenant app), and creates a private `bug-evidence` storage bucket.
   - [`supabase/migrations/0002_bug_comments.sql`](supabase/migrations/0002_bug_comments.sql) — adds the `bug_comments` table used by the comment thread on each bug.
3. From **Project Settings → API**, copy the project URL, anon key, and service role key.

## 2. Create the PM/QA accounts

There is no sign-up UI, and only two accounts ever exist: one PM, one QA. The login page's two buttons sign in to whichever accounts are configured here — a single source of truth (environment variables) is shared by the login buttons and the seed script.

1. Copy `.env.local.example` to `.env.local` and fill in the Supabase values (see below for Azure OpenAI).
2. Set `PM_EMAIL` / `PM_PASSWORD` / `PM_FULL_NAME` and `QA_EMAIL` / `QA_PASSWORD` / `QA_FULL_NAME` in `.env.local` to the values for the two accounts.
3. Run:

   ```bash
   npm run seed:users
   ```

   This creates both accounts in Supabase Auth. Each one automatically gets a matching row in `profiles` (via a database trigger) with the `role` (`PM` or `QA`) and `full_name` from those environment variables.

To change `PM_EMAIL`/`PM_PASSWORD`/`QA_EMAIL`/`QA_PASSWORD` later, update `.env.local` and re-run `npm run seed:users`. The script fails for an account that already exists under the old email, so delete that user from the Supabase dashboard (Authentication → Users) first if renaming rather than adding an account.

> **Note:** the login buttons do not ask for a password — anyone who can reach the login page can select either button and obtain a valid PM or QA session. This trades per-person accountability for a zero-friction login, since the tool is intended for a small trusted team rather than public access. If this is deployed somewhere reachable outside the team, put it behind something like Vercel's password protection or an IP allowlist.

## 3. Set up Azure OpenAI

1. Create an **Azure OpenAI** resource in the Azure Portal, then deploy a chat model (e.g. `gpt-4o`) from Azure AI Foundry.
2. From the resource's **Keys and Endpoint** page, copy the endpoint and one of the keys.
3. Fill in `.env.local`:
   - `AZURE_OPENAI_ENDPOINT`
   - `AZURE_OPENAI_API_KEY`
   - `AZURE_OPENAI_DEPLOYMENT` — the **deployment name** chosen in Azure AI Foundry, not the base model name.
   - `AZURE_OPENAI_API_VERSION` — defaults to `2024-10-21`; change only if a different version is required.

## 4. Run locally

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`. Unauthenticated requests are redirected to `/login`. Select "Continue as PM" or "Continue as QA" to sign in as the account created in step 2.

## 5. Deploy to Vercel

1. Push this repository to GitHub and import it into Vercel.
2. Add the same environment variables from `.env.local` to the Vercel project (Project Settings → Environment Variables). `SUPABASE_SERVICE_ROLE_KEY` is only needed to run `npm run seed:users` against production from a local machine; it is not used by the deployed app itself.
3. Deploy.

## How the AI bug report generation works

The "New Bug Report" page has a free-text box where the reporter describes the bug in their own words, in any language. Selecting **Generate with AI** sends that text to `/api/ai/generate-bug-report`, which calls Azure OpenAI and requests a structured JSON report (title, description, priority, severity, steps to reproduce, actual result, expected result), translated into English regardless of the input language. The generated fields populate the form and remain fully editable before saving; the AI never writes directly to the database.

## Bug workflow

Status: `Open → In Progress → Resolved → Closed`, with `Reopened` available if a closed bug resurfaces. PM and QA have the same permissions (create, edit, assign, change status, comment, delete) — there is no role-based restriction on bug actions. `role` is informational only, shown next to each user's name and used for assignment.
