// Supabase Auth requires an email. To offer plain username/password login, we
// derive a synthetic, never-emailed address from the username and use that
// as the Supabase Auth "email" behind the scenes.
const USERNAME_EMAIL_DOMAIN = "users.qa-bugtracker.internal";

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidUsername(username: string): boolean {
  return /^[a-z0-9._-]{3,20}$/.test(username);
}

export function usernameToEmail(username: string): string {
  return `${username}@${USERNAME_EMAIL_DOMAIN}`;
}
