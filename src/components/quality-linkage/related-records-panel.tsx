"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import {
  AlertTriangle,
  Bug,
  ClipboardCheck,
  FileCheck,
  FileText,
  Link2,
  ShieldAlert,
  Unlink,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import type { GroupedRelatedRecords, Confidence } from "@/lib/quality-linkage/types"
import {
  QUALITY_RECORD_TYPE_LABELS,
  QUALITY_RECORD_TYPE_COLORS,
  QUALITY_LINK_TYPE_LABELS,
  QUALITY_LINK_TYPE_COLORS,
  CONFIDENCE_STYLES,
} from "@/lib/quality-linkage/types"
import type { QualityRecordType, QualityLinkType } from "@/generated/prisma/client"

const RECORD_TYPE_ICONS: Record<QualityRecordType, React.ReactNode> = {
  FIELD_DEFECT: <AlertTriangle className="h-4 w-4" />,
  DEFECT: <Bug className="h-4 w-4" />,
  EIGHT_D: <FileText className="h-4 w-4" />,
  PPAP: <FileCheck className="h-4 w-4" />,
  IQC: <ClipboardCheck className="h-4 w-4" />,
  FMEA: <ShieldAlert className="h-4 w-4" />,
}

function ConfidenceBadge({ confidence, score }: { confidence: Confidence; score: number }) {
  const style = CONFIDENCE_STYLES[confidence]
  if (!style) return null
  return (
    <Badge
      variant="outline"
      className={`${style.className} text-[10px] px-1.5 py-0 border`}
      title={`Match score: ${score}`}
    >
      {style.label}
    </Badge>
  )
}

interface RelatedQualityRecordsPanelProps {
  groupedRecords: GroupedRelatedRecords[]
  loading?: boolean
  error?: string | null
  sourceType: QualityRecordType
  sourceId: string
  canLink?: boolean
  onCreateLink?: (input: {
    sourceType: QualityRecordType
    sourceId: string
    targetType: QualityRecordType
    targetId: string
    linkType: QualityLinkType
    reason?: string
  }) => Promise<{ ok?: boolean; error?: string } | null>
  onRemoveLink?: (linkId: string) => Promise<{ ok?: boolean; error?: string } | null>
  manualLinks?: Array<{
    id: string
    sourceType: QualityRecordType
    sourceId: string
    targetType: QualityRecordType
    targetId: string
    linkType: QualityLinkType
    reason: string | null
  }>
}

