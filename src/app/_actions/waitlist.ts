"use server"

export async function joinWaitlist(formData: FormData) {
  const email = formData.get("email") as string
  const brand = formData.get("brand") as string

  if (!email || !email.includes("@")) {
    return { error: "Please enter a valid email address." }
  }

  console.log(`[Waitlist] ${email} joined waitlist for ${brand}`)

  return { success: true }
}
