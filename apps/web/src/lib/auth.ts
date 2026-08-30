import NextAuth from "next-auth"
import type { User as NextAuthUser } from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import Nodemailer from "next-auth/providers/nodemailer"
import Credentials from "next-auth/providers/credentials"
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id"
import { prisma } from "@/lib/prisma"
import type { DefaultSession } from "next-auth"
import type { Role, CompanyType, Plan } from "@plantx/db/client"
import { createTransport } from "nodemailer"

declare module "@auth/core/types" {
  interface Session {
    user: {
      id: string
      role: Role
      plan: Plan
      companyId: string
      companyName: string
      companyType: CompanyType
      modules: string[]
      companyModules: string[]
      graphDepartment?: string | null
      graphJobTitle?: string | null
      graphManagerEmail?: string | null
    } & DefaultSession["user"]
  }
}

declare module "next-auth" {
  interface User {
    role?: Role
    plan?: Plan
    companyId?: string
    companyName?: string
    companyType?: CompanyType
    modules?: string[]
    companyModules?: string[]
    tid?: string
    graphDepartment?: string | null
    graphJobTitle?: string | null
    graphManagerEmail?: string | null
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id?: string
    role?: Role
    plan?: Plan
    companyId?: string
    companyName?: string
    companyType?: CompanyType
    modules?: string[]
    companyModules?: string[]
    graphDepartment?: string | null
    graphJobTitle?: string | null
    graphManagerEmail?: string | null
  }
}

const emailServerConfig = (() => {
  const raw = process.env.EMAIL_SERVER || '{"host":"localhost","port":1025}'
  try {
    return JSON.parse(raw)
  } catch {
    return { host: "localhost", port: 1025 }
  }
})()

type MicrosoftGraphInfo = {
  department?: string
  jobTitle?: string
  managerEmail?: string
}

