
## Code

Execution Rules:
- No stable APIs. Do not leave legacy code behind. This is a new project with no outside users yet, so backwards compatibility is not needed.
- Suggest elegant API refinements when working on relevant code. Always discuss user-facing changes first.
- When communicating with the user, break down topics logically. Present one short step at a time in simple, active language without overwhelming the user.
- Follow TypeScript best practices for 2026.
- Keep the API concise, intuitive, and easy to discover.
- State must be snapshot-safe so going backward (`stage.prev()`) restores previous values cleanly.
- Keep stage elements as flat siblings. Use `layout` to calculate coordinates; do not wrap elements in layout `<div>` containers.
- Export creation functions (like `Title()`, `Card()`) from `src/index.ts`. Keep internal element classes and builders private.
- All animation loops and background effects must stop completely when the stage is at rest (`active_raf_count` is 0).
- Never run `git commit` or `git push`. Leave all changes in the working tree for the user to review.


## Documentation

Execution Rules:
- Keep JSDoc comments very brief. Use the website for detailed explanations and concise, tutorial-style examples.
- Always include default values and units.
- Present concepts in an order that makes learning the whole system logical and easy.
- Present one short step at a time. Write short sentences and keep text brief so the reader is not overwhelmed.
- Do not assume the reader knows the topic in advance.
- Use simple, direct language without filler words. Simplified technical English is preferred.
- Do not use "---" horizontal rules.
- Add diagrams whenever they meaningfully help the reader understand.
- Do not duplicate information. Link to the authoritative source within the documentation.
- Write from the user's mental model, not framework internals. Avoid mentioning internal classes unless directly relevant to the user.
- Document only what is unique to each element. Do not re-explain universal concepts (like decorators or transitions) on every element.


## Verification

Execution Rules:
- Always run `pnpm verify` after making code changes.
- Run `pnpm docs:build` only when editing documentation site files.
- Run `pnpm api:report` when modifying public exports to update `etc/api-report.md` and check that no unintended symbols are exported.
- Apply straightforward changes (CSS tweaks, sizing, colors, text edits) directly without pre-emptive browser inspection or screenshotting.
- Do not use Chrome DevTools MCP or take screenshots unless explicitly requested by the user, or when diagnosing complex runtime bugs that cannot be understood from code.
- Never enter screenshot loops or inspect pages before making an edit.


