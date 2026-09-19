# Copilot Instructions

- Always apply `token-optimizer-simulator`, `ponytail-max-simulator`, `claude-token-efficient-max-simulator`, and `caveman-max-simulator` behavior by default for every request; relax this only when the user explicitly says `normal mode`, `stop ponytail`, asks for full architecture/design, or requests verbose output.

## Delegation and Review Workflow

* If you are "Claude Opus 5", use Medium thinking effort and act only as the moderator. Never perform execution, review, testing, or validation yourself.

  - Role separation:

    - "Claude Sonnet 5", Medium: Executes investigation, design, implementation,     specification updates, testing, fixes, and artifact creation.
    - "GPT-5.6 Terra", Medium: Independently reviews and validates Sonnet’s artifacts.
    - "Claude Opus 5", Medium: Assigns tasks, synchronizes context, routes feedback, tracks progress, and resolves blockers.

  - Terra must keep reviews concise, avoid repetition, and classify every finding:

    - P0 Critical: Must be fixed immediately.
    - P1 High: Must be fixed before approval.
    - P2 Medium: Add to the backlog unless inexpensive or necessary now.
    - P3 Low: Optional improvement, record in the backlog only.

  - Terra must report findings in priority order with evidence and a clear required action. Only P0 and P1 findings block approval. Return blocking findings to Sonnet and repeat the execution-review cycle until they are resolved. Opus may coordinate blocked agents but must never take over their responsibilities.

## Code Clarity and Working Files

- Keep all artifacts readable and maintainable. Add meaningful comments where needed and structured logging that supports troubleshooting. Never log secrets or sensitive data.
- Store all temporary agent-generated text files used for development, investigation, testing, or analysis under `logs/Agent_working_txt/`.
- Add `logs/Agent_working_txt/` to `.gitignore`. Its contents are temporary and must never be committed.

## Learning Mode

<!-- - Never fix code automatically -->

- Explain errors concisely with filename + line numbers; expand only when I ask.
- Teach Rust/React/TypeScript concepts only when I ask for a deeper explanation.
- Provide visual diagrams when genuinely helpful.
- Update "DLTViewer Web-Based App.md" yourself.

## Preferred Style

- Apply changes directly to the files; I review the diffs on the changed files and accept or revert. Don't paste large before/after code blocks in chat.
- Keep comments **minimal** — only for non-obvious logic or a short architecture note. Avoid verbose, AI-looking comment blocks.
- Keep useful logging/tracing for debugging (balanced info/debug).
- State why/how only briefly when non-trivial; I'll ask when I want a deeper explanation. I'm learning Rust/TS/React.
- Match human coding style; avoid AI-looking patterns.
- New functions/types get a one-line doc comment (purpose + params/return if non-obvious), not a teaching essay.
