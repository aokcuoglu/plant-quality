"use client"

import { useState, useCallback, useTransition, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  Loader2Icon,
  SaveIcon,
  SendIcon,
  UsersIcon,
  AlertTriangleIcon,
  ShieldAlertIcon,
  SearchIcon,
  WrenchIcon,
  EyeIcon,
  TrophyIcon,
  LockIcon,
  MessageSquareIcon,
  SparklesIcon,
  PlusIcon,
  Trash2Icon,
  UploadIcon,
  DownloadIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { toast } from "@/components/ui/use-toast"
import { normalizePlan, canUseFeature } from "@/lib/billing/client"
import { respondToReviewComment, saveEightDStep, submitEightDReport } from "@/app/(dashboard)/quality/supplier/defects/actions/8d"
import { UserSearchSelect } from "@/components/defects/UserSearchSelect"
import { DatePicker } from "@/components/defects/DatePicker"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { UpgradeModal } from "@/components/defects/UpgradeModal"
import { RootCauseDiagram } from "@/components/defects/RootCauseDiagram"
import {
  formatEvidenceSectionLabel,
  getMissingRequiredEvidenceSections,
} from "@/lib/evidence"
import type { EightDSection } from "@/generated/prisma/client"

interface ReviewComment {
  id: string
  stepId: string
  comment: string
  status: "OPEN" | "RESOLVED"
  supplierResponse: string | null
  resolvedAt: Date | null
  author: { name: string | null }
  createdAt: Date
}

interface TeamMemberRow {
  id: string
  userId: string
  userName: string
  role: "champion" | "teamLeader" | "member"
}

interface ContainmentActionRow {
  id: string
  description: string
  responsibleUserId: string
  responsibleName: string
  effectiveness: number
  targetDate: string
  actualDate: string
}

interface RootCauseRow {
  id: string
  cause: string
  contribution: number
}

interface D5ActionRow {
  id: string
  action: string
  verificationMethod: string
  effectiveness: number
}

interface D6ActionRow {
  id: string
  actionId: string
  actionDescription: string
  targetDate: string
  actualDate: string
  validatedByUserId: string
  validatedByName: string
}

interface ImpactRow {
  id: string
  documentType: string
  revisionNo: string
}

interface EvidenceItem {
  id: string
  section: EightDSection
  fileName: string
  mimeType: string
  sizeBytes: number
  createdAt: Date
  uploaderName: string
  canRemove: boolean
  downloadUrl: string
}

interface Step {
  id: number
  label: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}

const STEPS: Step[] = [
  {
    id: 1, label: "D1-D2", title: "Team & Problem Description",
    description: "Define the 8D team and describe the problem", icon: UsersIcon,
  },
  {
    id: 2, label: "D3", title: "Containment Actions",
    description: "Immediate actions to contain the problem and protect the customer", icon: ShieldAlertIcon,
  },
  {
    id: 3, label: "D4", title: "Root Cause Analysis",
    description: "Identify the root cause using 5-Why analysis", icon: SearchIcon,
  },
  {
    id: 4, label: "D5-D6", title: "Permanent Corrective Actions & Validation",
    description: "Implement and verify permanent corrective actions", icon: WrenchIcon,
  },
  {
    id: 5, label: "D7", title: "Preventive Actions",
    description: "Prevent recurrence through systemic changes", icon: EyeIcon,
  },
  {
    id: 6, label: "D8", title: "Recognition & Closure",
    description: "Final review, lessons learned, and team recognition", icon: TrophyIcon,
  },
]

const STEP_TO_D_KEYS: Record<number, string[]> = {
  0: ["d1_team", "d2_problem"],
  1: ["d3_containment"],
  2: ["d4_rootCause"],
  3: ["d5_actions", "d6_actions", "d5_d6_action"],
  4: ["d7_impacts", "d7_preventive"],
  5: ["d8_recognition"],
}

const IMPACTED_DOCUMENTS = [
  { value: "controlPlan", label: "Control Plan" },
  { value: "dfmea", label: "FMEA (DFMEA/PFMEA)" },
  { value: "workInstructions", label: "Work Instructions" },
  { value: "trainingLogs", label: "Training Logs" },
  { value: "processFlowChart", label: "Process Flow Chart" },
]

const ROLE_LABELS: Record<string, string> = {
  champion: "Champion",
  teamLeader: "Team Leader",
  member: "Member",
}

let nextId = 1
function genId() {
  return `row_${nextId++}_${Date.now()}`
}

function parseJsonSafe<T>(val: string | null | undefined): T | null {
  if (!val) return null
  try {
    return JSON.parse(val) as T
  } catch {
    return null
  }
}

function parseRootCauses(val: string | null | undefined): RootCauseRow[] | null {
  if (!val?.trim()) return null

  const saved = parseJsonSafe<RootCauseRow[]>(val)
  if (saved && saved.length > 0) return saved

  const rows = val
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(?:[-*\s]*Why\s*#?\d+\s*[:.-]\s*)?(.*?)(?:\s*\((\d+(?:\.\d+)?)%\))?$/i)
      const cause = (match?.[1] ?? line).trim()
      const contribution = match?.[2] ? Number(match[2]) : 0
      return { id: genId(), cause, contribution }
    })
    .filter((row) => row.cause)

  if (rows.length > 0) return rows

  return [{ id: genId(), cause: val.trim(), contribution: 100 }]
}

