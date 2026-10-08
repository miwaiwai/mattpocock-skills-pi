---
name: code-review
description: "Review the changes since a fixed point (commit, branch, tag, or merge-base) along two axes: Standards (does the code follow this repo's documented coding standards?) and Spec (does the code match what the originating issue/spec asked for?). Runs both reviews in parallel sub-agents and reports them side by side. Use when the user wants to review a branch, a PR, work-in-progress changes, or asks to \"review since X\"."
---

<!-- pi-adapter: code-review-workflow -->
> [!IMPORTANT]
> **Pi adapter — isolated two-axis workflow.** This block replaces upstream execution wording where the two conflict; the review criteria and report shape below remain authoritative.
>
> 1. **Establish delegation authority.** An explicit `/skill:code-review` invocation authorizes the independent reviewer workflow described by this skill. When this skill is selected automatically from an ordinary request such as “review,” ask the user to authorize subagent delegation before launching. Without authorization, stop before any `subagent` call.
> 2. **Finish parent preflight first.** In the parent session, obtain the fixed point and validate it with `git rev-parse`; capture the exact three-dot diff command, reject an empty diff, capture `git log <fixed-point>..HEAD --oneline`, find the spec source (or establish that none exists), and find every standards source. Do all of this before capability discovery or reviewer launch. An invalid fixed point, empty diff, unresolved request for a spec source, or other precondition failure launches no reviewer.
> 3. **Preflight Pi.** Read [the shared Pi subagent contract](../../../docs/adaptation/pi-subagents-contract.md), then confirm the `subagent` tool is available and call `subagent({ action: "list", capabilities: true })`. Require an executable, non-disabled native `reviewer`. If the tool or capability call is unavailable, stop and report exactly: `This workflow requires pi-subagents. Install it with: pi install npm:pi-subagents. Then run /reload in the active Pi session, or restart Pi.` Do not change execution mode.
> 4. **Build cold-start prompts.** The Standards prompt must contain the exact diff command, the captured commit list, every standards-source path (an explicit empty list is allowed), the complete smell baseline from this skill pasted in full, the upstream Standards brief, and the 400-word limit. The Spec prompt must contain the exact diff command, the captured commit list, the spec path or fetched contents, the upstream Spec brief, and the 400-word limit. Each prompt must identify the repo/cwd/ref, state that the child is read-only, forbid project/source edits and delegation, allow only the configured output artifact, and require findings plus a finding count and most severe issue for that axis.
> 5. **Launch the exact review shape.** When a spec exists, make exactly one top-level workflow call with `workflow: true`, `async: true`, `context: "fresh"`, and the explicit repo `cwd`. Its single `runs.all([...])` launches exactly two children keyed `standards` and `spec`. Both use `agent: "reviewer"`, `context: "fresh"`, `tools: ["read", "grep", "find", "ls", "watchdog_diff"]`, distinct prompts, distinct relative outputs (for example `code-review/standards.md` and `code-review/spec.md`), and `outputMode: "file-only"`. Await `runs.all`; return a JSON object that preserves each axis separately and includes its `ok`, `runId`, `output`, `outputReference`, `outputPathMapping`, and `artifactPaths`. Do not catch a failed child: either lane failing must fail the workflow. Do not launch either reviewer outside that one workflow.
> 6. **Handle no-spec reviews honestly.** If the user confirms that no spec exists, skip the Spec child. Launch one bounded direct Standards reviewer with the same fresh context, read-only tools, async mode, cwd, prompt, and durable file-only output. Do not construct a workflow or fabricate a second lane. In the final `## Spec` section say explicitly that no spec was available and the axis was skipped.
> 7. **Yield and accept in the parent.** Async launch receipts are not completed reviews. Yield to Pi's native completion notification rather than polling. After completion, consume the final child/workflow result and its real `outputReference`, `outputPathMapping`, or `artifactPaths`; verify both requested reports exist, correspond to the exact diff/ref, stay within their assigned axes and word limits, remain read-only, and contain an axis finding count and most severe issue. Child success is evidence, not acceptance. Lightly clean the reports, then print `## Standards` and `## Spec` separately and preserve the upstream per-axis summary; never merge or cross-rank findings.
> 8. **Fail closed.** A workflow, launch, extension, prompt runtime, child-tooling, output-binding, or lane failure stops aggregation as success. Report the exact error, run/status, repo, cwd, worktree, branch/ref, and clean/partial-diff state. Do not silently retry as a parent-written review, foreground child, CLI, or other execution mode.

Two-axis review of the diff between `HEAD` and a fixed point the user supplies:

- **Standards**: does the code conform to this repo's documented coding standards?
- **Spec**: does the code faithfully implement the originating issue / spec?

Both axes run as **parallel sub-agents** so they don't pollute each other's context, then this skill aggregates their findings.

The issue tracker should have been provided to you. If not, tell the user to run `/skill:setup-matt-pocock-skills`.

## Process

