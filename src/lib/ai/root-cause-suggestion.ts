import { aiClassify, isAiEnabled } from "./provider"

export interface RootCauseSuggestion {
  suggestedRootCauses: string[]
  suggestedInvestigationMethods: string[]
  suggested5WhyChain: string[]
  suggestedContainmentActions: string[]
  reasoning: string
  confidence: number
}

const SYSTEM_PROMPT = `You are an automotive quality engineering AI assistant. You suggest potential root causes and investigation approaches for quality defects based on the available information.

IMPORTANT RULES:
- You MUST assist, not decide. The OEM quality engineer makes the final decision.
- You MUST NOT assume supplier fault automatically.
- You MUST NOT blame any party without evidence.
- Be objective, professional, and constructive.
- Focus on engineering analysis, not fault assignment.
- Consider 5-Why analysis, Ishikawa (fishbone) diagrams, and automotive problem-solving methodologies.

Return a JSON object with these exact fields:
- suggestedRootCauses: array of strings (3-5 potential root causes, ordered by likelihood, each 1-2 sentences)
- suggestedInvestigationMethods: array of strings (3-5 investigation methods to verify root cause, e.g., "8D team cross-functional review", "process audit at supplier", "material analysis")
- suggested5WhyChain: array of strings (5 levels of "Why" starting from the symptom, each one line)
- suggestedContainmentActions: array of strings (3-5 immediate containment actions, max 1 sentence each)
- reasoning: string (2-3 sentences explaining the analysis approach)
- confidence: number 0-100 (your confidence in these suggestions given the available information)

Return ONLY valid JSON. No markdown, no code blocks, no explanations outside JSON.`

export async function suggestRootCause(input: {
  defectDescription: string
  partNumber: string
  supplierName?: string | null
  d2Problem?: string | null
  d4RootCause?: string | null
  containmentActions?: unknown
  category?: string | null
  subcategory?: string | null
  probableArea?: string | null
  fieldDefectTitle?: string | null
  fieldDefectDescription?: string | null
}): Promise<{ ok: true; suggestion: RootCauseSuggestion } | { ok: false; error: string }> {
  if (!isAiEnabled()) {
    return { ok: false, error: "AI suggestions are not configured" }
  }

  const contextLines = [
    `Defect: ${input.defectDescription}`,
    `Part Number: ${input.partNumber}`,
  ]

  if (input.supplierName) contextLines.push(`Supplier: ${input.supplierName}`)
  if (input.category) contextLines.push(`Category: ${input.category}`)
  if (input.subcategory) contextLines.push(`Subcategory: ${input.subcategory}`)
  if (input.probableArea) contextLines.push(`Probable Area: ${input.probableArea}`)
  if (input.d2Problem) contextLines.push(`D2 Problem Description: ${input.d2Problem}`)
  if (input.d4RootCause) contextLines.push(`Current D4 Root Cause: ${input.d4RootCause}`)
  if (Array.isArray(input.containmentActions) && input.containmentActions.length > 0) {
    contextLines.push(`Containment Actions: ${JSON.stringify(input.containmentActions)}`)
  }
  if (input.fieldDefectTitle) contextLines.push(`Linked Field Defect: ${input.fieldDefectTitle}`)
  if (input.fieldDefectDescription) contextLines.push(`Field Defect Description: ${input.fieldDefectDescription}`)

  const userMessage = [
    ...contextLines,
    "",
    "Suggest potential root causes and investigation approaches for this quality defect. Focus on engineering analysis and structured problem-solving. Return structured JSON only.",
  ].join("\n")

  const result = await aiClassify(SYSTEM_PROMPT, userMessage)

  if (!result.ok) return result

  try {
    const parsed = JSON.parse(result.result) as RootCauseSuggestion

    if (
      !Array.isArray(parsed.suggestedRootCauses) ||
      !Array.isArray(parsed.suggested5WhyChain) ||
      typeof parsed.confidence !== "number"
    ) {
      return { ok: false, error: "AI returned invalid root cause suggestion structure" }
    }

    parsed.confidence = Math.max(0, Math.min(100, Math.round(parsed.confidence)))

    return { ok: true, suggestion: parsed }
  } catch {
    return { ok: false, error: "Failed to parse AI root cause suggestion response" }
  }
}