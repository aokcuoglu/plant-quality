import { signIn } from "@/lib/auth"
import { redirect } from "next/navigation"
import { AuthError } from "next-auth"
import { Factory, ArrowRight, Mail, CheckCircle2 } from "lucide-react"
import { LoginRedirectHandler } from "@/components/LoginRedirectHandler"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; sent?: string }>
}) {
  const { redirect: redirectTo, sent } = await searchParams

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900/5 via-slate-800/[0.02] to-transparent dark:from-slate-100/10 dark:via-slate-50/5" />
        <div className="absolute top-[-20%] left-1/2 size-[600px] -translate-x-1/2 rounded-full bg-emerald-500/4 blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-5%] size-[400px] rounded-full bg-blue-500/3 blur-3xl" />
      </div>

      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <div className="mb-4 flex items-center justify-center gap-2">
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10">
              <Factory className="size-5 text-emerald-500" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Log in to your{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
              PlantX OS
            </span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            One account for Quality, Logistics, and Factory Management.
          </p>
        </div>

        {sent === "1" ? (
          <div className="space-y-4 rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30 p-6 text-center">
            <CheckCircle2 className="mx-auto size-10 text-emerald-500" />
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
              Magic link sent!
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400">
              Check your email inbox. No password needed.
            </p>
          </div>
        ) : (
          <form
            action={async (formData: FormData) => {
              "use server"
              try {
                const data = Object.fromEntries(formData)
                await signIn("nodemailer", {
                  email: data.email,
                  redirect: false,
                })
              } catch (error) {
                if (error instanceof AuthError) {
                  redirect(`/login?error=${error.type}${redirectTo ? `&redirect=${redirectTo}` : ""}`)
                }
                throw error
              }
              redirect(`/login?sent=1${redirectTo ? `&redirect=${redirectTo}` : ""}`)
            }}
            className="space-y-5"
          >
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                Work email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="name@company.com"
                  required
                  className="flex h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:border-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              className="group inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 active:translate-y-px"
            >
              Send Magic Link
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </button>

            <p className="text-center text-xs text-muted-foreground">
              No password needed. We&apos;ll send you a magic link to sign in
              instantly.
            </p>
          </form>
        )}
      </div>
      <LoginRedirectHandler redirectTo={redirectTo} />
    </div>
  )
}
