import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getDefects } from "./queries"
import { PageHeader } from "@/components/layout/PageHeader"
import { StatusBadge } from "@/components/ui/status-badge"
import { Button } from "@/components/ui/button"
import { PlusIcon } from "lucide-react"

export default async function DefectsPage() {
  const session = await auth()
  if (!session || session.user.companyType !== "OEM") redirect("/login")

  const defects = await getDefects()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Defects"
        description="Manage quality defect reports"
        actions={
          <Link href="/oem/defects/new">
            <Button>
              <PlusIcon className="mr-1.5 h-4 w-4" />
              New Defect
            </Button>
          </Link>
        }
      />

      <div className="rounded-lg border bg-card">
        <table className="w-full caption-bottom text-sm">
          <thead>
            <tr className="border-b">
              <Th>Part Number</Th>
              <Th>Description</Th>
              <Th>Supplier</Th>
              <Th>Status</Th>
              <Th>Created</Th>
            </tr>
          </thead>
          <tbody>
            {defects.map((d) => (
              <tr key={d.id} className="border-b transition-colors hover:bg-muted/50 cursor-pointer">
                <Td className="font-mono text-xs">
                  <a href={`/oem/defects/${d.id}`} className="text-foreground hover:text-primary transition-colors">{d.partNumber}</a>
                </Td>
                <Td className="max-w-xs truncate">
                  <a href={`/oem/defects/${d.id}`} className="block text-muted-foreground hover:text-foreground transition-colors">{d.description}</a>
                </Td>
                <Td>
                  <a href={`/oem/defects/${d.id}`} className="block text-muted-foreground hover:text-foreground transition-colors">{d.supplierName}</a>
                </Td>
                <Td>
                  <StatusBadge status={d.status} />
                </Td>
                <Td className="text-muted-foreground">
                  {d.createdAt.toLocaleDateString()}
                </Td>
              </tr>
            ))}
            {defects.length === 0 && (
              <tr>
                <Td colSpan={5} className="py-16 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-sm">No defects reported yet.</p>
                    <Link href="/oem/defects/new" className="text-xs text-primary hover:underline">
                      Report your first defect
                    </Link>
                  </div>
                </Td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="h-11 px-3 text-left align-middle text-xs font-medium uppercase tracking-wider text-muted-foreground">
      {children}
    </th>
  )
}

function Td({ children, className, colSpan }: { children: React.ReactNode; className?: string; colSpan?: number }) {
  return (
    <td className={`p-3 align-middle whitespace-nowrap ${className ?? ""}`} colSpan={colSpan}>
      {children}
    </td>
  )
}
