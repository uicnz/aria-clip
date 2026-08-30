// @vitest-environment jsdom
import { describe, expect, test } from "vitest"

import { mountPopupShell } from "./popup-shell"

describe("popup Interpreter layout", () => {
  test("presents Meta, Prompt, and Source as the popup disclosures", () => {
    document.body.innerHTML = '<div id="popup-root"></div>'

    mountPopupShell(false)

    const context = document.getElementById("prompt-context") as HTMLTextAreaElement
    const sourceDisclosure = context.closest("details") as HTMLDetailsElement
    const promptDisclosure = document.getElementById("prompt-disclosure") as HTMLDetailsElement
    const promptSummary = document.getElementById("prompt-disclosure-summary") as HTMLElement
    const promptField = document.getElementById("prompt-field") as HTMLTextAreaElement
    const interpretation = document.getElementById("note-content-field") as HTMLTextAreaElement
    const separator = document.getElementById("content-separator") as HTMLElement
    const popupScrollArea = document.querySelector('#workspace > [data-slot="scroll-area"]') as HTMLElement
    const metaHeader = document.querySelector(".metadata-properties-header") as HTMLElement

    expect(metaHeader.textContent).toContain("Meta")
    expect(promptSummary.textContent).toContain("Prompt")
    expect(promptSummary.querySelector("#prompt-token-counter")).not.toBeNull()
    expect(promptDisclosure.classList).toContain("hidden")
    expect(promptDisclosure.open).toBe(false)
    expect(promptField.closest("details")).toBe(promptDisclosure)
    expect(interpretation.closest("details")).toBeNull()
    expect(promptDisclosure.compareDocumentPosition(sourceDisclosure) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(sourceDisclosure.compareDocumentPosition(separator) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(separator.compareDocumentPosition(interpretation) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(sourceDisclosure.textContent).toContain("Source")
    expect(sourceDisclosure.querySelector("#source-token-counter")).not.toBeNull()
    expect(sourceDisclosure.classList).toContain("hidden")
    expect(sourceDisclosure.open).toBe(false)
    expect(popupScrollArea.contains(promptField)).toBe(true)
    expect(metaHeader.closest('[data-slot="scroll-area"]')).toBe(promptField.closest('[data-slot="scroll-area"]'))
    expect(metaHeader.closest('[data-slot="scroll-area"]')).toBe(context.closest('[data-slot="scroll-area"]'))
    expect(sourceDisclosure.closest("footer")).toBeNull()
    expect(promptField.classList).toContain("overflow-hidden")
    expect(promptField.classList).not.toContain("overflow-y-auto")
    expect(promptField.classList).not.toContain("field-sizing-fixed")
    expect(promptField.classList).toContain("text-xs/relaxed")
    expect(interpretation.classList).toContain("text-xs/relaxed")
    expect(context.classList).toContain("text-xs/relaxed")
    expect(context.classList).toContain("overflow-hidden")
    expect(document.getElementById("operations")?.querySelector(".operation-location")).not.toBeNull()
    expect(document.getElementById("operations")?.querySelector(".operation-controls")).not.toBeNull()
    expect(document.getElementById("operations")?.querySelector(".operation-actions")).not.toBeNull()
    expect(document.getElementById("model-select")?.closest("details")).toBeNull()
    expect(document.getElementById("interpret-btn")?.closest("details")).toBeNull()
  })
})
