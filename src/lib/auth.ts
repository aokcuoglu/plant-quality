import NextAuth from "next-auth"
import type { User as NextAuthUser } from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import Nodemailer from "next-auth/providers/nodemailer"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import type { DefaultSession } from "next-auth"
import type { Role, CompanyType, Plan } from "@/generated/prisma/client"
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
            emailVerified: true,
            companyId: true,
            company: { select: { type: true, name: true } },
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
          plan: user.plan,
          companyId: user.companyId ?? undefined,
          companyName: user.company?.name ?? undefined,
          companyType: user.company?.type ?? undefined,
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
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: {
            id: true,
            role: true,
            plan: true,
            companyId: true,
            company: { select: { type: true, name: true } },
          },
        })
        token.id = dbUser?.id ?? user.id
        token.role = dbUser?.role ?? user.role
        token.plan = dbUser?.plan ?? user.plan
        token.companyId = dbUser?.companyId ?? user.companyId
        token.companyName = dbUser?.company?.name ?? user.companyName
        token.companyType = dbUser?.company?.type ?? user.companyType
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as Role
        session.user.plan = token.plan as Plan
        session.user.companyId = token.companyId as string
        session.user.companyName = token.companyName as string
        session.user.companyType = token.companyType as CompanyType
      }
      return session
    },
  },
})
