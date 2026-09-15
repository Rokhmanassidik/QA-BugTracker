"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidUsername, normalizeUsername, usernameToEmail } from "@/lib/username";
import { USER_ROLES, type UserRole } from "@/types/database";

export interface SignupState {
  error: string | null;
}

export async function signup(
  _prevState: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const username = normalizeUsername(String(formData.get("username") || ""));
  const password = String(formData.get("password") || "");
  const role = String(formData.get("role") || "");

  if (!username || !password) {
    return { error: "Username and password are required." };
  }

  if (!isValidUsername(username)) {
    return {
      error:
        "Username must be 3-20 characters: lowercase letters, numbers, dots, underscores, or hyphens.",
    };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  if (!USER_ROLES.includes(role as UserRole)) {
    return { error: "Select a valid role." };
  }

  const email = usernameToEmail(username);
  const admin = createAdminClient();
  const { error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: username, role, username },
  });

  if (createError) {
    if (/already.*registered|already.*exists/i.test(createError.message)) {
      return { error: "That username is already taken." };
    }
    return { error: createError.message };
  }

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    return {
      error: `Account created, but sign-in failed: ${signInError.message}`,
    };
  }

  redirect("/");
}
