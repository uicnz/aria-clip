import '@/test/dom.js';
import { act } from "react"
import { describe, expect, test, vi } from "bun:test"

import type { Template } from "@/types/types"
import { renderTemplateList } from "./template-list"

const pageSummary: Template = {
  id: "builtin-page-summary",
  name: "Page Summary",
  behavior: "create",
  noteNameFormat: "{{title}}",
  path: "Clips",
  noteContentFormat: "summary",
  properties: [],
  triggers: [],
}

describe("template list", () => {
  test("renders outside the settings shell React root", async () => {
    const container = document.createElement("ul")

    await act(async () => {
      renderTemplateList(container, [pageSummary], -1, vi.fn(), vi.fn())
    })

    expect(container.textContent).toContain("Page Summary")
    expect(container.querySelector('[data-sidebar="menu-button"]')).not.toBeNull()
  })
})
