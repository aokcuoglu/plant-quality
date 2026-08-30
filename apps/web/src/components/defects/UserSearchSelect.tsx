"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { createPortal } from "react-dom"
import { CheckIcon, ChevronsUpDownIcon, Loader2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface UserOption {
  id: string
  name: string
  email: string
}

export function UserSearchSelect({
  value,
  onSelect,
  placeholder = "Select user...",
  excludeIds,
  selectedName,
}: {
  value: string
  onSelect: (userId: string, userName: string) => void
  placeholder?: string
  excludeIds?: string[]
  selectedName?: string
}) {
  const [open, setOpen] = useState(false)
  const [users, setUsers] = useState<UserOption[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const ref = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})

  const loadingRef = useRef(false)

  const fetchUsers = useCallback(() => {
    if (loadingRef.current) return
    loadingRef.current = true
    setLoading(true)
    fetch("/api/users/search")
      .then((r) => r.json())
      .then((data) => setUsers(data.users ?? []))
      .catch(() => {})
      .finally(() => {
        setLoading(false)
        loadingRef.current = false
      })
  }, [])

  useEffect(() => {
    if (open && users.length === 0) {
      fetchUsers()
    }
  }, [open, users.length, fetchUsers])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node
      const isInside =
        ref.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      if (!isInside) {
        setOpen(false)
      }
    }
    document.addEventListener("click", handleClick)
    return () => document.removeEventListener("click", handleClick)
  }, [])

  const filtered = users.filter((u) => {
    if (excludeIds?.includes(u.id)) return false
    if (!search) return true
    const q = search.toLowerCase()
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
  })

  const selectedUser = selectedName
    ? { id: value, name: selectedName, email: "" }
    : users.find((u) => u.id === value)

  return (
    <div ref={ref} className="relative">
      <Button
        ref={buttonRef}
        type="button"
        variant="outline"
        size="sm"
        className="w-full justify-between text-left font-normal"
        onClick={() => {
          if (!open && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect()
            setDropdownStyle({
              position: "fixed",
              top: `${rect.bottom + 4}px`,
              left: `${rect.left}px`,
              width: `${rect.width}px`,
              zIndex: 9999,
            })
          }
          setOpen(!open)
        }}
      >
        {selectedUser ? (
          <span className="truncate">{selectedUser.name}</span>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
        <ChevronsUpDownIcon className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
      </Button>
      {open && createPortal(
        <div style={{ ...dropdownStyle, minWidth: "240px", width: "auto" }} className="rounded-md border bg-popover shadow-md">
          <div className="border-b p-1.5">
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users..."
              className="w-full rounded-md bg-transparent px-2 py-1 text-xs outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="max-h-48 overflow-auto p-1">
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2Icon className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="py-2 text-center text-xs text-muted-foreground">No users found</p>
            ) : (
              filtered.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-accent",
                    value === user.id && "bg-accent",
                  )}
                  onClick={() => {
                    onSelect(user.id, user.name)
                    setOpen(false)
                    setSearch("")
                  }}
                >
                  <CheckIcon
                    className={cn("h-3.5 w-3.5", value === user.id ? "opacity-100" : "opacity-0")}
                  />
                  <div className="flex flex-col items-start">
                    <span>{user.name}</span>
                    <span className="text-[10px] text-muted-foreground">{user.email}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
