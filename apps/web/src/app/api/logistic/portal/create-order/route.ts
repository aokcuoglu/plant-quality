import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isPortalUser } from "@/lib/logistic/portal-access"
import { revalidatePath } from "next/cache"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  const { companyId, companyType } = session.user
  if (!isPortalUser(companyType)) return NextResponse.json({ error: "Access denied" }, { status: 403 })

  const formData = await request.formData()

  const oemId = formData.get("oemId") as string | null
  const customerName = formData.get("customerName") as string | null
  const vehicleModel = formData.get("vehicleModel") as string | null
  const vehicleType = formData.get("vehicleType") as string | null
  const quantityStr = formData.get("quantity") as string | null
  const priority = (formData.get("priority") as string) || "NORMAL"
  const country = formData.get("country") as string | null
  const market = formData.get("market") as string | null
  const vehicleVariant = formData.get("vehicleVariant") as string | null
  const powertrain = (formData.get("powertrain") as string) || null
  const requestedDeliveryDate = formData.get("requestedDeliveryDate") as string | null
  const notes = (formData.get("notes") as string) || null

  if (!oemId || !customerName || !vehicleModel || !vehicleType || !quantityStr) {
    return NextResponse.json({ error: "Required fields missing: OEM, customer name, vehicle model, vehicle type, quantity" }, { status: 400 })
  }

  const quantity = parseInt(quantityStr, 10)
  if (isNaN(quantity) || quantity < 1) return NextResponse.json({ error: "Quantity must be a positive number" }, { status: 400 })

  const oem = await prisma.company.findFirst({
    where: { id: oemId, type: "OEM" },
    select: { id: true },
  })
  if (!oem) return NextResponse.json({ error: "Selected OEM not found" }, { status: 400 })

  const last = await prisma.plantLogisticOrder.findFirst({
    where: { companyId: oem.id },
    orderBy: { orderNumber: "desc" },
    select: { orderNumber: true },
  })
  const lastNum = last ? parseInt(last.orderNumber.replace("LO-", ""), 10) : 0
  const orderNumber = `LO-${String(lastNum + 1).padStart(5, "0")}`

  const order = await prisma.plantLogisticOrder.create({
    data: {
      companyId: oem.id,
      orderNumber,
      customerName,
      customerType: "CUSTOMER",
      vehicleModel,
      vehicleType: vehicleType as "BUS",
      quantity,
      priority: priority as "NORMAL",
      status: "DRAFT",
      dealerCompanyId: companyId,
      dealerName: session.user.companyName ?? null,
      externalVisible: false,
      country: country || null,
      market: market || null,
      vehicleVariant: vehicleVariant || null,
      powertrain: (["DIESEL", "CNG", "ELECTRIC", "HYBRID", "OTHER"].includes(powertrain || "") ? powertrain : null) as "DIESEL" | null,
      requestedDeliveryDate: requestedDeliveryDate ? new Date(requestedDeliveryDate) : null,
      notes,
      createdById: session.user.id,
    },
  })

  await prisma.plantLogisticOrderEvent.create({
    data: {
      orderId: order.id,
      companyId: oem.id,
      actorId: session.user.id,
      eventType: "ORDER_CREATED",
      message: `Order created by ${companyType.toLowerCase()} ${session.user.companyName}`,
    },
  })

  revalidatePath("/logistic/portal")
  revalidatePath("/logistic/portal/orders")
  revalidatePath("/logistic")
  revalidatePath("/logistic/orders")

  return NextResponse.json({ data: { id: order.id, orderNumber: order.orderNumber } })
}