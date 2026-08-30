import type { ReactNode } from "react"

function parseLine(line: string): ReactNode {
  const trimmed = line.trim()

  if (trimmed.startsWith("**") && trimmed.endsWith("**")) {
    return <strong>{trimmed.slice(2, -2)}</strong>
  }

  const parts: ReactNode[] = []
  let remaining = trimmed
  let key = 0

  while (remaining.length > 0) {
    const boldStart = remaining.indexOf("**")
    if (boldStart === -1) {
      parts.push(remaining)
      break
    }
    if (boldStart > 0) {
      parts.push(remaining.slice(0, boldStart))
    }
    const boldEnd = remaining.indexOf("**", boldStart + 2)
    if (boldEnd === -1) {
      parts.push(remaining.slice(boldStart))
      break
    }
    parts.push(<strong key={key++}>{remaining.slice(boldStart + 2, boldEnd)}</strong>)
    remaining = remaining.slice(boldEnd + 2)
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>
}

function parseLines(text: string): ReactNode[] {
  const blocks: ReactNode[] = []
  let key = 0

  text.split("\n").forEach((line) => {
    const trimmed = line.trim()

    if (trimmed === "") {
      blocks.push(<br key={key++} />)
      return
    }

    // Heading (###)
    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)/)
    if (headingMatch) {
      const level = headingMatch[1].length as 1 | 2 | 3
      const Tag = [`h1`, `h2`, `h3`][level - 1] as "h1" | "h2" | "h3"
      blocks.push(
        <Tag key={key++} className="font-semibold text-foreground mt-4 mb-1 first:mt-0">
          {headingMatch[2]}
        </Tag>,
      )
      return
    }

    // Unordered list item
    const listMatch = trimmed.match(/^[\*\-\+]\s+(.+)/)
    if (listMatch) {
      blocks.push(
        <li key={key++} className="ml-4 list-disc text-muted-foreground">
          {parseLine(listMatch[1])}
        </li>,
      )
      return
    }

    // Numbered list item
    const numMatch = trimmed.match(/^\d+\.\s+(.+)/)
    if (numMatch) {
      blocks.push(
        <li key={key++} className="ml-4 list-decimal text-muted-foreground">
          {parseLine(numMatch[1])}
        </li>,
      )
      return
    }

    // Inline code
    if (trimmed.startsWith("`") && trimmed.endsWith("`") && trimmed.length > 2) {
      blocks.push(
        <code key={key++} className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
          {trimmed.slice(1, -1)}
        </code>,
      )
      return
    }

    blocks.push(<div key={key++} className="text-muted-foreground">{parseLine(trimmed)}</div>)
  })

  return blocks
}

export function Markdown({ content }: { content: string }) {
  return <div className="space-y-0.5 text-sm leading-relaxed">{parseLines(content)}</div>
}
