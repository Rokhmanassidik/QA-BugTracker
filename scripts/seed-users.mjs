// Creates the PM and QA accounts used by the "Masuk sebagai PM/QA" buttons on
// the login page. Credentials come from env vars so the login page and this
// script always stay in sync.
// Usage: node --env-file=.env.local scripts/seed-users.mjs

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Run with:\n" +
      "  node --env-file=.env.local scripts/seed-users.mjs",
  );
  process.exit(1);
}

const users = [
  {
    email: process.env.PM_EMAIL,
    password: process.env.PM_PASSWORD,
    full_name: process.env.PM_FULL_NAME || "Project Manager",
    role: "PM",
  },
  {
    email: process.env.QA_EMAIL,
    password: process.env.QA_PASSWORD,
    full_name: process.env.QA_FULL_NAME || "QA",
    role: "QA",
  },
];

const missing = users.filter((u) => !u.email || !u.password);
if (missing.length > 0) {
  console.error(
    `Missing env vars for: ${missing.map((u) => u.role).join(", ")}. ` +
      "Set PM_EMAIL/PM_PASSWORD and QA_EMAIL/QA_PASSWORD in .env.local.",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

for (const u of users) {
  const { error } = await supabase.auth.admin.createUser({
    email: u.email,
    password: u.password,
    email_confirm: true,
    user_metadata: { full_name: u.full_name, role: u.role },
  });

  if (error) {
    console.error(`Failed to create ${u.email}: ${error.message}`);
  } else {
    console.log(`Created ${u.email} (${u.role})`);
  }
}