### 1. Pin the fixed point

Whatever the user said is the fixed point (a commit SHA, branch name, tag, `main`, `HEAD~5`, etc.). If they didn't specify one, ask for it.

Capture the diff command once: `git diff <fixed-point>...HEAD` (three-dot, so the comparison is against the merge-base). Also note the list of commits via `git log <fixed-point>..HEAD --oneline`.

Before going further, confirm the fixed point resolves (`git rev-parse <fixed-point>`) and the diff is non-empty. A bad ref or empty diff should fail here, not inside two parallel sub-agents.

### 2. Identify the spec source

Look for the originating spec, in this order:

1. Issue references in the commit messages (`#123`, `Closes #45`, GitLab `!67`, etc.), fetched via the workflow in the tracker doc.
2. A path the user passed as an argument.
3. A spec file under `docs/`, `specs/`, or `.scratch/` matching the branch name or feature.
4. If nothing is found, ask the user where the spec is. If they say there isn't one, the **Spec** sub-agent will skip and report "no spec available".

### 3. Identify the standards sources

Search the repo for every file that documents how code should be written. When `CODING_STANDARDS.md` or `CONTRIBUTING.md` exists, it must be on the list.

On top of whatever the repo documents, the Standards axis always carries the **smell baseline** below: a fixed set of Fowler code smells (_Refactoring_, ch.3) that applies even when a repo documents nothing. Two rules bind it:

- **The repo overrides.** A documented repo standard always wins; where it endorses something the baseline would flag, suppress the smell.
- **Always a judgement call.** Each smell is a labelled heuristic ("possible Feature Envy"), never a hard violation. Like any standard here, skip anything tooling already enforces.

Each smell reads *what it is* → *how to fix*; match it against the diff:

- **Mysterious Name**: a function, variable, or type whose name doesn't reveal what it does or holds. → rename it; if no honest name comes, the design's murky.
- **Duplicated Code**: the same logic shape appears in more than one hunk or file in the change. → extract the shared shape, call it from both.
- **Feature Envy**: a method that reaches into another object's data more than its own. → move the method onto the data it envies.
- **Data Clumps**: the same few fields or params keep travelling together (a type wanting to be born). → bundle them into one type, pass that.
- **Primitive Obsession**: a primitive or string standing in for a domain concept that deserves its own type. → give the concept its own small type.
- **Repeated Switches**: the same `switch`/`if`-cascade on the same type recurs across the change. → replace with polymorphism, or one map both sites share.
- **Shotgun Surgery**: one logical change forces scattered edits across many files in the diff. → gather what changes together into one module.
- **Divergent Change**: one file or module is edited for several unrelated reasons. → split so each module changes for one reason.
- **Speculative Generality**: abstraction, parameters, or hooks added for needs the spec doesn't have. → delete it; inline back until a real need shows.
- **Message Chains**: long `a.b().c().d()` navigation the caller shouldn't depend on. → hide the walk behind one method on the first object.
- **Middle Man**: a class or function that mostly just delegates onward. → cut it, call the real target direct.
- **Refused Bequest**: a subclass or implementer that ignores or overrides most of what it inherits. → drop the inheritance, use composition.

### 4. Spawn both sub-agents in parallel

Issue both sub-agent calls together, in the foreground, and aggregate the reports they return.

**Standards sub-agent prompt** should include:

- The full diff command and commit list.
- The list of standards-source files you found in step 3, **plus the smell baseline from step 3** pasted in full (the sub-agent has no other access to it).
- The brief: "Report, per file/hunk where relevant, (a) every place the diff violates a documented standard: cite the standard (file + the rule); and (b) any baseline smell you spot: name it and quote the hunk. Distinguish hard violations from judgement calls: documented-standard breaches can be hard, but baseline smells are always judgement calls, and a documented repo standard overrides the baseline. Skip anything tooling enforces. Under 400 words."

**Spec sub-agent prompt** should include:

- The diff command and commit list.
- The path or fetched contents of the spec.
- The brief: "Report: (a) requirements the spec asked for that are missing or partial; (b) behaviour in the diff that wasn't asked for (scope creep); (c) requirements that look implemented but where the implementation looks wrong. Quote the spec line for each finding. Under 400 words."

If the spec is missing, skip the Spec sub-agent and note this in the final report.

### 5. Aggregate

Present the two reports under `## Standards` and `## Spec` headings, verbatim or lightly cleaned. Do **not** merge or rerank findings, because the two axes are deliberately separate (see _Why two axes_).

End with a one-line summary: total findings per axis, and the worst issue _within each axis_ (if any). Don't pick a single winner across axes: that's the reranking the separation exists to prevent.

## Why two axes

A change can pass one axis and fail the other:

- Code that follows every standard but implements the wrong thing → **Standards pass, Spec fail.**
- Code that does exactly what the issue asked but breaks the project's conventions → **Spec pass, Standards fail.**

Reporting them separately stops one axis from masking the other.
