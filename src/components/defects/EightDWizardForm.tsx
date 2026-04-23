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
  ClipboardCheckIcon,
  MessageSquareIcon,
} from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { saveEightDStep, submitEightDReport } from "@/app/(dashboard)/supplier/defects/actions/8d"

interface ReviewComment {
  id: string
  stepId: string
  comment: string
  author: { name: string | null }
  createdAt: Date
}

interface Step {
  id: number
  label: string
  title: string
  description: string
  fields: StepField[]
  icon: React.ComponentType<{ className?: string }>
}

interface StepField {
  name: string
  label: string
  placeholder: string
  type: "input" | "textarea"
  required: boolean
}

const STEPS: Step[] = [
  {
    id: 1,
    label: "D1-D2",
    title: "Team & Problem Description",
    description: "Define the 8D team and describe the problem",
    icon: UsersIcon,
    fields: [
      {
        name: "d1_team",
        label: "8D Team Members & Roles",
        placeholder: "List team members, their departments, and roles in this 8D process...",
        type: "textarea",
        required: true,
      },
      {
        name: "d2_problem",
        label: "Problem Description",
        placeholder: "What is the problem? Where was it found? When? How many affected? What is the defect rate?",
        type: "textarea",
        required: true,
      },
    ],
  },
  {
    id: 2,
    label: "D3",
    title: "Containment Actions",
    description: "Immediate actions to contain the problem and protect the customer",
    icon: ShieldAlertIcon,
    fields: [
      {
        name: "d3_containment",
        label: "Containment Actions Taken",
        placeholder: "Describe immediate actions: sort, segregate, rework, 100% inspection, containment boundaries...",
        type: "textarea",
        required: true,
      },
    ],
  },
  {
    id: 3,
    label: "D4",
    title: "Root Cause Analysis",
    description: "Identify the root cause using 5-Why analysis",
    icon: SearchIcon,
    fields: [
      {
        name: "d4_why1",
        label: "Why 1 — Direct Cause",
        placeholder: "What went wrong? What is the immediate cause of the defect?",
        type: "input",
        required: true,
      },
      {
        name: "d4_why2",
        label: "Why 2",
        placeholder: "Why did that direct cause happen?",
        type: "input",
        required: false,
      },
      {
        name: "d4_why3",
        label: "Why 3",
        placeholder: "Why did that happen?",
        type: "input",
        required: false,
      },
      {
        name: "d4_why4",
        label: "Why 4",
        placeholder: "Why did that happen?",
        type: "input",
        required: false,
      },
      {
        name: "d4_why5",
        label: "Why 5 — Root Cause",
        placeholder: "The fundamental root cause — why did the system allow this?",
        type: "input",
        required: false,
      },
    ],
  },
  {
    id: 4,
    label: "D5-D6",
    title: "Permanent Corrective Actions",
    description: "Implement and verify permanent corrective actions",
    icon: WrenchIcon,
    fields: [
      {
        name: "d5_d6_action",
        label: "Corrective Actions & Verification",
        placeholder: "Describe the permanent corrective actions selected, implemented, and how effectiveness was verified...",
        type: "textarea",
        required: true,
      },
    ],
  },
  {
    id: 5,
    label: "D7",
    title: "Preventive Actions",
    description: "Prevent recurrence through systemic changes",
    icon: EyeIcon,
    fields: [
      {
        name: "d7_preventive",
        label: "Preventive Actions",
        placeholder: "What systems, processes, or procedures are being updated to prevent recurrence across all similar products?",
        type: "textarea",
        required: true,
      },
    ],
  },
  {
    id: 6,
    label: "D8",
    title: "Recognition & Closure",
    description: "Final review, lessons learned, and team recognition",
    icon: TrophyIcon,
    fields: [
      {
        name: "d8_recognition",
        label: "Team Recognition & Lessons Learned",
        placeholder: "Document lessons learned, management review conclusions, and team recognition...",
        type: "textarea",
        required: true,
      },
    ],
  },
]

// Maps step index to the D stepId keys used in ReviewComment
const STEP_TO_D_KEYS: Record<number, string[]> = {
  0: ["d1_team", "d2_problem"],
  1: ["d3_containment"],
  2: ["d4_rootCause"],
  3: ["d5_d6_action"],
  4: ["d7_preventive"],
  5: ["d8_recognition"],
}

const REQUIRED_FIELDS = new Set(["d1_team", "d2_problem", "d3_containment", "d4_rootCause", "d5_d6_action", "d7_preventive", "d8_recognition"])

function combineFiveWhys(values: Record<string, string>): string {
  const whys = []
  for (let i = 1; i <= 5; i++) {
    const v = values[`d4_why${i}`]?.trim()
    if (v) whys.push(`Why #${i}: ${v}`)
  }
  return whys.join("\n\n")
}

