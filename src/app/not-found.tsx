import Link from "next/link"
import { ArrowLeft, SearchX } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="min-h-dvh bg-background text-foreground flex items-center justify-center p-4">
      <div className="mx-auto max-w-sm text-center space-y-5">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
          <SearchX className="h-7 w-7 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold">Page not found</h2>
        <p className="text-sm text-muted-foreground">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link href="/">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Go back
          </Button>
        </Link>
      </div>
    </div>
  )
}
