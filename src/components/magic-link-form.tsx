"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { ArrowRight, Mail } from "lucide-react"

interface Props {
  redirectTo?: string
}

export function MagicLinkForm({ redirectTo }: Props) {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    try {
      await signIn("nodemailer", {
        email,
        redirect: false,
        callbackUrl: redirectTo && redirectTo !== "/" ? redirectTo : "/oem",
      })
      setSent(true)
    } catch (err) {
      console.error("Magic link error:", err)
      alert("Failed to send magic link.")
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="space-y-5 rounded-2xl border border-emerald-500/20 bg-slate-900/60 p-7 text-center backdrop-blur-md">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-500/10">
          <svg className="size-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="space-y-1">
          <p className="text-base font-semibold text-white">Magic link sent!</p>
          <p className="text-sm text-slate-400">
            Check http://localhost:8025 (Mailpit) or container logs.
          </p>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium text-slate-200">
          Work email
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
          <input
            id="email"
            name="email"
            type="email"
            placeholder="name@company.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex h-11 w-full rounded-xl border border-slate-700 bg-slate-800/60 pl-10 pr-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 outline-none ring-offset-[#0a0c10] transition-all focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:border-emerald-500/40 hover:border-slate-600"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-[#0a0c10] shadow-lg shadow-emerald-500/15 transition-all hover:bg-emerald-400 hover:shadow-emerald-500/25 active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Sending..." : "Send Magic Link"}
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
      </button>

      <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-3 text-center">
        <p className="text-xs leading-relaxed text-slate-500">
          No password needed. We&apos;ll send you a magic link to sign in
          instantly.
        </p>
      </div>
    </form>
  )
}
