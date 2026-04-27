import OpenAI from "openai"

const AI_ENABLED = process.env.AI_ENABLED !== "false"
const AI_API_KEY = process.env.AI_API_KEY ?? ""
const AI_BASE_URL = process.env.AI_BASE_URL ?? "https://api.deepseek.com/v1"
const AI_MODEL = process.env.AI_MODEL ?? "deepseek-chat"
const AI_TIMEOUT_MS = 60_000

function getClient(): OpenAI | null {
  if (!AI_ENABLED || !AI_API_KEY) return null
  return new OpenAI({ apiKey: AI_API_KEY, baseURL: AI_BASE_URL, timeout: AI_TIMEOUT_MS })
}

export function isAiEnabled(): boolean {
  return AI_ENABLED && AI_API_KEY.length > 0
}

function isTimeoutError(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message?.toLowerCase() ?? ""
    return msg.includes("timeout") || msg.includes("timed out") || msg.includes("aborted")
  }
  return false
}

function isAuthError(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message?.toLowerCase() ?? ""
    return msg.includes("401") || msg.includes("authentication") || msg.includes("invalid api key")
  }
  return false
}

export async function aiClassify(
  systemPrompt: string,
  userMessage: string,
): Promise<{ ok: true; result: string } | { ok: false; error: string }> {
  const client = getClient()
  if (!client) {
    return { ok: false, error: "AI suggestions are not configured" }
  }

  try {
    const response = await client.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      max_tokens: 2048,
      response_format: { type: "json_object" },
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      return { ok: false, error: "AI returned no content" }
    }

    try {
      JSON.parse(content)
    } catch {
      return { ok: false, error: "AI returned invalid JSON" }
    }

    return { ok: true, result: content }
  } catch (err: unknown) {
    console.error("AI classification error:", err)
    if (isTimeoutError(err)) {
      return { ok: false, error: "AI request timed out. Please try again later." }
    }
    if (isAuthError(err)) {
      return { ok: false, error: "AI service authentication failed. Contact your administrator." }
    }
    return { ok: false, error: "AI service error. Please try again later." }
  }
}