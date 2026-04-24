"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { motion, useScroll, useTransform } from "framer-motion"
import {
  BarChart3,
  BellRing,
  Bot,
  Boxes,
  ChevronRight,
  ClipboardCheck,
  Cloud,
  Cog,
  Cpu,
  Factory,
  FileText,
  Gauge,
  Leaf,
  Lightbulb,
  Link2,
  Loader2,
  MoveRight,
  Network,
  SearchCheck,
  Settings,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Warehouse,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { joinWaitlist } from "@/app/actions/waitlist"

/* ─────────── Product Data ─────────── */

type ProductStatus = "live" | "upcoming" | "planned"

interface Product {
  id: string
  name: string
  tagline: string
  icon: React.ElementType
  status: ProductStatus
  href?: string
  color: string
  accent: string
}

const products: Product[] = [
  {
    id: "quality",
    name: "PlantQuality",
    tagline: "AI-Powered 8D & Quality Mgmt",
    icon: ShieldCheck,
    status: "live",
    href: "/login?redirect=/oem",
    color: "from-emerald-400 to-emerald-600",
    accent: "bg-emerald-500/10 text-emerald-400",
  },
  {
    id: "dock",
    name: "PlantDock",
    tagline: "Warehouse Gate & Logistics",
    icon: Warehouse,
    status: "upcoming",
    color: "from-blue-400 to-blue-600",
    accent: "bg-blue-500/10 text-blue-400",
  },
  {
    id: "quote",
    name: "PlantQuote",
    tagline: "RFQ & Supplier Bidding",
    icon: FileText,
    status: "upcoming",
    color: "from-cyan-400 to-cyan-600",
    accent: "bg-cyan-500/10 text-cyan-400",
  },
  {
    id: "trace",
    name: "PlantTrace",
    tagline: "Traceability & Carbon Footprint",
    icon: Leaf,
    status: "planned",
    color: "from-teal-400 to-teal-600",
    accent: "bg-teal-500/10 text-teal-400",
  },
  {
    id: "audit",
    name: "PlantAudit",
    tagline: "Digital Auditing (LPA, VDA)",
    icon: ClipboardCheck,
    status: "planned",
    color: "from-violet-400 to-violet-600",
    accent: "bg-violet-500/10 text-violet-400",
  },
  {
    id: "asset",
    name: "PlantAsset",
    tagline: "Machinery Maintenance & OEE",
    icon: Settings,
    status: "planned",
    color: "from-amber-400 to-amber-600",
    accent: "bg-amber-500/10 text-amber-400",
  },
  {
    id: "flow",
    name: "PlantFlow",
    tagline: "Internal Material Flow & RFID",
    icon: MoveRight,
    status: "planned",
    color: "from-sky-400 to-sky-600",
    accent: "bg-sky-500/10 text-sky-400",
  },
  {
    id: "staff",
    name: "PlantStaff",
    tagline: "Skill Matrix & HSE Compliance",
    icon: Users,
    status: "planned",
    color: "from-rose-400 to-rose-600",
    accent: "bg-rose-500/10 text-rose-400",
  },
]

const statusOrder: Record<ProductStatus, number> = { live: 0, upcoming: 1, planned: 2 }
const productsSorted = [...products].sort((a, b) => statusOrder[a.status] - statusOrder[b.status])

/* ─────────── Waitlist Dialog ─────────── */

function WaitlistDialog({
  product,
  open,
  onOpenChange,
}: {
  product: Product | null
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [email, setEmail] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!product) return null

  const isValid = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    if (!isValid(email)) {
      setError("Please enter a valid email address.")
      return
    }
    setPending(true)
    if (!product) return null

    const result = await joinWaitlist(email, product!.name)
    if (result.success) {
      toast({ title: `Joined waitlist for ${product!.name}!` })
      setEmail("")
      onOpenChange(false)
    } else {
      toast({ title: result.error ?? "Something went wrong.", type: "destructive" })
    }
    setPending(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-slate-700 bg-slate-900/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-slate-100">Get Early Access to {product.name}</DialogTitle>
          <DialogDescription className="text-slate-400">
            Be the first to know when {product.name} launches.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            placeholder="you@company.com"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setError(null)
            }}
            className="border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500"
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <Button type="submit" className="w-full gap-2" disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Joining...
              </>
            ) : (
              <>
                Join Waitlist <BellRing className="size-4" />
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* ─────────── Network Canvas ─────────── */

function HeroNetwork() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* Slow pulsing orbs */}
      <div className="absolute top-1/2 left-1/2 size-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/[0.07] blur-[120px]" />
      <div className="absolute top-1/3 right-1/4 size-[500px] rounded-full bg-blue-500/[0.06] blur-[100px]" />
      <div className="absolute bottom-0 left-0 size-[400px] rounded-full bg-cyan-500/[0.05] blur-[80px]" />

      {/* Glowing SVG network */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.18]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="netGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        {/* static network lines */}
        {[
          ["10%", "20%", "25%", "40%"],
          ["25%", "40%", "50%", "30%"],
          ["50%", "30%", "70%", "20%"],
          ["50%", "30%", "60%", "55%"],
          ["60%", "55%", "80%", "50%"],
          ["60%", "55%", "55%", "75%"],
          ["25%", "40%", "30%", "60%"],
          ["30%", "60%", "55%", "75%"],
          ["70%", "20%", "80%", "50%"],
          ["10%", "20%", "30%", "60%"],
          ["20%", "80%", "55%", "75%"],
          ["80%", "80%", "55%", "75%"],
        ].map((pts, i) => (
          <line
            key={i}
            x1={pts[0]}
            y1={pts[1]}
            x2={pts[2]}
            y2={pts[3]}
            stroke="url(#netGrad)"
            strokeWidth={0.6}
          />
        ))}
        {[
          ["10%", "20%"],
          ["25%", "40%"],
          ["50%", "30%"],
          ["60%", "55%"],
          ["30%", "60%"],
          ["55%", "75%"],
          ["70%", "20%"],
          ["80%", "50%"],
          ["20%", "80%"],
          ["80%", "80%"],
        ].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r={2.5} fill="#34d399" opacity={0.5} />
        ))}
      </svg>
    </div>
  )
}

