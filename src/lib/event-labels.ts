import type { DefectEventType } from "@/generated/prisma/client"
import {
  PlusIcon,
  PlayIcon,
  SaveIcon,
  SendIcon,
  MessageSquareIcon,
  ReplyIcon,
  CheckIcon,
  RotateCcwIcon,
  XCircleIcon,
  UserIcon,
  CalendarIcon,
  PaperclipIcon,
  TrashIcon,
} from "lucide-react"

type IconComponent = typeof PlusIcon

export interface EventMeta {
  label: string
  description: string
  icon: IconComponent
  iconColor: string
}

export const EVENT_META: Record<DefectEventType, EventMeta> = {
  CREATED: { label: "Created", description: "Defect report created", icon: PlusIcon, iconColor: "text-blue-500" },
  EIGHT_D_STARTED: { label: "8D Started", description: "8D investigation started", icon: PlayIcon, iconColor: "text-green-500" },
  EIGHT_D_STEP_SAVED: { label: "8D Step Saved", description: "8D step progress saved", icon: SaveIcon, iconColor: "text-slate-500" },
  EIGHT_D_SUBMITTED: { label: "8D Submitted", description: "8D report submitted for review", icon: SendIcon, iconColor: "text-green-600" },
  REVIEW_COMMENT_ADDED: { label: "Comment Added", description: "Review comment added", icon: MessageSquareIcon, iconColor: "text-blue-500" },
  REVIEW_COMMENT_RESPONDED: { label: "Comment Response", description: "Review comment responded to", icon: ReplyIcon, iconColor: "text-blue-500" },
  REVIEW_COMMENT_RESOLVED: { label: "Comment Resolved", description: "Review comment resolved", icon: CheckIcon, iconColor: "text-green-500" },
  REVIEW_COMMENT_REOPENED: { label: "Comment Reopened", description: "Review comment reopened", icon: RotateCcwIcon, iconColor: "text-amber-500" },
  REVISION_REQUESTED: { label: "Revision Requested", description: "OEM requested a revision", icon: XCircleIcon, iconColor: "text-red-500" },
  APPROVED: { label: "Approved", description: "8D report approved", icon: CheckIcon, iconColor: "text-green-600" },
  OWNER_CHANGED: { label: "Owner Changed", description: "OEM owner changed", icon: UserIcon, iconColor: "text-slate-500" },
  SUPPLIER_ASSIGNEE_CHANGED: { label: "Assignee Changed", description: "Supplier assignee changed", icon: UserIcon, iconColor: "text-slate-500" },
  DUE_DATE_CHANGED: { label: "Due Date Changed", description: "SLA due date updated", icon: CalendarIcon, iconColor: "text-amber-500" },
  EVIDENCE_ADDED: { label: "Evidence Added", description: "Supporting evidence uploaded", icon: PaperclipIcon, iconColor: "text-blue-500" },
  EVIDENCE_REMOVED: { label: "Evidence Removed", description: "Evidence file removed", icon: TrashIcon, iconColor: "text-red-500" },
}