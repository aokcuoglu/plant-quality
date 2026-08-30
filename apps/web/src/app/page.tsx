"use client"

import React, { useState, useEffect } from "react"
import { motion, useScroll, useTransform } from "motion/react"
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
  TruckIcon,
  Users,
  Warehouse,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useMounted } from "@/hooks/use-mounted"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { OpenAppButton } from "@/components/landing/OpenAppButton"
import { joinWaitlist } from "@/app/actions/waitlist"
import { useTranslations } from "@/i18n/context"
import { LanguageSwitcher } from "@/i18n/LanguageSwitcher"
import type { MessageKey } from "@/i18n/types"
import { waitlistEmailSchema } from "@/lib/validation"

/* ─────────── Product Data ─────────── */

type ProductStatus = "live" | "upcoming" | "planned"

interface Product {
  id: string
  name: string
  taglineKey: MessageKey
  icon: React.ElementType
  status: ProductStatus
  color: string
  accent: string
}

const products: Product[] = [
  {
    id: "quality",
    name: "PlantQuality",
    taglineKey: "landing.productTaglines.quality",
    icon: ShieldCheck,
    status: "live",
    color: "from-blue-500 to-blue-700",
    accent: "bg-muted text-muted-foreground",
  },
  {
    id: "logistic",
    name: "PlantLogistic",
    taglineKey: "landing.productTaglines.logistic",
    icon: TruckIcon,
    status: "live",
    color: "from-blue-400 to-blue-600",
    accent: "bg-muted text-muted-foreground",
  },
  {
    id: "dock",
    name: "PlantDock",
    taglineKey: "landing.productTaglines.dock",
    icon: Warehouse,
    status: "upcoming",
    color: "from-indigo-400 to-indigo-600",
    accent: "bg-indigo-500/10 text-indigo-400",
  },
  {
    id: "quote",
    name: "PlantQuote",
    taglineKey: "landing.productTaglines.quote",
    icon: FileText,
    status: "upcoming",
    color: "from-cyan-400 to-cyan-600",
    accent: "bg-cyan-500/10 text-cyan-400",
  },
  {
    id: "trace",
    name: "PlantTrace",
    taglineKey: "landing.productTaglines.trace",
    icon: Leaf,
    status: "planned",
    color: "from-teal-400 to-teal-600",
    accent: "bg-teal-500/10 text-teal-400",
  },
  {
    id: "audit",
    name: "PlantAudit",
    taglineKey: "landing.productTaglines.audit",
    icon: ClipboardCheck,
    status: "planned",
    color: "from-violet-400 to-violet-600",
    accent: "bg-violet-500/10 text-violet-400",
  },
  {
    id: "asset",
    name: "PlantAsset",
    taglineKey: "landing.productTaglines.asset",
    icon: Settings,
    status: "planned",
    color: "from-amber-400 to-amber-600",
    accent: "bg-destructive/10 text-destructive",
  },
  {
    id: "flow",
    name: "PlantFlow",
    taglineKey: "landing.productTaglines.flow",
    icon: MoveRight,
    status: "planned",
    color: "from-sky-400 to-sky-600",
    accent: "bg-sky-500/10 text-sky-400",
  },
  {
    id: "staff",
    name: "PlantStaff",
    taglineKey: "landing.productTaglines.staff",
    icon: Users,
    status: "planned",
    color: "from-rose-400 to-rose-600",
    accent: "bg-muted0/10 text-destructive",
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
  const t = useTranslations()
  const [email, setEmail] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!product) return null

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const parsed = waitlistEmailSchema({
      invalid: t("validation.emailInvalid"),
      required: t("validation.required"),
    }).safeParse(email)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? t("landing.waitlist.invalid"))
      return
    }
    setPending(true)
    if (!product) return

    const result = await joinWaitlist(parsed.data, product.name)
    if (result.success) {
      toast({ title: t("landing.waitlist.joined", { name: product.name }) })
      setEmail("")
      onOpenChange(false)
    } else {
      toast({
        title: ("error" in result ? result.error : null) ?? t("landing.waitlist.error"),
        type: "destructive",
      })
    }
    setPending(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-border bg-card/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-foreground">{t("landing.waitlist.title", { name: product.name })}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {t("landing.waitlist.description", { name: product.name })}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Input
            type="email"
            placeholder={t("landing.waitlist.emailPlaceholder")}
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setError(null)
            }}
            aria-invalid={!!error}
            className="border-border bg-muted text-foreground placeholder:text-muted-foreground/60"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full gap-2" disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {t("landing.waitlist.joining")}
              </>
            ) : (
              <>
                {t("landing.waitlist.join")} <BellRing className="size-4" />
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
  const mounted = useMounted()

  if (!mounted) return null

  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* Slow pulsing orbs */}
      <div className="absolute top-1/2 left-1/2 size-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/[0.07] blur-[120px]" />
      <div className="absolute top-1/3 right-1/4 size-[500px] rounded-full bg-blue-500/[0.06] blur-[100px]" />
      <div className="absolute bottom-0 left-0 size-[400px] rounded-full bg-cyan-500/[0.05] blur-[80px]" />

      {/* Glowing SVG network */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.18]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="netGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.5" />
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
          <circle key={i} cx={cx} cy={cy} r={2.5} fill="#3b82f6" opacity={0.5} />
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
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium tracking-widest uppercase text-foreground">
          <Sparkles className="size-3.5" />
          {eyebrow}
        </div>
      )}
      <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
        {title} <span className="text-foreground">{highlight}</span>
      </h2>
      <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{description}</p>
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
        "relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-md transition-all",
        hover && "hover:border-border/70 hover:shadow-lg hover:shadow-blue-600/5",
        className
      )}
    >
      {children}
    </div>
  )
}

