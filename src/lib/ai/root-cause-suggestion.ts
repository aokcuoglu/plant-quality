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
    const raw = JSON.parse(result.result)

    const parsed: RootCauseSuggestion = {
      suggestedRootCauses: Array.isArray(raw.suggestedRootCauses) ? raw.suggestedRootCauses.filter((s: unknown) => typeof s === "string").slice(0, 5) : [],
      suggestedInvestigationMethods: Array.isArray(raw.suggestedInvestigationMethods) ? raw.suggestedInvestigationMethods.filter((s: unknown) => typeof s === "string").slice(0, 5) : [],
      suggested5WhyChain: Array.isArray(raw.suggested5WhyChain) ? raw.suggested5WhyChain.filter((s: unknown) => typeof s === "string").slice(0, 5) : [],
      suggestedContainmentActions: Array.isArray(raw.suggestedContainmentActions) ? raw.suggestedContainmentActions.filter((s: unknown) => typeof s === "string").slice(0, 5) : [],
      reasoning: typeof raw.reasoning === "string" ? raw.reasoning : "",
      confidence: typeof raw.confidence === "number" ? raw.confidence : 50,
    }

    if (
      parsed.suggestedRootCauses.length === 0 &&
      parsed.suggested5WhyChain.length === 0
    ) {
      return { ok: false, error: "AI returned invalid root cause suggestion structure" }
    }

    parsed.confidence = Math.max(0, Math.min(100, Math.round(parsed.confidence)))

    return { ok: true, suggestion: parsed }
  } catch {
    return { ok: false, error: "Failed to parse AI root cause suggestion response" }
  }
}

export function parseRootCauseSuggestion(raw: unknown): RootCauseSuggestion | null {
  if (!raw || typeof raw !== "object") return null
  const r = raw as Record<string, unknown>
  const result: RootCauseSuggestion = {
    suggestedRootCauses: Array.isArray(r.suggestedRootCauses) ? r.suggestedRootCauses.filter((s: unknown) => typeof s === "string").slice(0, 5) : [],
    suggestedInvestigationMethods: Array.isArray(r.suggestedInvestigationMethods) ? r.suggestedInvestigationMethods.filter((s: unknown) => typeof s === "string").slice(0, 5) : [],
    suggested5WhyChain: Array.isArray(r.suggested5WhyChain) ? r.suggested5WhyChain.filter((s: unknown) => typeof s === "string").slice(0, 5) : [],
    suggestedContainmentActions: Array.isArray(r.suggestedContainmentActions) ? r.suggestedContainmentActions.filter((s: unknown) => typeof s === "string").slice(0, 5) : [],
    reasoning: typeof r.reasoning === "string" ? r.reasoning : "",
    confidence: typeof r.confidence === "number" ? Math.max(0, Math.min(100, Math.round(r.confidence))) : 50,
  }
  if (result.suggestedRootCauses.length === 0 && result.suggested5WhyChain.length === 0) return null
  return result
}