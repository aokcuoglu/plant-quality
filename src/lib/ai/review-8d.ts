import { aiClassify, isAiEnabled } from "./provider"
import { validateEightDCompleteness, type EightDCompletenessResult } from "./validate-8d-completeness"

export type Ai8dReviewStatus = "STRONG" | "NEEDS_IMPROVEMENT" | "INCOMPLETE" | "RISKY"

export interface Ai8dReviewResult {
  overallScore: number
  reviewStatus: Ai8dReviewStatus
  completeness: {
    problemDescriptionComplete: boolean
    containmentDefined: boolean
    rootCauseDefined: boolean
    correctiveActionDefined: boolean
    preventiveActionDefined: boolean
    verificationDefined: boolean
  }
  weakPoints: string[]
  missingItems: string[]
  suggestedQuestionsForSupplier: string[]
  suggestedRootCauseAngles: string[]
  suggestedContainmentActions: string[]
  suggestedCorrectiveActions: string[]
  suggestedPreventiveActions: string[]
  reasoningSummary: string
  confidence: number
}

export { type EightDCompletenessResult }

const SYSTEM_PROMPT = `You are an automotive quality engineering AI assistant. You review supplier-submitted 8D reports from the OEM quality perspective.

IMPORTANT RULES:
- You MUST assist, not decide. You suggest and review, but the OEM quality engineer makes the final decision.
- You MUST NOT automatically change 8D status.
- You MUST NOT automatically reject the supplier's 8D.
- You MUST NOT automatically blame the supplier.
- You MUST NOT assume supplier fault without evidence.
- Be objective, professional, and constructive.
- Consider IATF 16949 and automotive industry best practices.

Return a JSON object with these exact fields:
- overallScore: number 0-100 (overall quality score of the 8D report)
- reviewStatus: "STRONG" | "NEEDS_IMPROVEMENT" | "INCOMPLETE" | "RISKY"
- completeness: object with boolean fields:
  - problemDescriptionComplete
  - containmentDefined
  - rootCauseDefined
  - correctiveActionDefined
  - preventiveActionDefined
  - verificationDefined
- weakPoints: array of strings (specific weak points or gaps identified)
- missingItems: array of strings (critical missing elements)
- suggestedQuestionsForSupplier: array of strings (questions OEM should ask the supplier, max 5)
- suggestedRootCauseAngles: array of strings (potential root cause investigation angles, max 5)
- suggestedContainmentActions: array of strings (additional containment actions to consider, max 5)
- suggestedCorrectiveActions: array of strings (additional corrective actions to consider, max 5)
- suggestedPreventiveActions: array of strings (additional preventive actions to consider, max 5)
- reasoningSummary: string (2-3 sentences explaining the assessment)
- confidence: number 0-100 (your confidence in this review)

Scoring guidance:
- STRONG: score 80-100. Report is thorough, well-structured, with strong evidence and clear root cause.
- NEEDS_IMPROVEMENT: score 50-79. Report has gaps but is fundamentally sound. Missing some details or follow-through.
- INCOMPLETE: score 25-49. Major sections missing or insufficiently addressed.
- RISKY: score 0-24. Report is superficial, contains contradictory information, or poses quality risk.

Return ONLY valid JSON. No markdown, no code blocks, no explanations outside JSON.`