// Fetch the signed-in user's own directory info from Microsoft Graph.
// `department`/`jobTitle` need only `User.Read` (user-consentable); the
// manager link may require `User.ReadBasic.All`/`Directory.Read.All` (admin
// consent) so it degrades gracefully to undefined when the tenant has not
// granted it.
async function fetchMicrosoftGraphInfo(accessToken?: string): Promise<MicrosoftGraphInfo> {
  const info: MicrosoftGraphInfo = {}
  if (!accessToken) return info
  try {
    const meRes = await fetch("https://graph.microsoft.com/v1.0/me?$select=department,jobTitle", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (meRes.ok) {
      const me = (await meRes.json()) as { department?: string; jobTitle?: string }
      if (typeof me.department === "string") info.department = me.department
      if (typeof me.jobTitle === "string") info.jobTitle = me.jobTitle
    }
  } catch {
    // ignore — fall back to id_token optional claims
  }
  try {
    const mgrRes = await fetch("https://graph.microsoft.com/v1.0/me/manager?$select=mail,userPrincipalName", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (mgrRes.ok) {
      const mgr = (await mgrRes.json()) as { mail?: string; userPrincipalName?: string }
      if (typeof mgr.mail === "string") info.managerEmail = mgr.mail
      else if (typeof mgr.userPrincipalName === "string") info.managerEmail = mgr.userPrincipalName
    }
  } catch {
    // ignore — manager link not consented
  }
  return info
}

export const { auth, handlers, signIn, signOut } = NextAuth({
  trustHost: true,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    verifyRequest: "/verify-request",
  },
  providers: [
    Credentials({
      id: "credentials",
      name: "Development Login",
      credentials: {
        email: { label: "Email", type: "email" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined
        if (!email) return null
        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            plan: true,
            modules: true,
            emailVerified: true,
            companyId: true,
            company: { select: { type: true, name: true, plan: true, modules: true } },
          },
        })
        if (!user) return null
        if (!user.emailVerified) {
          // Dev mode — auto-verify if missing
          await prisma.user.update({
            where: { id: user.id },
            data: { emailVerified: new Date() },
          })
        }
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          plan: (user.company?.plan ?? user.plan) as Plan,
          companyId: user.companyId ?? undefined,
          companyName: (user.company?.name as string) ?? undefined,
          companyType: (user.company?.type as CompanyType) ?? undefined,
          modules: user.modules ?? [],
          companyModules: user.company?.modules ?? [],
        } as NextAuthUser
      },
    }),
    Nodemailer({
      server: emailServerConfig,
      from: process.env.EMAIL_FROM ?? "noreply@plantquality.com",
      sendVerificationRequest: async ({ identifier: email, url, provider }) => {
        const { host } = new URL(url)
        const transport = createTransport(provider.server ?? emailServerConfig)
        const result = await transport.sendMail({
          to: email,
          from: provider.from,
          subject: `Sign in to ${host}`,
          text: `Sign in to ${host}\n${url}\n\n`,
          html: `<p>Sign in to <b>${host}</b></p><p><a href="${url}">Click here to sign in</a></p>`,
        })
        const failed = result.rejected.filter(Boolean)
        if (failed.length) {
          throw new Error(`Email(s) (${failed.join(", ")}) could not be sent`)
        }
        console.log("")
        console.log("── MAGIC LINK ──────────────────────")
        console.log(`  📧 ${email}`)
        console.log(`  🔗 ${url}`)
        console.log("────────────────────────────────────")
        console.log("")
      },
    }),
    MicrosoftEntraID({
      clientId: process.env.AUTH_AZURE_AD_ID,
      clientSecret: process.env.AUTH_AZURE_AD_SECRET,
      issuer: process.env.AUTH_AZURE_AD_TENANT_ID
        ? `https://login.microsoftonline.com/${process.env.AUTH_AZURE_AD_TENANT_ID}/v2.0`
        : "https://login.microsoftonline.com/common/v2.0",
      authorization: { params: { scope: "openid profile email User.Read" } },
      profile: async (profile) => {
        const p = profile as unknown as Record<string, unknown>
        return {
          id: (profile.sub as string | undefined) ?? "",
          name: (profile.name as string | undefined) ?? null,
          email: (profile.email as string | undefined) ?? null,
          image: null,
          tid: (p.tid as string | undefined) ?? undefined,
          graphDepartment: (p.department as string | undefined) ?? null,
          graphJobTitle: (p.jobTitle as string | undefined) ?? null,
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "microsoft-entra-id") {
        const tid = (profile as { tid?: string }).tid
        const email = user.email?.toLowerCase()
        const domain = email?.split("@")[1]?.toLowerCase()
        if (!tid || !domain) return false
        const company = await prisma.company.findFirst({
          where: { ssoEnabled: true, microsoftTenantIds: { has: tid }, ssoAllowedDomains: { has: domain } },
          select: { id: true },
        })
        return !!company
      }
      return true
    },
    async jwt({ token, user, account, profile, trigger }) {
      if (user?.id) {
        const isAzure = account?.provider === "microsoft-entra-id"

        // On first Microsoft sign-in, attach the user to their tenant's company
        // and enrich them with directory data (department / job title / manager).
        if (isAzure && trigger === "signIn") {
          const tid = (profile as { tid?: string }).tid
          const email = user.email?.toLowerCase()
          const domain = email?.split("@")[1]?.toLowerCase()
          const company = tid && domain
            ? await prisma.company.findFirst({
                where: { ssoEnabled: true, microsoftTenantIds: { has: tid }, ssoAllowedDomains: { has: domain } },
                select: { id: true, plan: true },
              })
            : null
          const graph = await fetchMicrosoftGraphInfo(account?.access_token)
          const department = graph.department ?? (profile as { department?: string }).department ?? null
          const jobTitle = graph.jobTitle ?? (profile as { jobTitle?: string }).jobTitle ?? null
          const managerEmail = graph.managerEmail ?? null
          await prisma.user.update({
            where: { id: user.id },
            data: {
              ...(company ? { companyId: company.id, plan: company.plan } : {}),
              microsoftId: account?.providerAccountId,
              ...(department ? { graphDepartment: department } : {}),
              ...(jobTitle ? { graphJobTitle: jobTitle } : {}),
              ...(managerEmail ? { graphManagerEmail: managerEmail } : {}),
            },
          })
        }

        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: {
            id: true,
            role: true,
            plan: true,
            modules: true,
            companyId: true,
            graphDepartment: true,
            graphJobTitle: true,
            graphManagerEmail: true,
            company: { select: { type: true, name: true, plan: true, modules: true } },
          },
        })
        token.id = dbUser?.id ?? user.id
        token.role = dbUser?.role ?? user.role
        token.plan = dbUser?.company?.plan ?? dbUser?.plan ?? user.plan
        token.companyId = dbUser?.companyId ?? user.companyId ?? ""
        token.companyName = dbUser?.company?.name ?? user.companyName ?? ""
        token.companyType = dbUser?.company?.type ?? user.companyType ?? "OEM"
        token.modules = dbUser?.modules ?? []
        token.companyModules = dbUser?.company?.modules ?? []
        token.graphDepartment = dbUser?.graphDepartment ?? null
        token.graphJobTitle = dbUser?.graphJobTitle ?? null
        token.graphManagerEmail = dbUser?.graphManagerEmail ?? null
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as Role
        session.user.plan = token.plan as Plan
        session.user.companyId = (token.companyId as string) ?? ""
        session.user.companyName = (token.companyName as string) ?? ""
        session.user.companyType = (token.companyType as CompanyType) ?? "OEM"
        session.user.modules = (token.modules as string[]) ?? []
        session.user.companyModules = (token.companyModules as string[]) ?? []
        session.user.graphDepartment = (token.graphDepartment as string | null) ?? null
        session.user.graphJobTitle = (token.graphJobTitle as string | null) ?? null
        session.user.graphManagerEmail = (token.graphManagerEmail as string | null) ?? null
      }
      return session
    },
  },
})
