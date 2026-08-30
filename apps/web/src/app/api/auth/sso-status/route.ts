import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    microsoftEnabled: Boolean(process.env.AUTH_AZURE_AD_ID),
  })
}
