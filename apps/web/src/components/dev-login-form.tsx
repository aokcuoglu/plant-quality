"use client"

import { Label } from "@/components/ui/label"

import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"

import { Button } from "@/components/ui/button"

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
        <Label className="text-sm font-medium text-foreground flex items-center gap-2">
          <Terminal className="size-4 text-foreground" />
          Development Login
        </Label>
        <NativeSelect
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)} className="w-full"
        >
          {accounts.map((acc) => (
            <NativeSelectOption key={acc.email} value={acc.email}>
              {acc.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      <Button
        type="submit"
        disabled={!ready || loading}
        className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-foreground/10 transition-all hover:bg-foreground/80 hover:shadow-foreground/15 active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Signing in..." : "Sign In (Dev Mode)"}
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
      </Button>
    </form>
  )
}
