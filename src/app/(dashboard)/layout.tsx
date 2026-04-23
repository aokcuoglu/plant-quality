import { auth, signOut } from "@/lib/auth"
import { redirect } from "next/navigation"
import {
  LayoutDashboardIcon,
  BugIcon,
  PlusCircleIcon,
  LogOutIcon,
  Building2Icon,
} from "lucide-react"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect("/login")

  const isOem = session.user.companyType === "OEM"

  const navItems = isOem
    ? [
        { href: "/oem", label: "Dashboard", icon: LayoutDashboardIcon },
        { href: "/oem/defects", label: "Defects", icon: BugIcon },
        { href: "/oem/defects/new", label: "Report Defect", icon: PlusCircleIcon },
      ]
    : [
        { href: "/supplier", label: "Dashboard", icon: LayoutDashboardIcon },
        { href: "/supplier/defects", label: "Defects", icon: BugIcon },
      ]

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 flex-col border-r bg-card">
        <div className="flex h-14 items-center gap-2.5 border-b px-5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-[10px] font-bold text-primary-foreground">
            PQ
          </div>
          <span className="text-sm font-semibold">PlantQuality</span>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => (
            <SidebarLink key={item.href} href={item.href} icon={item.icon} label={item.label} />
          ))}
        </nav>

        <div className="border-t p-3">
          <div className="flex items-center gap-3 rounded-md px-2 py-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
              {session.user.email?.charAt(0).toUpperCase() ?? "U"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{session.user.companyName}</p>
              <p className="truncate text-xs text-muted-foreground">{session.user.email}</p>
            </div>
          </div>
          <form
            action={async () => {
              "use server"
              await signOut()
            }}
            className="mt-1"
          >
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <LogOutIcon className="h-3.5 w-3.5" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b bg-card px-6">
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building2Icon className="h-4 w-4" />
            {session.user.companyName}
          </span>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}

function SidebarLink({
  href,
  icon: Icon,
  label,
}: {
  href: string
  icon: React.ComponentType<{ className?: string }>
  label: string
}) {
  return (
    <a
      href={href}
      className="group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-accent hover:text-accent-foreground data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:font-semibold"
      data-active={undefined}
      // Active detection via server is not possible with static links,
      // but we keep the data attribute for future enhancement
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </a>
  )
}
