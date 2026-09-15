import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { NewBugForm } from "./new-bug-form";

export default function NewBugPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Back to bugs
      </Link>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">
        New Bug Report
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Describe the bug in your own words. AI will generate a structured
        report for you to review before saving.
      </p>
      <NewBugForm />
    </div>
  );
}