function parseFiveWhys(values: Record<string, string | null>): Record<string, string> {
  const root = (values.d4_rootCause ?? "").trim()
  if (!root) return {}
  const lines = root.split("\n\n").filter(Boolean)
  const out: Record<string, string> = {}
  for (const line of lines) {
    const match = line.match(/^Why #(\d):\s*(.+)$/)
    if (match) {
      out[`d4_why${match[1]}`] = match[2].trim()
    }
  }
  if (!out.d4_why1 && lines.length > 0) {
    out.d4_why1 = lines[0]
  }
  return out
}

export function EightDWizardForm({
  defectId,
  initialData,
  reviewComments,
}: {
  defectId: string
  initialData: Record<string, string | null>
  reviewComments?: ReviewComment[]
}) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [values, setValues] = useState<Record<string, string>>(() => {
    const v: Record<string, string> = {}
    for (const s of STEPS) {
      for (const f of s.fields) {
        v[f.name] = initialData[f.name] ?? ""
      }
    }
    const parsed = parseFiveWhys(initialData)
    for (let i = 1; i <= 5; i++) {
      if (parsed[`d4_why${i}`] && !v[`d4_why${i}`]) {
        v[`d4_why${i}`] = parsed[`d4_why${i}`]
      }
    }
    if (v.d4_rootCause && !parsed.d4_why1) {
      v.d4_rootCause = initialData.d4_rootCause ?? ""
    }
    return v
  })
  const [saving, startSave] = useTransition()
  const [submitting, startSubmit] = useTransition()
  const [savedText, setSavedText] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [missingRequired, setMissingRequired] = useState(false)

  const current = STEPS[step]
  const isLastStep = step === STEPS.length - 1

  const currentComments = useMemo(() => {
    if (!reviewComments) return []
    const relevantKeys = STEP_TO_D_KEYS[step] ?? []
    return reviewComments.filter((c) => relevantKeys.includes(c.stepId))
  }, [reviewComments, step])

  const computedRootCause = useMemo(() => {
    const combined = combineFiveWhys(values)
    return combined || values.d4_rootCause?.trim() || ""
  }, [values])

  const allFilled = useMemo(() => {
    for (const name of REQUIRED_FIELDS) {
      if (name === "d4_rootCause") {
        if (!values.d4_why1?.trim()) return false
        continue
      }
      if (!values[name]?.trim()) return false
    }
    return true
  }, [values])

  const showSaved = useCallback((text: string) => {
    setSavedText(text)
    setTimeout(() => setSavedText(null), 2500)
  }, [])

  const saveCurrentStep = useCallback(async () => {
    const data: Record<string, string> = {}
    for (const f of current.fields) {
      data[f.name] = values[f.name] ?? ""
    }
    if (step === 3) {
      data.d4_rootCause = combineFiveWhys(values)
    }
    return saveEightDStep(defectId, data)
  }, [current, defectId, values, step])

  const handleSave = useCallback(() => {
    startSave(async () => {
      const result = await saveCurrentStep()
      if (result.success) showSaved("Step saved")
    })
  }, [saveCurrentStep, showSaved, startSave])

  const handleNext = useCallback(() => {
    const requiredFields = current.fields.filter((f) => f.required)
    const allReqFilled = requiredFields.every((f) => values[f.name]?.trim())
    if (!allReqFilled) {
      setMissingRequired(true)
      return
    }
    setMissingRequired(false)
    startSave(async () => {
      await saveCurrentStep()
      setStep((s) => Math.min(s + 1, STEPS.length - 1))
    })
  }, [current, saveCurrentStep, startSave, values])

  const handlePrev = useCallback(() => {
    setMissingRequired(false)
    setStep((s) => Math.max(s - 1, 0))
  }, [])

  const handleSubmit = useCallback(() => {
    startSubmit(async () => {
      await saveCurrentStep()
      const result = await submitEightDReport(defectId)
      if (result.success) {
        setSuccess(true)
        setTimeout(() => {
          router.push("/supplier/defects")
        }, 2500)
      }
    })
  }, [defectId, startSubmit, router, saveCurrentStep])

  if (success) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-50 dark:bg-green-950">
          <CheckIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-xl font-semibold tracking-tight">Report Submitted Successfully</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Your 8D report has been sent to the customer for review.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Redirecting to defects list...
        </p>
        <div className="mt-6 flex justify-center gap-1">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" style={{ animationDelay: "0ms" }} />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" style={{ animationDelay: "150ms" }} />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Step indicator */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">8D Report</h1>
          <span className="text-xs text-muted-foreground">
            Step {step + 1} of {STEPS.length}
          </span>
        </div>
        <div className="flex gap-2">
          {STEPS.map((s, i) => {
            const isDone = i < step
            const isCurrent = i === step
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setStep(i)}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 rounded-lg px-2 py-2 text-xs font-medium transition-all",
                  isCurrent && "bg-primary/10 text-primary ring-1 ring-primary/20",
                  isDone && "text-primary",
                  !isCurrent && !isDone && "text-muted-foreground hover:bg-muted",
                )}
              >
                <s.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{s.label}</span>
                {isDone && <CheckIcon className="h-3 w-3 text-primary" />}
              </button>
            )
          })}
        </div>
      </div>

      {/* OEM review comments for this step */}
      {currentComments.length > 0 && (
        <div className="space-y-2 rounded-lg border border-red-200 bg-red-50/50 p-4 dark:border-red-900 dark:bg-red-950/10">
          <div className="flex items-center gap-1.5 text-xs font-medium text-red-700 dark:text-red-400">
            <MessageSquareIcon className="h-3.5 w-3.5" />
            Customer Review Comments
          </div>
          {currentComments.map((c) => (
            <div key={c.id} className="rounded-md bg-white/50 p-2 text-xs dark:bg-black/10">
              <div className="mb-0.5 font-medium text-foreground">
                {c.author.name ?? "Customer"}
              </div>
              <p className="text-muted-foreground">{c.comment}</p>
            </div>
          ))}
        </div>
      )}

      {/* Missing required fields warning */}
      {missingRequired && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/50 px-4 py-2.5 text-sm text-amber-700 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-400">
          <AlertTriangleIcon className="h-4 w-4 shrink-0" />
          Please fill in all required fields (<span className="text-destructive">*</span>) before proceeding.
        </div>
      )}

      {/* Current step form */}
      <div className="rounded-xl border bg-card p-6">
        <div className="mb-5">
          <h2 className="text-lg font-semibold">{current.title}</h2>
          <p className="text-sm text-muted-foreground">{current.description}</p>
        </div>

        <div className="space-y-4">
          {current.fields.map((field) => (
            <div key={field.name} className="space-y-1.5">
              <label className="text-sm font-medium">
                {field.label}
                {field.required && <span className="ml-1 text-destructive">*</span>}
              </label>
              {field.type === "textarea" ? (
                <textarea
                  value={values[field.name] ?? ""}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, [field.name]: e.target.value }))
                  }
                  rows={5}
                  placeholder={field.placeholder}
                  className="w-full rounded-lg border border-input bg-background p-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              ) : (
                <input
                  value={values[field.name] ?? ""}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, [field.name]: e.target.value }))
                  }
                  type="text"
                  placeholder={field.placeholder}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Final review summary on last step */}
      {isLastStep && (
        <div className={cn("rounded-xl border p-5", allFilled ? "border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20" : "border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20")}>
          <div className="flex items-start gap-3">
            {allFilled ? (
              <CheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
            ) : (
              <AlertTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            )}
            <div>
              <p className="text-sm font-medium">
                {allFilled ? "All required fields completed" : "Some required fields are missing"}
              </p>
              <ul className="mt-2 space-y-1">
                {Array.from(REQUIRED_FIELDS).map((name) => {
                  const filled = name === "d4_rootCause" ? !!values.d4_why1?.trim() : !!values[name]?.trim()
                  const stepInfo = STEPS.find((s) => s.fields.some((f) => f.name === name))
                  const displayLabel = name === "d4_rootCause" ? "D4" : (stepInfo?.label ?? name)
                  return (
                    <li key={name} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className={cn("h-1.5 w-1.5 rounded-full", filled ? "bg-green-500" : "bg-amber-400")} />
                      <span className={filled ? "text-green-700 dark:text-green-400" : "text-amber-700 dark:text-amber-400"}>
                        {displayLabel}
                      </span>
                      {filled && <CheckIcon className="h-3 w-3 text-green-500" />}
                    </li>
                  )
                })}
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
              <ArrowLeftIcon className="mr-1 h-3.5 w-3.5" />
              Back
            </Button>
          )}

          <Button variant="secondary" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2Icon className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <SaveIcon className="mr-1 h-3.5 w-3.5" />
            )}
            Save
          </Button>

          {!isLastStep ? (
            <Button size="sm" onClick={handleNext} disabled={saving}>
              Next
              <ArrowRightIcon className="ml-1 h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={submitting || !allFilled}
            >
              {submitting ? (
                <Loader2Icon className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : (
                <SendIcon className="mr-1 h-3.5 w-3.5" />
              )}
              Submit to OEM
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
