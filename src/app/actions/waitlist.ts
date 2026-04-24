"use server"

import { prisma } from "@/lib/prisma"

export async function joinWaitlist(email: string, module: string) {
  if (!email || !email.includes("@")) {
    return { error: "Please enter a valid email address." }
  }

  try {
    await prisma.waitlist.create({
      data: { email, module },
    })
    return { success: true, module }
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      return { error: `You are already on the waitlist for ${module}!` }
    }
    console.error("[Waitlist] Unexpected error:", err)
    return { error: "Something went wrong. Please try again." }
  }
}
