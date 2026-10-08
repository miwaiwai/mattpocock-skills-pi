---
name: research
description: Investigate a question against high-trust primary sources and capture the findings as a Markdown file in the repo. Use when the user wants a topic researched, docs or API facts gathered, or reading legwork delegated to a background agent.
---

<!-- pi-adapter: research-workflow -->
> [!IMPORTANT]
> **Pi adapter — bounded background research.** Read [the shared Pi subagent contract](../../../docs/adaptation/pi-subagents-contract.md) before launching.
>
> 1. **Establish delegation authority.** An explicit `/skill:research` invocation or a request to delegate research to a background agent authorizes this one-child workflow. If this skill was selected automatically from an ordinary request such as “research this,” ask the user to authorize background delegation before launching. If authorization is absent, do not call `subagent`.
> 2. **Choose one output before launch.** Inspect the repository for an existing research-note convention and use it. If none exists, use `docs/research/<descriptive-slug>.md` and tell the user. Resolve the repo/cwd and target file explicitly. Convert the target to an absolute path inside that repo before binding it, because a relative child `output` is runtime-managed scratch rather than the requested repository note. Create no other research-note output.
> 3. **Preflight the prerequisite.** Confirm the `subagent` tool is available, then call `subagent({ action: "list", capabilities: true })`. Select one executable, non-disabled native `researcher` agent. If the tool is unavailable or the capability call cannot run, stop and report exactly: `This workflow requires pi-subagents. Install it with: pi install npm:pi-subagents. Then run /reload in the active Pi session, or restart Pi.` If no eligible researcher is listed, stop and report that capability failure. Do not use an external CLI or another execution mode as fallback.
> 4. **Launch exactly one bounded child.** Make one direct call with `agent: "researcher"`, `context: "fresh"`, the explicit repo `cwd`, `async: true`, a finite `timeoutMs`, `output` bound to the chosen Markdown target's absolute path, and `outputMode: "file-only"`. The task must state: the research question; repo and cwd; read-only authority except for the bound report; primary sources only (official docs, specifications, first-party APIs, and source code); an inline Markdown citation for every factual claim plus identifiable primary-source links; the exact output target; completion criteria; and a stop-and-report rule for missing sources, access, or permissions. The `output` field is the durable binding—the filename in task prose is not.
> 5. **Yield, then validate.** In an ordinary interactive session, after launch report the run identity and bound target, then yield to Pi's native completion notification; do not poll or call a wait tool merely because the child is active. On completion, consume the child result and report its actual `outputReference`, `outputPathMapping`, or `artifactPaths`. Verify that the bound file exists, citations are recognizable, key claims resolve to primary sources, and unverified inferences are either removed or explicitly labeled. A launch receipt alone is not completion.
> 6. **Fail closed.** If the child/extension fails, the bound file is absent, or the report has no recognizable citations, stop and report the exact failure and run/status plus repo/cwd/ref and worktree state. Preserve any partial artifact as failed evidence, and do not silently retry through a CLI, foreground agent, unbound file, or other fallback.

Spin up a **background agent** to do the research, so you keep working while it reads.

Its job:

1. Investigate the question against **primary sources** (official docs, source code, specs, first-party APIs), not a secondary write-up of them. Follow every claim back to the source that owns it.
2. Write the findings to a single Markdown file, citing each claim's source.
3. Save it where the repo already keeps such notes; match the existing convention, and if there is none, put it somewhere sensible and say where.
