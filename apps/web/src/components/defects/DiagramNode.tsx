"use client"

import { useState } from "react"
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react"
import { PlusIcon, BugIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export type DiagramNodeType = Node<DiagramNodeData, "diagramNode">

const DEPTH_COLORS = [
  { border: "border-border", bg: "bg-blue-50", ring: "ring-border", text: "text-foreground" },
  { border: "border-sky-400", bg: "bg-sky-50", ring: "ring-sky-400/30", text: "text-sky-700" },
  { border: "border-amber-400", bg: "bg-amber-50", ring: "ring-amber-400/30", text: "text-destructive" },
  { border: "border-rose-400", bg: "bg-muted", ring: "ring-rose-400/30", text: "text-destructive" },
  { border: "border-violet-400", bg: "bg-violet-50", ring: "ring-violet-400/30", text: "text-violet-700" },
]

export type DiagramNodeData = {
  label: string
  depth: number
  onAddChild: (parentId: string) => void
  isLeaf: boolean
  isRoot?: boolean
  contribution?: number
}

export function DiagramNode({ id, data }: NodeProps<DiagramNodeType>) {
  const [hovered, setHovered] = useState(false)
  const colors = DEPTH_COLORS[data.depth] ?? DEPTH_COLORS[DEPTH_COLORS.length - 1]

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "relative rounded-xl border-2 px-4 py-3 shadow-sm transition-shadow hover:shadow-md min-w-[160px] max-w-[240px]",
        colors.border,
        colors.bg,
      )}
    >
      <Handle type="target" position={Position.Top} className="!border-2 !border-border !bg-card !size-3" />

      <div className="flex items-start gap-2">
        {data.isRoot && <BugIcon className={cn("mt-0.5 size-4 shrink-0", colors.text)} />}
        <p className={cn("text-xs leading-snug font-medium", colors.text)}>
          {data.isRoot ? "The Problem" : "Why?"}
          <span className="ml-1.5 font-normal text-muted-foreground">{data.label}</span>
        </p>
      </div>

      {data.isLeaf && hovered && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); data.onAddChild(id) }}
          className={cn(
            "absolute -bottom-3 left-1/2 -translate-x-1/2 flex size-6 items-center justify-center rounded-full border-2 border-border bg-card shadow-sm transition-all hover:scale-110 hover:border-border hover:bg-muted",
            colors.ring,
          )}
          title="Add Why?"
        >
          <PlusIcon className="size-3.5 text-muted-foreground" />
        </button>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className={cn("!border-2 !border-border !bg-card !size-3", data.isLeaf ? "!visible" : "!invisible")}
      />
    </div>
  )
}
