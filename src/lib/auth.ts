import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import Nodemailer from "next-auth/providers/nodemailer"
import { prisma } from "@/lib/prisma"
import type { DefaultSession } from "next-auth"
import type { Role, CompanyType, Plan } from "@/generated/prisma/client"

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

export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    verifyRequest: "/verify-request",
  },
  providers: [
    Nodemailer({
      server: process.env.EMAIL_SERVER || `{"host":"localhost","port":1025}`,
      from: process.env.EMAIL_FROM ?? "noreply@plantquality.com",
      sendVerificationRequest: async ({ identifier: email, url }) => {
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
        token.companyName = dbUser?.company.name ?? user.companyName
        token.companyType = dbUser?.company.type ?? user.companyType
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
