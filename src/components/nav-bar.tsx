import Link from "next/link";
import { ArrowLeftRight, Bug } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notification-bell";
import { logout } from "@/app/login/actions";
import type { AppNotification, Profile } from "@/types/database";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function NavBar({
  profile,
  notifications,
}: {
  profile: Profile | null;
  notifications: AppNotification[];
}) {
  return (
    <header className="sticky top-0 z-10 border-b bg-background">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 text-sm font-medium">
          <Bug className="size-4" strokeWidth={1.5} />
          QA Bug Tracker
        </Link>
        <div className="flex items-center gap-2">
          {profile ? (
            <NotificationBell userId={profile.id} initialNotifications={notifications} />
          ) : null}
          {profile ? (
            <div className="flex items-center gap-2 pl-2">
              <Avatar className="size-7">
                <AvatarFallback className="text-xs font-normal">
                  {initials(profile.full_name)}
                </AvatarFallback>
              </Avatar>
              <p className="hidden text-sm sm:block">{profile.full_name}</p>
            </div>
          ) : null}
          <form action={logout}>
            <Button type="submit" variant="ghost" size="sm">
              <ArrowLeftRight className="size-3.5" />
              Switch account
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
