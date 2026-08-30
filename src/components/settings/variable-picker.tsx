import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CANONICAL_VARIABLE_DEFINITIONS } from "@/core/clipping/variables"
import { getMessage } from "@/platform/browser/i18n"

type VariablePickerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onChoose: (variable: string) => void
}

export function VariablePicker({ open, onOpenChange, onChoose }: VariablePickerProps) {
  const [search, setSearch] = useState("")
  const variables = useMemo(() => {
    const term = search.trim().toLowerCase()
    return CANONICAL_VARIABLE_DEFINITIONS.filter((definition) => {
      if (!term) return true
      return `${definition.name} ${definition.kind} ${definition.origin}`.toLowerCase().includes(term)
    })
  }, [search])

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      onOpenChange(nextOpen)
      if (!nextOpen) setSearch("")
    }}>
      <DialogContent className="grid max-h-[min(42rem,calc(100dvh-2rem))] grid-rows-[auto_auto_minmax(0,1fr)] gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle>{getMessage("pageVariables")}</DialogTitle>
        </DialogHeader>
        <div className="border-b px-5 py-3">
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
            placeholder={getMessage("searchVariables")}
            autoComplete="off"
          />
        </div>
        <ScrollArea className="min-h-0">
          <div className="grid grid-cols-1 gap-1 p-3 sm:grid-cols-2">
            {variables.length === 0 && (
              <p className="col-span-full px-2 py-8 text-center text-sm text-muted-foreground">
                {getMessage("noResults")}
              </p>
            )}
            {variables.map((definition) => {
              const variable = `{{${definition.name}}}`
              return (
                <Button
                  key={definition.name}
                  type="button"
                  variant="ghost"
                  className="h-auto min-w-0 justify-start px-2.5 py-2 text-left"
                  title={variable}
                  onClick={() => onChoose(variable)}
                >
                  <code className="min-w-0 flex-1 truncate font-mono text-xs text-foreground">{variable}</code>
                </Button>
              )
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