export function RelatedQualityRecordsPanel({
  groupedRecords,
  loading,
  error,
  sourceType,
  sourceId,
  canLink,
  onCreateLink,
  onRemoveLink,
  manualLinks,
}: RelatedQualityRecordsPanelProps) {
  const [unlinkingLinkId, setUnlinkingLinkId] = useState<string | null>(null)
  const [unlinkError, setUnlinkError] = useState<string | null>(null)
  const manualLinkIds = useMemo(() => {
    if (!manualLinks || manualLinks.length === 0) return new Set<string>()
    const ids = new Set<string>()
    for (const link of manualLinks) {
      const isSource = link.sourceType === sourceType && link.sourceId === sourceId
      const targetId = isSource ? link.targetId : link.sourceId
      ids.add(targetId)
    }
    return ids
  }, [manualLinks, sourceType, sourceId])

  const totalRecords = groupedRecords.reduce((s, g) => s + g.records.length, 0)
  const hasManualLinks = manualLinks && manualLinks.length > 0

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Related Quality Records
            {totalRecords > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {totalRecords}
              </Badge>
            )}
          </CardTitle>
          {canLink && onCreateLink && (
            <LinkRecordDialog
              sourceType={sourceType}
              sourceId={sourceId}
              onCreateLink={onCreateLink}
            />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        )}
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        {!loading && !error && groupedRecords.length === 0 && !hasManualLinks && (
          <div className="text-center py-6">
            <Link2 className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">No related quality records found.</p>
            <p className="text-xs text-muted-foreground mt-1">Records with shared parts, suppliers, or failure modes will appear here.</p>
          </div>
        )}

        {hasManualLinks && !loading && !error && (
          <>
            <h4 className="text-xs font-medium uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <Link2 className="h-3.5 w-3.5" />
              Manual Links
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {manualLinks!.length}
              </Badge>
            </h4>
            {unlinkError && (
              <p className="text-xs text-destructive">{unlinkError}</p>
            )}
            <div className="space-y-1">
              {manualLinks!.map((link) => {
                const isSource = link.sourceType === sourceType && link.sourceId === sourceId
                const displayType = isSource ? link.targetType : link.sourceType
                const displayId = isSource ? link.targetId : link.sourceId
                return (
                  <div
                    key={link.id}
                    className="flex items-center justify-between gap-2 rounded border border-emerald-500/20 bg-emerald-500/5 p-2 text-sm"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Badge variant="outline" className="bg-foreground/10 text-foreground border-foreground/20 text-[10px] px-1.5 py-0">
                        Manual
                      </Badge>
                      <Badge variant="outline" className={`${QUALITY_RECORD_TYPE_COLORS[displayType]} text-[10px] px-1.5 py-0 border`}>
                        {QUALITY_RECORD_TYPE_LABELS[displayType]}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-mono truncate">
                        {displayId.slice(0, 8)}...
                      </span>
                      {link.reason && (
                        <span className="text-xs text-muted-foreground truncate">
                          — {link.reason}
                        </span>
                      )}
                    </div>
                    {canLink && onRemoveLink && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={unlinkingLinkId === link.id}
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        onClick={async () => {
                          setUnlinkingLinkId(link.id)
                          setUnlinkError(null)
                          try {
                            const result = await onRemoveLink(link.id)
                            if (result?.error) {
                              setUnlinkError(result.error)
                            }
                          } catch {
                            setUnlinkError("Failed to remove link")
                          } finally {
                            setUnlinkingLinkId(null)
                          }
                        }}
                      >
                        <Unlink className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}

        {!loading && !error && groupedRecords.map((group, gi) => {
          const dedupedRecords = group.records.filter(r => !manualLinkIds.has(r.id))
          if (dedupedRecords.length === 0) return null
          return (
          <div key={group.recordType}>
            {(gi > 0 || hasManualLinks) && <Separator className="my-3" />}
            <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
              {RECORD_TYPE_ICONS[group.recordType]}
              {group.label}
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {dedupedRecords.length}
              </Badge>
            </h4>
            <div className="space-y-2">
              {dedupedRecords.map((record) => (
                <Link
                  key={record.id}
                  href={record.href}
                  className="block rounded-lg border border-border p-3 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {record.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge
                          variant="outline"
                          className={`${QUALITY_RECORD_TYPE_COLORS[record.recordType]} text-[10px] px-1.5 py-0 border`}
                        >
                          {record.statusLabel}
                        </Badge>
                        <ConfidenceBadge confidence={record.confidence} score={record.score} />
                        {record.partNumber && (
                          <span className="text-xs text-muted-foreground font-mono">
                            {record.partNumber}
                          </span>
                        )}
                        {record.supplier && (
                          <span className="text-xs text-muted-foreground">
                            {record.supplier}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                        {record.matchReasons.map((reason) => (
                          <Badge
                            key={reason}
                            variant="outline"
                            className={`${QUALITY_LINK_TYPE_COLORS[reason]} text-[10px] px-1 py-0 border`}
                          >
                            {QUALITY_LINK_TYPE_LABELS[reason]}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

function LinkRecordDialog({
  sourceType,
  sourceId,
  onCreateLink,
}: {
  sourceType: QualityRecordType
  sourceId: string
  onCreateLink: RelatedQualityRecordsPanelProps["onCreateLink"]
}) {
  const [open, setOpen] = useState(false)
  const [targetType, setTargetType] = useState<QualityRecordType>("FIELD_DEFECT")
  const [targetId, setTargetId] = useState("")
  const [linkType, setLinkType] = useState<QualityLinkType>("MANUAL")
  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!targetId.trim()) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const result = await onCreateLink!({
        sourceType,
        sourceId,
        targetType,
        targetId: targetId.trim(),
        linkType,
        reason: reason.trim() || undefined,
      })
      if (result?.error) {
        setSubmitError(result.error)
      } else {
        setOpen(false)
        setTargetId("")
        setReason("")
      }
    } catch {
      setSubmitError("Failed to create link")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
            <Link2 className="h-3 w-3" />
            Link Record
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Link Related Record</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Record Type
            </label>
            <select
              value={targetType}
              onChange={(e) => setTargetType(e.target.value as QualityRecordType)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            >
              {(Object.entries(QUALITY_RECORD_TYPE_LABELS) as [QualityRecordType, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Record ID
            </label>
            <input
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              placeholder="Paste the record ID"
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground font-mono"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Link Type
            </label>
            <select
              value={linkType}
              onChange={(e) => setLinkType(e.target.value as QualityLinkType)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            >
              {([
                ["MANUAL", "Manual"],
                ["SAME_PART", "Same part number"],
                ["SAME_SUPPLIER", "Same supplier + part"],
                ["SAME_FAILURE_MODE", "Same failure mode"],
                ["SAME_VEHICLE", "Same vehicle/project"],
                ["PPAP_REFERENCE", "PPAP same part"],
                ["FMEA_COVERAGE", "FMEA coverage"],
                ["RELATED_HISTORY", "Related history"],
                ["IQC_REJECTION", "IQC rejection history"],
              ] as [QualityLinkType, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Reason (optional)
            </label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why are these records related?"
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </div>
          {submitError && (
            <p className="text-sm text-destructive">{submitError}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !targetId.trim()}>
              {submitting ? "Linking..." : "Create Link"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function UpgradeLinkageBanner() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Link2 className="h-4 w-4" />
          Related Quality Records
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-6">
          <ShieldAlert className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground mb-3">
            Quality Linkage shows related records across modules.
          </p>
          <Link
            href="/quality/oem/settings/plan"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-400 hover:text-emerald-300"
          >
            Upgrade to Pro to enable Quality Linkage
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}