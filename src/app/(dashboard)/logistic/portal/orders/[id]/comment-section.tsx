"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { addPortalOrderComment } from "../../actions"

type Comment = {
  id: string
  content: string
  createdAt: Date
  author: {
    name: string | null
    email: string
    companyId: string | null
  }
}

export function PortalCommentSection({
  orderId,
  comments,
}: {
  orderId: string
  comments: Comment[]
}) {
  const router = useRouter()
  const [text, setText] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!text.trim()) return
    setSubmitting(true)
    setError(null)

    try {
      const result = await addPortalOrderComment(orderId, text)
      if ("error" in result && result.error) {
        setError(result.error)
      } else {
        setText("")
        router.refresh()
      }
    } catch {
      setError("Failed to send comment")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-foreground">
        Comments ({comments.length})
      </h3>

      {comments.length > 0 && (
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {comments.map((c) => (
            <div key={c.id} className="rounded-lg border border-border bg-muted/50 p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-foreground">
                  {c.author.name || c.author.email}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(c.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {c.content}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a comment..."
          rows={3}
          className="min-h-[80px]"
        />
        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}
        <Button
          onClick={handleSubmit}
          disabled={submitting || !text.trim()}
          size="sm"
          variant="outline"
        >
          <MessageSquare className="h-4 w-4 mr-1.5" />
          {submitting ? "Sending..." : "Send"}
        </Button>
      </div>
    </div>
  )
}
