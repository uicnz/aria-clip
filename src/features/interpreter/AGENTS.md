# Interpreter Agreements

The Interpreter transforms a complete source; it does not own or replace source capture.

- Send the compiled template context to the provider without truncation, summarization, or hidden preprocessing.
- Keep Prompt, Source, and Interpretation as separate state and UI disclosures. Executing an interpretation must not overwrite Prompt or Source.
- System instructions may enforce transport and source grounding. They must not impose concision, formatting, or structure that contradicts the selected template.
- Respect explicit terse templates. Otherwise output depth must follow the template and source breadth.
- A provider token-limit response is an error. Never accept a clipped response as complete.
- JSON response transport must not alter Markdown meaning or silently discard a prompt response.

## Required proof

- Compile every built-in context with a large beginning/middle/end sentinel and prove the whole sentinel survives.
- Mock the final provider boundary and assert exact context equality in the emitted request.
- For material prompt changes, run one real interpretation against a representative long source and inspect the saved Markdown for proportional coverage.
