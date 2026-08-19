import { flushSync } from "react-dom"
import { createRoot } from "react-dom/client"
import { MenuIcon, MoreHorizontalIcon, SettingsIcon } from "lucide-react"

import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function HighlightsShell() {
  return (
    <div id="highlights" className="group/highlights h-dvh overflow-hidden bg-background text-foreground">
      <div id="highlights-container" className="grid h-full grid-cols-[17rem_minmax(0,1fr)] max-md:grid-cols-1">
        <aside id="highlights-sidebar" className="sidebar flex min-h-0 flex-col border-r bg-sidebar p-3 max-md:absolute max-md:inset-y-0 max-md:left-0 max-md:z-40 max-md:hidden max-md:w-72 max-md:shadow-xl group-[.sidebar-open]/highlights:flex">
          <div id="highlights-sidebar-title" className="mb-4 flex h-8 cursor-pointer items-center gap-2 px-2 text-sm font-medium">
            <span data-i18n="highlights" className="min-w-0 flex-1">Highlights</span>
            <a id="highlights-settings-link" href="settings.html" className={buttonVariants({ variant: "ghost", size: "icon-sm" })} data-i18n-title="settings" aria-label="Settings"><SettingsIcon /></a>
          </div>
          <div className="highlights-search-container mb-3 flex gap-1">
            <Input id="highlights-search" data-i18n="searchHighlightsPlaceholder" placeholder="Search highlights…" autoComplete="off" spellCheck={false} />
            <div className="relative">
              <Button id="highlights-sort-btn" type="button" variant="ghost" size="icon" data-i18n-title="sort" aria-label="Sort"><MoreHorizontalIcon /></Button>
              <div id="highlights-sort-menu" className="menu absolute top-full right-0 z-20 mt-1 hidden min-w-40 rounded-lg border bg-popover p-1 text-popover-foreground shadow-md [&.show]:block">
                {[["az", "A to Z", "sortAZ"], ["za", "Z to A", "sortZA"], ["new", "Newest first", "sortNewOld"], ["old", "Oldest first", "sortOldNew"]].map(([sort,label,key]) => (
                  <button type="button" key={sort} data-sort={sort} className="menu-item flex h-7 w-full items-center rounded-md px-2 text-left text-xs hover:bg-accent hover:text-accent-foreground [&.active]:bg-accent [&.active]:font-medium" data-i18n={key}>{label}</button>
                ))}
              </div>
            </div>
          </div>
          <ul id="highlights-domain-list" className="min-h-0 flex-1 space-y-0.5 overflow-y-auto" />
        </aside>

        <main id="highlights-main" className="min-w-0 overflow-hidden">
          <div id="highlights-navbar" className="hidden items-center justify-between border-b px-4 py-2 max-md:flex">
            <button id="highlights-navbar-title" type="button" className="text-sm font-medium" data-i18n="highlights">Highlights</button>
            <Button id="highlights-hamburger" type="button" variant="ghost" size="icon" aria-label="Open navigation"><MenuIcon /></Button>
          </div>
          <div className="flex h-full min-h-0 flex-col">
            <header id="highlights-main-header" className="flex shrink-0 items-center justify-between gap-4 border-b px-8 py-4 max-md:px-4">
              <div id="highlights-breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm" />
              <div className="highlights-main-actions flex items-center gap-2">
                <Button id="export-context-btn" type="button" variant="outline" data-i18n="export">Export</Button>
                <Button id="delete-context-btn" type="button" variant="destructive" data-i18n="delete">Delete</Button>
              </div>
            </header>
            <div id="highlights-scroll" className="min-h-0 flex-1 overflow-y-auto">
              <div id="highlights-list" className="mx-auto grid w-full max-w-4xl gap-6 px-8 py-8 max-md:px-4" />
              <div id="highlights-empty" className="highlights-empty mx-auto max-w-4xl px-8 py-20 text-center text-sm text-muted-foreground" style={{ display: "none" }}><p data-i18n="noResults">No results found</p></div>
              <div id="highlights-sentinel" className="h-px" />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export function mountHighlightsShell() {
  const root = document.getElementById("highlights-root")
  if (!root) throw new Error("Highlights root was not found")
  flushSync(() => createRoot(root).render(<HighlightsShell />))
}
