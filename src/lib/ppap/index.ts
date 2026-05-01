import type { PpapLevel, PpapSubmissionRequirement, PpapReasonForSubmission } from "@/generated/prisma/client"

export const PPAP_REQUIREMENTS: { key: PpapSubmissionRequirement; label: string; description: string }[] = [
  { key: "DESIGN_RECORDS", label: "Design Records", description: "Engineering drawings, specifications, and CAD data" },
  { key: "ENGINEERING_CHANGE_DOCUMENTS", label: "Engineering Change Documents", description: "ECN/ECO documentation" },
  { key: "CUSTOMER_ENGINEERING_APPROVAL", label: "Customer Engineering Approval", description: "Written engineering approval if required" },
  { key: "DESIGN_FMEA", label: "Design FMEA", description: "Design Failure Mode and Effects Analysis" },
  { key: "PROCESS_FLOW_DIAGRAM", label: "Process Flow Diagram", description: "Process flow diagram for the manufacturing process" },
  { key: "PROCESS_FMEA", label: "Process FMEA", description: "Process Failure Mode and Effects Analysis" },
  { key: "CONTROL_PLAN", label: "Control Plan", description: "Process control plan documentation" },
  { key: "MEASUREMENT_SYSTEM_ANALYSIS", label: "MSA Studies", description: "Measurement System Analysis / Gage R&R studies" },
  { key: "DIMENSIONAL_RESULTS", label: "Dimensional Results", description: "Dimensional inspection results" },
  { key: "MATERIAL_PERFORMANCE_RESULTS", label: "Material / Performance Test Results", description: "Material and performance test results" },
  { key: "INITIAL_PROCESS_STUDY", label: "Initial Process Studies", description: "SPC initial process capability studies" },
  { key: "QUALIFIED_LABORATORY_DOCUMENTATION", label: "Qualified Laboratory Documentation", description: "Lab scope and accreditation" },
  { key: "APPEARANCE_APPROVAL_REPORT", label: "Appearance Approval Report", description: "AAR if appearance item" },
  { key: "SAMPLE_PRODUCTION_PARTS", label: "Sample Production Parts", description: "Production representative samples" },
  { key: "MASTER_SAMPLE", label: "Master Sample", description: "Master sample if required" },
  { key: "CHECKING_ASSIST", label: "Checking Aids", description: "Checking fixtures, gauges, templates" },
  { key: "CUSTOMER_SPECIFIC_REQUIREMENTS", label: "Customer-Specific Requirements", description: "OEM-specific requirements" },
  { key: "PART_SUBMISSION_WARRANT", label: "Part Submission Warrant", description: "PSW form with all required signatures" },
]

export function getDefaultRequirements(level: PpapLevel): Record<PpapSubmissionRequirement, boolean> {
  const reqs: Record<PpapSubmissionRequirement, boolean> = {} as Record<PpapSubmissionRequirement, boolean>
  for (const r of PPAP_REQUIREMENTS) {
    reqs[r.key] = false
  }
  switch (level) {
    case "LEVEL_1":
      reqs.PART_SUBMISSION_WARRANT = true
      reqs.DESIGN_RECORDS = true
      break
    case "LEVEL_2":
      reqs.PART_SUBMISSION_WARRANT = true
      reqs.DESIGN_RECORDS = true
      reqs.PROCESS_FLOW_DIAGRAM = true
      break
    case "LEVEL_3":
      reqs.PART_SUBMISSION_WARRANT = true
      reqs.DESIGN_RECORDS = true
      reqs.PROCESS_FLOW_DIAGRAM = true
      reqs.PROCESS_FMEA = true
      reqs.CONTROL_PLAN = true
      reqs.MEASUREMENT_SYSTEM_ANALYSIS = true
      reqs.DIMENSIONAL_RESULTS = true
      reqs.MATERIAL_PERFORMANCE_RESULTS = true
      reqs.INITIAL_PROCESS_STUDY = true
      reqs.QUALIFIED_LABORATORY_DOCUMENTATION = true
      break
    case "LEVEL_4":
      Object.keys(reqs).forEach((k) => {
        reqs[k as PpapSubmissionRequirement] = true
      })
      reqs.CUSTOMER_ENGINEERING_APPROVAL = false
      reqs.SAMPLE_PRODUCTION_PARTS = false
      reqs.MASTER_SAMPLE = false
      break
    case "LEVEL_5":
      Object.keys(reqs).forEach((k) => {
        reqs[k as PpapSubmissionRequirement] = true
      })
      break
  }
  return reqs
}

