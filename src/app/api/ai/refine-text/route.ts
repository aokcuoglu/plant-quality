import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { auth } from "@/lib/auth"

const client = new OpenAI({
  apiKey: process.env.AI_API_KEY ?? "",
  baseURL: process.env.AI_BASE_URL ?? "https://api.deepseek.com/v1",
})

const REFINE_PROMPT =
  "You are a Senior Automotive Quality Engineer. Rewrite the following 8D report entry to be more professional, technically precise, and grammatically correct. Preserve all factual information. Output only the improved text, no preamble."

async function getRefinement(text: string, stepLabel: string): Promise<string> {
  const response = await client.chat.completions.create({
    model: process.env.AI_MODEL ?? "deepseek-chat",
    messages: [
      { role: "system", content: REFINE_PROMPT },
      {
        role: "user",
        content: `8D Step: ${stepLabel}\n\nCurrent text:\n"""\n${text}\n"""`,
      },
    ],
    max_tokens: 1024,
  })

  return response.choices[0]?.message?.content ?? text
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (session.user.companyType !== "OEM") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (!["ADMIN", "QUALITY_ENGINEER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (session.user.plan !== "PRO") {
    return NextResponse.json({ error: "This is a PRO feature. Please upgrade your plan." }, { status: 403 })
  }

  const { text, stepLabel } = await req.json()

  if (!text?.trim()) {
    return NextResponse.json({ error: "Text content is required" }, { status: 400 })
  }

  try {
    const refined = await getRefinement(text.trim(), stepLabel ?? "General")

    return NextResponse.json({ refined })
  } catch (err) {
    console.error("AI refine error:", err)
    return NextResponse.json({ error: "Refinement failed. Please try again." }, { status: 500 })
  }
}
