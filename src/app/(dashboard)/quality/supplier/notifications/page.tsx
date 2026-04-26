import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { MarkAllAsReadButton } from "./mark-all-read-button"
import { getNotifications } from "@/app/(dashboard)/_actions/notifications"

export default async function SupplierNotificationsPage() {
  const session = await auth()
  if (!session || session.user.companyType !== "SUPPLIER") redirect("/login")

  const { notifications, unreadCount } = await getNotifications(1, 100)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
          </p>
        </div>
        {unreadCount > 0 && <MarkAllAsReadButton />}
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-3 rounded-lg border bg-card p-4 transition-colors ${
                !n.isRead ? "border-l-2 border-l-emerald-500 bg-emerald-500/5" : ""
              }`}
            >
              <div className="flex-1 min-w-0">
                {n.title && (
                  <p className={`text-sm ${!n.isRead ? "font-medium text-foreground" : "text-foreground"}`}>
                    {n.title}
                  </p>
                )}
                <p className={`text-sm ${!n.title && !n.isRead ? "font-medium" : ""} text-muted-foreground`}>
                  {n.message}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(n.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              {n.link && (
                <a
                  href={n.link}
                  className="shrink-0 rounded-md border border-border px-3 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                >
                  View
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}