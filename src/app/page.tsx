"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import {
  ShieldCheck,
  Warehouse,
  FileText,
  Leaf,
  ClipboardCheck,
  Settings,
  MoveRight,
  Users,
  ArrowRight,
  BellRing,
  Loader2,
  Factory,
  Sparkles,
  MapPin,
  Rocket,
  ArrowLeftRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { joinWaitlist } from "@/app/actions/waitlist"

type BrandIcon = typeof ShieldCheck

interface Brand {
  id: string
  name: string
  description: string
  icon: BrandIcon
  active: boolean
  href?: string
}

const brands: Brand[] = [
  {
    id: "quality",
    name: "PlantQuality",
    description: "AI-Powered 8D & Quality Mgmt",
    icon: ShieldCheck,
    // TODO: Replace the redirect param value with the actual dashboard route
    active: true,
    href: "/login?redirect=/oem",
  },
  {
    id: "dock",
    name: "PlantDock",
    description: "Warehouse Gate & Logistics",
    icon: Warehouse,
    active: false,
  },
  {
    id: "quote",
    name: "PlantQuote",
    description: "RFQ & Supplier Bidding",
    icon: FileText,
    active: false,
  },
  {
    id: "trace",
    name: "PlantTrace / PlantGreen",
    description: "Traceability & Carbon Footprint",
    icon: Leaf,
    active: false,
  },
  {
    id: "audit",
    name: "PlantAudit",
    description: "Digital Auditing (LPA, VDA)",
    icon: ClipboardCheck,
    active: false,
  },
  {
    id: "asset",
    name: "PlantAsset",
    description: "Machinery Maintenance & OEE",
    icon: Settings,
    active: false,
  },
  {
    id: "flow",
    name: "PlantFlow",
    description: "Internal Material Flow & RFID",
    icon: MoveRight,
    active: false,
  },
  {
    id: "staff",
    name: "PlantStaff",
    description: "Skill Matrix & HSE Compliance",
    icon: Users,
    active: false,
  },
]

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.07 },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: "easeOut" as const },
  },
}

