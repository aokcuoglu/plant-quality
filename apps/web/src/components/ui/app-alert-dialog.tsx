"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { CircleAlert } from "lucide-react"

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { useTranslations } from "@/i18n/context"

type AppAlertDialogVariant = "default" | "destructive"

interface AppAlertDialogOptions {
  title?: string
  description: string
  actionLabel?: string
  variant?: AppAlertDialogVariant
}

interface AppConfirmDialogOptions extends AppAlertDialogOptions {
  cancelLabel?: string
}

interface DialogRequest extends AppConfirmDialogOptions {
  id: number
  kind: "alert" | "confirm"
  resolve: (confirmed: boolean) => void
}

interface AppAlertDialogContextValue {
  showAlert: (options: AppAlertDialogOptions | string) => void
  showConfirm: (options: AppConfirmDialogOptions | string) => Promise<boolean>
}

const AppAlertDialogContext = createContext<AppAlertDialogContextValue | null>(null)

function normalizeOptions(
  options: AppConfirmDialogOptions | string,
): AppConfirmDialogOptions {
  return typeof options === "string" ? { description: options } : options
}

export function AppAlertDialogProvider({ children }: { children: ReactNode }) {
  const t = useTranslations()
  const [activeDialog, setActiveDialog] = useState<DialogRequest | null>(null)
  const activeDialogRef = useRef<DialogRequest | null>(null)
  const queueRef = useRef<DialogRequest[]>([])
  const nextIdRef = useRef(0)

  const enqueue = useCallback(
    (
      kind: DialogRequest["kind"],
      options: AppConfirmDialogOptions,
      resolve: DialogRequest["resolve"],
    ) => {
      const request: DialogRequest = {
        ...options,
        id: nextIdRef.current++,
        kind,
        resolve,
      }

      if (activeDialogRef.current) {
        queueRef.current.push(request)
        return
      }

      activeDialogRef.current = request
      setActiveDialog(request)
    },
    [],
  )

  const finishDialog = useCallback((confirmed: boolean) => {
    const current = activeDialogRef.current
    if (!current) return

    activeDialogRef.current = null
    current.resolve(confirmed)

    const next = queueRef.current.shift() ?? null
    activeDialogRef.current = next
    setActiveDialog(next)
  }, [])

  const showAlert = useCallback<AppAlertDialogContextValue["showAlert"]>(
    (options) => {
      const normalized = normalizeOptions(options)
      enqueue(
        "alert",
        { ...normalized, variant: normalized.variant ?? "destructive" },
        () => undefined,
      )
    },
    [enqueue],
  )

  const showConfirm = useCallback<AppAlertDialogContextValue["showConfirm"]>(
    (options) =>
      new Promise<boolean>((resolve) => {
        enqueue("confirm", normalizeOptions(options), resolve)
      }),
    [enqueue],
  )

  useEffect(() => {
    return () => {
      activeDialogRef.current?.resolve(false)
      for (const request of queueRef.current) request.resolve(false)
      activeDialogRef.current = null
      queueRef.current = []
    }
  }, [])

  const contextValue = useMemo(
    () => ({ showAlert, showConfirm }),
    [showAlert, showConfirm],
  )

  return (
    <AppAlertDialogContext.Provider value={contextValue}>
      {children}

      {activeDialog && (
        <AlertDialog
          open
          onOpenChange={(open) => {
            if (!open) finishDialog(false)
          }}
        >
          <AlertDialogContent key={activeDialog.id}>
            <AlertDialogHeader>
              <div className="flex items-start gap-3">
                <CircleAlert
                  aria-hidden="true"
                  className={
                    activeDialog.variant === "destructive"
                      ? "mt-0.5 size-5 shrink-0 text-destructive"
                      : "mt-0.5 size-5 shrink-0 text-foreground"
                  }
                />
                <div className="space-y-2">
                  <AlertDialogTitle>
                    {activeDialog.title ??
                      (activeDialog.kind === "alert"
                        ? t("common.dialog.errorTitle")
                        : t("common.dialog.confirmationTitle"))}
                  </AlertDialogTitle>
                  <AlertDialogDescription className="whitespace-pre-wrap">
                    {activeDialog.description}
                  </AlertDialogDescription>
                </div>
              </div>
            </AlertDialogHeader>
            <AlertDialogFooter>
              {activeDialog.kind === "confirm" && (
                <Button variant="outline" onClick={() => finishDialog(false)}>
                  {activeDialog.cancelLabel ?? t("common.dialog.cancel")}
                </Button>
              )}
              <Button
                variant={activeDialog.variant === "destructive" ? "destructive" : "default"}
                onClick={() => finishDialog(true)}
              >
                {activeDialog.actionLabel ??
                  (activeDialog.kind === "alert"
                    ? t("common.dialog.close")
                    : t("common.dialog.confirm"))}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </AppAlertDialogContext.Provider>
  )
}

export function useAppAlertDialog(): AppAlertDialogContextValue {
  const context = useContext(AppAlertDialogContext)
  if (!context) {
    throw new Error("useAppAlertDialog must be used within AppAlertDialogProvider")
  }
  return context
}
