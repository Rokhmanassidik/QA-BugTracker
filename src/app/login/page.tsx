"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loginAs } from "./actions";
import type { UserRole } from "@/types/database";

export default function LoginPage() {
  const [isPending, startTransition] = useTransition();

  function handleLogin(role: UserRole) {
    startTransition(async () => {
      const result = await loginAs(role);
      if (result?.error) {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-xs space-y-10">
        <div className="flex flex-col items-center gap-3 text-center">
          <Bug className="size-6" strokeWidth={1.5} />
          <div className="space-y-1">
            <h1 className="text-base font-medium">QA Bug Tracker</h1>
            <p className="text-sm text-muted-foreground">Choose your role to continue.</p>
          </div>
        </div>
        <div className="space-y-2">
          <Button
            variant="outline"
            className="h-11 w-full"
            disabled={isPending}
            onClick={() => handleLogin("PM")}
          >
            Continue as PM
          </Button>
          <Button
            variant="outline"
            className="h-11 w-full"
            disabled={isPending}
            onClick={() => handleLogin("QA")}
          >
            Continue as QA
          </Button>
        </div>
      </div>
    </div>
  );
}
