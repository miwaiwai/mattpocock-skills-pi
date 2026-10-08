# Design It Twice

<!-- pi-adapter: design-it-twice-workflow -->
> [!IMPORTANT]
> **Pi adapter — authorized independent interface designs.** This block governs Pi execution where the upstream parallel sub-agent wording differs; the vocabulary and parent comparison below remain authoritative.
>
> 1. **Gate the branch.** Reading `codebase-design`, asking for one interface, or asking generally to improve architecture does not authorize delegation or parallel design. Start Design It Twice only when the user explicitly asks to explore multiple alternative interfaces or explicitly authorizes this parallel branch. Otherwise the parent may use the vocabulary directly, but makes no `subagent` call.
> 2. **Build the shared brief in the parent.** Before launch, identify the chosen candidate and prepare a cold-start technical brief containing the repo/cwd/ref; relevant file paths and coupling evidence; constraints and dependencies (including their DEEPENING.md categories); what may sit behind the seam; the exact deep-module terms `module`, `interface`, `depth`, `seam`, `adapter`, `leverage`, and `locality`; relevant project `GLOSSARY.md` terms (or an explicit statement that none exists); and the required five-part upstream output format. Show the user only the problem-space framing and illustrative non-proposal sketch from Step 1.
> 3. **Preflight Pi.** Read [the shared Pi subagent contract](../../../docs/adaptation/pi-subagents-contract.md), confirm the `subagent` tool is available, and call `subagent({ action: "list", capabilities: true })`. Require an executable, non-disabled native `reviewer` that accepts fresh context and a read-only tool override. If the tool or capability call is unavailable, stop and report exactly: `This workflow requires pi-subagents. Install it with: pi install npm:pi-subagents. Then run /reload in the active Pi session, or restart Pi.` Do not change execution mode.
> 4. **Launch exactly one async workflow.** Write one `js workflow` block and make one top-level call with `workflow: true`, `async: true`, `context: "fresh"`, and the explicit repo `cwd`. Inside it, await exactly one `runs.all([...])` containing at least these four designer lanes: `minimal-interface` (1–3 entry points and maximum leverage), `strongest-locality` (concentrate change, bugs, knowledge, and verification), `least-migration` (minimize caller and test migration cost without preserving a shallow interface), and `clearest-seam` (make seam placement, dependency categories, and justified adapters clearest). These are different design constraints, not numbered copies.
> 5. **Make every designer independent and read-only.** Each lane uses `agent: "reviewer"`, `context: "fresh"`, and `tools: ["read", "grep", "find", "ls"]`; grant no `bash`, `edit`, `write`, `subagent`, external tool, or mutation fallback. Each task repeats the complete shared technical brief, relevant files, deep-module terminology, GLOSSARY terms, common output format, its unique constraint, a no-project-changes boundary, and a stop rule for missing evidence. Give every lane a distinct runtime-managed relative `output` and `outputMode: "file-only"`. Do not set child `async: true`: the workflow must await final designer results, not launch receipts.
> 6. **Return evidence without voting.** Return each lane's key, `ok`, `runId`, `output`, `outputReference`, `outputPathMapping`, and `artifactPaths`. Do not catch or replace a rejected child; any lane failure fails the workflow. After native async completion, the parent reads all successful designs, checks them against the shared brief and cited code, presents them sequentially, and compares them by `depth`, `locality`, and `seam placement`. The parent—not a vote, score total, or child—recommends the final design or an evidence-based hybrid and retains final decision authority.
> 7. **Fail closed.** On workflow, launch, extension, prompt-runtime, child-tooling, output-binding, or lane failure, stop the design comparison and report the exact error, failed lane, run/status, repo, cwd, worktree, branch/ref, and clean/partial-diff state. Do not omit the failed lane, compare only survivors, present the parent's first idea as the multi-design result, relaunch outside the one workflow, or switch to CLI/foreground/another execution mode.

When the user wants to explore alternative interfaces for a chosen deepening candidate, use this parallel sub-agent pattern. Based on "Design It Twice" (Ousterhout): your first idea is unlikely to be the best.

Uses the vocabulary in [SKILL.md](SKILL.md): **module**, **interface**, **seam**, **adapter**, **leverage**.

## Process

### 1. Frame the problem space

Before spawning sub-agents, write a user-facing explanation of the problem space for the chosen candidate:

- The constraints any new interface would need to satisfy
- The dependencies it would rely on, and which category they fall into (see [DEEPENING.md](DEEPENING.md))
- A rough illustrative code sketch to ground the constraints, not a proposal, just a way to make the constraints concrete

Show this to the user, then immediately proceed to Step 2. The user reads and thinks while the sub-agents work in parallel.

### 2. Spawn sub-agents

Spawn 3+ sub-agents in parallel. Each must produce a **radically different** interface for the deepened module.

Prompt each sub-agent with a separate technical brief (file paths, coupling details, dependency category from [DEEPENING.md](DEEPENING.md), what sits behind the seam). The brief is independent of the user-facing problem-space explanation in Step 1. Give each agent a different design constraint:

- Agent 1: "Minimize the interface: aim for 1–3 entry points max. Maximise leverage per entry point."
- Agent 2: "Maximise flexibility: support many use cases and extension."
- Agent 3: "Optimise for the most common caller: make the default case trivial."
- Agent 4 (if applicable): "Design around ports & adapters for cross-seam dependencies."

Include both [SKILL.md](SKILL.md) vocabulary and GLOSSARY.md vocabulary in the brief so each sub-agent names things consistently with the architecture language and the project's domain language.

Each sub-agent outputs:

1. Interface (types, methods, params, plus invariants, ordering, error modes)
2. Usage example showing how callers use it
3. What the implementation hides behind the seam
4. Dependency strategy and adapters (see [DEEPENING.md](DEEPENING.md))
5. Trade-offs: where leverage is high, where it's thin

### 3. Present and compare

Present designs sequentially so the user can absorb each one, then compare them in prose. Contrast by **depth** (leverage at the interface), **locality** (where change concentrates), and **seam placement**.

After comparing, give your own recommendation: which design you think is strongest and why. If elements from different designs would combine well, propose a hybrid. Be opinionated: the user wants a strong read, not a menu.
