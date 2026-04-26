import OpenAI from "openai"

const AI_ENABLED = process.env.AI_ENABLED !== "false"
const AI_API_KEY = process.env.AI_API_KEY ?? ""
const AI_BASE_URL = process.env.AI_BASE_URL ?? "https://api.deepseek.com/v1"
const AI_MODEL = process.env.AI_MODEL ?? "deepseek-chat"

function getClient(): OpenAI | null {
  if (!AI_ENABLED || !AI_API_KEY) return null
  return new OpenAI({ apiKey: AI_API_KEY, baseURL: AI_BASE_URL })
}

export function isAiEnabled(): boolean {
  return AI_ENABLED && AI_API_KEY.length > 0
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

    return { ok: true, result: content }
  } catch (err) {
    console.error("AI classification error:", err)
    return { ok: false, error: "AI service error. Please try again later." }
  }
}