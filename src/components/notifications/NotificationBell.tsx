"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { BellIcon, InfoIcon, AlertTriangleIcon, GitPullRequestIcon, ClockIcon, FileTextIcon, ClipboardCheckIcon, ShieldAlertIcon, XCircleIcon, BugIcon, MessageSquareIcon, TrendingUpIcon, CheckCheckIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { NotificationType } from "@/generated/prisma/client"

type Notification = {
  id: string
  title: string | null
  message: string
  type: NotificationType
  link: string | null
  isRead: boolean
  createdAt: Date
}

export function NotificationBell({
  initialNotifications,
  initialUnreadCount,
}: {
  initialNotifications?: Notification[]
  initialUnreadCount?: number
}) {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications ?? [])
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount ?? 0)
  const [markingAll, setMarkingAll] = useState(false)
  const router = useRouter()
  const ref = useRef<HTMLDivElement>(null)

  const typeIcon = (type: NotificationType) => {
    switch (type) {
      case "NEW_DEFECT":
        return <AlertTriangleIcon className="h-3.5 w-3.5 text-destructive shrink-0" />
      case "SLA_DUE_SOON":
        return <ClockIcon className="h-3.5 w-3.5 text-amber-500 shrink-0" />
      case "SLA_ESCALATION":
        return <AlertTriangleIcon className="h-3.5 w-3.5 text-red-500 shrink-0" />
      case "REVISION":
        return <GitPullRequestIcon className="h-3.5 w-3.5 text-amber-500 shrink-0" />
      case "PPAP_REQUIRED":
        return <FileTextIcon className="h-3.5 w-3.5 text-blue-500 shrink-0" />
      case "PPAP_SUBMITTED":
        return <FileTextIcon className="h-3.5 w-3.5 text-green-500 shrink-0" />
      case "PPAP_APPROVED":
        return <FileTextIcon className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
      case "PPAP_REJECTED":
        return <XCircleIcon className="h-3.5 w-3.5 text-red-500 shrink-0" />
      case "IQC_FAILED":
        return <ClipboardCheckIcon className="h-3.5 w-3.5 text-red-500 shrink-0" />
      case "FMEA_HIGH_RPN":
        return <ShieldAlertIcon className="h-3.5 w-3.5 text-amber-500 shrink-0" />
      case "FIELD_DEFECT_CREATED":
        return <BugIcon className="h-3.5 w-3.5 text-blue-500 shrink-0" />
      case "FIELD_DEFECT_ASSIGNED":
        return <InfoIcon className="h-3.5 w-3.5 text-blue-500 shrink-0" />
      case "FIELD_DEFECT_CONVERTED_TO_8D":
        return <TrendingUpIcon className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
      case "FIELD_DEFECT_OVERDUE":
        return <ClockIcon className="h-3.5 w-3.5 text-destructive shrink-0" />
      case "FIELD_DEFECT_ESCALATED":
        return <AlertTriangleIcon className="h-3.5 w-3.5 text-orange-500 shrink-0" />
      case "FIELD_DEFECT_STATUS_CHANGED":
        return <InfoIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      case "EIGHT_D_OVERDUE":
        return <ClockIcon className="h-3.5 w-3.5 text-destructive shrink-0" />
      case "EIGHT_D_ESCALATED":
        return <AlertTriangleIcon className="h-3.5 w-3.5 text-orange-500 shrink-0" />
      case "COMMENT_ADDED":
        return <MessageSquareIcon className="h-3.5 w-3.5 text-blue-500 shrink-0" />
      default:
        return <InfoIcon className="h-3.5 w-3.5 text-blue-500 shrink-0" />
    }
  }

  const handleClick = useCallback(
    async (notification: Notification) => {
      if (!notification.isRead) {
        const { markAsRead } = await import("@/app/(dashboard)/_actions/notifications")
        await markAsRead(notification.id)
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
        )
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
      setOpen(false)
      if (notification.link) {
        router.push(notification.link)
      } else {
        router.refresh()
      }
    },
    [router]
  )

  const handleMarkAllRead = useCallback(async () => {
    setMarkingAll(true)
    const { markAllAsRead } = await import("@/app/(dashboard)/_actions/notifications")
    await markAllAsRead()
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    setUnreadCount(0)
    setMarkingAll(false)
    router.refresh()
  }, [router])

  useEffect(() => {
    if (!initialNotifications) {
      import("@/app/(dashboard)/_actions/notifications").then(({ getNotifications }) =>
        getNotifications().then((data) => {
          setNotifications(data.notifications)
          setUnreadCount(data.unreadCount)
        })
      )
    }
  }, [initialNotifications])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        aria-label="Notifications"
      >
        <BellIcon className="h-4 w-4" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </Badge>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-80 rounded-lg border bg-popover text-popover-foreground shadow-lg">
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <span className="text-sm font-medium">Notifications</span>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  disabled={markingAll}
                  className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 disabled:opacity-50 transition-colors"
                >
                  <CheckCheckIcon className="h-3 w-3" />
                  {markingAll ? "Marking..." : "Mark all read"}
                </button>
              )}
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-1 px-4 py-8 text-center">
                <BellIcon className="h-5 w-5 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No notifications</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleClick(notification)}
                  className={cn(
                    "flex w-full gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-accent cursor-pointer",
                    !notification.isRead && "bg-accent/50"
                  )}
                >
                  {typeIcon(notification.type)}
                  <div className="flex-1 min-w-0">
                    {notification.title && (
                      <p className={cn(
                        "text-sm line-clamp-1",
                        !notification.isRead && "font-medium"
                      )}>
                        {notification.title}
                      </p>
                    )}
                    <p
                      className={cn(
                        "line-clamp-2",
                        !notification.isRead && !notification.title && "font-medium"
                      )}
                    >
                      {notification.message}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatRelativeTime(notification.createdAt)}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - new Date(date).getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`

  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`

  return new Date(date).toLocaleDateString()
}