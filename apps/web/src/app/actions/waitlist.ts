"use server"

import { prisma } from "@/lib/prisma"
import { waitlistEmailSchema, zodToActionError } from "@/lib/validation"

export async function joinWaitlist(email: string, module: string) {
  const parsed = waitlistEmailSchema().safeParse(email)
  if (!parsed.success) {
    return zodToActionError(parsed.error, "Please enter a valid email address.")
  }

  try {
    await prisma.waitlist.create({
      data: { email: parsed.data, module },
    })
    return { success: true as const, module }
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      return { success: false as const, error: `You are already on the waitlist for ${module}!` }
    }
    console.error("[Waitlist] Unexpected error:", err)
    return { success: false as const, error: "Something went wrong. Please try again." }
  }
}
