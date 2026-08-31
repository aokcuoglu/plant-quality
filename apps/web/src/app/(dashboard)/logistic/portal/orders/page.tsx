import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { isPortalUser } from "@/lib/logistic/portal-access"
import { getPortalOrders } from "../actions"
import { labelForExternalStatus, colorForExternalStatus, labelForExternalDispatchStatus } from "@/lib/logistic/external-status"
import Link from "next/link"

export default async function PortalOrdersPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!isPortalUser(session.user.companyType)) redirect("/logistic")

  const result = await getPortalOrders()
  const orders = "data" in result ? result.data : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">My Orders</h1>
        <p className="text-sm text-muted-foreground">Track your vehicle orders and delivery status.</p>
      </div>

      {!orders || orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <PackageIcon className="size-12 text-muted-foreground/30" />
          <p className="mt-4 text-sm text-muted-foreground">No orders visible to your account yet.</p>
          <p className="text-xs text-muted-foreground">Contact your OEM for order assignment.</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table className="w-full text-sm">
              <TableHeader>
                <TableRow className="border-b bg-muted/50">
                  <TableHead className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Order No</TableHead>
                  <TableHead className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Vehicle</TableHead>
                  <TableHead className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Qty</TableHead>
                  <TableHead className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</TableHead>
                  <TableHead className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Delivery ETA</TableHead>
                  <TableHead className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Dispatch</TableHead>
                  <TableHead className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y">
                {orders.map((order) => (
                  <TableRow key={order.id} className="transition-colors hover:bg-muted/30">
                    <TableCell className="whitespace-nowrap px-4 py-3">
                      <Link href={`/logistic/portal/orders/${order.id}`} className="font-medium text-foreground hover:text-foreground transition-colors">
                        {order.orderNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {order.vehicleModel}{order.vehicleVariant ? ` ${order.vehicleVariant}` : ""}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-4 py-3 text-muted-foreground">{order.quantity}</TableCell>
                    <TableCell className="whitespace-nowrap px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colorForExternalStatus(order.externalStatus)}`}>
                        {labelForExternalStatus(order.externalStatus)}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {order.plannedDeliveryDate
                        ? new Date(order.plannedDeliveryDate).toLocaleDateString()
                        : order.latestDispatch?.estimatedArrivalDate
                          ? new Date(order.latestDispatch.estimatedArrivalDate).toLocaleDateString()
                          : "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {order.latestDispatch
                        ? labelForExternalDispatchStatus(order.latestDispatch.status)
                        : "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {new Date(order.updatedAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  )
}

function PackageIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m7.5 4.27 9 5.15" /><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" />
    </svg>
  )
}