function WaitlistModal({
  brand,
  open,
  onOpenChange,
}: {
  brand: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [email, setEmail] = useState("")
  const [pending, setPending] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  if (!brand) return null

  function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setValidationError(null)

    if (!isValidEmail(email)) {
      setValidationError("Please enter a valid email address.")
      return
    }

    setPending(true)

    const result = await joinWaitlist(email, brand!)

    if (result.success) {
      toast({
        title: "Successfully joined the waitlist!",
        description: `You are now on the list for ${brand}.`,
      })
      setEmail("")
      onOpenChange(false)
    } else {
      toast({
        title: result.error ?? "Something went wrong.",
        type: "destructive",
      })
    }

    setPending(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Get Early Access to {brand}</DialogTitle>
          <DialogDescription>
            Be the first to know when {brand} launches. We&apos;ll notify you
            personally.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            name="email"
            placeholder="you@company.com"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setValidationError(null)
            }}
          />
          {validationError && (
            <p className="text-xs text-destructive">{validationError}</p>
          )}
          <Button type="submit" className="w-full gap-2" disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Joining&hellip;
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

function EcosystemCard({
  brand,
  onNotify,
}: {
  brand: Brand
  onNotify: (name: string) => void
}) {
  const Icon = brand.icon

  return (
    <motion.div
      variants={cardVariants}
      whileHover={brand.active ? { scale: 1.03, y: -4 } : { scale: 1.02 }}
      className="relative"
    >
      <Card
        className={cn(
          "group h-full transition-all duration-300",
          brand.active
            ? "border-emerald-500/40 bg-card shadow-lg shadow-emerald-500/5"
            : "border-border/40 bg-muted/20 opacity-80 shadow-sm"
        )}
      >
        <CardHeader>
          <div className="flex items-start justify-between">
            <div
              className={cn(
                "mb-2 flex size-10 items-center justify-center rounded-lg transition-colors",
                brand.active
                  ? "bg-emerald-500/10 text-emerald-500"
                  : "bg-muted-foreground/5 text-muted-foreground/60"
              )}
            >
              <Icon className="size-5" />
            </div>
            {brand.active ? (
              <Badge className="border-emerald-400/40 bg-emerald-400/10 text-emerald-500 text-[10px] font-semibold tracking-wider uppercase">
                <Sparkles className="mr-1 inline size-2.5" />
                Live Now
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="border-slate-400/30 bg-slate-400/5 text-muted-foreground text-[10px] font-semibold tracking-wider uppercase"
              >
                Coming Soon
              </Badge>
            )}
          </div>
          <CardTitle
            className={cn(
              "text-base",
              !brand.active && "text-muted-foreground/80"
            )}
          >
            {brand.name}
          </CardTitle>
          <CardDescription>{brand.description}</CardDescription>
        </CardHeader>
        <CardContent>
          {brand.active && (
            <Link href={brand.href!}>
              <Button
                variant="default"
                size="sm"
                className="w-full gap-1.5 text-xs"
              >
                Go to App <ArrowRight className="size-3.5" />
              </Button>
            </Link>
          )}
          {!brand.active && (
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5 border-slate-300/40 text-xs text-muted-foreground hover:text-foreground hover:border-foreground/20"
              onClick={() => onNotify(brand.name)}
            >
              <BellRing className="size-3.5" />
              Notify Me
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default function LandingPage() {
  const pathname = usePathname()
  const [waitlistBrand, setWaitlistBrand] = useState<string | null>(null)

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 font-semibold text-lg tracking-tight">
            <Factory className="size-5 text-emerald-500" />
            PlantX
          </div>
        </div>
      </header>

      <main key={pathname} className="flex-1">
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900/5 via-slate-800/[0.02] to-transparent dark:from-slate-100/10 dark:via-slate-50/5" />
            <div className="absolute top-[-10%] left-1/2 size-[800px] -translate-x-1/2 rounded-full bg-emerald-500/4 blur-3xl" />
            <div className="absolute top-[5%] right-[-5%] size-[500px] rounded-full bg-blue-500/3 blur-3xl" />
            <div className="absolute bottom-0 left-[-5%] size-[400px] rounded-full bg-emerald-500/3 blur-3xl" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
          </div>
          <div className="mx-auto max-w-7xl px-4 pt-24 pb-16 sm:px-6 sm:pt-32 lg:px-8 lg:pt-40 lg:pb-24">
            <motion.div
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="mx-auto max-w-4xl text-center"
            >
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                <span className="bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600 bg-clip-text text-transparent">
                  PlantX:
                </span>{" "}
                <span className="bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
                  The Digital OS for Modern Factories.
                </span>
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-muted-foreground sm:text-xl max-w-3xl mx-auto">
                A modular, interconnected ecosystem designed to digitize every
                aspect of your plant—from quality control to logistics.
              </p>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground/80 max-w-2xl mx-auto">
                PlantX is a unified nervous system for manufacturing. We
                eliminate data silos by connecting quality control, supply
                chain, maintenance, and logistics into one seamless platform.
              </p>
              <div className="mt-10 flex items-center justify-center gap-4">
                <a href="#ecosystem-grid">
                  <Button size="lg" className="gap-2 text-base">
                    Discover the Ecosystem
                    <ArrowRight className="size-4" />
                  </Button>
                </a>
                <a href="#roadmap">
                  <Button variant="outline" size="lg" className="text-base">
                    View Roadmap
                  </Button>
                </a>
              </div>
            </motion.div>
          </div>
        </section>

        <section id="roadmap" className="border-t border-border/40">
          <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ duration: 0.5 }}
              className="mb-14 text-center"
            >
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Our Vision &amp;{" "}
                <span className="text-emerald-500">Roadmap</span>
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
                A phased rollout bringing the full PlantX ecosystem to life.
              </p>
            </motion.div>

            <div className="relative mx-auto max-w-3xl">
              <div className="absolute left-[19px] top-0 hidden h-full w-px bg-gradient-to-b from-emerald-500/60 via-emerald-500/30 to-transparent sm:block" />
              <motion.div
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.1 }}
                className="space-y-12"
              >
                {[
                  {
                    phase: "Phase 1",
                    label: "Foundation",
                    status: "Live",
                    icon: Rocket,
                    color: "text-emerald-500",
                    border: "border-emerald-500/30",
                    bg: "bg-emerald-500/10",
                    dot: "bg-emerald-500",
                    ring: "ring-emerald-500/20",
                    description:
                      'Launching <span class="font-semibold text-foreground">PlantQuality</span> with AI-powered 8D reporting, defect tracking, and supplier quality management.',
                  },
                  {
                    phase: "Phase 2",
                    label: "Supply Chain Sync",
                    status: "Upcoming",
                    icon: ArrowLeftRight,
                    color: "text-blue-500",
                    border: "border-blue-500/20",
                    bg: "bg-blue-500/5",
                    dot: "bg-blue-500",
                    ring: "ring-blue-500/20",
                    description:
                      'Introducing <span class="font-semibold text-foreground">PlantQuote</span> for RFQ & supplier bidding and <span class="font-semibold text-foreground">PlantDock</span> for warehouse gate & logistics appointment management.',
                  },
                  {
                    phase: "Phase 3",
                    label: "Full Factory Floor",
                    status: "Future",
                    icon: MapPin,
                    color: "text-slate-500",
                    border: "border-slate-400/20",
                    bg: "bg-slate-400/5",
                    dot: "bg-slate-400",
                    ring: "ring-slate-400/20",
                    description:
                      'Deploying <span class="font-semibold text-foreground">PlantAudit</span>, <span class="font-semibold text-foreground">PlantAsset</span>, and <span class="font-semibold text-foreground">PlantFlow</span> — covering digital auditing, machinery maintenance, OEE, and internal material flow.',
                  },
                ].map((milestone, i) => {
                  const Icon = milestone.icon
                  return (
                    <motion.div
                      key={milestone.phase}
                      variants={{
                        hidden: { opacity: 0, x: -20 },
                        visible: {
                          opacity: 1,
                          x: 0,
                          transition: {
                            duration: 0.5,
                            ease: "easeOut",
                            delay: i * 0.12,
                          },
                        },
                      }}
                      className="relative flex flex-col gap-3 sm:flex-row"
                    >
                      <div className="flex shrink-0 items-center gap-3 sm:w-36 sm:flex-col sm:items-end sm:gap-1">
                        <div
                          className={`relative z-10 flex size-10 items-center justify-center rounded-full border ${milestone.border} ${milestone.ring} ring-2 ${milestone.bg} sm:order-2 sm:ml-auto sm:mr-[-29px]`}
                        >
                          <Icon className={`size-4 ${milestone.color}`} />
                        </div>
                        <span
                          className={`text-sm font-semibold whitespace-nowrap sm:order-1 ${milestone.color}`}
                        >
                          {milestone.phase}
                        </span>
                      </div>
                      <div className="flex-1 rounded-xl border border-border/40 bg-card p-5 sm:ml-10">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-base font-semibold">
                            {milestone.label}
                          </h3>
                          <Badge
                            variant={
                              milestone.status === "Live"
                                ? "default"
                                : "outline"
                            }
                            className={cn(
                              "text-[10px] font-semibold tracking-wider uppercase",
                              milestone.status === "Live" &&
                                "bg-emerald-500/10 text-emerald-500 border-emerald-400/30",
                              milestone.status === "Upcoming" &&
                                "border-blue-400/30 bg-blue-400/5 text-blue-500",
                              milestone.status === "Future" &&
                                "border-slate-400/30 bg-slate-400/5 text-muted-foreground"
                            )}
                          >
                            {milestone.status === "Future"
                              ? "Planned"
                              : milestone.status}
                          </Badge>
                        </div>
                        <p
                          className="text-sm text-muted-foreground leading-relaxed"
                          dangerouslySetInnerHTML={{
                            __html: milestone.description,
                          }}
                        />
                      </div>
                    </motion.div>
                  )
                })}
              </motion.div>
            </div>
          </div>
        </section>

        <section
          id="ecosystem-grid"
          className="border-t border-border/40 bg-muted/30"
        >
          <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ duration: 0.5 }}
              className="mb-14 text-center"
            >
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                The <span className="text-emerald-500">PlantX</span> Ecosystem
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
                Eight modular brands working in concert to deliver a 360-degree
                view of plant health.
              </p>
            </motion.div>

            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.1 }}
              className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
            >
              {brands.map((brand) => (
                <EcosystemCard
                  key={brand.id}
                  brand={brand}
                  onNotify={setWaitlistBrand}
                />
              ))}
            </motion.div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/40">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-center px-4 sm:px-6 lg:px-8">
          <p className="text-xs text-muted-foreground">
            PlantX Ecosystem &copy; 2026. Empowering Automotive Manufacturing.
          </p>
        </div>
      </footer>

      <WaitlistModal
        brand={waitlistBrand}
        open={waitlistBrand !== null}
        onOpenChange={(open) => {
          if (!open) setWaitlistBrand(null)
        }}
      />
    </div>
  )
}
