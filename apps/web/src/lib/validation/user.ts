import { z } from "zod"
import { emailLocalPartSchema, emailSchema, type EmailMessages } from "./email"

export const COMPANY_USER_ROLES = ["ADMIN", "EDITOR", "VIEWER"] as const
export type CompanyUserRole = (typeof COMPANY_USER_ROLES)[number]

export const PLAN_VALUES = ["FREE", "BASIC", "PRO", "ENTERPRISE"] as const

export type UserFieldMessages = EmailMessages & {
  nameRequired: string
  roleInvalid: string
  companyNameRequired?: string
  oemRequired?: string
}

const DEFAULT_USER_MESSAGES: UserFieldMessages = {
  invalid: "Enter a valid email address",
  localPartInvalid: "Enter the part before @ (e.g. first.last)",
  required: "Required",
  nameRequired: "Full name is required",
  roleInvalid: "Select a valid role",
  companyNameRequired: "Company name is required",
  oemRequired: "OEM is required",
}

export function roleSchema(message?: string) {
  return z.enum(COMPANY_USER_ROLES, {
    error: message ?? DEFAULT_USER_MESSAGES.roleInvalid,
  })
}

export function addCompanyUserSchema(messages: Partial<UserFieldMessages> = {}) {
  const m = { ...DEFAULT_USER_MESSAGES, ...messages }
  return z
    .object({
      name: z.string().trim().min(1, { error: m.nameRequired }),
      email: emailSchema(m),
      role: roleSchema(m.roleInvalid),
      modules: z.array(z.string()).optional().default([]),
      orgUnitId: z.string().trim().min(1).nullable().optional(),
    })
    .superRefine((data, ctx) => {
      // Company mailbox local-part: same rules as domain-fixed UI (max one `.`).
      const localPart = data.email.split("@")[0] ?? ""
      const localResult = emailLocalPartSchema(m).safeParse(localPart)
      if (!localResult.success) {
        ctx.addIssue({
          code: "custom",
          path: ["email"],
          message: localResult.error.issues[0]?.message ?? m.localPartInvalid,
        })
      }
    })
}

export function addSupplierAdminSchema(messages: Partial<UserFieldMessages> = {}) {
  const m = { ...DEFAULT_USER_MESSAGES, ...messages }
  return z.object({
    companyName: z.string().trim().min(1, { error: m.companyNameRequired }),
    adminName: z.string().trim().min(1, { error: m.nameRequired }),
    adminEmail: emailSchema(m),
    oemId: z.string().trim().min(1, { error: m.oemRequired }),
    taxNumber: z.string().trim().optional().nullable(),
    plan: z.enum(PLAN_VALUES).default("FREE"),
  })
}

export function addSupplierUserSchema(messages: Partial<UserFieldMessages> = {}) {
  const m = { ...DEFAULT_USER_MESSAGES, ...messages }
  return z.object({
    companyId: z.string().trim().min(1, { error: m.required ?? "Required" }),
    name: z.string().trim().min(1, { error: m.nameRequired }),
    email: emailSchema(m),
    role: roleSchema(m.roleInvalid).default("VIEWER"),
  })
}

export function waitlistEmailSchema(messages: Partial<EmailMessages> = {}) {
  return emailSchema(messages)
}
