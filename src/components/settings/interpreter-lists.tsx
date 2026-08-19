import { createRoot, type Root } from "react-dom/client"
import {
  AlertTriangleIcon,
  CopyPlusIcon,
  GripVerticalIcon,
  PenLineIcon,
  Trash2Icon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Field } from "@/components/ui/field"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import type { ModelConfig, Provider } from "@/types/types"

type ProviderRow = {
  index: number
  provider: Provider
  missingApiKey: boolean
}

type ModelRow = {
  index: number
  model: ModelConfig
  providerName?: string
}

type ProviderListActions = {
  edit: (index: number) => void
  remove: (index: number) => void
  missingApiKeyLabel: string
}

type ModelListActions = {
  edit: (index: number) => void
  duplicate: (index: number) => void
  remove: (index: number) => void
  setEnabled: (index: number, enabled: boolean) => void
  unknownProviderLabel: string
}

type ModelSelectionOption = {
  id: string
  name: string
  recommended?: boolean
}

const roots = new WeakMap<HTMLElement, Root>()

function render(container: HTMLElement, node: React.ReactNode) {
  let root = roots.get(container)
  if (!root) {
    root = createRoot(container)
    roots.set(container, root)
  }
  root.render(node)
}

export function renderProviderList(
  container: HTMLElement,
  rows: ProviderRow[],
  actions: ProviderListActions
) {
  render(
    container,
    <ItemGroup>
      {rows.map(({ provider, index, missingApiKey }) => (
        <Item key={provider.id} size="xs">
          <ItemMedia>
            <span
              aria-hidden="true"
              className={`icon-${provider.name.toLowerCase().replace(/\s+/g, "-")} size-4 bg-current [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain]`}
            />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>{provider.name}</ItemTitle>
            {missingApiKey && (
              <ItemDescription className="flex items-center gap-1 text-destructive">
                <AlertTriangleIcon className="size-3" />
                {actions.missingApiKeyLabel}
              </ItemDescription>
            )}
          </ItemContent>
          <ItemActions>
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Edit provider" onClick={() => actions.edit(index)}>
              <PenLineIcon />
            </Button>
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Delete provider" onClick={() => actions.remove(index)}>
              <Trash2Icon />
            </Button>
          </ItemActions>
        </Item>
      ))}
    </ItemGroup>
  )
}

export function renderModelList(
  container: HTMLElement,
  rows: ModelRow[],
  actions: ModelListActions
) {
  render(
    container,
    <ItemGroup>
      {rows.map(({ model, index, providerName }) => (
        <Item key={model.id} size="xs" draggable data-model-id={model.id}>
          <ItemMedia variant="icon">
            <GripVerticalIcon />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>{model.name}</ItemTitle>
            <ItemDescription className={!providerName ? "flex items-center gap-1 text-destructive" : undefined}>
              {!providerName && <AlertTriangleIcon className="size-3" />}
              {providerName || actions.unknownProviderLabel}
            </ItemDescription>
          </ItemContent>
          <ItemActions>
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Edit model" onClick={() => actions.edit(index)}>
              <PenLineIcon />
            </Button>
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Duplicate model" onClick={() => actions.duplicate(index)}>
              <CopyPlusIcon />
            </Button>
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Delete model" onClick={() => actions.remove(index)}>
              <Trash2Icon />
            </Button>
            <Checkbox
              aria-label={`Enable ${model.name}`}
              checked={model.enabled}
              onCheckedChange={(checked) => actions.setEnabled(index, checked)}
            />
          </ItemActions>
        </Item>
      ))}
    </ItemGroup>
  )
}

export function renderModelSelection(
  container: HTMLElement,
  options: ModelSelectionOption[],
  value: string,
  labels: { recommended: string; custom: string },
  onValueChange: (value: string) => void
) {
  render(
    container,
    <RadioGroup value={value} onValueChange={onValueChange}>
      {options.map((option, index) => {
        const id = `pop-model-${index}`
        return (
          <Field key={option.id} orientation="horizontal">
            <RadioGroupItem id={id} value={option.id} />
            <Label htmlFor={id}>
              {option.name}
              {option.recommended && <Badge variant="secondary">{labels.recommended}</Badge>}
            </Label>
          </Field>
        )
      })}
      <Field orientation="horizontal">
        <RadioGroupItem id="model-other" value="other" />
        <Label htmlFor="model-other">{labels.custom}</Label>
      </Field>
    </RadioGroup>
  )
}

export function clearModelSelection(container: HTMLElement) {
  render(container, null)
}
