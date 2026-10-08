---
name: grilling
description: Grill the user relentlessly about a plan, decision, or idea. Use when the user wants to stress-test their thinking, or uses any 'grill' trigger phrases.
---

Interview the user relentlessly until you reach a shared understanding. Map this as a **design tree**: every decision branches into the decisions that hang off it.

Work the tree in **rounds**. The **frontier** is every decision whose prerequisites are already settled: the questions you can ask _now_ without guessing at answers you haven't heard yet. Ask the whole frontier in one round: number each question and give your recommended answer. Then wait for the user's answers before the next round.

Format a round like so:

```
❓ **Q1** - **<question title>**: <question body, might be multiple paragraphs, including multiple choices>

➡️ <your recommended answer>

---

❓ **Q2** - **<question title>**: <question body, might be multiple paragraphs, including multiple choices>

➡️ <your recommended answer>
```

Word each question so "yes" accepts your recommended answer.

Each round the user answers reshapes the tree: settled decisions push the frontier outward and unblock questions that depended on them. Recompute the frontier and ask the next round. A question whose answer depends on another question still open in this round belongs to a _later_ round, not this one.

<!-- pi-adapter: grilling-fact-scout -->
> [!IMPORTANT]
> **Pi adapter — optional read-only fact scout.** This block narrows the fact-exploration branch where Pi execution differs; the upstream design tree, frontier, rounds, and division between agent-owned facts and user-owned decisions remain authoritative.
>
> 1. **Keep the parent in charge of the interview.** The parent asks every decision question directly, supplies its own recommendation, receives the user's answer, and recomputes the frontier. A child may return facts only; it must never answer, recommend, settle, or ask the user a decision on the parent's behalf.
> 2. **Check local facts directly first.** Use the parent's existing `read`, `bash`, and other available tools for facts that can be confirmed quickly in the current environment. Lack of delegation authority never transfers a discoverable fact to the user: the parent still makes a reasonable direct investigation and reports any remaining uncertainty.
> 3. **Require all three launch conditions.** Consider one fact scout only when (a) the user has explicitly authorized delegation or background work in the current request or applicable instructions, (b) the investigation is independent of the decision questions currently ready on the frontier, and (c) a separate fresh context provides a concrete benefit. Automatic/model invocation of grilling is not delegation authority. Without all three conditions, make no `subagent` call.
> 4. **Preflight only after the branch qualifies.** Read [the shared Pi subagent contract](../../../docs/adaptation/pi-subagents-contract.md), confirm the `subagent` tool is available, and call `subagent({ action: "list", capabilities: true })`. Require an executable, non-disabled native `scout` that accepts a per-run read-only tool override. If the tool or capability check is unavailable, stop this optional delegated investigation and report exactly: `This workflow requires pi-subagents. Install it with: pi install npm:pi-subagents. Then run /reload in the active Pi session, or restart Pi.` Keep the fact unresolved; do not change execution mode or invent a result.
> 5. **Launch one permission-bounded scout asynchronously.** Because a direct child call cannot narrow tools in the current API, use exactly one top-level workflow call containing one `runs.run` child. Set the outer call to `workflow: true`, `async: true`, `context: "fresh"`, the explicit `cwd`, and `mission: false`. The child uses `agent: "scout"`, `context: "fresh"`, and `tools: ["read", "grep", "find", "ls"]`; do not grant `bash`, `edit`, `write`, `subagent`, external tools, or a mutation-capable fallback. Give it one bounded factual question, relevant paths and evidence, the repo/cwd/ref, a read-only/no-project-changes boundary, required citations to file paths and line ranges, a concise output shape, and a stop rule for missing evidence. Await and return that one child's result inside the workflow; the outer async launch must not block the parent conversation.
> 6. **Advance only the independent frontier.** Treat the running fact as an unsettled prerequisite and hold only questions downstream of it. Ask every other currently unblocked frontier question in the normal numbered round. Use Pi's native async completion notification; do not poll, sleep, call `bg_wait` merely because the scout is active, or stop asking independent questions.
> 7. **Resolve or expose the gap.** When the scout completes, the parent checks its cited evidence before using it, updates the fact prerequisite, recomputes the frontier, and asks any newly unblocked decisions directly. If launch, tooling, or investigation fails, mark that fact unresolved and report the exact failure/run status; never fabricate the fact or let the child convert uncertainty into a user decision.

Finding _facts_ is your job, never the user's. When a frontier question needs a fact from the environment (filesystem, tools, etc.), dispatch a sub-agent to find it; don't ask the user for anything you could look up yourself. Don't block on it: a running exploration is an unsettled prerequisite, so only the questions downstream of it wait for the sub-agent to report; ask the rest of the frontier now. The _decisions_ are the user's: put each to them and wait.

The session is done when the frontier is empty: every branch of the design tree visited, nothing left silently assumed. Do not act on it until the user confirms you have reached a shared understanding.
