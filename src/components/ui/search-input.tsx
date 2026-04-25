"use client"

import { useRef, useCallback } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { SearchIcon, XIcon } from "lucide-react"

interface SearchInputProps {
  placeholder?: string
  preserveParams?: string[]
}

export function SearchInput({ placeholder = "Search…", preserveParams = ["filter"] }: SearchInputProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentSearch = searchParams.get("q") ?? ""

  const navigate = useCallback(
    (newSearch: string) => {
      const sp = new URLSearchParams()
      for (const key of preserveParams) {
        const val = searchParams.get(key)
        if (val) sp.set(key, val)
      }
      if (newSearch) sp.set("q", newSearch)
      const qs = sp.toString()
      router.push(qs ? `${pathname}?${qs}` : pathname)
    },
    [router, pathname, searchParams, preserveParams],
  )

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      navigate(v)
    }, 300)
  }

  const handleClear = () => {
    navigate("")
    inputRef.current?.focus()
  }

  return (
    <div className="relative">
      <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        ref={inputRef}
        type="search"
        defaultValue={currentSearch}
        onChange={handleChange}
        placeholder={placeholder}
        className="h-9 w-full rounded-md border bg-transparent pl-9 pr-9 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
      {currentSearch && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <XIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}