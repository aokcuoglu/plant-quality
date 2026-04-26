import { aiClassify, isAiEnabled } from "./provider"

export interface FieldDefectClassification {
  category: string | null
  subcategory: string | null
  probableArea: string | null
  suggestedSeverity: "MINOR" | "MAJOR" | "CRITICAL" | null
  suggestedSupplierName: string | null
  confidence: number
  reasoning: string
  recommendedAction: string
  duplicateRisk: "LOW" | "MEDIUM" | "HIGH"
}

const SYSTEM_PROMPT = `You are an automotive quality engineering AI assistant. Classify field defects based on the information provided.

Return a JSON object with these fields:
- category: string or null (e.g., "Electrical", "Mechanical", "Body", "Powertrain", "Chassis", "Interior", "Software")
- subcategory: string or null (e.g., "Wiring Harness", "Brake System", "Paint", "Engine Mount")
- probableArea: string or null (e.g., "Front Left Door Module", "Underhood Harness", "Rear Suspension")
- suggestedSeverity: "MINOR" | "MAJOR" | "CRITICAL" or null
- suggestedSupplierName: string or null (only if the defect description strongly implies a specific supplier)
- confidence: number 0-100 representing classification confidence
- reasoning: string (1-2 sentences explaining the classification)
- recommendedAction: string (e.g., "Assign to electrical team", "Escalate for root cause analysis", "Link to similar past defect")
- duplicateRisk: "LOW" | "MEDIUM" | "HIGH" (likelihood this is a duplicate of existing issues)

Be conservative with confidence scores. If information is insufficient, return null for uncertain fields.`

export async function classifyFieldDefect(input: {
  title: string
  description: string
  partNumber?: string | null
  partName?: string | null
  vehicleModel?: string | null
  vin?: string | null
  severity?: string | null
  source?: string | null
}): Promise<{ ok: true; classification: FieldDefectClassification } | { ok: false; error: string }> {
  if (!isAiEnabled()) {
    return { ok: false, error: "AI suggestions are not configured" }
  }

  const userMessage = [
    `Title: ${input.title}`,
    input.description ? `Description: ${input.description}` : null,
    input.partNumber ? `Part Number: ${input.partNumber}` : null,
    input.partName ? `Part Name: ${input.partName}` : null,
    input.vehicleModel ? `Vehicle Model: ${input.vehicleModel}` : null,
    input.vin ? `VIN: ${input.vin}` : null,
    input.severity ? `Current Severity: ${input.severity}` : null,
    input.source ? `Source: ${input.source}` : null,
    "",
    "Classify this field defect and provide structured insights.",
  ]
    .filter(Boolean)
    .join("\n")

  const result = await aiClassify(SYSTEM_PROMPT, userMessage)

  if (!result.ok) return result

  try {
    const parsed = JSON.parse(result.result) as FieldDefectClassification
    if (typeof parsed.confidence !== "number" || !parsed.duplicateRisk) {
      return { ok: false, error: "AI returned incomplete classification" }
    }
    return { ok: true, classification: parsed }
  } catch {
    return { ok: false, error: "Failed to parse AI classification response" }
  }
}