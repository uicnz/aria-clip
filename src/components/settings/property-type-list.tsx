import { createRoot, type Root } from "react-dom/client"
import {
  AlignLeftIcon,
  BinaryIcon,
  CalendarIcon,
  ClockIcon,
  ListIcon,
  SquareCheckBigIcon,
  TagsIcon,
  Trash2Icon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
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
  ItemContent,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import type { PropertyType } from "@/types/types"

type PropertyTypeName = "text" | "multitext" | "number" | "checkbox" | "date" | "datetime"

type PropertyTypeRow = {
  propertyType: PropertyType
  usageCount: number
}

type PropertyTypeListActions = {
  changeType: (property: PropertyType, type: PropertyTypeName) => void
  changeDefaultValue: (property: PropertyType, value: string) => void
  remove: (property: PropertyType) => void
  typeLabels: Record<PropertyTypeName, string>
}

const roots = new WeakMap<HTMLElement, Root>()

const propertyIcons = {
  text: AlignLeftIcon,
  multitext: ListIcon,
  number: BinaryIcon,
  checkbox: SquareCheckBigIcon,
  date: CalendarIcon,
  datetime: ClockIcon,
} satisfies Record<PropertyTypeName, typeof AlignLeftIcon>

function render(container: HTMLElement, node: React.ReactNode) {
  let root = roots.get(container)
  if (!root) {
    root = createRoot(container)
    roots.set(container, root)
  }
  root.render(node)
}

export function renderPropertyTypeList(
  container: HTMLElement,
  rows: PropertyTypeRow[],
  actions: PropertyTypeListActions
) {
  render(
    container,
    <ItemGroup className="has-data-[size=xs]:gap-0">
      {rows.map(({ propertyType, usageCount }) => {
        const propertyTypeName = propertyType.type as PropertyTypeName
        const Icon = propertyType.name === "tags" ? TagsIcon : propertyIcons[propertyTypeName] || AlignLeftIcon
        const locked = propertyType.name === "tags"

        return (
          <Item
            key={propertyType.name}
            size="xs"
            className="grid grid-cols-[1.5rem_14rem_minmax(0,1fr)_auto] gap-2 px-0 py-1"
          >
            <ItemMedia variant="icon">
              <DropdownMenu>
                <DropdownMenuTrigger
                  disabled={locked}
                  render={<Button type="button" variant="ghost" size="icon-sm" aria-label={`Property type for ${propertyType.name}`} />}
                >
                  <Icon />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {(Object.keys(propertyIcons) as PropertyTypeName[]).map((type) => {
                    const TypeIcon = propertyIcons[type]
                    return (
                      <DropdownMenuItem key={type} onClick={() => actions.changeType(propertyType, type)}>
                        <TypeIcon />
                        {actions.typeLabels[type]}
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </ItemMedia>
            <ItemContent>
              <ItemTitle>{propertyType.name}</ItemTitle>
            </ItemContent>
            <Input
              aria-label={`Default value for ${propertyType.name}`}
              defaultValue={propertyType.defaultValue || ""}
              disabled={locked}
              placeholder="Default value"
              onBlur={(event) => actions.changeDefaultValue(propertyType, event.currentTarget.value)}
            />
            <ItemActions className="gap-1">
              <Badge variant="secondary">{usageCount}</Badge>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={locked || usageCount > 0}
                aria-label={`Remove ${propertyType.name}`}
                onClick={() => actions.remove(propertyType)}
              >
                <Trash2Icon />
              </Button>
            </ItemActions>
          </Item>
        )
      })}
    </ItemGroup>
  )
}
