"use client"

import { Label } from "@/components/ui/label"

import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"

import { Input } from "@/components/ui/input"

import { Button } from "@/components/ui/button"

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
import { useTranslations } from "@/i18n/context"
import { LanguageSwitcher } from "@/i18n/LanguageSwitcher"
import { emailSchema } from "@/lib/validation"
import { FieldError } from "@/components/ui/field-error"

const errorTypes = ["Configuration", "AccessDenied", "Verification", "CredentialsSignin", "Default"] as const

function LoginContent() {
  const t = useTranslations()
  const [accounts, setAccounts] = useState<{ email: string; label: string }[]>([])
  const [devEmail, setDevEmail] = useState("")
  const [magicEmail, setMagicEmail] = useState("")
  const [magicSent, setMagicSent] = useState(false)
  const [magicError, setMagicError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [devError, setDevError] = useState<string | null>(null)
  const [microsoftEnabled, setMicrosoftEnabled] = useState(false)

  const search = useSearchParams()
  const errorType = search.get("error")
  const resolvedErrorType: (typeof errorTypes)[number] =
    errorTypes.includes(errorType as (typeof errorTypes)[number]) ? (errorType as (typeof errorTypes)[number]) : "Default"
  // Honore the proxy-provided `?redirect=/path` (defaults to the company dashboard).
  // Keep it a same-origin relative path so login never bounces to another host/port.
  const requestedRedirect = search.get("redirect")
  const callbackUrl = requestedRedirect && requestedRedirect.startsWith("/") ? requestedRedirect : "/dashboard"

  useEffect(() => {
    fetch("/api/dev/users")
      .then((r) => r.json())
      .then((data) => {
        setAccounts(data.users)
        if (data.users.length > 0) setDevEmail(data.users[0].email)
      })
      .catch(console.error)
    fetch("/api/auth/sso-status")
      .then((r) => r.json())
      .then((data) => setMicrosoftEnabled(Boolean(data.microsoftEnabled)))
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
    setMagicError(null)
    const parsed = emailSchema({
      invalid: t("validation.emailInvalid"),
      required: t("validation.required"),
    }).safeParse(magicEmail)
    if (!parsed.success) {
      setMagicError(parsed.error.issues[0]?.message ?? t("validation.emailInvalid"))
      return
    }
    setLoading(true)
    await signIn("nodemailer", {
      email: parsed.data,
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
        <div className="absolute top-1/3 right-1/4 size-[500px] rounded-full bg-brand/[0.04] blur-[100px]" />
      </div>

      <Link href="/" className="absolute top-6 left-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="size-4" /> {t("auth.backToPlantx")}
      </Link>

      <div className="absolute top-6 right-6">
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-sm space-y-8 px-4">
        <div className="text-center">
          <div className="mb-5 flex items-center justify-center">
            <div className="relative flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-brand shadow-xl shadow-foreground/10">
              <Factory className="size-7 text-foreground" strokeWidth={2.5} />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t("auth.loginTitle")}
            <span className="bg-gradient-to-r from-brand via-brand to-brand bg-clip-text text-transparent">{t("auth.loginTitleHighlight")}</span>
          </h1>
        </div>

        <div className="flex items-center justify-center gap-3">
          <div className="flex items-center gap-1.5 rounded-full border border-border bg-foreground/5 px-3 py-1 text-[10px] font-medium tracking-wider uppercase text-foreground">
            <ShieldCheck className="size-3" /> {t("auth.secure")}
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-border bg-brand/5 px-3 py-1 text-[10px] font-medium tracking-wider uppercase text-muted-foreground">
            <Zap className="size-3" /> {t("auth.passwordless")}
          </div>
        </div>

        {errorType && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-center">
            <p className="text-xs font-medium text-destructive">
              {t(`auth.error.${resolvedErrorType}` as const)}
            </p>
          </div>
        )}

        {magicSent ? (
          <div className="space-y-5 rounded-2xl border border-border bg-card p-7 text-center backdrop-blur-md">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-muted">
              <svg className="size-7 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-base font-semibold text-foreground">{t("auth.magicSent")}</p>
            <p className="text-sm text-muted-foreground">{t("auth.magicSentDetail")}</p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Microsoft (Entra ID) Sign-in — only shown when configured */}
            {microsoftEnabled && (
              <>
                <Button
                  type="button"
                  onClick={() => signIn("microsoft-entra-id", { callbackUrl })}
                  disabled={loading}
                  className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background shadow-lg shadow-foreground/10 transition-all hover:bg-foreground/80 active:translate-y-px disabled:opacity-50"
                >
                  <svg className="size-4 fill-current" viewBox="0 0 23 23" aria-hidden="true">
                    <rect x="1" y="1" width="10" height="10" />
                    <rect x="12" y="1" width="10" height="10" />
                    <rect x="1" y="12" width="10" height="10" />
                    <rect x="12" y="12" width="10" height="10" />
                  </svg>
                  {loading ? t("auth.microsoft.signingIn") : t("auth.microsoft.continueWith")}
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-background px-3 text-muted-foreground">{t("auth.microsoft.orDev")}</span>
                  </div>
                </div>
              </>
            )}

            {/* Dev Login */}
            <form onSubmit={handleDevLogin} className="space-y-4">
              {devError && (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {devError}
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Terminal className="size-4 text-destructive" /> {t("auth.devLogin")}
                </Label>
                <NativeSelect
                  value={devEmail}
                  onChange={(e) => setDevEmail(e.target.value)} className="w-full"
                >
                  {accounts.map((acc) => (
                    <NativeSelectOption key={acc.email} value={acc.email}>{acc.label}</NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
              <Button
                type="submit"
                disabled={accounts.length === 0 || loading}
                className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-destructive px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-destructive/15 transition-all hover:bg-destructive/90 active:translate-y-px disabled:opacity-50"
              >
                {loading ? t("auth.microsoft.signingIn") : t("auth.signInDev")}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-background px-3 text-muted-foreground">{t("auth.orMagic")}</span>
              </div>
            </div>

            <form onSubmit={handleMagicLink} className="space-y-5" noValidate>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-foreground">{t("auth.workEmail")}</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder={t("auth.emailPlaceholder")}
                    required
                    value={magicEmail}
                    onChange={(e) => {
                      setMagicEmail(e.target.value)
                      setMagicError(null)
                    }}
                    aria-invalid={!!magicError}
                    className="flex h-11 w-full rounded-xl border border-border bg-muted pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none ring-offset-background transition-all focus-visible:ring-2 focus-visible:ring-foreground/20 focus-visible:border-foreground/20 hover:border-border"
                  />
                </div>
                <FieldError message={magicError} />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background shadow-lg shadow-foreground/10 transition-all hover:bg-foreground/80 active:translate-y-px disabled:opacity-50"
              >
                {loading ? t("auth.sending") : t("auth.sendMagicLink")}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

export default function LoginPage() {
  const t = useTranslations()
  return (
    <Suspense fallback={<div className="flex min-h-dvh items-center justify-center bg-background text-foreground">{t("auth.loading")}</div>}>
      <LoginContent />
    </Suspense>
  )
}
