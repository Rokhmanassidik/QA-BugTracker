import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateBugReport } from "@/lib/azure-openai";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const rawText = typeof body?.rawText === "string" ? body.rawText.trim() : "";

  if (!rawText) {
    return NextResponse.json(
      { error: "Describe the bug before generating a report." },
      { status: 400 },
    );
  }

  try {
    const report = await generateBugReport(rawText);
    return NextResponse.json({ report });
  } catch (error) {
    console.error("AI bug report generation failed:", error);
    return NextResponse.json(
      { error: "Failed to generate the bug report. Try again or fill it in manually." },
      { status: 500 },
    );
  }
}
