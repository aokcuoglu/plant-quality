import Link from "next/link"
import { XIcon } from "lucide-react"

export function SupplierFilterBadge({ supplierName, clearHref }: { supplierName: string; clearHref: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted px-3 py-1.5 text-sm">
      <span className="text-muted-foreground">Filtered by</span>
      <span className="font-medium text-foreground">{supplierName}</span>
      <Link href={clearHref} className="ml-1 inline-flex items-center justify-center rounded-full p-0.5 text-muted-foreground hover:text-foreground transition-colors">
        <XIcon className="h-3.5 w-3.5" />
      </Link>
    </div>
  )
}