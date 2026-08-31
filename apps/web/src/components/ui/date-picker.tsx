"use client"

import { Input } from "@/components/ui/input"

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
  defaultValue,
  name,
  id,
  placeholder = "Select date",
  variant = "default",
  className,
  onKeyDown,
  inputRef,
  disabled,
  minDate,
  clearable = true,
}: {
  value?: string
  onChange?: (date: string) => void
  defaultValue?: string
  name?: string
  id?: string
  placeholder?: string
  variant?: "default" | "table"
  className?: string
  onKeyDown?: (e: React.KeyboardEvent) => void
  inputRef?: (el: HTMLButtonElement | null) => void
  disabled?: boolean
  minDate?: string
  clearable?: boolean
}) {
  const controlled = value !== undefined
  const [internal, setInternal] = useState(defaultValue ?? "")
  const resolved = controlled ? value : internal

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
    document.addEventListener("click", handleClick)
    return () => document.removeEventListener("click", handleClick)
  }, [])

  const date = resolved ? new Date(resolved) : undefined
  const minimumDate = minDate ? new Date(`${minDate}T00:00:00`) : undefined
  const updateDropdownPosition = useCallback(() => {
    if (!buttonRef.current) return

    const rect = buttonRef.current.getBoundingClientRect()
    const estimatedHeight = 340
    const estimatedWidth = 292
    const margin = 8
    const openAbove = rect.bottom + estimatedHeight + margin > window.innerHeight && rect.top > estimatedHeight
    const top = openAbove
      ? Math.max(margin, rect.top - estimatedHeight - 4)
      : Math.min(rect.bottom + 4, window.innerHeight - estimatedHeight - margin)
    const left = Math.min(rect.left, window.innerWidth - estimatedWidth - margin)

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

  const commit = (dateStr: string) => {
    if (!controlled) setInternal(dateStr)
    onChange?.(dateStr)
  }

  return (
    <div ref={ref} className="relative">
      {name && <Input type="hidden" name={name} value={resolved} />}
      <Button
        ref={(el) => {
          buttonRef.current = el
          inputRef?.(el)
        }}
        type="button"
        variant="outline"
        size="sm"
        id={id}
        disabled={disabled}
        onKeyDown={onKeyDown}
        className={cn(
          variant === "table"
            ? "h-auto w-full justify-start rounded-none border-0 bg-transparent px-2 py-2 text-sm font-normal text-foreground shadow-none outline-none disabled:opacity-60 hover:bg-transparent focus-visible:bg-muted/40 focus-visible:ring-0"
            : "h-10 w-full justify-start px-3 py-2 text-sm font-normal",
          !date && "text-muted-foreground",
          className,
        )}
        onClick={() => {
          if (disabled) return
          if (!open) updateDropdownPosition()
          setOpen(!open)
        }}
      >
        <CalendarIcon className={cn("h-3.5 w-3.5", variant === "table" ? "mr-2" : "mr-1")} />
        {date ? format(date, "MMM d, yyyy") : placeholder}
      </Button>
      {open && createPortal(
        <div
          ref={dropdownRef}
          style={{ ...dropdownStyle, width: "288px" }}
          className="rounded-md border bg-popover shadow-lg"
        >
          <Calendar
            mode="single"
            className="w-full"
            selected={date}
            disabled={minimumDate ? { before: minimumDate } : undefined}
            onSelect={(d) => {
              commit(d ? format(d, "yyyy-MM-dd") : "")
              setOpen(false)
            }}
            autoFocus
          />
          {clearable && <div className="border-t px-3 py-2">
            <Button
              type="button"
              variant="ghost"
              className="w-full rounded-md px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
              onClick={() => {
                commit("")
                setOpen(false)
              }}
            >
              Clear
            </Button>
          </div>}
        </div>,
        document.body
      )}
    </div>
  )
}
