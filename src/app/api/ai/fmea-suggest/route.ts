import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { auth } from "@/lib/auth"
import { requireFeature } from "@/lib/billing"

const client = new OpenAI({
  apiKey: process.env.AI_API_KEY ?? "",
  baseURL: process.env.AI_BASE_URL ?? "https://api.deepseek.com/v1",
})

const FMEA_PROMPTS: Record<string, string> = {
  failure_modes:
    "You are a Senior Automotive Quality Engineer specialized in FMEA. Based on the process/component description below, suggest 3-5 potential failure modes. For each failure mode, also provide: the potential effect, severity rating (1-10), potential cause, occurrence rating (1-10), current design/process control, and detection rating (1-10). Output each failure mode as a JSON array. Each item should have: potentialFailureMode, potentialEffect, severity, potentialCause, occurrence, currentControl, detection. Do not use markdown. Output only the JSON array.",
  preventive_actions:
    "You are a Senior Automotive Quality Engineer specialized in FMEA. Based on the failure mode and root cause information below, suggest 3 specific preventive actions to reduce occurrence and improve detection. Output each action on its own line. Do not use bullet points or markdown.",
  risk_reduction:
    "You are a Senior Automotive Quality Engineer specialized in FMEA. Based on the current RPN and failure mode below, suggest specific actions to reduce the Severity, Occurrence, or Detection ratings. Focus on design changes for Severity, process changes for Occurrence, and inspection improvements for Detection. Output as plain text without markdown. Do not use bullet points.",
}

const ALLOWED_STEPS = new Set(["failure_modes", "preventive_actions", "risk_reduction"])

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

  const featureGate = requireFeature(session, "FMEA")
  if (!featureGate.allowed) {
    return NextResponse.json({ error: featureGate.reason }, { status: 403 })
  }

  const { stepId, context } = await req.json()

  if (!stepId || !ALLOWED_STEPS.has(stepId)) {
    return NextResponse.json({ error: "Invalid step. Allowed: failure_modes, preventive_actions, risk_reduction" }, { status: 400 })
  }

  const systemPrompt = FMEA_PROMPTS[stepId]

  const contextParts: string[] = []
  if (context?.partNumber) contextParts.push(`Part Number: ${context.partNumber}`)
  if (context?.partName) contextParts.push(`Part Name: ${context.partName}`)
  if (context?.fmeaType) contextParts.push(`FMEA Type: ${context.fmeaType === "DESIGN" ? "Design FMEA" : "Process FMEA"}`)
  if (context?.processStep) contextParts.push(`Process Step: ${context.processStep}`)
  if (context?.failureMode) contextParts.push(`Failure Mode: ${context.failureMode}`)
  if (context?.effect) contextParts.push(`Effect: ${context.effect}`)
  if (context?.cause) contextParts.push(`Cause: ${context.cause}`)
  if (context?.currentRpn) contextParts.push(`Current RPN: ${context.currentRpn}`)
  if (context?.severity) contextParts.push(`Severity: ${context.severity}`)
  if (context?.occurrence) contextParts.push(`Occurrence: ${context.occurrence}`)
  if (context?.detection) contextParts.push(`Detection: ${context.detection}`)

  const userMessage = contextParts.length > 0
    ? contextParts.join("\n") + "\n\nProvide your FMEA analysis based on the information above."
    : "Provide general FMEA guidance for automotive quality."

  try {
    const response = await client.chat.completions.create({
      model: process.env.AI_MODEL ?? "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      max_tokens: 2048,
    })

    const suggestion = response.choices[0]?.message?.content ?? "AI suggestion failed to produce a result."

    return NextResponse.json({ suggestion })
  } catch (err) {
    console.error("FMEA AI suggest error:", err)
    return NextResponse.json({ error: "AI suggestion failed. Please try again." }, { status: 500 })
  }
}