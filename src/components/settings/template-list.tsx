import { createRoot, type Root } from "react-dom/client"
import { GripVerticalIcon, Trash2Icon } from "lucide-react"

import {
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import type { Template } from "@/types/types"

const roots = new WeakMap<HTMLElement, Root>()

export function renderTemplateList(
  container: HTMLElement,
  templates: Template[],
  activeIndex: number,
  onOpen: (template: Template) => void,
  onRemove: (id: string) => void
) {
  let root = roots.get(container)
  if (!root) {
    root = createRoot(container)
    roots.set(container, root)
  }

  root.render(
    <>
      {templates.map((template, index) => (
        <SidebarMenuItem key={template.id} draggable data-id={template.id} data-index={index}>
          <SidebarMenuButton type="button" size="sm" isActive={index === activeIndex} onClick={() => onOpen(template)}>
            <GripVerticalIcon />
            <span>{template.name}</span>
          </SidebarMenuButton>
          <SidebarMenuAction type="button" showOnHover aria-label={`Delete ${template.name}`} onClick={() => onRemove(template.id)}>
            <Trash2Icon />
          </SidebarMenuAction>
        </SidebarMenuItem>
      ))}
    </>
  )
}
