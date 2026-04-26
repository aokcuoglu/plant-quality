"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { ArrowRight, Terminal } from "lucide-react"

const ACCOUNTS = [
  { value: "admin@oem.com", label: "admin@oem.com (OEM Admin)" },
  { value: "quality@oem.com", label: "quality@oem.com (OEM QE)" },
  { value: "admin@supplier.com", label: "admin@supplier.com (Supplier Admin)" },
  { value: "engineer@supplier.com", label: "engineer@supplier.com (Supplier QE)" },
  { value: "admin@steelforged.com", label: "admin@steelforged.com (SteelForged)" },
  { value: "engineer@steelforged.com", label: "engineer@steelforged.com (SteelForged)" },
]

interface Props {
  redirectTo?: string
}

export function DevLoginForm({ redirectTo }: Props) {
  const [email, setEmail] = useState("admin@oem.com")
  const [loading, setLoading] = useState(false)

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
        <label className="text-sm font-medium text-slate-200 flex items-center gap-2">
          <Terminal className="size-4 text-amber-400" />
          Development Login
        </label>
        <select
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex h-11 w-full rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-2 text-sm text-slate-100 outline-none ring-offset-[#0a0c10] transition-all focus-visible:ring-2 focus-visible:ring-amber-500/40 focus-visible:border-amber-500/40 hover:border-slate-600"
        >
          {ACCOUNTS.map((acc) => (
            <option key={acc.value} value={acc.value}>
              {acc.label}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-[#0a0c10] shadow-lg shadow-amber-500/15 transition-all hover:bg-amber-400 hover:shadow-amber-500/25 active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Signing in..." : "Sign In (Dev Mode)"}
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
      </button>
    </form>
  )
}
