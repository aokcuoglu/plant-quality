import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { acceptSuggestion } from "@/app/(dashboard)/field/ai-actions"

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; suggestionId: string }> },
) {
  const session = await auth()
  if (!session?.user?.companyId || session.user.companyType !== "OEM") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id, suggestionId } = await params
  const result = await acceptSuggestion(suggestionId, id)

  if (!result.ok) {
    const status = result.error === "Unauthorized" ? 403 : 400
    return NextResponse.json({ error: result.error }, { status })
  }

  return NextResponse.json(result)
}