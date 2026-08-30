import {
  BookOpenIcon,
  ChevronDownIcon,
  HighlighterIcon,
  MoreHorizontalIcon,
  PictureInPicture2Icon,
  RefreshCwIcon,
  SettingsIcon,
  ShareIcon,
  XIcon,
} from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { flushSync } from "react-dom"
import { createRoot } from "react-dom/client"
import { cn } from "@/lib/utils"

type PopupShellProps = {
  sidePanel: boolean
}

const toolbarButtonClass =
  "aria-[pressed=true]:bg-accent aria-[pressed=true]:text-accent-foreground"

export function PopupShell({ sidePanel }: PopupShellProps) {
  return (
    <main id="popup-shell" className={cn(
      "flex min-h-0 flex-col bg-background text-foreground",
      sidePanel ? "h-dvh w-full" : "h-[570px] w-[344px]"
    )}>
      <header
        id="popup-header"
        className="flex shrink-0 items-center gap-2 border-b px-3 py-2.5"
      >
        <div id="template-container" className="min-w-0 flex-1">
          <NativeSelect id="template-select" aria-label="Template" className="w-full">
            <NativeSelectOption value="" />
          </NativeSelect>
        </div>

        <div className="header-actions flex shrink-0 items-center gap-0.5">
          <Button
            id="show-variables"
            type="button"
            variant="ghost"
            size="icon"
            className={toolbarButtonClass}
            data-i18n-title="showPageVariables"
            aria-label="Show page variables"
          >
            <MoreHorizontalIcon />
          </Button>
          <Button
            id="highlighter-mode"
            type="button"
            variant="ghost"
            size="icon"
            className={toolbarButtonClass}
            data-i18n-title="highlightPage"
            aria-label="Highlight page"
            aria-pressed="false"
          >
            <HighlighterIcon />
          </Button>
          <Button
            id="reader-mode"
            type="button"
            variant="ghost"
            size="icon"
            className={toolbarButtonClass}
            data-i18n-title="reader"
            aria-label="Reader"
            aria-pressed="false"
          >
            <BookOpenIcon />
          </Button>
          {sidePanel ? (
            <Button
              id="refresh-pane"
              type="button"
              variant="ghost"
              size="icon"
              data-i18n-title="refresh"
              aria-label="Refresh"
            >
              <RefreshCwIcon />
            </Button>
          ) : (
            <Button
              id="embedded-mode"
              type="button"
              variant="ghost"
              size="icon"
              data-i18n-title="openEmbedded"
              aria-label="Open embedded"
            >
              <PictureInPicture2Icon />
            </Button>
          )}
          <Button
            id="open-settings"
            type="button"
            variant="ghost"
            size="icon"
            data-i18n-title="settings"
            aria-label="Settings"
          >
            <SettingsIcon />
          </Button>
          {sidePanel && (
            <Button
              id="embedded-mode"
              type="button"
              variant="ghost"
              size="icon"
              data-i18n-title="embeddedMode"
              aria-label="Close side panel"
            >
              <XIcon />
            </Button>
          )}
        </div>
      </header>

      <Alert
        variant="destructive"
        className="error-message m-3 hidden w-auto"
      >
        <AlertDescription />
      </Alert>

      <section id="workspace" className="workspace flex min-h-0 flex-1 flex-col">
        <ScrollArea className="min-h-0 flex-1">
          <div id="workspace-content" className="px-3 py-4">
            <div id="workspace-inputs">
              <Textarea
                id="note-name-field"
                rows={1}
                data-i18n="noteName"
                aria-label="Note name"
                className="min-h-8 rounded-none border-transparent bg-transparent px-0 py-0 text-lg font-medium shadow-none focus-visible:border-transparent focus-visible:ring-0 md:text-lg dark:bg-transparent"
              />

              <Button
                type="button"
                variant="ghost"
                className="metadata-properties-header group mt-4 h-auto w-full justify-between px-0 py-1 text-sm hover:bg-transparent"
              >
                <span data-i18n="meta">Meta</span>
                <ChevronDownIcon className="size-4 transition-transform group-[.collapsed]:-rotate-90" />
              </Button>

              <div className="metadata-properties mt-1 [&.collapsed]:hidden" />

              <details id="prompt-disclosure" className="group hidden">
                <summary
                  id="prompt-disclosure-summary"
                  className="flex cursor-pointer list-none items-center justify-between gap-2 py-1 text-sm font-medium [&::-webkit-details-marker]:hidden"
                >
                  <span data-i18n="prompt">Prompt</span>
                  <span className="flex items-center gap-1.5">
                    <span id="prompt-token-counter" className="token-counter text-xs font-normal text-muted-foreground" />
                    <ChevronDownIcon className="size-4 -rotate-90 transition-transform group-open:rotate-0" />
                  </span>
                </summary>
                <Textarea
                  id="prompt-field"
                  aria-label="Prompt"
                  rows={6}
                  className="mt-2 min-h-32 overflow-hidden rounded-none border-transparent bg-transparent px-0 font-mono text-xs/relaxed shadow-none focus-visible:border-transparent focus-visible:ring-0 dark:bg-transparent"
                />
              </details>

              <details id="source-disclosure" className="group hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 py-1 text-sm font-medium [&::-webkit-details-marker]:hidden">
                  <span data-i18n="source">Source</span>
                  <span className="flex items-center gap-1.5">
                    <span id="source-token-counter" className="token-counter text-xs font-normal text-muted-foreground" />
                    <ChevronDownIcon className="size-4 -rotate-90 transition-transform group-open:rotate-0" />
                  </span>
                </summary>
                <Textarea
                  id="prompt-context"
                  aria-label="Source"
                  rows={6}
                  className="mt-2 min-h-32 overflow-hidden rounded-none border-transparent bg-transparent px-0 font-mono text-xs/relaxed shadow-none focus-visible:border-transparent focus-visible:ring-0 dark:bg-transparent"
                />
              </details>
            </div>

            <Separator id="content-separator" className="my-4" />
            <div id="interpretation">
              <Textarea
                id="note-content-field"
                rows={8}
                data-i18n="notesAboutPage"
                aria-label="Notes about page"
                className="min-h-40 rounded-none border-transparent bg-transparent px-0 py-0 font-mono text-xs/relaxed shadow-none focus-visible:border-transparent focus-visible:ring-0 dark:bg-transparent"
              />
            </div>
          </div>
        </ScrollArea>

        <footer id="operations" className="operations shrink-0 border-t bg-background p-3">
          <div className="operation-location mb-3 flex gap-2">
            <div id="vault-container" className="min-w-28" style={{ display: "none" }}>
              <NativeSelect id="vault-select" aria-label="Vault" className="w-full" />
            </div>
            <Input
              id="path-name-field"
              type="text"
              data-i18n="folder"
              aria-label="Folder"
              className="flex-1"
            />
          </div>

          <div id="interpret-operation" className="mb-3 hidden flex-col gap-2">
            <div className="operation-controls flex items-center gap-2">
              <NativeSelect
                id="model-select"
                aria-label="Model"
                className="min-w-0 flex-1"
                style={{ display: "none" }}
              />
              <Button id="interpret-btn" type="button" variant="secondary" data-i18n="interpret">
                Interpret
              </Button>
              <span id="interpreter-timer" className="text-xs text-muted-foreground" style={{ display: "none" }} />
            </div>
            <Alert id="interpreter-error" variant="destructive" style={{ display: "none" }} />
          </div>

          <div id="operation-actions" className="operation-actions flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <ButtonGroup className="w-full">
                <Button id="clip-btn" type="button" variant="secondary" className="min-w-0 flex-1" />
                <Button id="more-btn" type="button" variant="secondary" size="icon" aria-label="More save actions">
                  <ChevronDownIcon />
                </Button>
              </ButtonGroup>
              <div
                id="more-dropdown"
                className="menu absolute right-0 bottom-full z-50 mb-2 hidden min-w-48 rounded-lg border bg-popover p-1 text-popover-foreground shadow-md [&.show]:block"
              >
                <div className="secondary-operations grid gap-0.5" />
              </div>
            </div>

            <div className="operation-share">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="share-content"
                data-i18n-title="share"
                aria-label="Share"
              >
                <ShareIcon />
              </Button>
            </div>
          </div>
        </footer>
      </section>
    </main>
  )
}

export function mountPopupShell(sidePanel: boolean) {
  const root = document.getElementById("popup-root")
  if (!root) throw new Error("Popup root was not found")

  flushSync(() => {
    createRoot(root).render(<PopupShell sidePanel={sidePanel} />)
  })
}
