"use client"

import { useState, useEffect } from "react"
import { signIn } from "next-auth/react"
import { ArrowRight, Terminal } from "lucide-react"

interface Props {
  redirectTo?: string
}

export function DevLoginForm({ redirectTo }: Props) {
  const [accounts, setAccounts] = useState<{ email: string; label: string }[]>([])
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    fetch("/api/dev/users")
      .then((r) => r.json())
      .then((data) => {
        setAccounts(data.users)
        if (data.users.length > 0) setEmail(data.users[0].email)
        setReady(true)
      })
      .catch(console.error)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await signIn("credentials", {
      email,
      redirect: true,
      callbackUrl: redirectTo && redirectTo !== "/" ? redirectTo : "/quality/oem",
    })
    // redirect: true causes browser navigation; this line typically isn't reached.
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground flex items-center gap-2">
          <Terminal className="size-4 text-foreground" />
          Development Login
        </label>
        <select
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex h-11 w-full rounded-xl border border-border bg-card px-4 py-2 text-sm text-foreground outline-none ring-offset-background transition-all focus-visible:ring-2 focus-visible:ring-foreground/20 focus-visible:border-foreground/20 hover:border-accent"
        >
          {accounts.map((acc) => (
            <option key={acc.email} value={acc.email}>
              {acc.label}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={!ready || loading}
        className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-foreground/10 transition-all hover:bg-foreground/80 hover:shadow-foreground/15 active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Signing in..." : "Sign In (Dev Mode)"}
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
      </button>
    </form>
  )
}
