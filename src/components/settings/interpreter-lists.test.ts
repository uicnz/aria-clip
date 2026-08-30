// @vitest-environment jsdom
import { act } from "react"
import { describe, expect, test, vi } from "vitest"

import { renderModelSelection } from "./interpreter-lists"

describe("model selection", () => {
  test("moves the checked radio from Custom to the selected preset", async () => {
    const container = document.createElement("div")
    const onValueChange = vi.fn()

    await act(async () => {
      renderModelSelection(
        container,
        [
          { id: "gpt-5.6-luna", name: "GPT-5.6 Luna" },
          { id: "gpt-5.6-sol", name: "GPT-5.6 Sol" },
        ],
        "other",
        { recommended: "Recommended", custom: "Custom" },
        onValueChange
      )
    })

    const radios = container.querySelectorAll<HTMLElement>('[role="radio"]')
    expect(radios).toHaveLength(3)
    expect(radios[2].getAttribute("aria-checked")).toBe("true")

    await act(async () => {
      radios[1].click()
    })

    expect(onValueChange).toHaveBeenCalledWith("gpt-5.6-sol")
    expect(radios[1].getAttribute("aria-checked")).toBe("true")
    expect(radios[2].getAttribute("aria-checked")).toBe("false")
  })
})