export async function reviewEightD(input: {
  defectDescription: string
  partNumber: string
  supplierName: string
  report: {
    team: unknown
    d2_problem: string | null
    containmentActions: unknown
    d4_rootCause: string | null
    d5Actions: unknown
    d6Actions: unknown
    d7Preventive: string | null
    d7Impacts: unknown
    d8_recognition: string | null
  }
  reviewComments?: Array<{ stepId: string; comment: string; supplierResponse: string | null }>
}): Promise<{ ok: true; review: Ai8dReviewResult; deterministicCompleteness: EightDCompletenessResult } | { ok: false; error: string }> {
  if (!isAiEnabled()) {
    return { ok: false, error: "AI suggestions are not configured" }
  }

  const deterministicCompleteness = validateEightDCompleteness(input.report)

  const reportSummary = [
    `Defect: ${input.defectDescription}`,
    `Part Number: ${input.partNumber}`,
    `Supplier: ${input.supplierName}`,
    "",
    "=== 8D Report Content ===",
    input.report.d2_problem ? `D2 Problem: ${input.report.d2_problem}` : "D2 Problem: NOT PROVIDED",
    Array.isArray(input.report.containmentActions) && input.report.containmentActions.length > 0
      ? `D3 Containment: ${JSON.stringify(input.report.containmentActions)}`
      : "D3 Containment: NOT PROVIDED",
    input.report.d4_rootCause ? `D4 Root Cause: ${input.report.d4_rootCause}` : "D4 Root Cause: NOT PROVIDED",
    Array.isArray(input.report.d5Actions) && input.report.d5Actions.length > 0
      ? `D5 Corrective Actions: ${JSON.stringify(input.report.d5Actions)}`
      : "D5 Corrective Actions: NOT PROVIDED",
    Array.isArray(input.report.d6Actions) && input.report.d6Actions.length > 0
      ? `D6 Verification: ${JSON.stringify(input.report.d6Actions)}`
      : "D6 Verification: NOT PROVIDED",
    input.report.d7Preventive ? `D7 Preventive: ${input.report.d7Preventive}` : "D7 Preventive: NOT PROVIDED",
    Array.isArray(input.report.d7Impacts) && input.report.d7Impacts.length > 0
      ? `D7 Document Updates: ${JSON.stringify(input.report.d7Impacts)}`
      : "D7 Document Updates: NOT PROVIDED",
    input.report.d8_recognition ? `D8 Recognition: ${input.report.d8_recognition}` : "D8 Recognition: NOT PROVIDED",
    Array.isArray(input.report.team) && input.report.team.length > 0
      ? `D1 Team: ${JSON.stringify(input.report.team)}`
      : "D1 Team: NOT PROVIDED",
  ]

  if (input.reviewComments && input.reviewComments.length > 0) {
    reportSummary.push("", "=== Previous Review Comments ===")
    for (const c of input.reviewComments) {
      reportSummary.push(`[${c.stepId}] OEM: ${c.comment}`)
      if (c.supplierResponse) {
        reportSummary.push(`[${c.stepId}] Supplier: ${c.supplierResponse}`)
      }
    }
  }

  const userMessage = [
    ...reportSummary,
    "",
    "Review this 8D report from a supplier. Assess completeness, quality, and risk. Identify weak points and suggest improvements. Return structured JSON only.",
  ].join("\n")

  const result = await aiClassify(SYSTEM_PROMPT, userMessage)

  if (!result.ok) return result

  try {
    const raw = JSON.parse(result.result)

    const parsed: Ai8dReviewResult = {
      overallScore: typeof raw.overallScore === "number" ? raw.overallScore : 50,
      reviewStatus: ["STRONG", "NEEDS_IMPROVEMENT", "INCOMPLETE", "RISKY"].includes(raw.reviewStatus)
        ? raw.reviewStatus
        : "NEEDS_IMPROVEMENT",
      completeness: {
        problemDescriptionComplete: Boolean(raw.completeness?.problemDescriptionComplete),
        containmentDefined: Boolean(raw.completeness?.containmentDefined),
        rootCauseDefined: Boolean(raw.completeness?.rootCauseDefined),
        correctiveActionDefined: Boolean(raw.completeness?.correctiveActionDefined),
        preventiveActionDefined: Boolean(raw.completeness?.preventiveActionDefined),
        verificationDefined: Boolean(raw.completeness?.verificationDefined),
      },
      weakPoints: Array.isArray(raw.weakPoints) ? raw.weakPoints.filter((s: unknown) => typeof s === "string") : [],
      missingItems: Array.isArray(raw.missingItems) ? raw.missingItems.filter((s: unknown) => typeof s === "string") : [],
      suggestedQuestionsForSupplier: Array.isArray(raw.suggestedQuestionsForSupplier) ? raw.suggestedQuestionsForSupplier.filter((s: unknown) => typeof s === "string").slice(0, 5) : [],
      suggestedRootCauseAngles: Array.isArray(raw.suggestedRootCauseAngles) ? raw.suggestedRootCauseAngles.filter((s: unknown) => typeof s === "string").slice(0, 5) : [],
      suggestedContainmentActions: Array.isArray(raw.suggestedContainmentActions) ? raw.suggestedContainmentActions.filter((s: unknown) => typeof s === "string").slice(0, 5) : [],
      suggestedCorrectiveActions: Array.isArray(raw.suggestedCorrectiveActions) ? raw.suggestedCorrectiveActions.filter((s: unknown) => typeof s === "string").slice(0, 5) : [],
      suggestedPreventiveActions: Array.isArray(raw.suggestedPreventiveActions) ? raw.suggestedPreventiveActions.filter((s: unknown) => typeof s === "string").slice(0, 5) : [],
      reasoningSummary: typeof raw.reasoningSummary === "string" ? raw.reasoningSummary : "",
      confidence: typeof raw.confidence === "number" ? raw.confidence : 50,
    }

    parsed.overallScore = Math.max(0, Math.min(100, Math.round(parsed.overallScore)))
    parsed.confidence = Math.max(0, Math.min(100, Math.round(parsed.confidence)))

    return { ok: true, review: parsed, deterministicCompleteness }
  } catch {
    return { ok: false, error: "Failed to parse AI 8D review response" }
  }
}