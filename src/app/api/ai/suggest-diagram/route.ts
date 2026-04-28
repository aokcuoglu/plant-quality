import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { auth } from "@/lib/auth"
import { requireFeature } from "@/lib/billing"

const client = new OpenAI({
  apiKey: process.env.AI_API_KEY ?? "",
  baseURL: process.env.AI_BASE_URL ?? "https://api.deepseek.com/v1",
})

const SYSTEM_PROMPT = `You are a Senior Automotive Quality Engineer specialized in Root Cause Analysis.

Given a defect problem description, generate a 5-Whys root cause tree diagram as JSON.

The JSON structure must be:
{
  "nodes": [{ "id": string, "label": string, "depth": number }],
  "edges": [{ "from": string, "to": string }]
}

Rules:
- Node 0 is always "The Problem" (depth 0).
- Each level digs deeper into the cause (depth 1 = direct cause, depth 2 = why, depth 3 = root cause).
- Aim for 3–5 levels of depth.
- Labels are concise and technical (one sentence max).
- The "from"/"to" in edges refers to node ids.
- Output ONLY valid JSON. No explanation, no markdown.`

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

  const featureGate = requireFeature(session, "AI_CLASSIFICATION")
  if (!featureGate.allowed) {
    return NextResponse.json({ error: featureGate.reason }, { status: 403 })
  }

  const { defectTitle, partName, symptoms, d2Text } = await req.json()

  const userMessage = [
    `Part: ${partName ?? "N/A"}`,
    `Defect: ${defectTitle ?? "N/A"}`,
    `Symptoms: ${symptoms ?? "N/A"}`,
    ``,
    d2Text?.trim()
      ? `Problem Description:\n"""\n${d2Text.trim()}\n"""`
      : "No detailed problem description available.",
    ``,
    `Generate a 5-Whys root cause tree diagram as JSON.`,
  ].join("\n")

  try {
    const response = await client.chat.completions.create({
      model: process.env.AI_MODEL ?? "deepseek-chat",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      max_tokens: 2048,
      response_format: { type: "json_object" },
    })

    const raw = response.choices[0]?.message?.content ?? "{}"
    const diagram = JSON.parse(raw)

    return NextResponse.json(diagram)
  } catch {
    return NextResponse.json(
      { error: "AI diagram generation failed. Please try again." },
      { status: 500 },
    )
  }
}
