"use client"

import { useState, useRef, useEffect } from "react"
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
          if (!open && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect()
            setDropdownStyle({
              position: "fixed",
              top: `${rect.bottom + 4}px`,
              left: `${rect.left}px`,
              zIndex: 9999,
            })
          }
          setOpen(!open)
        }}
      >
        <CalendarIcon className="mr-1 h-3.5 w-3.5" />
        {date ? format(date, "MMM d, yyyy") : placeholder}
      </Button>
      {open && createPortal(
        <div ref={dropdownRef} style={{ ...dropdownStyle, minWidth: "280px" }} className="rounded-md border bg-popover shadow-md">
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
