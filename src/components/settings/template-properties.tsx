import { useEffect, useState } from "react"
import { flushSync } from "react-dom"
import { createRoot, type Root } from "react-dom/client"
import {
  AlignLeftIcon,
  BinaryIcon,
  CalendarIcon,
  ClockIcon,
  GripVerticalIcon,
  ListIcon,
  SquareCheckBigIcon,
  Trash2Icon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Item,
  ItemActions,
  ItemGroup,
  ItemMedia,
} from "@/components/ui/item"
import type { PropertyType, ValueKind } from "@/types/types"

export type TemplatePropertyRow = {
  id: string
  name: string
  value: string
  type: ValueKind
}

type TemplatePropertyEditorProps = {
  initialRows: TemplatePropertyRow[]
  propertyTypes: PropertyType[]
  typeLabels: Record<ValueKind, string>
  labels: { propertyName: string; propertyValue: string; propertyType: string; removeProperty: string }
  onTypeChange: (name: string, type: ValueKind) => void
  onValidate: (input: HTMLInputElement, container: HTMLElement) => void
}

const roots = new WeakMap<HTMLElement, Root>()

const propertyIcons = {
  text: AlignLeftIcon,
  multitext: ListIcon,
  number: BinaryIcon,
  checkbox: SquareCheckBigIcon,
  date: CalendarIcon,
  datetime: ClockIcon,
} satisfies Record<ValueKind, typeof AlignLeftIcon>

function notifyFormChanged() {
  setTimeout(() => {
    document.getElementById("template-settings-form")?.dispatchEvent(new Event("input", { bubbles: true }))
  })
}

function TemplatePropertyEditor({
  initialRows,
  propertyTypes,
  typeLabels,
  labels,
  onTypeChange,
  onValidate,
}: TemplatePropertyEditorProps) {
  const [rows, setRows] = useState(initialRows)

  useEffect(() => {
    const addProperty = () => {
      const id = `${Date.now()}${Math.random().toString(36).slice(2, 11)}`
      setRows((current) => [...current, { id, name: "", value: "", type: "text" }])
      requestAnimationFrame(() => document.getElementById(`${id}-name`)?.focus())
    }
    window.addEventListener("aria-add-template-property", addProperty)
    return () => window.removeEventListener("aria-add-template-property", addProperty)
  }, [])

  const updateRow = (id: string, update: Partial<TemplatePropertyRow>) => {
    setRows((current) => current.map((row) => row.id === id ? { ...row, ...update } : row))
  }

  const removeRow = (id: string) => {
    setRows((current) => current.filter((row) => row.id !== id))
    notifyFormChanged()
  }

  return (
    <ItemGroup className="has-data-[size=xs]:gap-1">
      {rows.map((row) => {
        const Icon = propertyIcons[row.type]
        return (
          <Item
            key={row.id}
            className="property-editor grid grid-cols-[1rem_1.5rem_minmax(0,1fr)_auto] gap-2 px-0 py-1"
            size="xs"
            draggable
            data-id={row.id}
            data-type={row.type}
          >
            <ItemMedia variant="icon"><GripVerticalIcon /></ItemMedia>
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button type="button" variant="ghost" size="icon-sm" aria-label={labels.propertyType} />}>
                <Icon />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {(Object.keys(propertyIcons) as ValueKind[]).map((type) => {
                  const TypeIcon = propertyIcons[type]
                  return (
                    <DropdownMenuItem
                      key={type}
                      onClick={() => {
                        updateRow(row.id, { type })
                        if (row.name.trim()) onTypeChange(row.name, type)
                        notifyFormChanged()
                      }}
                    >
                      <TypeIcon />
                      {typeLabels[type]}
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="grid min-w-0 grid-cols-[minmax(8rem,0.7fr)_minmax(12rem,2fr)] gap-2">
              <Input
                id={`${row.id}-name`}
                className="property-name min-w-0 flex-1"
                value={row.name}
                placeholder={labels.propertyName}
                autoCapitalize="off"
                autoComplete="off"
                list="property-name-suggestions"
                onChange={(event) => {
                  const name = event.currentTarget.value
                  const selectedType = propertyTypes.find((propertyType) => propertyType.name === name)
                  if (selectedType) {
					const type = selectedType.type
                    const value = selectedType.defaultValue && !row.value ? selectedType.defaultValue : row.value
                    updateRow(row.id, { name, type, value })
                    onTypeChange(name, type)
                  } else {
                    updateRow(row.id, { name })
                  }
                }}
                onBlur={(event) => {
                  if (!event.currentTarget.value.trim()) removeRow(row.id)
                }}
              />
              <Input
                id={`${row.id}-value`}
                className="property-value min-w-0 flex-[2]"
                value={row.value}
                placeholder={labels.propertyValue}
                onChange={(event) => updateRow(row.id, { value: event.currentTarget.value })}
                onBlur={(event) => {
                  const container = event.currentTarget.closest(".property-editor")
                  if (container instanceof HTMLElement) onValidate(event.currentTarget, container)
                }}
              />
            </div>
            <ItemActions>
              <Button type="button" variant="ghost" size="icon-sm" className="remove-property-btn" aria-label={labels.removeProperty} onClick={() => removeRow(row.id)}>
                <Trash2Icon />
              </Button>
            </ItemActions>
          </Item>
        )
      })}
    </ItemGroup>
  )
}

export function renderTemplateProperties(container: HTMLElement, props: TemplatePropertyEditorProps) {
  let root = roots.get(container)
  if (!root) {
    root = createRoot(container)
    roots.set(container, root)
  }
  flushSync(() => root.render(<TemplatePropertyEditor key={props.initialRows.map((row) => row.id).join(":")} {...props} />))
}
