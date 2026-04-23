import { auth, signIn } from "@/lib/auth"
import { redirect } from "next/navigation"
import { AuthError } from "next-auth"

export default async function LoginPage() {
  const session = await auth()
  if (session) redirect("/")

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            PlantQuality
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Supplier Quality Management
          </p>
        </div>

        <form
          action={async (formData: FormData) => {
            "use server"
            try {
              const data = Object.fromEntries(formData)
              await signIn("nodemailer", { ...data, redirectTo: "/" })
            } catch (error) {
              if (error instanceof AuthError) {
                redirect(`/login?error=${error.type}`)
              }
              throw error
            }
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="name@company.com"
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Send Magic Link
          </button>
        </form>
      </div>
    </div>
  )
}