/* ─────────── Animated Counter ─────────── */

function AnimatedNumber({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    let raf = 0
    let start = 0
    const duration = 2000
    const animate = (t: number) => {
      if (!start) start = t
      const p = Math.min((t - start) / duration, 1)
      setVal(Math.floor(p * target))
      if (p < 1) raf = requestAnimationFrame(animate)
    }
    raf = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(raf)
  }, [target])

  return (
    <span>
      {val.toLocaleString()}
      {suffix}
    </span>
  )
}

/* ─────────── Section Heading ─────────── */

function SectionHeading({
  eyebrow,
  title,
  highlight,
  description,
}: {
  eyebrow?: string
  title: string
  highlight: string
  description: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6 }}
      className="mx-auto max-w-3xl text-center"
    >
      {eyebrow && (
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium tracking-widest uppercase text-emerald-400">
          <Sparkles className="size-3.5" />
          {eyebrow}
        </div>
      )}
      <h2 className="text-3xl font-bold tracking-tight text-slate-100 sm:text-4xl lg:text-5xl">
        {title} <span className="text-emerald-400">{highlight}</span>
      </h2>
      <p className="mt-4 text-lg leading-relaxed text-slate-400">{description}</p>
    </motion.div>
  )
}

/* ─────────── Glass Card ─────────── */

function GlassCard({
  children,
  className,
  hover = true,
}: {
  children: React.ReactNode
  className?: string
  hover?: boolean
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900/60 backdrop-blur-md transition-all",
        hover && "hover:border-slate-600/70 hover:shadow-lg hover:shadow-emerald-500/5",
        className
      )}
    >
      {children}
    </div>
  )
}

/* ─────────── Page ─────────── */

