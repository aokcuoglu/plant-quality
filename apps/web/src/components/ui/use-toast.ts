"use client"

import { useState, useCallback } from "react"

type ToastType = "default" | "destructive" | "info"

type Toast = {
  id: string
  title: string
  description?: string
  type?: ToastType
}

let toastListeners: ((toast: Toast) => void)[] = []

export function toast({
  title,
  description,
  type = "default",
}: {
  title: string
  description?: string
  type?: ToastType
}) {
  const id = crypto.randomUUID()
  const t: Toast = { id, title, description, type }
  toastListeners.forEach((fn) => fn(t))
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((t: Toast) => {
    setToasts((prev) => (prev.some((x) => x.id === t.id) ? prev : [...prev, t]))
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== t.id))
    }, 4000)
  }, [])

  useState(() => {
    toastListeners.push(addToast)
    return () => {
      toastListeners = toastListeners.filter((fn) => fn !== addToast)
    }
  })

  return { toasts }
}
