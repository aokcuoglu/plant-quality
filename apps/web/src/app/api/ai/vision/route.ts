import { isEditorRole } from "@/lib/roles"
import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { auth } from "@/lib/auth"
import { requireFeature } from "@/lib/billing"
import { s3Client, S3_BUCKET_NAME } from "@/lib/s3"
import { GetObjectCommand } from "@aws-sdk/client-s3"

const client = new OpenAI({
  apiKey: process.env.AI_API_KEY ?? "",
  baseURL: process.env.AI_BASE_URL ?? "https://api.deepseek.com/v1",
})

const SYSTEM_PROMPT = `You are a Senior Automotive Quality Engineer. Analyze this defect image from the production line.

Return a JSON object with exactly these fields:
- "problemDescription": a detailed technical description of the fault (2-3 sentences).
- "rootCauses": an array of exactly 3 objects, each with "cause" (string) and "contribution" (number, 1-100, representing the percentage this cause contributes to the defect). The sum of all contributions must equal 100.
- "correctiveActions": an array of exactly 3 strings, each a recommended corrective action.

Respond with ONLY valid JSON, no markdown, no explanation.`

const ALLOWED_STEPS = new Set(["d2_problem", "d4_rootCause"])

async function fetchImageAsBase64(urlOrKey: string): Promise<string> {
  let key: string | null = null
  if (urlOrKey.startsWith("/api/image?key=")) {
    key = new URL(urlOrKey, "http://localhost").searchParams.get("key")
  } else if (!urlOrKey.startsWith("http://") && !urlOrKey.startsWith("https://")) {
    key = urlOrKey
  }

  if (key) {
    const { Body, ContentType } = await s3Client.send(
      new GetObjectCommand({ Bucket: S3_BUCKET_NAME, Key: key }),
    )
    const bytes = await Body?.transformToByteArray()
    if (!bytes) throw new Error("Empty image object")
    const base64 = Buffer.from(bytes).toString("base64")
    return `data:${ContentType ?? "image/jpeg"};base64,${base64}`
  }

  const res = await fetch(urlOrKey)
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`)
  const contentType = res.headers.get("content-type") ?? "image/jpeg"
  const buffer = await res.arrayBuffer()
  const base64 = Buffer.from(buffer).toString("base64")
  return `data:${contentType};base64,${base64}`
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (session.user.companyType !== "OEM") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (!isEditorRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const featureGate = requireFeature(session, "AI_CLASSIFICATION")
  if (!featureGate.allowed) {
    return NextResponse.json({ error: featureGate.reason }, { status: 403 })
  }

  const { imageUrl, stepId } = await req.json()

  if (!imageUrl || !stepId) {
    return NextResponse.json({ error: "imageUrl and stepId are required" }, { status: 400 })
  }

  if (!ALLOWED_STEPS.has(stepId)) {
    return NextResponse.json({ error: "Invalid step" }, { status: 400 })
  }

  try {
    const dataUri = await fetchImageAsBase64(imageUrl)

    const response = await client.chat.completions.create({
      model: process.env.AI_MODEL ?? "deepseek-chat",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Analyze this defect image for the 8D step: ${stepId}.\n\nImage data: ${dataUri}`,
        },
      ],
      max_tokens: 1024,
    })

    const analysis = response.choices[0]?.message?.content ?? ""

    let parsed
    try {
      parsed = JSON.parse(analysis)
    } catch {
      return NextResponse.json({ error: "AI returned invalid JSON. Please try again." }, { status: 500 })
    }

    if (
      !parsed.problemDescription ||
      !Array.isArray(parsed.rootCauses) ||
      !Array.isArray(parsed.correctiveActions) ||
      !parsed.rootCauses.every((r: unknown) => r && typeof r === "object" && "cause" in r && "contribution" in r)
    ) {
      return NextResponse.json({ error: "AI response missing required fields. Please try again." }, { status: 500 })
    }

    return NextResponse.json({
      problemDescription: parsed.problemDescription,
      rootCauses: parsed.rootCauses.slice(0, 3).map((r: { cause: string; contribution: number }) => ({
        cause: r.cause,
        contribution: Math.max(1, Math.min(100, Math.round(r.contribution))),
      })),
      correctiveActions: parsed.correctiveActions.slice(0, 3),
    })
  } catch (err) {
    console.error("AI analysis error:", err)
    return NextResponse.json({ error: "AI analysis failed. Please try again." }, { status: 500 })
  }
}