/* ─────────── Page ─────────── */

export default function LandingPage() {
  const t = useTranslations()
  const [waitlistProduct, setWaitlistProduct] = useState<Product | null>(null)
  const { scrollYProgress } = useScroll()
  const heroOpacity = useTransform(scrollYProgress, [0, 0.18], [1, 0])
  const heroY = useTransform(scrollYProgress, [0, 0.18], [0, -60])

  const navLinks = [
    { label: t("landing.ecosystem"), href: "#ecosystem" },
    { label: t("landing.platform"), href: "#platform" },
    { label: t("landing.integrations"), href: "#integrations" },
  ]

  const integrationItems = [
    {
      icon: Cloud,
      title: t("landing.integrationItems.cloudTitle"),
      desc: t("landing.integrationItems.cloudDesc"),
    },
    {
      icon: Cpu,
      title: t("landing.integrationItems.edgeTitle"),
      desc: t("landing.integrationItems.edgeDesc"),
    },
    {
      icon: Link2,
      title: t("landing.integrationItems.erpTitle"),
      desc: t("landing.integrationItems.erpDesc"),
    },
    {
      icon: Boxes,
      title: t("landing.integrationItems.scaleTitle"),
      desc: t("landing.integrationItems.scaleDesc"),
    },
    {
      icon: Network,
      title: t("landing.integrationItems.meshTitle"),
      desc: t("landing.integrationItems.meshDesc"),
    },
    {
      icon: Cog,
      title: t("landing.integrationItems.workflowTitle"),
      desc: t("landing.integrationItems.workflowDesc"),
    },
  ]

  const footerLinks = [
    t("landing.footerLink.privacy"),
    t("landing.footerLink.terms"),
    t("landing.footerLink.status"),
  ]

  return (
    <div className="dark flex min-h-dvh flex-col bg-background text-muted-foreground selection:bg-foreground/30">
      {/* ─── Header ─── */}
      <header className="fixed top-0 z-50 w-full border-b border-border bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <div className="relative flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-600/20">
              <Factory className="size-4.5 text-foreground" strokeWidth={2.5} />
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">PlantX</span>
          </div>

          <nav className="hidden items-center gap-6 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <a href="#ecosystem">
              <Button
                size="sm"
                className="bg-foreground text-background font-semibold hover:bg-foreground/80 shadow-lg shadow-foreground/10"
              >
                {t("landing.explore")}
              </Button>
            </a>
          </div>
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
              className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-1.5 text-xs font-medium tracking-wider uppercase text-muted-foreground backdrop-blur-sm"
            >
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-blue-500 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-foreground" />
              </span>
              {t("landing.badge")}
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-5xl font-extrabold tracking-tight text-foreground sm:text-6xl md:text-7xl lg:text-8xl"
            >
              <span className="block">{t("landing.title1")}</span>
              <span className="mt-2 block bg-gradient-to-r from-blue-400 via-blue-500 to-blue-700 bg-clip-text text-transparent">
                {t("landing.title2")}
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl"
            >
              {t("landing.subtitle")}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
            >
              <OpenAppButton
                  size="lg"
                  className="h-12 gap-2 bg-foreground px-8 text-base font-semibold text-background shadow-xl shadow-foreground/10 transition-transform hover:bg-foreground/80 hover:scale-[1.02] hover:shadow-foreground/15"
                >
                  {t("landing.launch")} <ChevronRight className="size-4" />
                </OpenAppButton>
              <a href="#ecosystem">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 border-border bg-transparent px-8 text-base text-muted-foreground hover:border-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  {t("landing.explore")}
                </Button>
              </a>
            </motion.div>
          </motion.div>
        </section>

        {/* ═══════ Product Ecosystem (Bento) ═══════ */}
        <section id="ecosystem" className="relative border-t border-border bg-sidebar">
          <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
            <SectionHeading
              eyebrow={t("landing.modularArch")}
              title={t("landing.ecoTitle")}
              highlight={t("landing.ecoHighlight")}
              description={t("landing.ecoDescription")}
            />

            <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {productsSorted.map((product, i) => {
                const Icon = product.icon
                const isLive = product.status === "live"
                const isUpcoming = product.status === "upcoming"

                return (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 24, scale: 0.97 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: true, amount: 0.1 }}
                    transition={{ type: "spring", stiffness: 140, damping: 20, delay: i * 0.06 }}
                    whileHover={{ y: -6, scale: 1.02 }}
                    className={cn(
                      "group relative flex flex-col overflow-hidden rounded-2xl border bg-card/60 p-6 backdrop-blur-md",
                      "transition-[border-color,box-shadow] duration-300",
                      isLive
                        ? "border-border hover:border-brand/50 hover:shadow-2xl hover:shadow-brand/15"
                        : "border-border hover:border-border/80 hover:shadow-xl hover:shadow-foreground/5"
                    )}
                  >
                    {/* rotating gradient border — live modules */}
                    {isLive && (
                      <div
                        aria-hidden
                        className="pointer-events-none absolute -inset-px overflow-hidden rounded-2xl"
                      >
                        <div className="absolute -inset-[100%] animate-[spin_6s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0deg,var(--brand)_80deg,transparent_160deg,var(--brand)_240deg,transparent_320deg)] opacity-30 transition-opacity duration-300 group-hover:opacity-70" />
                      </div>
                    )}

                    {/* breathing ambient glow — live modules */}
                    {(product.id === "quality" || product.id === "logistic") && (
                      <motion.div
                        aria-hidden
                        initial={{ opacity: 0.5 }}
                        animate={{ opacity: [0.35, 0.9, 0.35], scale: [1, 1.06, 1] }}
                        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                        className={cn(
                          "pointer-events-none absolute -top-20 -right-20 size-72 rounded-full blur-[80px]",
                          product.id === "quality" ? "bg-foreground/10" : "bg-brand/10"
                        )}
                      />
                    )}

                    <div className="mb-4 flex items-start justify-between">
                      <div
                        className={cn(
                          "flex size-10 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3",
                          product.accent
                        )}
                      >
                        <Icon className="size-5" />
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "border px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase",
                          isLive && "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
                          isUpcoming && "border-amber-500/40 bg-amber-500/10 text-amber-400",
                          !isLive && !isUpcoming && "border-border bg-muted text-muted-foreground"
                        )}
                      >
                        {isLive ? (
                          <>
                            <span className="relative flex size-1.5">
                              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                              <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
                            </span>
                            {t("landing.productStatus.live")}
                          </>
                        ) : isUpcoming ? (
                          <>
                            <span className="size-1.5 rounded-full bg-amber-400" />
                            {t("landing.productStatus.upcoming")}
                          </>
                        ) : (
                          <>
                            <span className="size-1.5 rounded-full bg-muted-foreground/50" />
                            {t("landing.productStatus.planned")}
                          </>
                        )}
                      </Badge>
                    </div>

                    <h3 className="text-lg font-semibold text-foreground">{product.name}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t(product.taglineKey)}</p>

                    <div className="mt-auto pt-5">
                      {isLive ? (
                        <OpenAppButton
                          size="sm"
                          className="w-full gap-1 bg-foreground text-background font-semibold shadow-md shadow-brand/10 transition-all duration-300 hover:bg-foreground/85 group-hover:shadow-lg group-hover:shadow-brand/20"
                        >
                          {t("landing.openApp")}
                          <ChevronRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
                        </OpenAppButton>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full border-border text-muted-foreground hover:border-muted-foreground hover:bg-muted hover:text-foreground"
                          onClick={() => setWaitlistProduct(product)}
                        >
                          <BellRing className="mr-1.5 size-3.5" />
                          {t("landing.notifyMe")}
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
        <section id="platform" className="relative overflow-hidden border-t border-border bg-card">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute top-0 left-1/2 h-[600px] w-[1200px] -translate-x-1/2 bg-gradient-radial from-blue-600/[0.06] to-transparent blur-3xl" />
          </div>

          <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
            <SectionHeading
              eyebrow={t("landing.dataDriven")}
              title={t("landing.dataTitle")}
              highlight={t("landing.dataHighlight")}
              description={t("landing.dataDescription")}
            />

            {/* Bento-style dashboard grid */}
            <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Main chart card */}
              <GlassCard className="sm:col-span-2 lg:col-span-2 p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-foreground/15 text-foreground">
                      <BarChart3 className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{t("landing.defectRate")}</p>
                      <p className="text-xs text-muted-foreground/60">{t("landing.monthlyAggregated")}</p>
                    </div>
                  </div>
                  <Badge className="border-border bg-muted text-muted-foreground text-[10px]">
                    -12% YoY
                  </Badge>
                </div>
                <div className="flex items-end justify-between gap-2 rounded-xl border border-border bg-card/80 p-4">
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
                        className="w-full rounded-t-sm bg-gradient-to-t from-blue-600/60 to-blue-500/90"
                      />
                      <span className="text-[10px] text-muted-foreground/60">{b.m}</span>
                    </div>
                  ))}
                </div>
              </GlassCard>

              {/* Live metrics */}
              <GlassCard className="flex flex-col justify-between p-6">
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-blue-500/15 text-muted-foreground">
                    <Gauge className="size-4" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">{t("landing.plantHealth")}</span>
                </div>
                <div className="mt-4 text-4xl font-extrabold text-foreground">
                  <AnimatedNumber target={94} suffix="%" />
                </div>
                <div className="mt-2 text-xs text-muted-foreground/60">{t("landing.healthCaption")}</div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: "94%" }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400"
                  />
                </div>
              </GlassCard>

              {/* Active modules */}
              <GlassCard className="p-6">
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-400">
                    <Zap className="size-4" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">{t("landing.activeModules")}</span>
                </div>
                <div className="mt-4 space-y-3">
                  {[
                    { label: "PlantQuality", pct: 100, color: "bg-foreground" },
                    { label: "PlantLogistic", pct: 90, color: "bg-blue-500" },
                    { label: "PlantDock", pct: 80, color: "bg-indigo-500" },
                  ].map((m) => (
                    <div key={m.label}>
                      <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                        <span>{m.label}</span>
                        <span>{m.pct}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted">
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
                    <div className="flex size-8 items-center justify-center rounded-lg bg-muted0/15 text-destructive">
                      <SearchCheck className="size-4" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">{t("landing.openDefects")}</span>
                  </div>
                  <span className="text-xs text-muted-foreground/60">{t("landing.updatedNow")}</span>
                </div>
                <div className="overflow-hidden rounded-xl border border-border">
                  <div className="grid grid-cols-[1fr_1fr_1fr_80px] gap-2 bg-card/80 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                    <span>{t("landing.defectId")}</span>
                    <span>{t("landing.supplier")}</span>
                    <span>{t("landing.stage")}</span>
                    <span className="text-right">{t("landing.sla")}</span>
                  </div>
                  {[
                    ["#8D-2044", "TurboTech GmbH", "D4 Root Cause", "2h"],
                    ["#8D-2039", "Seiko Parts Co", "D5 Corrective", "1d"],
                    ["#8D-2035", "Delta Electronics", "D3 Containment", "3h"],
                    ["#8D-2028", "MetaFab Inc.", "D6 Verification", "5h"],
                  ].map((row, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-[1fr_1fr_1fr_80px] gap-2 border-t border-border px-4 py-3 text-xs text-muted-foreground transition-colors hover:bg-muted/40"
                    >
                      <span className="font-mono font-semibold text-muted-foreground">{row[0]}</span>
                      <span>{row[1]}</span>
                      <span className="text-foreground">{row[2]}</span>
                      <span className="text-right text-destructive">{row[3]}</span>
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
                  <span className="text-sm font-medium text-muted-foreground">{t("landing.aiInsight")}</span>
                </div>
                <div className="mt-4 space-y-3">
                  {[
                    {
                      icon: Lightbulb,
                      text: t("landing.insights.repeat"),
                    },
                    {
                      icon: TrendingUp,
                      text: t("landing.insights.ppm"),
                    },
                  ].map((insight, i) => (
                    <div key={i} className="flex gap-2.5">
                      <insight.icon className="mt-0.5 size-4 shrink-0 text-purple-400" />
                      <p className="text-xs leading-relaxed text-muted-foreground">{insight.text}</p>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>
          </div>
        </section>

        {/* ═══════ Integration Focus ═══════ */}
        <section id="integrations" className="relative border-t border-border bg-sidebar">
          <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
            <SectionHeading
              eyebrow={t("landing.integrationFocus")}
              title={t("landing.integrationTitle")}
              highlight={t("landing.integrationHighlight")}
              description={t("landing.integrationDescription")}
            />

            <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {integrationItems.map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.1 }}
                  transition={{ duration: 0.45, delay: i * 0.07 }}
                  whileHover={{ y: -4 }}
                >
                  <GlassCard className="h-full p-6" hover>
                    <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-muted to-card border border-border text-foreground shadow-lg transition-transform duration-300 group-hover:scale-110">
                      <item.icon className="size-6" />
                    </div>
                    <h3 className="text-base font-semibold text-foreground">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════ CTA ═══════ */}
        <section className="relative overflow-hidden border-t border-border bg-background">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute -top-[200px] left-1/2 h-[600px] w-[1000px] -translate-x-1/2 rounded-full bg-foreground/[0.06] blur-[120px]" />
          </div>
          <div className="mx-auto max-w-4xl px-4 py-24 text-center sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                {t("landing.ctaTitle")}
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
                {t("landing.ctaDescription")}
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <OpenAppButton
                  size="lg"
                  className="h-12 gap-2 bg-foreground px-8 text-base font-semibold text-background shadow-xl shadow-foreground/10 hover:bg-foreground/80"
                >
                  {t("landing.getStarted")} <ChevronRight className="size-4" />
                </OpenAppButton>
                <a href="mailto:hello@plantx.io">
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-12 border-border bg-transparent px-8 text-base text-muted-foreground hover:border-muted-foreground hover:bg-muted"
                  >
                    {t("landing.contactSales")}
                  </Button>
                </a>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* ═══════ Footer ═══════ */}
      <footer className="border-t border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-2.5">
              <div className="flex size-7 items-center justify-center rounded-md bg-gradient-to-br from-blue-500 to-blue-700">
                <Factory className="size-4 text-foreground" strokeWidth={2.5} />
              </div>
              <span className="text-sm font-bold tracking-tight text-foreground">PlantX</span>
            </div>
            <p className="text-xs text-muted-foreground/60">
              &copy; {new Date().getFullYear()} {t("landing.footerRights")}
            </p>
            <div className="flex gap-6">
              {footerLinks.map((link, idx) => (
                <span key={idx} className="cursor-pointer text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors">
                  {link}
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
