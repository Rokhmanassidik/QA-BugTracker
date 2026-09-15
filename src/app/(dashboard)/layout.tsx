import { createClient } from "@/lib/supabase/server";
import { NavBar } from "@/components/nav-bar";
import type { AppNotification, Profile } from "@/types/database";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: Profile | null = null;
  let notifications: AppNotification[] = [];

  if (user) {
    const [{ data: profileData }, { data: notificationData }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase
        .from("notifications")
        .select("*")
        .eq("recipient_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    profile = profileData as Profile | null;
    notifications = (notificationData as AppNotification[]) || [];
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <NavBar profile={profile} notifications={notifications} />
      <main>{children}</main>
    </div>
  );
}
