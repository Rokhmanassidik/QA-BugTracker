"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

export interface LoginResult {
  error: string;
}

function credentialsFor(role: UserRole) {
  if (role === "PM") {
    return { email: process.env.PM_EMAIL, password: process.env.PM_PASSWORD };
  }
  return { email: process.env.QA_EMAIL, password: process.env.QA_PASSWORD };
}

export async function loginAs(role: UserRole): Promise<LoginResult | void> {
  const { email, password } = credentialsFor(role);

  if (!email || !password) {
    return {
      error: `The ${role} account has not been configured. Set ${role}_EMAIL and ${role}_PASSWORD in the environment variables.`,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: `Unable to sign in as ${role}: ${error.message}` };
  }

  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
