import { useEffect, useState } from "react"
import { createRoot, type Root } from "react-dom/client"
import {
  AlignLeftIcon,
  BinaryIcon,
  CalendarIcon,
  ClockIcon,
  ListIcon,
  SquareCheckBigIcon,
  TagsIcon,
} from "lucide-react"

import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Item,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import type { Property } from "@/types/types"

type PopupProperty = Property & { type: string }

const roots = new WeakMap<HTMLElement, Root>()

const propertyIcons = {
  text: AlignLeftIcon,
  multitext: ListIcon,
  number: BinaryIcon,
  checkbox: SquareCheckBigIcon,
  date: CalendarIcon,
  datetime: ClockIcon,
  tags: TagsIcon,
} as const

function MetadataPropertyList({ properties }: { properties: PopupProperty[] }) {
  const [checked, setChecked] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setChecked({})
  }, [properties])

  useEffect(() => {
    const updateValue = (event: Event) => {
      const { id, value } = (event as CustomEvent<{ id: string; value: boolean }>).detail
      setChecked((current) => ({ ...current, [id]: value }))
    }
    window.addEventListener("aria-popup-property-value", updateValue)
    return () => window.removeEventListener("aria-popup-property-value", updateValue)
  }, [])

  return (
    <ItemGroup className="has-data-[size=xs]:gap-0">
      {properties.map((property) => {
        const Icon = propertyIcons[property.type as keyof typeof propertyIcons] || AlignLeftIcon
        const commonProps = {
          id: property.name,
          "data-property-input": "",
          "data-type": property.type,
          "data-template-value": property.value,
        }

        return (
          <Item
            key={property.id || property.name}
            size="xs"
            className="grid grid-cols-[1rem_4.75rem_minmax(0,1fr)] gap-2 px-0 py-0.5 leading-normal"
          >
            <ItemMedia variant="icon" className="size-4 text-muted-foreground">
              <Icon />
            </ItemMedia>
            <ItemTitle className="w-full text-sm leading-normal font-normal text-muted-foreground">
              {property.name}
            </ItemTitle>
            {property.type === "checkbox" ? (
              <Checkbox
                {...commonProps}
                aria-label={property.name}
                className="justify-self-start"
                checked={checked[property.name] || false}
                onCheckedChange={(value) => setChecked((current) => ({ ...current, [property.name]: value }))}
              />
            ) : (
              <Input
                {...commonProps}
                aria-label={property.name}
                defaultValue=""
                className="h-auto rounded-none border-transparent bg-transparent px-0 py-0.5 text-sm leading-normal shadow-none focus-visible:border-transparent focus-visible:ring-0 md:text-sm dark:bg-transparent"
              />
            )}
          </Item>
        )
      })}
    </ItemGroup>
  )
}

export function renderMetadataProperties(container: HTMLElement, properties: PopupProperty[]) {
  let root = roots.get(container)
  if (!root) {
    root = createRoot(container)
    roots.set(container, root)
  }
  root.render(<MetadataPropertyList properties={properties} />)
}
