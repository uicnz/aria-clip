import { createRoot, type Root } from "react-dom/client"
import { GripVerticalIcon, Trash2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import { Kbd } from "@/components/ui/kbd"

const roots = new WeakMap<HTMLElement, Root>()

function render(container: HTMLElement, node: React.ReactNode) {
  let root = roots.get(container)
  if (!root) {
    root = createRoot(container)
    roots.set(container, root)
  }
  root.render(node)
}

export function renderVaultList(
  container: HTMLElement,
  vaults: string[],
  removeLabel: string,
  onRemove: (index: number) => void
) {
  render(
    container,
    <ItemGroup>
      {vaults.map((vault, index) => (
        <Item key={`${vault}-${index}`} size="xs" draggable data-index={index}>
          <ItemMedia variant="icon"><GripVerticalIcon /></ItemMedia>
          <ItemContent><ItemTitle>{vault}</ItemTitle></ItemContent>
          <ItemActions>
            <Button type="button" variant="ghost" size="icon-sm" aria-label={removeLabel} onClick={() => onRemove(index)}>
              <Trash2Icon />
            </Button>
          </ItemActions>
        </Item>
      ))}
    </ItemGroup>
  )
}

export function renderShortcutList(
  container: HTMLElement,
  shortcuts: Array<{ description: string; shortcut: string }>
) {
  render(
    container,
    <ItemGroup>
      {shortcuts.map((shortcut) => (
        <Item key={shortcut.description} size="xs">
          <ItemContent><ItemTitle>{shortcut.description}</ItemTitle></ItemContent>
          <ItemActions><Kbd>{shortcut.shortcut}</Kbd></ItemActions>
        </Item>
      ))}
    </ItemGroup>
  )
}

export function renderShortcutMessage(container: HTMLElement, message: string) {
  render(
    container,
    <Item size="xs">
      <ItemContent><ItemDescription>{message}</ItemDescription></ItemContent>
    </Item>
  )
}
