"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"

export function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
}: {
  value: string
  onChange: (date: string) => void
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node
      const isInside =
        ref.current?.contains(target) ||
        buttonRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      if (!isInside) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const date = value ? new Date(value) : undefined
  const updateDropdownPosition = useCallback(() => {
    if (!buttonRef.current) return

    const rect = buttonRef.current.getBoundingClientRect()
    const estimatedHeight = 330
    const margin = 8
    const openAbove = rect.bottom + estimatedHeight + margin > window.innerHeight && rect.top > estimatedHeight
    const top = openAbove
      ? Math.max(margin, rect.top - estimatedHeight - 4)
      : Math.min(rect.bottom + 4, window.innerHeight - estimatedHeight - margin)
    const left = Math.min(rect.left, window.innerWidth - 292 - margin)

    setDropdownStyle({
      position: "fixed",
      top: `${top}px`,
      left: `${Math.max(margin, left)}px`,
      zIndex: 10000,
    })
  }, [])

  useEffect(() => {
    if (!open) return

    updateDropdownPosition()
    window.addEventListener("resize", updateDropdownPosition)
    window.addEventListener("scroll", updateDropdownPosition, true)
    return () => {
      window.removeEventListener("resize", updateDropdownPosition)
      window.removeEventListener("scroll", updateDropdownPosition, true)
    }
  }, [open, updateDropdownPosition])

  return (
    <div ref={ref} className="relative">
      <Button
        ref={buttonRef}
        type="button"
        variant="outline"
        size="sm"
        className={cn(
          "w-full justify-start text-left font-normal",
          !date && "text-muted-foreground",
        )}
        onClick={() => {
          if (!open) updateDropdownPosition()
          setOpen(!open)
        }}
      >
        <CalendarIcon className="mr-1 h-3.5 w-3.5" />
        {date ? format(date, "MMM d, yyyy") : placeholder}
      </Button>
      {open && createPortal(
        <div
          ref={dropdownRef}
          style={{ ...dropdownStyle, minWidth: "280px" }}
          className="max-h-[min(330px,calc(100vh-16px))] overflow-auto rounded-md border bg-popover shadow-lg"
        >
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => {
              onChange(d ? format(d, "yyyy-MM-dd") : "")
              setOpen(false)
            }}
            autoFocus
          />
        </div>,
        document.body
      )}
    </div>
  )
}