function formatFileSize(sizeBytes: number) {
  if (sizeBytes < 1024) return `${sizeBytes} B`
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`
}

export function EightDWizardForm({
  defectId,
  initialData,
  reviewComments,
  userPlan,
  initialEvidences,
  canManageEvidence,
  imageUrls,
  defectTitle,
  partName,
  symptoms,
}: {
  defectId: string
  initialData: Record<string, string | null>
  reviewComments?: ReviewComment[]
  userPlan?: string
  initialEvidences?: EvidenceItem[]
  canManageEvidence?: boolean
  imageUrls?: string[]
  defectTitle?: string
  partName?: string
  symptoms?: string
}) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [saving, startSave] = useTransition()
  const [submitting, startSubmit] = useTransition()
  const [savedText, setSavedText] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [analyzing, setAnalyzing] = useState<string | null>(null)
  const [suggesting, setSuggesting] = useState<string | null>(null)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [commentResponses, setCommentResponses] = useState<Record<string, string>>({})
  const [evidences, setEvidences] = useState<EvidenceItem[]>(initialEvidences ?? [])
  const [uploadingSection, setUploadingSection] = useState<EightDSection | null>(null)
  const [removingEvidenceId, setRemovingEvidenceId] = useState<string | null>(null)
  const normalizedPlan = normalizePlan(userPlan)
  const canBrainstorm = canUseFeature(normalizedPlan, "OEM", "AI_CLASSIFICATION")
  const _canRootCause = canUseFeature(normalizedPlan, "OEM", "ROOT_CAUSE_SUGGESTION")
  const isPro = canBrainstorm

  const [d2Problem, setD2Problem] = useState(initialData.d2_problem ?? "")
  const [teamMembers, setTeamMembers] = useState<TeamMemberRow[]>(() => {
    const saved = initialData.d1_team ? parseJsonSafe<TeamMemberRow[]>(initialData.d1_team) : null
    if (saved && saved.length > 0) return saved
    return [{ id: genId(), userId: "", userName: "", role: "member" }]
  })

  const [containmentActions, setContainmentActions] = useState<ContainmentActionRow[]>(() => {
    const saved = parseJsonSafe<ContainmentActionRow[]>(initialData.d3_containment)
    if (saved && saved.length > 0) return saved
    return [{ id: genId(), description: "", responsibleUserId: "", responsibleName: "", effectiveness: 100, targetDate: "", actualDate: "" }]
  })

  const [rootCauses, setRootCauses] = useState<RootCauseRow[]>(() => {
    const saved = parseRootCauses(initialData.d4_rootCause)
    if (saved && saved.length > 0) return saved
    return [{ id: genId(), cause: "", contribution: 0 }]
  })

  const [d5Actions, setD5Actions] = useState<D5ActionRow[]>(() => {
    const saved = parseJsonSafe<D5ActionRow[]>(initialData.d5_actions)
    if (saved && saved.length > 0) return saved
    return [{ id: genId(), action: "", verificationMethod: "", effectiveness: 0 }]
  })

  const [d6Actions, setD6Actions] = useState<D6ActionRow[]>(() => {
    const saved = parseJsonSafe<D6ActionRow[]>(initialData.d6_actions)
    if (saved && saved.length > 0) return saved
    return [{ id: genId(), actionId: "", actionDescription: "", targetDate: "", actualDate: "", validatedByUserId: "", validatedByName: "" }]
  })

  const [d7Preventive, setD7Preventive] = useState(initialData.d7_preventive ?? "")
  const [d7Impacts, setD7Impacts] = useState<ImpactRow[]>(() => {
    const saved = parseJsonSafe<ImpactRow[]>(initialData.d7_impacts)
    if (saved && saved.length > 0) return saved
    return []
  })

  const [d8Recognition, setD8Recognition] = useState(initialData.d8_recognition ?? "")

  const currentComments = useMemo(() => {
    if (!reviewComments) return []
    const relevantKeys = STEP_TO_D_KEYS[step] ?? []
    return reviewComments.filter((c) => relevantKeys.includes(c.stepId))
  }, [reviewComments, step])

  const d5ActionMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const a of d5Actions) if (a.action) map[a.id] = a.action
    return map
  }, [d5Actions])

  const combinedRootCause = useMemo(() => rootCauses.map((r, i) => `Why #${i + 1}: ${r.cause} (${r.contribution}%)`).join("\n\n"), [rootCauses])

  const allFilled = useMemo(() => {
    const teamOk = teamMembers.some((m) => m.userId)
    const problemOk = d2Problem.trim().length > 0
    const containmentOk = containmentActions.some((a) => a.description.trim())
    const rootCauseOk = rootCauses.some((r) => r.cause.trim())
    const d5Ok = d5Actions.some((a) => a.action.trim())
    const d7Ok = d7Preventive.trim().length > 0
    const d8Ok = d8Recognition.trim().length > 0
    return teamOk && problemOk && containmentOk && rootCauseOk && d5Ok && d7Ok && d8Ok
  }, [teamMembers, d2Problem, containmentActions, rootCauses, d5Actions, d7Preventive, d8Recognition])

  const evidenceCounts = useMemo(() => {
    const counts: Partial<Record<EightDSection, number>> = {}
    for (const evidence of evidences) {
      counts[evidence.section] = (counts[evidence.section] ?? 0) + 1
    }
    return counts
  }, [evidences])

  const missingRequiredEvidence = useMemo(
    () => getMissingRequiredEvidenceSections(evidenceCounts),
    [evidenceCounts],
  )

  const evidenceReady = useMemo(
    () => missingRequiredEvidence.length === 0,
    [missingRequiredEvidence.length],
  )

  const showSaved = useCallback((text: string) => {
    setSavedText(text)
    setTimeout(() => setSavedText(null), 2500)
  }, [])

  const buildStepData = useCallback((targetStep: number) => {
    const data: Record<string, unknown> = {}
    if (targetStep === 0) {
      data.d1_team = teamMembers
      data.d2_problem = d2Problem
    } else if (targetStep === 1) {
      data.d3_containmentActions = containmentActions
    } else if (targetStep === 2) {
      data.d4_rootCause = combinedRootCause
    } else if (targetStep === 3) {
      data.d5_actions = d5Actions
      data.d6_actions = d6Actions
      data.d5_d6_action = `D5 Actions:\n${d5Actions.map((a) => `- ${a.action} (Verification: ${a.verificationMethod}, Effectiveness: ${a.effectiveness}%)`).join("\n")}\n\nD6 Validation:\n${d6Actions.map((a) => `- ${d5ActionMap[a.actionId] || a.actionDescription} | Target: ${a.targetDate} | Actual: ${a.actualDate} | Validated by: ${a.validatedByName}`).join("\n")}`
    } else if (targetStep === 4) {
      data.d7_impacts = d7Impacts
      data.d7_preventive = d7Preventive
    } else if (targetStep === 5) {
      data.d8_recognition = d8Recognition
    }
    return data
  }, [teamMembers, d2Problem, containmentActions, combinedRootCause, d5Actions, d6Actions, d5ActionMap, d7Impacts, d7Preventive, d8Recognition])

  const buildAllStepData = useCallback(() => ({
    ...buildStepData(0),
    ...buildStepData(1),
    ...buildStepData(2),
    ...buildStepData(3),
    ...buildStepData(4),
    ...buildStepData(5),
  }), [buildStepData])

  const saveCurrentStep = useCallback(async () => {
    return saveEightDStep(defectId, buildStepData(step))
  }, [step, defectId, buildStepData])

  const saveAllSteps = useCallback(async () => {
    return saveEightDStep(defectId, buildAllStepData())
  }, [defectId, buildAllStepData])

  const handleSave = useCallback(() => {
    startSave(async () => {
      const result = await saveCurrentStep()
      if (result.success) showSaved("Step saved")
    })
  }, [saveCurrentStep, showSaved, startSave])

  const handleNext = useCallback(() => {
    startSave(async () => {
      await saveCurrentStep()
      setStep((s) => Math.min(s + 1, STEPS.length - 1))
    })
  }, [saveCurrentStep, startSave])

  const handlePrev = useCallback(() => setStep((s) => Math.max(s - 1, 0)), [])

  const handleSubmit = useCallback(() => {
    startSubmit(async () => {
      const saveResult = await saveAllSteps()
      if (!saveResult.success) {
        toast({ title: "Save failed", description: saveResult.error, type: "destructive" })
        return
      }
      const result = await submitEightDReport(defectId)
      if (result.success) {
        setSuccess(true)
        setTimeout(() => router.push("/quality/supplier/defects"), 2500)
      } else {
        toast({ title: "Submit blocked", description: result.error, type: "destructive" })
      }
    })
  }, [defectId, startSubmit, router, saveAllSteps])

  const handleCommentResponse = useCallback((commentId: string) => {
    const response = commentResponses[commentId]?.trim()
    if (!response) return
    startSave(async () => {
      const result = await respondToReviewComment(commentId, response)
      if (result.success) {
        setCommentResponses((prev) => ({ ...prev, [commentId]: "" }))
        showSaved("Response saved")
      } else {
        toast({ title: "Response failed", description: result.error, type: "destructive" })
      }
    })
  }, [commentResponses, showSaved, startSave])

  const handleSuggest = useCallback(async (fieldName: string, contextText?: string) => {
    if (!canBrainstorm) {
      setShowUpgradeModal(true)
      return
    }
    setSuggesting(fieldName)
    try {
      const body: Record<string, string> = { stepId: fieldName, defectTitle: defectTitle ?? "", partName: partName ?? "", symptoms: symptoms ?? "" }
      if (contextText) body.d2Text = contextText
      if (fieldName === "d7_preventive") body.d4Text = combinedRootCause

      const res = await fetch("/api/ai/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json()
        toast({ title: "Brainstorm failed", description: err.error ?? "Please try again.", type: "destructive" })
        return
      }
      const { suggestion } = await res.json()

      if (fieldName === "d4_rootCause") {
        const lines = suggestion.split("\n").map((l: string) => l.replace(/^[\s*-]+/, "").replace(/^Why\s*\d+\s*[:.-]\s*/i, "").trim()).filter(Boolean).filter((l: string) => !l.startsWith("---") && !l.startsWith("AI"))
        setRootCauses(lines.length > 0 ? lines.map((cause: string, i: number) => ({ id: genId(), cause, contribution: i === 0 ? 100 : 0 })) : [{ id: genId(), cause: "", contribution: 0 }])
      } else if (fieldName === "d2_problem") {
        const clean = suggestion.replace(/^[\s*-]+/gm, "").replace(/#{1,6}\s/g, "").trim()
        setD2Problem((prev) => prev ? `${prev}\n\n--- AI SUGGESTION ---\n${clean}` : `--- AI SUGGESTION ---\n${clean}`)
      } else if (fieldName === "d7_preventive") {
        const clean = suggestion.replace(/^[\s*-]+/gm, "").replace(/#{1,6}\s/g, "").trim()
        setD7Preventive((prev) => prev ? `${prev}\n\n--- AI SUGGESTION ---\n${clean}` : `--- AI SUGGESTION ---\n${clean}`)
      } else if (fieldName === "d3_containment") {
        const lines = suggestion.split("\n").filter((l: string) => l.trim()).filter((l: string) => !l.startsWith("---"))
        setContainmentActions(lines.length > 0 ? lines.map((desc: string) => ({ id: genId(), description: desc.replace(/^[\s*-]+/, "").trim(), responsibleUserId: "", responsibleName: "", effectiveness: 100, targetDate: "", actualDate: "" })) : [{ id: genId(), description: "", responsibleUserId: "", responsibleName: "", effectiveness: 100, targetDate: "", actualDate: "" }])
      }
    } catch {
      toast({ title: "Network error", description: "Failed to connect to AI service.", type: "destructive" })
    } finally {
      setSuggesting(null)
    }
  }, [canBrainstorm, defectTitle, partName, symptoms, combinedRootCause])

  const handleVisionAnalyze = useCallback(async (imageUrl: string) => {
    if (!canBrainstorm) {
      setShowUpgradeModal(true)
      return
    }
    setAnalyzing(imageUrl)
    try {
      const res = await fetch("/api/ai/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl, stepId: "d2_problem" }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast({ title: "Analysis failed", description: err.error ?? "Please try again.", type: "destructive" })
        return
      }
      const { problemDescription, rootCauses, correctiveActions } = await res.json()

      setD2Problem((prev) => prev ? `${prev}\n\n${problemDescription}` : problemDescription)

      setRootCauses((prev) => {
        const existing = prev.filter((r) => r.cause.trim())
        const newCauses = rootCauses.map((r: { cause: string; contribution: number }) => ({
          id: genId(),
          cause: r.cause,
          contribution: r.contribution,
        }))
        return existing.length > 0 ? [...existing, ...newCauses] : newCauses
      })

      setD5Actions((prev) => {
        const existing = prev.filter((a) => a.action.trim())
        const newActions = correctiveActions.map((action: string) => ({
          id: genId(),
          action,
          verificationMethod: "",
          effectiveness: 100,
        }))
        return existing.length > 0 ? [...existing, ...newActions] : newActions
      })

      toast({ title: "Analysis complete", description: "Results have been filled into D2, D4, and D5-D6.", type: "info" })
    } catch {
      toast({ title: "Network error", description: "Failed to connect to AI service.", type: "destructive" })
    } finally {
      setAnalyzing(null)
    }
  }, [canBrainstorm])

  const handleEvidenceUpload = useCallback(async (section: EightDSection, file: File | null) => {
    if (!file) return
    setUploadingSection(section)
    try {
      const payload = new FormData()
      payload.set("defectId", defectId)
      payload.set("section", section)
      payload.set("file", file)

      const response = await fetch("/api/defects/evidence", {
        method: "POST",
        body: payload,
      })
      const json = await response.json()
      if (!response.ok) {
        throw new Error(json.error ?? "Upload failed")
      }

      const nextEvidence: EvidenceItem = {
        id: json.evidence.id,
        section: json.evidence.section as EightDSection,
        fileName: json.evidence.fileName,
        mimeType: json.evidence.mimeType,
        sizeBytes: json.evidence.sizeBytes,
        uploaderName: json.evidence.uploaderName,
        createdAt: new Date(json.evidence.createdAt),
        downloadUrl: json.evidence.downloadUrl,
        canRemove: true,
      }
      setEvidences((prev) => [nextEvidence, ...prev])
      toast({
        title: "Evidence uploaded",
        description: `${nextEvidence.fileName} added to ${formatEvidenceSectionLabel(section)}.`,
        type: "info",
      })
      router.refresh()
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Please try again.",
        type: "destructive",
      })
    } finally {
      setUploadingSection(null)
    }
  }, [defectId, router])

  const handleEvidenceRemove = useCallback(async (evidenceId: string) => {
    setRemovingEvidenceId(evidenceId)
    try {
      const response = await fetch("/api/defects/evidence", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evidenceId }),
      })
      const json = await response.json()
      if (!response.ok) {
        throw new Error(json.error ?? "Remove failed")
      }

      setEvidences((prev) => prev.filter((item) => item.id !== evidenceId))
      toast({ title: "Evidence removed", description: "File removed from this report.", type: "info" })
      router.refresh()
    } catch (error) {
      toast({
        title: "Remove failed",
        description: error instanceof Error ? error.message : "Please try again.",
        type: "destructive",
      })
    } finally {
      setRemovingEvidenceId(null)
    }
  }, [router])

  const renderEvidenceSection = (section: EightDSection) => {
    const sectionFiles = evidences.filter((item) => item.section === section)
    const isRequiredMissing = missingRequiredEvidence.includes(section)

    return (
      <div className="rounded-lg border bg-muted/20 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium">{formatEvidenceSectionLabel(section)}</p>
            <p className="text-xs text-muted-foreground">
              {isRequiredMissing ? "Required before submission" : "Supporting files"}
            </p>
          </div>
          <span className={cn(
            "rounded-full px-2 py-1 text-xs font-medium",
            isRequiredMissing
              ? "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300",
          )}>
            {sectionFiles.length} files
          </span>
        </div>

        {canManageEvidence && (
          <div className="mb-3">
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-dashed px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground">
              <UploadIcon className="h-3.5 w-3.5" />
              {uploadingSection === section ? "Uploading..." : "Upload File"}
              <input
                type="file"
                className="sr-only"
                accept=".pdf,image/png,image/jpeg,image/webp"
                disabled={uploadingSection !== null}
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null
                  handleEvidenceUpload(section, file)
                  event.target.value = ""
                }}
              />
            </label>
          </div>
        )}

        {sectionFiles.length === 0 ? (
          <p className="text-xs text-muted-foreground">No evidence files uploaded.</p>
        ) : (
          <div className="space-y-2">
            {sectionFiles.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-2 rounded-md bg-background px-2 py-2">
                <div className="min-w-0">
                  <a
                    href={item.downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    title={item.fileName}
                    className="block truncate text-xs font-medium hover:underline"
                  >
                    {item.fileName}
                  </a>
                  <p className="text-[11px] text-muted-foreground">
                    {formatFileSize(item.sizeBytes)} · {item.uploaderName}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <a
                    href={item.downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border hover:bg-muted"
                    aria-label="Download evidence"
                  >
                    <DownloadIcon className="h-3.5 w-3.5" />
                  </a>
                  {item.canRemove && canManageEvidence && (
                    <button
                      type="button"
                      onClick={() => handleEvidenceRemove(item.id)}
                      disabled={removingEvidenceId === item.id}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-destructive/30 text-destructive hover:bg-destructive/10 disabled:opacity-50"
                      aria-label="Delete evidence"
                    >
                      {removingEvidenceId === item.id ? (
                        <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2Icon className="h-3.5 w-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (success) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-50 dark:bg-green-950">
          <CheckIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-xl font-semibold tracking-tight">Report Submitted Successfully</h2>
        <p className="mt-2 text-sm text-muted-foreground">Your 8D report has been sent to the customer for review.</p>
        <p className="mt-1 text-xs text-muted-foreground">Redirecting to defects list...</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">8D Report</h1>
          <span className="text-xs text-muted-foreground">Step {step + 1} of {STEPS.length}</span>
        </div>
        <div className="flex gap-2">
          {STEPS.map((s, i) => {
            const isDone = i < step
            const isCurrent = i === step
            return (
              <button key={s.id} type="button" onClick={() => setStep(i)}
                className={cn("flex flex-1 flex-col items-center gap-1 rounded-lg px-2 py-2 text-xs font-medium transition-all",
                  isCurrent && "bg-primary/10 text-primary ring-1 ring-primary/20",
                  isDone && "text-primary",
                  !isCurrent && !isDone && "text-muted-foreground hover:bg-muted")}
              >
                <s.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{s.label}</span>
                {isDone && <CheckIcon className="h-3 w-3 text-primary" />}
              </button>
            )
          })}
        </div>
      </div>

      {currentComments.length > 0 && (
        <div className="space-y-2 rounded-lg border border-red-200 bg-red-50/50 p-4 dark:border-red-900 dark:bg-red-950/10">
          <div className="flex items-center gap-1.5 text-xs font-medium text-red-700 dark:text-red-400">
            <MessageSquareIcon className="h-3.5 w-3.5" /> Customer Review Comments
          </div>
          {currentComments.map((c) => (
            <div key={c.id} className="rounded-md bg-white/50 p-2 text-xs dark:bg-black/10">
              <div className="mb-0.5 flex items-center justify-between gap-2">
                <span className="font-medium text-foreground">{c.author.name ?? "Customer"}</span>
                <span className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-medium",
                  c.status === "OPEN"
                    ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                    : "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300",
                )}>
                  {c.status === "OPEN" ? "Open" : "Resolved"}
                </span>
              </div>
              <p className="text-muted-foreground">{c.comment}</p>
              {c.supplierResponse ? (
                <div className="mt-2 rounded-md bg-muted/60 p-2">
                  <span className="font-medium text-foreground">Your response: </span>
                  <span className="text-muted-foreground">{c.supplierResponse}</span>
                </div>
              ) : c.status === "OPEN" ? (
                <div className="mt-2 flex gap-2">
                  <input
                    value={commentResponses[c.id] ?? ""}
                    onChange={(e) => setCommentResponses((prev) => ({ ...prev, [c.id]: e.target.value }))}
                    placeholder="Respond to this review comment..."
                    className="min-w-0 flex-1 rounded-md border border-input bg-background px-2 py-1 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => handleCommentResponse(c.id)}
                    disabled={saving || !commentResponses[c.id]?.trim()}
                    className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
                  >
                    Reply
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border bg-card p-6">
        {/* D1-D2: Team & Problem */}
        {step === 0 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold">D1 — 8D Team</h2>
              <p className="text-sm text-muted-foreground">Define the 8D team roles and members</p>
            </div>
            <div className="space-y-3">
              {teamMembers.map((member, idx) => (
                <div key={member.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="flex-1 space-y-1.5 min-w-0">
                    <label className="text-xs font-medium">Team Member</label>
                    <UserSearchSelect
                      value={member.userId}
                      onSelect={(userId, userName) => setTeamMembers((prev) => { const n = [...prev]; n[idx] = { ...n[idx], userId, userName }; return n })}
                      placeholder="Select team member..."
                      excludeIds={teamMembers.filter((_, i) => i !== idx).map((m) => m.userId).filter(Boolean)}
                      selectedName={member.userName}
                    />
                  </div>
                  <div className="w-36 shrink-0 space-y-1.5">
                    <label className="text-xs font-medium">Role</label>
                    <Select value={member.role} onValueChange={(val) => setTeamMembers((prev) => { const n = [...prev]; n[idx] = { ...n[idx], role: val as "champion" | "teamLeader" | "member" }; return n })}>
                      <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select role">{ROLE_LABELS[member.role]}</SelectValue></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="champion">Champion</SelectItem>
                        <SelectItem value="teamLeader">Team Leader</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {teamMembers.length > 1 && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setTeamMembers((prev) => prev.filter((_, i) => i !== idx))} className="text-destructive shrink-0">
                      <Trash2Icon className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setTeamMembers((prev) => [...prev, { id: genId(), userId: "", userName: "", role: "member" }])}>
                <PlusIcon className="mr-1 h-3.5 w-3.5" /> Add Team Member
              </Button>
            </div>

            <div className="border-t pt-6">
              <div className="mb-4">
                <h2 className="text-lg font-semibold">D2 — Problem Description</h2>
                <p className="text-sm text-muted-foreground">Describe the problem in detail</p>
              </div>
              <div className="space-y-2">
                <textarea value={d2Problem} onChange={(e) => setD2Problem(e.target.value)} rows={6}
                  placeholder="What is the problem? Where was it found? When? How many affected? What is the defect rate?"
                  className="w-full rounded-lg border border-input bg-background p-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => isPro ? handleSuggest("d2_problem") : setShowUpgradeModal(true)} disabled={suggesting === "d2_problem"}
                    className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50">
                    {suggesting === "d2_problem" ? <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> : isPro ? <SparklesIcon className="h-3.5 w-3.5" /> : <LockIcon className="h-3.5 w-3.5" />}
                    {suggesting === "d2_problem" ? "Brainstorming..." : isPro ? "AI Brainstorm" : "AI Brainstorm — Upgrade to Pro"}
                  </button>
                  {imageUrls && imageUrls.length > 0 && imageUrls.map((url, imgIdx) => (
                    <button key={`${url}-${imgIdx}`} type="button" onClick={() => isPro ? handleVisionAnalyze(url) : setShowUpgradeModal(true)} disabled={analyzing === url}
                      className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50">
                      {analyzing === url ? <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> : isPro ? <SparklesIcon className="h-3.5 w-3.5" /> : <LockIcon className="h-3.5 w-3.5" />}
                      {analyzing === url ? "Analyzing..." : isPro ? `Analyze Photo ${imgIdx + 1}` : `Analyze Photo ${imgIdx + 1} — Upgrade to Pro`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* D3: Containment Actions */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">D3 — Containment Actions</h2>
              <p className="text-sm text-muted-foreground">Immediate actions to contain the problem and protect the customer</p>
            </div>
            <div className="overflow-visible border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30%]">Action Description</TableHead>
                    <TableHead className="w-[15%]">Responsible</TableHead>
                    <TableHead className="w-[10%]">% Effectiveness</TableHead>
                    <TableHead className="w-[15%]">Target Date</TableHead>
                    <TableHead className="w-[15%]">Actual Date</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {containmentActions.map((action, idx) => (
                    <TableRow key={action.id}>
                      <TableCell>
                        <input value={action.description} onChange={(e) => setContainmentActions((prev) => { const n = [...prev]; n[idx] = { ...n[idx], description: e.target.value }; return n })}
                          placeholder="Describe the containment action..." className="w-full rounded border border-input bg-background px-2 py-1 text-xs" />
                      </TableCell>
                      <TableCell>
                        <UserSearchSelect value={action.responsibleUserId} onSelect={(uid, un) => setContainmentActions((prev) => { const n = [...prev]; n[idx] = { ...n[idx], responsibleUserId: uid, responsibleName: un }; return n })} placeholder="Assign..." selectedName={action.responsibleName} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <input type="number" min={0} max={100} value={action.effectiveness}
                            onChange={(e) => setContainmentActions((prev) => { const n = [...prev]; n[idx] = { ...n[idx], effectiveness: Math.min(100, Math.max(0, Number(e.target.value) || 0)) }; return n })}
                            className="w-16 rounded border border-input bg-background px-2 py-1 text-xs" />
                          <span className="text-xs text-muted-foreground">%</span>
                        </div>
                      </TableCell>
                      <TableCell><DatePicker value={action.targetDate} onChange={(d) => setContainmentActions((prev) => { const n = [...prev]; n[idx] = { ...n[idx], targetDate: d }; return n })} placeholder="Target" /></TableCell>
                      <TableCell><DatePicker value={action.actualDate} onChange={(d) => setContainmentActions((prev) => { const n = [...prev]; n[idx] = { ...n[idx], actualDate: d }; return n })} placeholder="Actual" /></TableCell>
                      <TableCell>
                        {containmentActions.length > 1 && (
                          <Button type="button" variant="ghost" size="sm" onClick={() => setContainmentActions((prev) => prev.filter((_, i) => i !== idx))} className="h-8 w-8 p-0 text-destructive">
                            <Trash2Icon className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setContainmentActions((prev) => [...prev, { id: genId(), description: "", responsibleUserId: "", responsibleName: "", effectiveness: 100, targetDate: "", actualDate: "" }])}>
                <PlusIcon className="mr-1 h-3.5 w-3.5" /> Add Containment Action
              </Button>
              <button type="button" onClick={() => isPro ? handleSuggest("d3_containment") : setShowUpgradeModal(true)} disabled={suggesting === "d3_containment"}
                className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50">
                {suggesting === "d3_containment" ? <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> : isPro ? <SparklesIcon className="h-3.5 w-3.5" /> : <LockIcon className="h-3.5 w-3.5" />}
                {suggesting === "d3_containment" ? "Brainstorming..." : isPro ? "AI Brainstorm" : "AI Brainstorm — Upgrade to Pro"}
              </button>
            </div>
            {renderEvidenceSection("D3")}
          </div>
        )}

        {/* D4: Root Cause */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">D4 — Root Cause Analysis</h2>
              <p className="text-sm text-muted-foreground">Identify root causes using 5-Why analysis with % contribution</p>
            </div>
            <RootCauseDiagram
              d2Problem={d2Problem}
              initialRootCauses={rootCauses}
              plan={userPlan ?? "FREE"}
              onShowUpgradeModal={() => setShowUpgradeModal(true)}
              onRootCausesChange={setRootCauses}
              defectTitle={defectTitle}
              partName={partName}
              symptoms={symptoms}
            />
          </div>
        )}

        {/* D5-D6: PCA & Validation */}
        {step === 3 && (
          <div className="space-y-8">
            <div>
              <h2 className="text-lg font-semibold">D5 — Permanent Corrective Actions</h2>
              <p className="text-sm text-muted-foreground">Select and implement permanent corrective actions</p>
            </div>
            <div className="overflow-visible border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[35%]">Action</TableHead>
                    <TableHead className="w-[30%]">Verification Method</TableHead>
                    <TableHead className="w-[15%]">% Effectiveness</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {d5Actions.map((a, idx) => (
                    <TableRow key={a.id}>
                      <TableCell>
                        <input value={a.action} onChange={(e) => setD5Actions((prev) => { const n = [...prev]; n[idx] = { ...n[idx], action: e.target.value }; return n })}
                          placeholder="Describe the corrective action..." className="w-full rounded border border-input bg-background px-2 py-1 text-xs" />
                      </TableCell>
                      <TableCell>
                        <input value={a.verificationMethod} onChange={(e) => setD5Actions((prev) => { const n = [...prev]; n[idx] = { ...n[idx], verificationMethod: e.target.value }; return n })}
                          placeholder="How will effectiveness be verified?" className="w-full rounded border border-input bg-background px-2 py-1 text-xs" />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <input type="number" min={0} max={100} value={a.effectiveness}
                            onChange={(e) => setD5Actions((prev) => { const n = [...prev]; n[idx] = { ...n[idx], effectiveness: Math.min(100, Math.max(0, Number(e.target.value) || 0)) }; return n })}
                            className="w-16 rounded border border-input bg-background px-2 py-1 text-xs" />
                          <span className="text-xs text-muted-foreground">%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {d5Actions.length > 1 && (
                          <Button type="button" variant="ghost" size="sm" onClick={() => setD5Actions((prev) => prev.filter((_, i) => i !== idx))} className="h-8 w-8 p-0 text-destructive">
                            <Trash2Icon className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => setD5Actions((prev) => [...prev, { id: genId(), action: "", verificationMethod: "", effectiveness: 0 }])}>
              <PlusIcon className="mr-1 h-3.5 w-3.5" /> Add Corrective Action
            </Button>
            {renderEvidenceSection("D5")}

            <div className="border-t pt-6">
              <div className="mb-4">
                <h2 className="text-lg font-semibold">D6 — Validation & Closure</h2>
                <p className="text-sm text-muted-foreground">Validate that corrective actions are effective</p>
              </div>
              <div className="overflow-visible border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[25%]">D5 Action (linked)</TableHead>
                      <TableHead className="w-[20%]">Target Date</TableHead>
                      <TableHead className="w-[20%]">Actual Date</TableHead>
                      <TableHead className="w-[15%]">Validated By</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {d6Actions.map((a, idx) => (
                      <TableRow key={a.id}>
                        <TableCell>
                          <select value={a.actionId} onChange={(e) => {
                            const selectedId = e.target.value
                            const desc = d5ActionMap[selectedId] || ""
                            setD6Actions((prev) => { const n = [...prev]; n[idx] = { ...n[idx], actionId: selectedId, actionDescription: desc }; return n })
                          }}
                            className="w-full rounded border border-input bg-background px-2 py-1 text-xs">
                            <option value="">Select D5 action...</option>
                            {d5Actions.map((d5) => (
                              <option key={d5.id} value={d5.id}>{d5.action || "(unnamed)"}</option>
                            ))}
                          </select>
                        </TableCell>
                        <TableCell><DatePicker value={a.targetDate} onChange={(d) => setD6Actions((prev) => { const n = [...prev]; n[idx] = { ...n[idx], targetDate: d }; return n })} placeholder="Target" /></TableCell>
                        <TableCell><DatePicker value={a.actualDate} onChange={(d) => setD6Actions((prev) => { const n = [...prev]; n[idx] = { ...n[idx], actualDate: d }; return n })} placeholder="Actual" /></TableCell>
                        <TableCell>
                          <UserSearchSelect value={a.validatedByUserId} onSelect={(uid, un) => setD6Actions((prev) => { const n = [...prev]; n[idx] = { ...n[idx], validatedByUserId: uid, validatedByName: un }; return n })} placeholder="Validator..." selectedName={a.validatedByName} />
                        </TableCell>
                        <TableCell>
                          {d6Actions.length > 1 && (
                            <Button type="button" variant="ghost" size="sm" onClick={() => setD6Actions((prev) => prev.filter((_, i) => i !== idx))} className="h-8 w-8 p-0 text-destructive">
                              <Trash2Icon className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setD6Actions((prev) => [...prev, { id: genId(), actionId: "", actionDescription: "", targetDate: "", actualDate: "", validatedByUserId: "", validatedByName: "" }])}>
                <PlusIcon className="mr-1 h-3.5 w-3.5" /> Add Validation Row
              </Button>
              <div className="mt-4">
                {renderEvidenceSection("D6")}
              </div>
            </div>
          </div>
        )}

        {/* D7: Preventive Actions */}
        {step === 4 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">D7 — Preventive Actions & System Updates</h2>
              <p className="text-sm text-muted-foreground">Prevent recurrence through systemic changes</p>
            </div>
            <div className="space-y-3">
              <label className="text-sm font-medium">Impacted Documents / Processes</label>
              <div className="space-y-2">
                {IMPACTED_DOCUMENTS.map((doc) => {
                  const isChecked = d7Impacts.some((i) => i.documentType === doc.value)
                  return (
                    <div key={doc.value} className="flex items-center gap-2">
                      <Checkbox
                        id={`doc-${doc.value}`}
                        checked={isChecked}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setD7Impacts((prev) => [...prev, { id: genId(), documentType: doc.value, revisionNo: "" }])
                          } else {
                            setD7Impacts((prev) => prev.filter((i) => i.documentType !== doc.value))
                          }
                        }}
                      />
                      <label htmlFor={`doc-${doc.value}`} className="text-sm cursor-pointer">{doc.label}</label>
                    </div>
                  )
                })}
              </div>
            </div>
            {d7Impacts.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Specific Document Revision Numbers</label>
                {d7Impacts.map((impact, idx) => {
                  const docLabel = IMPACTED_DOCUMENTS.find((d) => d.value === impact.documentType)?.label || impact.documentType
                  return (
                    <div key={impact.id} className="flex items-center gap-2">
                      <span className="w-40 text-xs text-muted-foreground">{docLabel}:</span>
                      <input value={impact.revisionNo} onChange={(e) => setD7Impacts((prev) => { const n = [...prev]; n[idx] = { ...n[idx], revisionNo: e.target.value }; return n })}
                        placeholder="Revision No." className="flex-1 rounded border border-input bg-background px-2 py-1 text-xs" />
                    </div>
                  )
                })}
              </div>
            )}
            <div className="space-y-2 pt-2">
              <label className="text-sm font-medium">Preventive Actions Description <span className="text-destructive">*</span></label>
              <textarea value={d7Preventive} onChange={(e) => setD7Preventive(e.target.value)} rows={5}
                placeholder="Describe the preventive actions taken to prevent recurrence across all similar products..."
                className="w-full rounded-lg border border-input bg-background p-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <button type="button" onClick={() => isPro ? handleSuggest("d7_preventive") : setShowUpgradeModal(true)} disabled={suggesting === "d7_preventive"}
                className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50">
                {suggesting === "d7_preventive" ? <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> : isPro ? <SparklesIcon className="h-3.5 w-3.5" /> : <LockIcon className="h-3.5 w-3.5" />}
                {suggesting === "d7_preventive" ? "Brainstorming..." : isPro ? "AI Brainstorm" : "AI Brainstorm — Upgrade to Pro"}
              </button>
            </div>
            {renderEvidenceSection("D7")}
          </div>
        )}

        {/* D8: Recognition */}
        {step === 5 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">D8 — Recognition & Closure</h2>
              <p className="text-sm text-muted-foreground">Final review, lessons learned, and team recognition</p>
            </div>
            <textarea value={d8Recognition} onChange={(e) => setD8Recognition(e.target.value)} rows={8}
              placeholder="Document lessons learned, management review conclusions, and team recognition..."
              className="w-full rounded-lg border border-input bg-background p-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        )}
      </div>

      {/* Final review summary */}
      {step === 5 && (
        <div className={cn("rounded-xl border p-5", allFilled ? "border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20" : "border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20")}>
          <div className="flex items-start gap-3">
            {allFilled ? (
              <CheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
            ) : (
              <AlertTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            )}
            <div>
              <p className="text-sm font-medium">{allFilled ? "All required fields completed" : "Some required fields are missing"}</p>
              <ul className="mt-2 space-y-1">
                {[
                  ["Team & Problem", teamMembers.some((m) => m.userId) && d2Problem.trim().length > 0],
                  ["Containment Actions", containmentActions.some((a) => a.description.trim())],
                  ["Root Cause Analysis", rootCauses.some((r) => r.cause.trim())],
                  ["Corrective Actions", d5Actions.some((a) => a.action.trim())],
                  ["Preventive Actions", d7Preventive.trim().length > 0],
                  ["Recognition & Closure", d8Recognition.trim().length > 0],
                  ["Required Evidence (D5, D6, D7)", evidenceReady],
                ].map(([label, done]) => (
                  <li key={label as string} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className={cn("h-1.5 w-1.5 rounded-full", done ? "bg-green-500" : "bg-amber-400")} />
                    <span className={done ? "text-green-700 dark:text-green-400" : "text-amber-700 dark:text-amber-400"}>{label as string}</span>
                    {done && <CheckIcon className="h-3 w-3 text-green-500" />}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between rounded-xl border bg-card px-4 py-3">
        <div className="flex items-center gap-2">
          {savedText && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
              <CheckIcon className="h-3.5 w-3.5" />
              {savedText}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {step > 0 && (
            <Button variant="outline" size="sm" onClick={handlePrev}>
              <ArrowLeftIcon className="mr-1 h-3.5 w-3.5" /> Back
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2Icon className="mr-1 h-3.5 w-3.5 animate-spin" /> : <SaveIcon className="mr-1 h-3.5 w-3.5" />}
            Save
          </Button>
          {step < 5 ? (
            <Button size="sm" onClick={handleNext} disabled={saving}>
              Next <ArrowRightIcon className="ml-1 h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button size="sm" onClick={handleSubmit} disabled={submitting || !allFilled || !evidenceReady}>
              {submitting ? <Loader2Icon className="mr-1 h-3.5 w-3.5 animate-spin" /> : <SendIcon className="mr-1 h-3.5 w-3.5" />}
              Submit to OEM
            </Button>
          )}
        </div>
      </div>

      <UpgradeModal open={showUpgradeModal} onOpenChange={setShowUpgradeModal} />
    </div>
  )
}
