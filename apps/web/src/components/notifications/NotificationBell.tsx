"use client"

import { Button } from "@/components/ui/button"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { BellIcon, InfoIcon, AlertTriangleIcon, GitPullRequestIcon, ClockIcon, FileTextIcon, ClipboardCheckIcon, ShieldAlertIcon, XCircleIcon, BugIcon, MessageSquareIcon, TrendingUpIcon, CheckCheckIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { NotificationType } from "@plantx/db/client"
import { useTranslations } from "@/i18n/context"
import type { Translator } from "@/i18n/types"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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
  const t = useTranslations()

  const typeIcon = (type: NotificationType) => {
    switch (type) {
      case "NEW_DEFECT":
        return <AlertTriangleIcon className="h-3.5 w-3.5 text-destructive shrink-0" />
      case "SLA_DUE_SOON":
        return <ClockIcon className="h-3.5 w-3.5 text-destructive shrink-0" />
      case "SLA_ESCALATION":
        return <AlertTriangleIcon className="h-3.5 w-3.5 text-destructive shrink-0" />
      case "REVISION":
        return <GitPullRequestIcon className="h-3.5 w-3.5 text-destructive shrink-0" />
      case "PPAP_REQUIRED":
        return <FileTextIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      case "PPAP_SUBMITTED":
        return <FileTextIcon className="h-3.5 w-3.5 text-foreground shrink-0" />
      case "PPAP_APPROVED":
        return <FileTextIcon className="h-3.5 w-3.5 text-foreground shrink-0" />
      case "PPAP_REJECTED":
        return <XCircleIcon className="h-3.5 w-3.5 text-destructive shrink-0" />
      case "IQC_FAILED":
        return <ClipboardCheckIcon className="h-3.5 w-3.5 text-destructive shrink-0" />
      case "FMEA_HIGH_RPN":
        return <ShieldAlertIcon className="h-3.5 w-3.5 text-destructive shrink-0" />
      case "FIELD_DEFECT_CREATED":
        return <BugIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      case "FIELD_DEFECT_ASSIGNED":
        return <InfoIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      case "FIELD_DEFECT_CONVERTED_TO_8D":
        return <TrendingUpIcon className="h-3.5 w-3.5 text-foreground shrink-0" />
      case "FIELD_DEFECT_OVERDUE":
        return <ClockIcon className="h-3.5 w-3.5 text-destructive shrink-0" />
      case "FIELD_DEFECT_ESCALATED":
        return <AlertTriangleIcon className="h-3.5 w-3.5 text-destructive shrink-0" />
      case "FIELD_DEFECT_STATUS_CHANGED":
        return <InfoIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      case "EIGHT_D_OVERDUE":
        return <ClockIcon className="h-3.5 w-3.5 text-destructive shrink-0" />
      case "EIGHT_D_ESCALATED":
        return <AlertTriangleIcon className="h-3.5 w-3.5 text-destructive shrink-0" />
      case "COMMENT_ADDED":
        return <MessageSquareIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      default:
        return <InfoIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
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

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="relative text-muted-foreground"
            aria-label={t("shell.notifications.title")}
          />
        }
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
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={8} className="w-80 p-0">
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <span className="text-sm font-medium">{t("shell.notifications.title")}</span>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button
                  onClick={handleMarkAllRead}
                  disabled={markingAll}
                  variant="ghost" className="flex items-center gap-1 text-xs text-foreground hover:text-foreground   disabled:opacity-50 transition-colors"
                >
                  <CheckCheckIcon className="h-3 w-3" />
                  {markingAll ? t("shell.notifications.marking") : t("shell.notifications.markAllRead")}
                </Button>
              )}
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-1 px-4 py-8 text-center">
                <BellIcon className="h-5 w-5 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">{t("shell.notifications.empty")}</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  onClick={() => void handleClick(notification)}
                  className={cn(
                    "flex w-full cursor-pointer items-start gap-3 rounded-none px-4 py-3 text-left text-sm",
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
                      {formatRelativeTime(notification.createdAt, t)}
                    </p>
                  </div>
                </DropdownMenuItem>
              ))
            )}
          </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function formatRelativeTime(date: Date, t: Translator): string {
  const now = new Date()
  const diffMs = now.getTime() - new Date(date).getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return t("shell.notifications.justNow")
  if (diffMins < 60) return t("shell.notifications.minutesAgo", { value: diffMins })

  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return t("shell.notifications.hoursAgo", { value: diffHours })

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return t("shell.notifications.daysAgo", { value: diffDays })

  return new Date(date).toLocaleDateString()
}