export default function LandingPage() {
  const [waitlistProduct, setWaitlistProduct] = useState<Product | null>(null)
  const { scrollYProgress } = useScroll()
  const heroOpacity = useTransform(scrollYProgress, [0, 0.18], [1, 0])
  const heroY = useTransform(scrollYProgress, [0, 0.18], [0, -60])

  return (
    <div className="flex min-h-dvh flex-col bg-[#0a0c10] text-slate-200 selection:bg-emerald-500/30">
      {/* ─── Header ─── */}
      <header className="fixed top-0 z-50 w-full border-b border-slate-800/60 bg-[#0a0c10]/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <div className="relative flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-blue-600 shadow-lg shadow-emerald-500/20">
              <Factory className="size-4.5 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">PlantX</span>
          </div>

          <nav className="hidden items-center gap-6 md:flex">
            {[
              ["Ecosystem", "#ecosystem"],
              ["Platform", "#platform"],
              ["Integrations", "#integrations"],
            ].map(([label, href]) => (
              <a
                key={href}
                href={href}
                className="text-sm font-medium text-slate-400 transition-colors hover:text-slate-100"
              >
                {label}
              </a>
            ))}
          </nav>

          <a href="#ecosystem">
            <Button
              size="sm"
              className="bg-emerald-500 text-[#0a0c10] font-semibold hover:bg-emerald-400 shadow-lg shadow-emerald-500/15"
            >
              Explore Ecosystem
            </Button>
          </a>
        </div>
      </header>

      <main className="flex-1">
        {/* ═══════ Hero ═══════ */}
        <section className="relative flex min-h-[90vh] flex-col items-center justify-center overflow-hidden pt-16">
          <HeroNetwork />

          <motion.div
            style={{ opacity: heroOpacity, y: heroY }}
            className="relative z-10 mx-auto max-w-5xl px-4 text-center sm:px-6"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/60 px-4 py-1.5 text-xs font-medium tracking-wider uppercase text-slate-300 backdrop-blur-sm"
            >
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              The Industrial Efficiency Hub
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-5xl font-extrabold tracking-tight text-white sm:text-6xl md:text-7xl lg:text-8xl"
            >
              <span className="block">The Industrial OS</span>
              <span className="mt-2 block bg-gradient-to-r from-emerald-400 via-teal-400 to-blue-500 bg-clip-text text-transparent">
                PlantX
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-slate-400 sm:text-xl"
            >
              Unify your plant operations under one intelligent platform. Quality, production, maintenance,
              and supply chain — seamlessly connected.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
            >
              <Link href="/login?redirect=/oem">
                <Button
                  size="lg"
                  className="h-12 gap-2 bg-emerald-500 px-8 text-base font-semibold text-[#0a0c10] shadow-xl shadow-emerald-500/15 transition-transform hover:bg-emerald-400 hover:scale-[1.02] hover:shadow-emerald-500/25"
                >
                  Launch PlantQuality <ChevronRight className="size-4" />
                </Button>
              </Link>
              <a href="#ecosystem">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 border-slate-700 bg-transparent px-8 text-base text-slate-200 hover:border-slate-500 hover:bg-slate-800/60 hover:text-white"
                >
                  Explore Ecosystem
                </Button>
              </a>
            </motion.div>
          </motion.div>
        </section>

        {/* ═══════ Product Ecosystem (Bento) ═══════ */}
        <section id="ecosystem" className="relative border-t border-slate-800/60 bg-[#0b0e14]">
          <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
            <SectionHeading
              eyebrow="Modular Architecture"
              title="The PlantX"
              highlight="Ecosystem"
              description="Eight specialized modules built on a single data layer. Start with one, expand as you grow."
            />

            <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {productsSorted.map((product, i) => {
                const Icon = product.icon
                const isLive = product.status === "live"
                const isUpcoming = product.status === "upcoming"

                return (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.1 }}
                    transition={{ duration: 0.45, delay: i * 0.06 }}
                    whileHover={isLive ? { y: -4 } : { y: -2 }}
                    className={cn(
                      "group relative flex flex-col rounded-2xl border bg-slate-900/60 p-6 backdrop-blur-md transition-all",
                      isLive
                        ? "border-emerald-500/30 shadow-lg shadow-emerald-500/5 hover:border-emerald-400/50 hover:shadow-emerald-500/10"
                        : "border-slate-700/40 hover:border-slate-600/60",
                      product.id === "quality" && "sm:col-span-2 lg:col-span-2"
                    )}
                  >
                    {/* ambient glow for hero card */}
                    {product.id === "quality" && (
                      <div className="pointer-events-none absolute -top-24 -right-24 size-[320px] rounded-full bg-emerald-500/8 blur-[80px]" />
                    )}

                    <div className="mb-4 flex items-start justify-between">
                      <div
                        className={cn(
                          "flex size-10 items-center justify-center rounded-xl",
                          product.accent
                        )}
                      >
                        <Icon className="size-5" />
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "border px-2 text-[10px] font-semibold tracking-wider uppercase",
                          isLive &&
                            "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
                          isUpcoming &&
                            "border-blue-500/40 bg-blue-500/10 text-blue-400",
                          !isLive &&
                            !isUpcoming &&
                            "border-slate-600 bg-slate-800/60 text-slate-400"
                        )}
                      >
                        {isLive ? (
                          <>
                            <Sparkles className="mr-1 inline size-2.5" />
                            Live
                          </>
                        ) : isUpcoming ? (
                          "Upcoming"
                        ) : (
                          "Planned"
                        )}
                      </Badge>
                    </div>

                    <h3 className="text-lg font-semibold text-slate-100">{product.name}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-slate-400">{product.tagline}</p>

                    <div className="mt-auto pt-5">
                      {isLive && product.href ? (
                        <Link href={product.href}>
                          <Button
                            size="sm"
                            className="w-full bg-emerald-500 text-[#0a0c10] font-semibold hover:bg-emerald-400 shadow-md shadow-emerald-500/10"
                          >
                            Open App <ChevronRight className="size-3.5" />
                          </Button>
                        </Link>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full border-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-800/60 hover:text-white"
                          onClick={() => setWaitlistProduct(product)}
                        >
                          <BellRing className="mr-1.5 size-3.5" />
                          Notify Me
                        </Button>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ═══════ Data-Driven Core (Dashboard Preview) ═══════ */}
        <section id="platform" className="relative overflow-hidden border-t border-slate-800/60 bg-slate-950">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute top-0 left-1/2 h-[600px] w-[1200px] -translate-x-1/2 bg-gradient-radial from-emerald-500/[0.06] to-transparent blur-3xl" />
          </div>

          <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
            <SectionHeading
              eyebrow="Data-Driven Core"
              title="One Data Layer."
              highlight="Every Decision."
              description="Real-time analytics, AI-powered insights, and unified operational intelligence across all modules."
            />

            {/* Bento-style dashboard grid */}
            <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Main chart card */}
              <GlassCard className="sm:col-span-2 lg:col-span-2 p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                      <BarChart3 className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-200">Defect Rate Trend</p>
                      <p className="text-xs text-slate-500">Monthly aggregated</p>
                    </div>
                  </div>
                  <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[10px]">
                    -12% YoY
                  </Badge>
                </div>
                <div className="flex items-end justify-between gap-2 rounded-xl border border-slate-800/60 bg-slate-900/80 p-4">
                  {[
                    { m: "Jan", h: 42 },
                    { m: "Feb", h: 55 },
                    { m: "Mar", h: 38 },
                    { m: "Apr", h: 48 },
                    { m: "May", h: 30 },
                    { m: "Jun", h: 36 },
                    { m: "Jul", h: 24 },
                    { m: "Aug", h: 28 },
                  ].map((b) => (
                    <div key={b.m} className="flex flex-1 flex-col items-center gap-2">
                      <motion.div
                        initial={{ height: 0 }}
                        whileInView={{ height: `${b.h * 1.8}px` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="w-full rounded-t-sm bg-gradient-to-t from-emerald-500/60 to-emerald-400/90"
                      />
                      <span className="text-[10px] text-slate-500">{b.m}</span>
                    </div>
                  ))}
                </div>
              </GlassCard>

              {/* Live metrics */}
              <GlassCard className="flex flex-col justify-between p-6">
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-blue-500/15 text-blue-400">
                    <Gauge className="size-4" />
                  </div>
                  <span className="text-sm font-medium text-slate-200">Plant Health Score</span>
                </div>
                <div className="mt-4 text-4xl font-extrabold text-white">
                  <AnimatedNumber target={94} suffix="%" />
                </div>
                <div className="mt-2 text-xs text-slate-500">Based on 8D closure rate, SLA compliance, PPM</div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: "94%" }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-400"
                  />
                </div>
              </GlassCard>

              {/* Active modules */}
              <GlassCard className="p-6">
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-400">
                    <Zap className="size-4" />
                  </div>
                  <span className="text-sm font-medium text-slate-200">Active Modules</span>
                </div>
                <div className="mt-4 space-y-3">
                  {[
                    { label: "PlantQuality", pct: 100, color: "bg-emerald-500" },
                    { label: "PlantDock", pct: 80, color: "bg-blue-500" },
                    { label: "PlantTrace", pct: 45, color: "bg-teal-500" },
                  ].map((m) => (
                    <div key={m.label}>
                      <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
                        <span>{m.label}</span>
                        <span>{m.pct}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-800">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${m.pct}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.9 }}
                          className={cn("h-full rounded-full", m.color)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>

              {/* Defects table mini */}
              <GlassCard className="sm:col-span-2 p-6 lg:col-span-2">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-rose-500/15 text-rose-400">
                      <SearchCheck className="size-4" />
                    </div>
                    <span className="text-sm font-medium text-slate-200">Open Defects Overview</span>
                  </div>
                  <span className="text-xs text-slate-500">Updated just now</span>
                </div>
                <div className="overflow-hidden rounded-xl border border-slate-800/60">
                  <div className="grid grid-cols-[1fr_1fr_1fr_80px] gap-2 bg-slate-900/80 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    <span>Defect ID</span>
                    <span>Supplier</span>
                    <span>Stage</span>
                    <span className="text-right">SLA</span>
                  </div>
                  {[
                    ["#8D-2044", "TurboTech GmbH", "D4 Root Cause", "2h"],
                    ["#8D-2039", "Seiko Parts Co", "D5 Corrective", "1d"],
                    ["#8D-2035", "Delta Electronics", "D3 Containment", "3h"],
                    ["#8D-2028", "MetaFab Inc.", "D6 Verification", "5h"],
                  ].map((row, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-[1fr_1fr_1fr_80px] gap-2 border-t border-slate-800/40 px-4 py-3 text-xs text-slate-300 transition-colors hover:bg-slate-800/40"
                    >
                      <span className="font-mono font-semibold text-slate-200">{row[0]}</span>
                      <span>{row[1]}</span>
                      <span className="text-emerald-400">{row[2]}</span>
                      <span className="text-right text-rose-400">{row[3]}</span>
                    </div>
                  ))}
                </div>
              </GlassCard>

              {/* AI Insight */}
              <GlassCard className="p-6">
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-purple-500/15 text-purple-400">
                    <Bot className="size-4" />
                  </div>
                  <span className="text-sm font-medium text-slate-200">AI Insight</span>
                </div>
                <div className="mt-4 space-y-3">
                  {[
                    {
                      icon: Lightbulb,
                      text: "TurboTech GmbH shows 22% repeat defect pattern. Recommend focused audit.",
                    },
                    {
                      icon: TrendingUp,
                      text: "PPM improving trend: -18% this quarter across Tier 1 suppliers.",
                    },
                  ].map((insight, i) => (
                    <div key={i} className="flex gap-2.5">
                      <insight.icon className="mt-0.5 size-4 shrink-0 text-purple-400" />
                      <p className="text-xs leading-relaxed text-slate-400">{insight.text}</p>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>
          </div>
        </section>

        {/* ═══════ Integration Focus ═══════ */}
        <section id="integrations" className="relative border-t border-slate-800/60 bg-[#0b0e14]">
          <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
            <SectionHeading
              eyebrow="Integration Focus"
              title="Hardware Agnostic."
              highlight="Cloud Native."
              description="Deploy in hours, not months. Connect PLCs, ERPs, and edge devices without writing a single line of integration code."
            />

            <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  icon: Cloud,
                  title: "Cloud-Native by Design",
                  desc: "Built on auto-scaling infrastructure. No on-premise servers needed. SOC 2 Type II ready architecture.",
                },
                {
                  icon: Cpu,
                  title: "Edge Connectivity",
                  desc: "Seamless integration with PLCs, SCADA, and IoT sensors via MQTT and OPC-UA protocols.",
                },
                {
                  icon: Link2,
                  title: "ERP Harmonization",
                  desc: "Pre-built connectors for SAP, Oracle, Microsoft Dynamics, and custom REST APIs.",
                },
                {
                  icon: Boxes,
                  title: "Modular Scale",
                  desc: "Start with a single module. Add capacity and connectivity as your factory matures.",
                },
                {
                  icon: Network,
                  title: "Unified Data Mesh",
                  desc: "Every module writes to the same graph-backed data mesh. No more silos, no more drift.",
                },
                {
                  icon: Cog,
                  title: "Automated Workflows",
                  desc: "Trigger actions across modules. A new defect can instantly alert maintenance and block dock receipts.",
                },
              ].map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.1 }}
                  transition={{ duration: 0.45, delay: i * 0.07 }}
                >
                  <GlassCard className="h-full p-6" hover>
                    <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 text-emerald-400 shadow-lg">
                      <item.icon className="size-6" />
                    </div>
                    <h3 className="text-base font-semibold text-slate-100">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-400">{item.desc}</p>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════ CTA ═══════ */}
        <section className="relative overflow-hidden border-t border-slate-800/60 bg-[#0a0c10]">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute -top-[200px] left-1/2 h-[600px] w-[1000px] -translate-x-1/2 rounded-full bg-emerald-500/[0.06] blur-[120px]" />
          </div>
          <div className="mx-auto max-w-4xl px-4 py-24 text-center sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
                Ready to Digitize Your Plant?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg text-slate-400">
                Join the factories already running on PlantX. Start with PlantQuality and grow at your own pace.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href="/login?redirect=/oem">
                  <Button
                    size="lg"
                    className="h-12 gap-2 bg-emerald-500 px-8 text-base font-semibold text-[#0a0c10] shadow-xl shadow-emerald-500/15 hover:bg-emerald-400"
                  >
                    Get Started <ChevronRight className="size-4" />
                  </Button>
                </Link>
                <a href="mailto:hello@plantx.io">
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-12 border-slate-700 bg-transparent px-8 text-base text-slate-200 hover:border-slate-500 hover:bg-slate-800/60"
                  >
                    Contact Sales
                  </Button>
                </a>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* ═══════ Footer ═══════ */}
      <footer className="border-t border-slate-800/60 bg-[#0a0c10]">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-2.5">
              <div className="flex size-7 items-center justify-center rounded-md bg-gradient-to-br from-emerald-500 to-blue-600">
                <Factory className="size-4 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-sm font-bold tracking-tight text-white">PlantX</span>
            </div>
            <p className="text-xs text-slate-500">
              &copy; {new Date().getFullYear()} PlantX Technologies. All rights reserved.
            </p>
            <div className="flex gap-6">
              {["Privacy", "Terms", "Status"].map((t) => (
                <span key={t} className="cursor-pointer text-xs text-slate-500 hover:text-slate-300 transition-colors">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </footer>

      <WaitlistDialog
        product={waitlistProduct}
        open={!!waitlistProduct}
        onOpenChange={(v) => {
          if (!v) setWaitlistProduct(null)
        }}
      />
    </div>
  )
}
