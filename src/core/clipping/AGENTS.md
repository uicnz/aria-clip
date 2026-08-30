# Clipping Agreements

This directory owns source truth.

## Complete-source invariant

- Use asynchronous Defuddle extraction for every capture path. Async extractors provide material such as YouTube transcripts that synchronous parsing cannot recover.
- Never catch an async extraction error or timeout and silently substitute `parse()`. A failed complete extraction is an error, not permission to return a thumbnail, metadata fragment, or partial body.
- `{{content}}` must contain the complete normalized Markdown body. `{{contentHtml}}` must contain the complete extracted HTML body. `{{fullHtml}}` remains the cleaned document capture. Do not conflate them.
- Preserve extracted variables such as `transcript` without replacing canonical content.
- Metadata enrichment may fill metadata; it must never replace or shorten the body.
- Highlight replacement and a current text selection are explicit user-controlled scope changes. No other feature may narrow content implicitly.

## Required proof

- Unit-test that the async path is called and the sync path is not.
- For async-source adapters, exercise a real accessible page and record body and extracted-variable lengths.
- Verify recognizable content near the beginning and end. A non-empty check alone is insufficient.
- Any capture artifact that describes its own source as missing when async source data exists is a failed artifact and blocks handoff.
