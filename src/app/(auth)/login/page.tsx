"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
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

const errorMessages: Record<string, string> = {
  Configuration: "Auth configuration error.",
  AccessDenied: "Access denied.",
  Verification: "Link expired or already used.",
  CredentialsSignin: "Invalid credentials. Make sure the selected user exists.",
  Default: "An unexpected error occurred.",
}

function LoginContent() {
  const [accounts, setAccounts] = useState<{ email: string; label: string }[]>([])
  const [devEmail, setDevEmail] = useState("")
  const [magicEmail, setMagicEmail] = useState("")
  const [magicSent, setMagicSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [devError, setDevError] = useState<string | null>(null)

  const search = useSearchParams()
  const errorType = search.get("error")
  // Honore the proxy-provided `?redirect=/path` (defaults to the OEM dashboard).
  // Keep it a same-origin relative path so login never bounces to another host/port.
  const requestedRedirect = search.get("redirect")
  const callbackUrl = requestedRedirect && requestedRedirect.startsWith("/") ? requestedRedirect : "/quality/oem"

  useEffect(() => {
    fetch("/api/dev/users")
      .then((r) => r.json())
      .then((data) => {
        setAccounts(data.users)
        if (data.users.length > 0) setDevEmail(data.users[0].email)
      })
      .catch(console.error)
  }, [])

  const handleDevLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!devEmail) return
    setLoading(true)
    setDevError(null)

    // NextAuth standard sign-in for credentials provider.
    // redirect:true lets the browser do a real POST → redirect on success/failure.
    await signIn("credentials", {
      email: devEmail,
      redirect: true,
      callbackUrl,
    })
  }

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!magicEmail) return
    setLoading(true)
    await signIn("nodemailer", {
      email: magicEmail,
      redirect: false,
      callbackUrl: "/login",
    })
    setMagicSent(true)
    setLoading(false)
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-background" />
        <div className="absolute top-1/2 left-1/2 size-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/[0.05] blur-[120px]" />
        <div className="absolute top-1/3 right-1/4 size-[500px] rounded-full bg-blue-500/[0.04] blur-[100px]" />
      </div>

      <Link href="/" className="absolute top-6 left-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to PlantX
      </Link>

      <div className="w-full max-w-sm space-y-8 px-4">
        <div className="text-center">
          <div className="mb-5 flex items-center justify-center">
            <div className="relative flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-xl shadow-foreground/10">
              <Factory className="size-7 text-foreground" strokeWidth={2.5} />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Log in to{" "}
            <span className="bg-gradient-to-r from-blue-400 via-blue-500 to-blue-700 bg-clip-text text-transparent">PlantX OS</span>
          </h1>
        </div>

        <div className="flex items-center justify-center gap-3">
          <div className="flex items-center gap-1.5 rounded-full border border-border bg-foreground/5 px-3 py-1 text-[10px] font-medium tracking-wider uppercase text-foreground">
            <ShieldCheck className="size-3" /> Secure
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-border bg-blue-500/5 px-3 py-1 text-[10px] font-medium tracking-wider uppercase text-muted-foreground">
            <Zap className="size-3" /> Passwordless
          </div>
        </div>

        {errorType && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-center">
            <p className="text-xs font-medium text-destructive">{errorMessages[errorType] ?? errorMessages.Default}</p>
          </div>
        )}

        {magicSent ? (
          <div className="space-y-5 rounded-2xl border border-border bg-card p-7 text-center backdrop-blur-md">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-muted">
              <svg className="size-7 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-base font-semibold text-foreground">Magic link sent!</p>
            <p className="text-sm text-muted-foreground">Check http://localhost:8025 or container logs.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Dev Login */}
            <form onSubmit={handleDevLogin} className="space-y-4">
              {devError && (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {devError}
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Terminal className="size-4 text-destructive" /> Development Login
                </label>
                <select
                  value={devEmail}
                  onChange={(e) => setDevEmail(e.target.value)}
                  className="flex h-11 w-full rounded-xl border border-border bg-muted px-4 py-2 text-sm text-foreground outline-none ring-offset-background transition-all focus-visible:ring-2 focus-visible:ring-amber-500/40 focus-visible:border-amber-500/40 hover:border-border"
                >
                  {accounts.map((acc) => (
                    <option key={acc.email} value={acc.email}>{acc.label}</option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={accounts.length === 0 || loading}
                className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-black shadow-lg shadow-amber-500/15 transition-all hover:bg-amber-400 active:translate-y-px disabled:opacity-50"
              >
                {loading ? "Signing in..." : "Sign In (Dev Mode)"}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-background px-3 text-muted-foreground">or use magic link</span>
              </div>
            </div>

            <form onSubmit={handleMagicLink} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-foreground">Work email</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="email"
                    type="email"
                    placeholder="name@company.com"
                    required
                    value={magicEmail}
                    onChange={(e) => setMagicEmail(e.target.value)}
                    className="flex h-11 w-full rounded-xl border border-border bg-muted pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none ring-offset-background transition-all focus-visible:ring-2 focus-visible:ring-foreground/20 focus-visible:border-foreground/20 hover:border-border"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background shadow-lg shadow-foreground/10 transition-all hover:bg-foreground/80 active:translate-y-px disabled:opacity-50"
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
    <Suspense fallback={<div className="flex min-h-dvh items-center justify-center bg-background text-foreground">Loading...</div>}>
      <LoginContent />
    </Suspense>
  )
}
