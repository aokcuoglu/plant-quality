import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { auth } from "@/lib/auth"
import { requireFeature } from "@/lib/billing"

const client = new OpenAI({
  apiKey: process.env.AI_API_KEY ?? "",
  baseURL: process.env.AI_BASE_URL ?? "https://api.deepseek.com/v1",
})

const PROMPTS: Record<string, string> = {
  d2_problem:
    "You are a Senior Automotive Quality Engineer. Based on the defect information below, generate a detailed technical problem description suitable for an 8D D2 section. Provide a technical response that can be directly used in an 8D report. Output plain text without markdown formatting. Do not use bullet points, asterisks, or markdown.",
  d3_containment:
    "You are a Senior Automotive Quality Engineer. Based on the defect information below, suggest immediate containment actions to protect the customer. Focus on sorting, segregation, rework, 100% inspection, and containment boundaries. Output each action on its own line. Do not use bullet points or markdown.",
  d4_rootCause:
    "You are a Senior Automotive Quality Engineer. Based on the problem description below, perform a 5-Why analysis. List each 'Why' on a new line starting with the direct cause, then each subsequent deeper cause. Output each cause on its own line, one per row, ordered from most direct to most fundamental. Do not use bullet points or numbering. Do not use markdown. Example:\nWhy 1: <direct cause>\nWhy 2: <deeper cause>\nWhy 3: <even deeper cause>",
  d7_preventive:
    "You are a Senior Automotive Quality Engineer. Based on the root cause information below, suggest 3 long-term preventive actions to avoid recurrence. Focus on process improvements, FMEA updates, control plan changes, and systemic fixes. Provide a technical response that can be directly used in an 8D report. Output plain text without markdown formatting. Do not use bullet points, asterisks, or markdown.",
}

const ALLOWED_STEPS = new Set(["d2_problem", "d3_containment", "d4_rootCause", "d7_preventive"])

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

  const { stepId, defectTitle, partName, symptoms, d2Text, d4Text } = await req.json()

  if (!stepId) {
    return NextResponse.json({ error: "stepId is required" }, { status: 400 })
  }

  if (!ALLOWED_STEPS.has(stepId)) {
    return NextResponse.json({ error: "Invalid step" }, { status: 400 })
  }

  const systemPrompt = PROMPTS[stepId] ?? PROMPTS.d2_problem

  let userMessage: string
  if (stepId === "d2_problem") {
    userMessage = [
      `Part Name/Number: ${partName ?? "N/A"}`,
      `Defect Description: ${defectTitle ?? "N/A"}`,
      `Observed Symptoms: ${symptoms ?? "N/A"}`,
      ``,
      `Generate a professional D2 Problem Description entry for this 8D report.`,
    ].join("\n")
  } else if (stepId === "d3_containment") {
    userMessage = [
      `Part Name/Number: ${partName ?? "N/A"}`,
      `Defect Description: ${defectTitle ?? "N/A"}`,
      `Observed Symptoms: ${symptoms ?? "N/A"}`,
      ``,
      `Suggest immediate containment actions for this defect.`,
    ].join("\n")
  } else if (stepId === "d4_rootCause") {
    userMessage = [
      `Part Name/Number: ${partName ?? "N/A"}`,
      ``,
      `Problem Description (from D2):`,
      d2Text?.trim() ? `"""\n${d2Text.trim()}\n"""` : "Not yet provided.",
      ``,
      `Based on this problem, suggest 3 potential engineering root causes.`,
    ].join("\n")
  } else if (stepId === "d7_preventive") {
    userMessage = [
      `Part Name/Number: ${partName ?? "N/A"}`,
      ``,
      `Root Cause (from D4):`,
      d4Text?.trim() ? `"""\n${d4Text.trim()}\n"""` : "Not yet provided.",
      ``,
      `Based on this root cause, suggest 3 long-term preventive actions.`,
    ].join("\n")
  } else {
    userMessage = [
      `Defect: ${defectTitle ?? "N/A"}`,
      `Part: ${partName ?? "N/A"}`,
      `Symptoms: ${symptoms ?? "N/A"}`,
    ].join("\n")
  }

  try {
    const response = await client.chat.completions.create({
      model: process.env.AI_MODEL ?? "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      max_tokens: 1024,
    })

    const suggestion =
      response.choices[0]?.message?.content ?? "AI suggestion failed to produce a result."

    return NextResponse.json({ suggestion })
  } catch (err) {
    console.error("AI suggest error:", err)
    return NextResponse.json({ error: "AI suggestion failed. Please try again." }, { status: 500 })
  }
}
