export default function VerifyRequestPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Check your email
        </h1>
        <p className="text-sm text-muted-foreground">
          A sign in link has been sent to your email address.
        </p>
        <p className="text-xs text-muted-foreground">
          (In development, check the server console for the Magic Link.)
        </p>
      </div>
    </div>
  )
}
