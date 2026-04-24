"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"
import Link from "next/link"
import {
  Factory,
  ArrowRight,
  Mail,
  ArrowLeft,
  Zap,
  ShieldCheck,
  Terminal,
} from "lucide-react"

const ACCOUNTS = [
  { value: "admin@oem.com", label: "admin@oem.com (OEM Admin)" },
  { value: "quality@oem.com", label: "quality@oem.com (OEM QE)" },
  { value: "admin@supplier.com", label: "admin@supplier.com (Supplier Admin)" },
  { value: "engineer@supplier.com", label: "engineer@supplier.com (Supplier QE)" },
  { value: "admin@steelforged.com", label: "admin@steelforged.com (SteelForged)" },
  { value: "engineer@steelforged.com", label: "engineer@steelforged.com (SteelForged)" },
]

const errorMessages: Record<string, string> = {
  Configuration: "Auth configuration error.",
  AccessDenied: "Access denied.",
  Verification: "Link expired or already used.",
  Default: "An unexpected error occurred.",
}

function LoginContent() {
  const [devEmail, setDevEmail] = useState("admin@oem.com")
  const [magicEmail, setMagicEmail] = useState("")
  const [magicSent, setMagicSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const search = useSearchParams()
  const redirectTo = search.get("redirect") || "/oem"
  const errorType = search.get("error")

  const router = useRouter()

  const handleDevSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const csrfRes = await fetch("http://localhost:3000/api/auth/csrf", {
        credentials: "include",
      })
      const csrfJson = await csrfRes.json()
      const csrfToken = csrfJson.csrfToken

      const fd = new URLSearchParams()
      fd.append("email", devEmail)
      fd.append("csrfToken", csrfToken)

      await fetch("http://localhost:3000/api/auth/callback/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        credentials: "include",
        body: fd.toString(),
        redirect: "follow",
      })

      window.location.href = redirectTo
    } catch (err) {
      console.error("Dev sign-in error:", err)
      alert("Could not sign in. Please check container logs.")
    } finally {
      setLoading(false)
    }
  }

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!magicEmail) return
    setLoading(true)
    await signIn("nodemailer", {
      email: magicEmail,
      redirect: false,
    })
    setMagicSent(true)
    setLoading(false)
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[#0a0c10]" />
        <div className="absolute top-1/2 left-1/2 size-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/[0.05] blur-[120px]" />
        <div className="absolute top-1/3 right-1/4 size-[500px] rounded-full bg-blue-500/[0.04] blur-[100px]" />
      </div>

      <Link href="/" className="absolute top-6 left-6 inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition-colors hover:text-slate-200">
        <ArrowLeft className="size-4" /> Back to PlantX
      </Link>

      <div className="w-full max-w-sm space-y-8 px-4">
        <div className="text-center">
          <div className="mb-5 flex items-center justify-center">
            <div className="relative flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-600 shadow-xl shadow-emerald-500/15">
              <Factory className="size-7 text-white" strokeWidth={2.5} />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Log in to{" "}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-blue-500 bg-clip-text text-transparent">PlantX OS</span>
          </h1>
        </div>

        <div className="flex items-center justify-center gap-3">
          <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1 text-[10px] font-medium tracking-wider uppercase text-emerald-400">
            <ShieldCheck className="size-3" /> Secure
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-blue-500/20 bg-blue-500/5 px-3 py-1 text-[10px] font-medium tracking-wider uppercase text-blue-400">
            <Zap className="size-3" /> Passwordless
          </div>
        </div>

        {errorType && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-center">
            <p className="text-xs font-medium text-red-400">{errorMessages[errorType] ?? errorMessages.Default}</p>
          </div>
        )}

        {magicSent ? (
          <div className="space-y-5 rounded-2xl border border-emerald-500/20 bg-slate-900/60 p-7 text-center backdrop-blur-md">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-500/10">
              <svg className="size-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-base font-semibold text-white">Magic link sent!</p>
            <p className="text-sm text-slate-400">Check http://localhost:8025 or container logs.</p>
          </div>
        ) : (
          <div className="space-y-5">
            <form onSubmit={handleDevSignIn} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200 flex items-center gap-2">
                  <Terminal className="size-4 text-amber-400" /> Development Login
                </label>
                <select
                  value={devEmail}
                  onChange={(e) => setDevEmail(e.target.value)}
                  className="flex h-11 w-full rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-2 text-sm text-slate-100 outline-none ring-offset-[#0a0c10] transition-all focus-visible:ring-2 focus-visible:ring-amber-500/40 focus-visible:border-amber-500/40 hover:border-slate-600"
                >
                  {ACCOUNTS.map((acc) => (
                    <option key={acc.value} value={acc.value}>{acc.label}</option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-[#0a0c10] shadow-lg shadow-amber-500/15 transition-all hover:bg-amber-400 active:translate-y-px disabled:opacity-50"
              >
                Sign In (Dev Mode)
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-700/50" /></div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-[#0a0c10] px-3 text-slate-500">or use magic link</span>
              </div>
            </div>

            <form onSubmit={handleMagicLink} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-slate-200">Work email</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                  <input
                    id="email"
                    type="email"
                    placeholder="name@company.com"
                    required
                    value={magicEmail}
                    onChange={(e) => setMagicEmail(e.target.value)}
                    className="flex h-11 w-full rounded-xl border border-slate-700 bg-slate-800/60 pl-10 pr-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 outline-none ring-offset-[#0a0c10] transition-all focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:border-emerald-500/40 hover:border-slate-600"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-[#0a0c10] shadow-lg shadow-emerald-500/15 transition-all hover:bg-emerald-400 active:translate-y-px disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send Magic Link"}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-dvh items-center justify-center bg-[#0a0c10] text-white">Loading...</div>}>
      <LoginContent />
    </Suspense>
  )
}
