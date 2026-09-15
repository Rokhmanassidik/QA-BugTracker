import { AzureOpenAI } from "openai";
import { z } from "zod";
import { BUG_PRIORITIES, BUG_SEVERITIES } from "@/types/database";

const BugReportSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  priority: z.enum(BUG_PRIORITIES as [string, ...string[]]),
  severity: z.enum(BUG_SEVERITIES as [string, ...string[]]),
  steps_to_reproduce: z.string().default(""),
  actual_result: z.string().default(""),
  expected_result: z.string().default(""),
});

export type GeneratedBugReport = z.infer<typeof BugReportSchema>;

let cachedClient: AzureOpenAI | null = null;

function getClient() {
  if (cachedClient) return cachedClient;

  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-10-21";

  if (!endpoint || !apiKey || !deployment) {
    throw new Error(
      "Azure OpenAI is not configured. Set AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY and AZURE_OPENAI_DEPLOYMENT.",
    );
  }

  cachedClient = new AzureOpenAI({ endpoint, apiKey, deployment, apiVersion });
  return cachedClient;
}

const SYSTEM_PROMPT = `You are a QA assistant embedded in a bug tracker. A user will describe a software bug informally, in any language.

Turn that description into a clear, professional bug report, written in English regardless of what language the user wrote in.

Respond with ONLY a JSON object with exactly these keys:
- "title": a short, specific bug title (max ~12 words)
- "description": a concise summary of the bug
- "priority": one of ${BUG_PRIORITIES.join(", ")}
- "severity": one of ${BUG_SEVERITIES.join(", ")}
- "steps_to_reproduce": numbered steps as a single string, separated by newlines (e.g. "1. ...\\n2. ...")
- "actual_result": what actually happens
- "expected_result": what should happen instead

Infer priority and severity from how the user describes impact (e.g. crashes, data loss, or blocking issues are higher severity/priority; cosmetic or minor issues are lower). If the user's description doesn't give enough detail for a field, make a reasonable best guess rather than leaving it empty.`;

export async function generateBugReport(
  rawText: string,
): Promise<GeneratedBugReport> {
  const client = getClient();
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT!;

  const completion = await client.chat.completions.create({
    model: deployment,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: rawText },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Azure OpenAI returned an empty response");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("Azure OpenAI returned invalid JSON");
  }

  return BugReportSchema.parse(parsed);
}