export const PPAP_LEVELS: { value: PpapLevel; label: string; description: string }[] = [
  { value: "LEVEL_1", label: "Level 1", description: "Warrant only — submit PSW with design records" },
  { value: "LEVEL_2", label: "Level 2", description: "Warrant with design records and process flow" },
  { value: "LEVEL_3", label: "Level 3", description: "Full submission — all major elements required" },
  { value: "LEVEL_4", label: "Level 4", description: "Full submission with customer engineering approval" },
  { value: "LEVEL_5", label: "Level 5", description: "Full submission with master sample and checking aids" },
]

export const PPAP_REASONS: { value: PpapReasonForSubmission; label: string }[] = [
  { value: "NEW_PART", label: "New Part" },
  { value: "ENGINEERING_CHANGE", label: "Engineering Change" },
  { value: "SUPPLIER_CHANGE", label: "Supplier Change" },
  { value: "PROCESS_CHANGE", label: "Process Change" },
  { value: "TOOLING_CHANGE", label: "Tooling Change" },
  { value: "ANNUAL_REVALIDATION", label: "Annual Revalidation" },
  { value: "CORRECTIVE_ACTION_FOLLOW_UP", label: "Corrective Action Follow-up" },
  { value: "OTHER", label: "Other" },
]

export const PPAP_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  REQUESTED: "Requested",
  SUPPLIER_IN_PROGRESS: "Supplier In Progress",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under Review",
  REVISION_REQUIRED: "Revision Required",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
  REVISED: "Revised",
}

export const PPAP_DOCUMENT_STATUS_LABELS: Record<string, string> = {
  MISSING: "Missing",
  UPLOADED: "Uploaded",
  UNDER_REVIEW: "Under Review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  REVISION_REQUIRED: "Revision Required",
}

export function getPpapStatusColor(status: string): string {
  switch (status) {
    case "APPROVED":
      return "bg-emerald-500/10 text-emerald-400"
    case "REJECTED":
    case "CANCELLED":
    case "EXPIRED":
      return "bg-red-500/10 text-red-400"
    case "DRAFT":
      return "bg-muted text-muted-foreground"
    case "SUBMITTED":
    case "SUPPLIER_IN_PROGRESS":
      return "bg-blue-500/10 text-blue-400"
    case "UNDER_REVIEW":
      return "bg-amber-500/10 text-amber-400"
    case "REVISION_REQUIRED":
    case "REVISED":
      return "bg-orange-500/10 text-orange-400"
    case "REQUESTED":
      return "bg-cyan-500/10 text-cyan-400"
    default:
      return "bg-muted text-muted-foreground"
  }
}

export function getDocumentStatusColor(status: string): string {
  switch (status) {
    case "APPROVED":
      return "bg-emerald-500/10 text-emerald-400"
    case "REJECTED":
      return "bg-red-500/10 text-red-400"
    case "UPLOADED":
      return "bg-blue-500/10 text-blue-400"
    case "UNDER_REVIEW":
      return "bg-amber-500/10 text-amber-400"
    case "REVISION_REQUIRED":
      return "bg-orange-500/10 text-orange-400"
    case "MISSING":
    default:
      return "bg-muted text-muted-foreground"
  }
}