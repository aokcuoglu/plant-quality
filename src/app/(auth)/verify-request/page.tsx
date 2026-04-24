import Link from "next/link"
import { ArrowLeft, MailCheck } from "lucide-react"

export default function VerifyRequestPage() {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#0a0c10]">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 size-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/[0.05] blur-[120px]" />
        <div className="absolute top-1/3 right-1/4 size-[400px] rounded-full bg-blue-500/[0.04] blur-[100px]" />
      </div>

      {/* Return link */}
      <Link
        href="/"
        className="absolute top-6 left-6 inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition-colors hover:text-slate-200"
      >
        <ArrowLeft className="size-4" />
        Back to PlantX
      </Link>

      <div className="w-full max-w-sm space-y-6 px-4 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-eborder-emerald-500/20 bg-slate-900/60 border border-slate-700/50">
          <MailCheck className="size-7 text-emerald-400" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-white">Check your email</h1>
        <p className="text-sm leading-relaxed text-slate-400">
          A sign-in link has been sent to your email address.
        </p>
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4">
          <p className="text-xs leading-relaxed text-slate-500">
            Click the link in the email to sign in instantly. No password
            required.
          </p>
        </div>
        <p className="text-[11px] text-slate-500">
          (In development, check the server console for the Magic Link.)
        </p>

        <Link
          href="/login"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 px-5 py-2.5 text-sm font-medium text-slate-300 transition-all hover:border-slate-500 hover:bg-slate-800 hover:text-white"
        >
          <ArrowLeft className="size-4" />
          Back to Sign In
        </Link>
      </div>
    </div>
  )
}
