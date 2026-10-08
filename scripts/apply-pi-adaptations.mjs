#!/usr/bin/env node

import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_SKILLS_ROOT = path.resolve(SCRIPT_DIR, "..", "skills");
export const OFFICIAL_SKILL_NAMES = Object.freeze([
  "ask-matt", "diagnosing-bugs", "grill-with-docs", "triage",
  "improve-codebase-architecture", "setup-matt-pocock-skills", "tdd", "to-spec",
  "to-tickets", "wayfinder", "implement", "implement-spec", "prototype", "research",
  "domain-modeling", "codebase-design", "code-review", "pr", "retro", "wizard",
  "grill-me", "grilling", "handoff", "teach", "to-questionnaire", "wait-what",
  "writing-for-agents",
]);

function exactRule(file, upstream, pi, kind) {
  return { file, upstream, pi, expected: 1, kind };
}

function operative(file, upstream, pi) {
  return exactRule(file, upstream, pi, "operative");
}

function platform(file, upstream, pi) {
  return exactRule(file, upstream, pi, "platform");
}

export const SUBAGENT_GUARD_MARKER = "<!-- pi-adapter: subagent-guard -->";
export const CODE_REVIEW_WORKFLOW_MARKER = "<!-- pi-adapter: code-review-workflow -->";
export const RESEARCH_WORKFLOW_MARKER = "<!-- pi-adapter: research-workflow -->";
export const WAYFINDER_WORKFLOW_MARKER = "<!-- pi-adapter: wayfinder-workflow -->";
export const TRACKER_WRITE_GUARD_MARKER = "<!-- pi-adapter: tracker-write-guard -->";
export const GRILLING_FACT_SCOUT_MARKER = "<!-- pi-adapter: grilling-fact-scout -->";
export const ARCHITECTURE_SCOUT_MARKER = "<!-- pi-adapter: architecture-scout -->";
export const DESIGN_IT_TWICE_WORKFLOW_MARKER = "<!-- pi-adapter: design-it-twice-workflow -->";
export const IMPLEMENT_SPEC_WORKFLOW_MARKER = "<!-- pi-adapter: implement-spec-workflow -->";

function subagentGuard(file, anchor, scope = "skill") {
  const contractPath = "../../../docs/adaptation/pi-subagents-contract.md";
  const prefix = [SUBAGENT_GUARD_MARKER, "> [!IMPORTANT]"];
  const previousGuard = [
    ...prefix,
    `> **Pi adapter — subagent prerequisite (${scope}).** Before the first subagent step, read [the shared Pi subagent contract](${contractPath}) and call \`subagent({ action: "list", capabilities: true })\`. If the tool is unavailable or that capability check cannot run, stop and report: \`This workflow requires pi-subagents. Install it with: pi install npm:pi-subagents. Then run /reload in the active Pi session, or restart Pi.\` Do not switch to a CLI, background process, or other implicit fallback.`,
  ].join("\n");
  const guard = [
    ...prefix,
    `> **Pi adapter — subagent prerequisite (${scope}).** Before the first subagent step, read [the shared Pi subagent contract](${contractPath}); that contract governs Pi execution when upstream workflow wording differs. Call \`subagent({ action: "list", capabilities: true })\`. If the tool is unavailable or that capability check cannot run, stop and report: \`This workflow requires pi-subagents. Install it with: pi install npm:pi-subagents. Then run /reload in the active Pi session, or restart Pi.\` Do not switch to a CLI, background process, or other implicit fallback.`,
  ].join("\n");
  return { file, anchor, guard, previousGuard };
}

/**
 * Guards are inserted only into skills (or branch references) that actually
 * delegate. The marker makes adapter-owned prose distinguishable from upstream.
 */
export const SUBAGENT_GUARD_RULES = Object.freeze([]);

export const IMPLEMENT_SPEC_WORKFLOW_RULE = Object.freeze({
  file: "engineering/implement-spec/SKILL.md",
  anchor: "You have been provided a spec.",
  guard: `${IMPLEMENT_SPEC_WORKFLOW_MARKER}
> [!IMPORTANT]
> **Pi adapter — controlled task-graph workflow.** This block replaces upstream execution, merge, review, remote-write, and cleanup wording where they conflict. The upstream goal, task-graph vocabulary, sparse context pointers, and TDD intent remain authoritative.
>
> 1. **Authority and prerequisite.** An explicit \`/skill:implement-spec\` invocation authorizes the implementer, reviewer, integration-owner, and managed-worktree workflow described here. It does not authorize push, PR/MR creation or updates, draft-to-ready changes, ticket closure, labels, assignees, or other remote writes; each requires separate explicit authorization in the current request. Read [the shared Pi subagent contract](../../../docs/adaptation/pi-subagents-contract.md), confirm the \`subagent\` tool exists, and call \`subagent({ action: "list", capabilities: true })\`. Require executable, non-disabled native \`worker\` and \`reviewer\` agents. If the tool or capability call is unavailable, stop and report exactly: \`This workflow requires pi-subagents. Install it with: pi install npm:pi-subagents. Then run /reload in the active Pi session, or restart Pi.\`
> 2. **Build and validate the graph before any child.** The parent reads the complete spec, every ticket, and every blocking edge, then records a lane board with ticket identity, objective, blockers, completion criteria, allowed/forbidden scope, validation commands, and context pointers. Reject duplicate identities, a missing blocker, a cycle, an empty initial ready frontier, any ticket without completion criteria, or an absent/ambiguous integration base/ref. Also classify each ticket's implementation topology and reject overlapping writer claims. No validation failure may reach capability discovery or child launch.
> 3. **Protect the source checkout and create the integration target.** Before worktree allocation, record the repository, source \`cwd\`, current branch/ref, integration base/ref, status, and existing user changes. Managed worktrees require a clean tracked source checkout; preserve user changes and ask the user to commit or stash them rather than modifying, discarding, or hiding them. Create one named local integration branch from the validated base and verify its exact tip. Never use \`git reset --hard\`; if a base is wrong, stop, report it, and recreate only workflow-owned worktrees from the correct named ref.
> 4. **Launch exactly one top-level workflow.** After preflight, write one dynamic \`js workflow\` and make one top-level \`subagent({ workflow: true, async: true, cwd: <repo>, ... })\` call for the entire implementation, integration, final review, and fix process. Do not launch per-ticket top-level calls or a second workflow for code review. Use ordinary JavaScript plus awaited \`runs.all\` for each ready frontier and awaited \`runs.run\` for dependent integration/review/fix steps. Every started run promise is observed directly by \`await\`, \`Promise.all\`, or \`Promise.race\`. Use stable sanitized keys such as \`ticket-<identity>-implement\`, short verb-and-behavior labels, and a returned board that identifies every ticket as \`ready\`, \`blocked\`, \`completed\`, or \`failed\` with run IDs and artifact/handoff references.
> 5. **Isolate every mutation ticket.** Each ready implementation item uses \`agent: "worker"\`, \`context: "fresh"\`, \`worktree: true\`, the explicit repository \`cwd\`, and the verified named integration \`baseRef\`; include matching lane metadata. One ticket owns one managed worktree/branch and one writer, with exclusive file/contract claims. Never run two writers in one \`cwd\`/worktree. Do not set child \`async: true\`: the enclosing async workflow awaits terminal results. A completed lane must return its diff/changed files, test commands and results, commit and exact ref/head evidence, plus the handoff manifest/patch references exposed through \`artifactPaths\`.
> 6. **Give implementers cold-start TDD packets.** Every implementer task has explicit fields for ticket identity and objective; spec/ticket context pointers; repository; worktree/cwd (the runtime-assigned managed worktree, which the child must resolve and report before editing); branch/ref and named base ref; allowed and forbidden files/contracts; the absolute path to this package's \`tdd/SKILL.md\`; test/acceptance commands; expected changed-files, diff, tests, commit/ref, and handoff report; and stop/escalation conditions for missing context, scope overlap, product decisions, base mismatch, failing infrastructure, or inability to validate. It requires reading that absolute TDD skill before editing, confirming the resolved cwd/branch/base and test seams, and working in vertical red→green slices. A code/test failure is returned as a structured failed/blocked ticket with evidence; launch, runtime, extension, worktree, or tooling failure is not converted into an ordinary ticket failure.
> 7. **Integrate serially through one owner.** After a frontier settles, start or resume exactly one \`worker\` as the integration owner in the integration checkout; implementation workers never merge one another. Give it only successful lane handoff/patch paths and require it to verify ticket acceptance, diff, tests, commit/head/base evidence before applying and committing. Reuse the same retained integration-owner session with a new stable key for later waves when resumable; otherwise stop for same-protocol recovery rather than silently creating competing owners. A merge conflict yields an explicit blocked ticket and preserved lane/worktree; no second writer resolves it concurrently. Recompute the ready frontier only from tickets successfully integrated into the integration branch. A failed implementation or test blocks its dependants and stops unsafe new mutation lanes while preserving successful, unintegrated handoffs.
> 8. **Run final review inside the same workflow.** Only after every ticket is integrated, apply the adapted \`code-review\` contract to the integration branch without making another top-level call: capture the fixed base, exact three-dot diff, commits, spec, and standards sources, then launch one awaited \`runs.all\` containing \`standards\` and \`spec\` reviewer children. Both use \`agent: "reviewer"\`, \`context: "fresh"\`, \`tools: ["read", "grep", "find", "ls", "watchdog_diff"]\`, distinct \`output\` paths with \`outputMode: "file-only"\`, and no project/source edits or delegation. Require structured finding counts/verdicts in addition to the two separate reports. A reviewer launch/output/tooling failure fails review; it can never mean passed.
> 9. **Fix and revalidate review findings.** If either review axis reports accepted findings, create one separate managed fix lane from the current named integration ref, with one worker, exclusive scope, the TDD path, exact finding artifacts, and affected validation. Have the same integration owner verify and integrate its handoff, rerun the affected commands, and rerun the relevant fresh read-only review axis inside this workflow. Cap review/fix rounds and return blocked rather than looping indefinitely or treating remaining findings as success.
> 10. **Fail closed with recovery evidence.** On workflow, child launch, extension, worktree, prompt-runtime, or tooling initialization failure, stop launching new lanes and report the exact error, workflow/child run IDs, repo, cwd, worktree, branch/ref/base, status, and partial diff/handoff paths. Preserve failed, dirty, unknown, conflicted, and unintegrated worktrees. Retry only through an explicit same-protocol action; do not switch to an external CLI or foreground agent, and do not let the parent silently implement the tickets.
> 11. **Gate remote effects and cleanup.** Without separate remote authorization, report only the integration branch, local commits, test/review results, residual risks, and proposed remote operations. After terminal workflow evidence, inspect each handoff and run \`subagent({ action: "worktree.cleanup", repo: <repo>, mode: "plan" })\`; review the saved plan, then use \`mode: "apply"\` with its \`planId\` only when authorized by the runtime. Cleanup may remove only workflow-owned, safely integrated, clean, terminal worktrees. It retains every dirty, failed, unknown, conflicted, or unintegrated lane and reports its path, branch, handoff, and recovery command. Never use destructive discard as cleanup.
>
> **Workflow construction invariant.** The dynamic script must carry a bounded validated graph, derive each frontier from integrated predecessors, and return the board plus \`outputReference\`, \`outputPathMapping\`, \`artifactPaths\`, commit/ref evidence, review reports, and residual worktrees. Raw workflow scripts have no shell/filesystem authority: Git mutation and verification belong to the explicitly scoped worker children, while cleanup uses the reviewed management action after the workflow.`,
});

export const WAYFINDER_WORKFLOW_RULE = Object.freeze({
  file: "engineering/wayfinder/SKILL.md",
  anchor: "A loose idea has arrived",
  guard: `${WAYFINDER_WORKFLOW_MARKER}
> [!IMPORTANT]
> **Pi adapter — recoverable frontier orchestration.** This block governs Pi execution where the upstream child-launch, tracker-write, or publication wording differs. The destination, shared map, decision tickets, frontier, fog of war, HITL/AFK split, and ticket types below remain authoritative.
>
> 1. **Separate delegation from remote authority.** An explicit \`/skill:wayfinder\` invocation authorizes the subagent workflow declared here. It does not authorize git push, creating/editing/closing a remote issue, assigning an assignee, or creating/modifying a PR/MR. Those operations require separate explicit user authorization in the current request. Without it, prepare local artifacts and a proposed operation list, show the exact remote mutations awaiting approval, and stop before them. Keep using the configured tracker; missing credentials or authorization never permits a silent switch to another tracker.
> 2. **Preflight before every child wave.** Read [the shared Pi subagent contract](../../../docs/adaptation/pi-subagents-contract.md), confirm the \`subagent\` tool is available, and call \`subagent({ action: "list", capabilities: true })\`. Require an executable, non-disabled native \`researcher\` that supports fresh context, the \`research\` skill, and file-only output. If the tool or capability call is unavailable, stop and report exactly: \`This workflow requires pi-subagents. Install it with: pi install npm:pi-subagents. Then run /reload in the active Pi session, or restart Pi.\` Do not change execution mode.
> 3. **Recompute the frontier from current tracker state.** Before selecting work, re-read the map, each candidate ticket's open/claimed state, type, and every blocking edge. Select only open, unclaimed, unblocked \`research\` tickets. Prototype, grilling, and HITL task tickets remain with the parent and human; no child may impersonate the human, answer a HITL ticket, or convert it to AFK. Recompute again after any observed concurrent tracker change. When remote claim authority exists, immediately before launch re-read and recompute once more, claim each selected ticket, then confirm the claims; without that separate authority, keep the remote tracker unchanged and identify the local research artifacts as provisional.
> 4. **Launch one parallel research workflow.** For two or more ready research tickets, write one \`js workflow\` block and make exactly one top-level call with \`workflow: true\`, \`async: true\`, \`context: "fresh"\`, and the explicit repo \`cwd\`; launch all tickets inside one awaited \`runs.all([...])\`. A single ready research ticket may use one bounded direct child. Each child has a stable key derived from the tracker ticket identity, \`agent: "researcher"\`, \`context: "fresh"\`, \`skill: "research"\`, a distinct absolute Markdown \`output\` inside the approved repo research-note convention, and \`outputMode: "file-only"\`. Do not set child \`async: true\`; the workflow awaits final results rather than dispatch receipts.
> 5. **Give each child exactly one AFK ticket.** Repeat the ticket identity, title, question, map destination, repo/cwd/ref, relevant notes, and known dependencies in its cold-start task. Limit authority to research and the bound report: no tracker mutation, assignment, issue comment/closure, branch creation, commit, push, PR/MR, implementation, or subdelegation. Require the child to load the \`research\` skill and apply its primary-source, citation, and durable-output contract directly in this child; its nested-launch wording grants no subdelegation. Require primary sources only, an identifiable link for every factual claim, labeled uncertainty, and a stop on missing access or evidence. One child handles one ticket and never handles or answers HITL work.
> 6. **Return an identity-preserving result.** The workflow returns one entry per ticket containing \`ticketIdentity\`, stable \`key\`, \`ok\`, \`runId\`, \`output\`, \`outputReference\`, \`outputPathMapping\`, and \`artifactPaths\`. Do not catch, replace, or relaunch a rejected child inside or outside the workflow. Stable keys and the terminal workflow receipt must make every successful or failed lane recoverable and map every artifact back to its tracker identity.
> 7. **Apply results with optimistic revalidation.** A launch receipt is not a resolution. After terminal completion, verify each bound Markdown file, citations, and ticket match. Immediately before every map/ticket write—claim, comment, close, edge change, map edit, or new ticket—re-read that ticket's state and blocking edges and recompute the frontier. If it was claimed, closed, edited, or newly blocked by another session, leave it unresolved and preserve the artifact as recovery evidence. Perform an authorized remote mutation only after this fresh read; otherwise append it to the proposed-operation list and await confirmation.
> 8. **Fail recoverably and stop at planning.** A failed workflow or lane leaves that ticket open/unresolved, never appends it to Decisions-so-far, and never lets the map be declared complete. Record the exact run/status, failed key and ticket identity, workflow receipt/output references, repo/cwd/ref, worktree state, partial artifact, and safe same-protocol retry point. Do not treat successful sibling lanes as proof that a failed ticket resolved, and do not switch to CLI/foreground/another tracker. When no decisions or fog remain, present \`/skill:to-spec\`; do not enter \`implement\` automatically.`,
});

function trackerWriteGuard(file, remote) {
  const remoteRule = remote
    ? "Read-only tracker queries are allowed. Git push; creating, editing, commenting on, closing, or assigning a remote issue; and creating or modifying a PR/MR require separate explicit user authorization in the current request. Without it, produce local artifacts plus the exact proposed operations and wait for confirmation."
    : "Local Markdown tracker writes are local project changes, not remote authorization. Git push and any later remote issue or PR/MR operation still require separate explicit user authorization in the current request.";
  return Object.freeze({
    file,
    anchor: "## Wayfinding operations",
    guard: `${TRACKER_WRITE_GUARD_MARKER}\n> [!IMPORTANT]\n> **Pi adapter — concurrent tracker writes and remote effects.** ${remoteRule} Immediately before every wayfinding write, re-read the affected ticket's current state and blocking edges and recompute the frontier. If concurrent state invalidates the operation, preserve the local artifact and leave the ticket unresolved. Never silently change tracker because access or authorization is missing.`,
  });
}

export const TRACKER_WRITE_GUARD_RULES = Object.freeze([
  trackerWriteGuard("engineering/setup-matt-pocock-skills/issue-tracker-github.md", true),
  trackerWriteGuard("engineering/setup-matt-pocock-skills/issue-tracker-gitlab.md", true),
  trackerWriteGuard("engineering/setup-matt-pocock-skills/issue-tracker-local.md", false),
]);

export const ARCHITECTURE_SCOUT_RULE = Object.freeze({
  file: "engineering/improve-codebase-architecture/SKILL.md",
  anchor: "Surface architectural friction",
  guard: `${ARCHITECTURE_SCOUT_MARKER}
> [!IMPORTANT]
> **Pi adapter — one evidence-bound architecture scout.** This block governs Pi execution where the upstream sub-agent wording differs; the upstream exploration criteria, HTML format, and interaction remain authoritative.
>
> 1. **Establish the narrow authority.** An explicit \`/skill:improve-codebase-architecture\` invocation authorizes exactly one read-only codebase-scanning scout because this skill's advertised description promises that scan. If these instructions were reached without that explicit invocation or another explicit delegation request, ask for authorization before launching; without it, make no \`subagent\` call.
> 2. **Prepare the scan in the parent.** The parent chooses the user-named scope or derives one from commit history, reads the relevant \`GLOSSARY.md\` and ADRs, and prepares the exact repo, cwd, ref, paths, hot-spot evidence, and deep-module vocabulary before launch. Load only \`codebase-design\` at this stage. Do not load \`grilling\` or \`domain-modeling\`, and do not propose a concrete new interface before the user selects a candidate.
> 3. **Preflight Pi.** Read [the shared Pi subagent contract](../../../docs/adaptation/pi-subagents-contract.md), confirm the \`subagent\` tool is available, and call \`subagent({ action: "list", capabilities: true })\`. Require one executable, non-disabled native \`scout\` that accepts a read-only per-run tool override. If the tool or capability call is unavailable, stop and report exactly: \`This workflow requires pi-subagents. Install it with: pi install npm:pi-subagents. Then run /reload in the active Pi session, or restart Pi.\` Do not change execution mode.
> 4. **Launch one scout, once.** Because the direct-child API cannot narrow tools per run, write one \`js workflow\` block containing exactly one awaited \`runs.run\` child, then make one top-level call with \`workflow: true\`, \`async: true\`, \`context: "fresh"\`, the explicit repo \`cwd\`, and \`mission: false\`. The only child uses key \`architecture-scout\`, \`agent: "scout"\`, \`context: "fresh"\`, and \`tools: ["read", "grep", "find", "ls"]\`; do not grant \`bash\`, \`edit\`, \`write\`, \`subagent\`, external tools, or a mutation-capable fallback. Await and return that child's final result; do not set child \`async: true\` and mistake a launch receipt for evidence. The cold-start task includes the prepared scope/ref/paths, hot spots, relevant glossary and ADR terms, the deep-module vocabulary and deletion test, and a read-only/no-project-changes boundary. Require only: observed friction; exact file paths and line ranges or symbols as evidence; candidate deepening areas tied to that evidence; confidence and gaps. The scout neither designs interfaces nor writes the HTML report. Do not launch duplicate or per-area scouts.
> 5. **Keep report authorship in the parent.** Yield to Pi's native async completion notification rather than polling. After completion, the parent verifies every cited path/symbol, derives report candidates only from the scout's evidence, and writes/opens the HTML report itself. Every candidate card must cite the supporting scout evidence; omit unsupported candidates. The parent chooses the recommendation strength and top recommendation, then asks which candidate the user wants to explore. The report still contains no concrete proposed interface.
> 6. **Load the interactive skills only after selection.** Once the user selects a candidate, then—and only then—read and follow \`grilling\` and \`domain-modeling\`. The parent conducts the conversation and retains every architecture decision. Enter Design It Twice only if the user explicitly asks to explore multiple alternative interfaces or explicitly authorizes that branch.
> 7. **Fail closed.** A missing tool, capability failure, child launch/runtime/tooling failure, or absent evidence stops the scan/report flow as success. Report the exact error and run/status plus repo, cwd, worktree, branch/ref, and clean/partial-diff state. Do not silently scan in a second child, invent evidence, produce unsupported candidates, or switch to a parent-written scan, CLI, foreground child, or other execution mode.`,
});

export const DESIGN_IT_TWICE_WORKFLOW_RULE = Object.freeze({
  file: "engineering/codebase-design/DESIGN-IT-TWICE.md",
  anchor: "When the user wants",
  guard: `${DESIGN_IT_TWICE_WORKFLOW_MARKER}
> [!IMPORTANT]
> **Pi adapter — authorized independent interface designs.** This block governs Pi execution where the upstream parallel sub-agent wording differs; the vocabulary and parent comparison below remain authoritative.
>
> 1. **Gate the branch.** Reading \`codebase-design\`, asking for one interface, or asking generally to improve architecture does not authorize delegation or parallel design. Start Design It Twice only when the user explicitly asks to explore multiple alternative interfaces or explicitly authorizes this parallel branch. Otherwise the parent may use the vocabulary directly, but makes no \`subagent\` call.
> 2. **Build the shared brief in the parent.** Before launch, identify the chosen candidate and prepare a cold-start technical brief containing the repo/cwd/ref; relevant file paths and coupling evidence; constraints and dependencies (including their DEEPENING.md categories); what may sit behind the seam; the exact deep-module terms \`module\`, \`interface\`, \`depth\`, \`seam\`, \`adapter\`, \`leverage\`, and \`locality\`; relevant project \`GLOSSARY.md\` terms (or an explicit statement that none exists); and the required five-part upstream output format. Show the user only the problem-space framing and illustrative non-proposal sketch from Step 1.
> 3. **Preflight Pi.** Read [the shared Pi subagent contract](../../../docs/adaptation/pi-subagents-contract.md), confirm the \`subagent\` tool is available, and call \`subagent({ action: "list", capabilities: true })\`. Require an executable, non-disabled native \`reviewer\` that accepts fresh context and a read-only tool override. If the tool or capability call is unavailable, stop and report exactly: \`This workflow requires pi-subagents. Install it with: pi install npm:pi-subagents. Then run /reload in the active Pi session, or restart Pi.\` Do not change execution mode.
> 4. **Launch exactly one async workflow.** Write one \`js workflow\` block and make one top-level call with \`workflow: true\`, \`async: true\`, \`context: "fresh"\`, and the explicit repo \`cwd\`. Inside it, await exactly one \`runs.all([...])\` containing at least these four designer lanes: \`minimal-interface\` (1–3 entry points and maximum leverage), \`strongest-locality\` (concentrate change, bugs, knowledge, and verification), \`least-migration\` (minimize caller and test migration cost without preserving a shallow interface), and \`clearest-seam\` (make seam placement, dependency categories, and justified adapters clearest). These are different design constraints, not numbered copies.
> 5. **Make every designer independent and read-only.** Each lane uses \`agent: "reviewer"\`, \`context: "fresh"\`, and \`tools: ["read", "grep", "find", "ls"]\`; grant no \`bash\`, \`edit\`, \`write\`, \`subagent\`, external tool, or mutation fallback. Each task repeats the complete shared technical brief, relevant files, deep-module terminology, GLOSSARY terms, common output format, its unique constraint, a no-project-changes boundary, and a stop rule for missing evidence. Give every lane a distinct runtime-managed relative \`output\` and \`outputMode: "file-only"\`. Do not set child \`async: true\`: the workflow must await final designer results, not launch receipts.
> 6. **Return evidence without voting.** Return each lane's key, \`ok\`, \`runId\`, \`output\`, \`outputReference\`, \`outputPathMapping\`, and \`artifactPaths\`. Do not catch or replace a rejected child; any lane failure fails the workflow. After native async completion, the parent reads all successful designs, checks them against the shared brief and cited code, presents them sequentially, and compares them by \`depth\`, \`locality\`, and \`seam placement\`. The parent—not a vote, score total, or child—recommends the final design or an evidence-based hybrid and retains final decision authority.
> 7. **Fail closed.** On workflow, launch, extension, prompt-runtime, child-tooling, output-binding, or lane failure, stop the design comparison and report the exact error, failed lane, run/status, repo, cwd, worktree, branch/ref, and clean/partial-diff state. Do not omit the failed lane, compare only survivors, present the parent's first idea as the multi-design result, relaunch outside the one workflow, or switch to CLI/foreground/another execution mode.`,
});

export const GRILLING_FACT_SCOUT_RULE = Object.freeze({
  file: "productivity/grilling/SKILL.md",
  anchor: "Finding _facts_ is your job",
  guard: `${GRILLING_FACT_SCOUT_MARKER}
> [!IMPORTANT]
> **Pi adapter — optional read-only fact scout.** This block narrows the fact-exploration branch where Pi execution differs; the upstream design tree, frontier, rounds, and division between agent-owned facts and user-owned decisions remain authoritative.
>
> 1. **Keep the parent in charge of the interview.** The parent asks every decision question directly, supplies its own recommendation, receives the user's answer, and recomputes the frontier. A child may return facts only; it must never answer, recommend, settle, or ask the user a decision on the parent's behalf.
> 2. **Check local facts directly first.** Use the parent's existing \`read\`, \`bash\`, and other available tools for facts that can be confirmed quickly in the current environment. Lack of delegation authority never transfers a discoverable fact to the user: the parent still makes a reasonable direct investigation and reports any remaining uncertainty.
> 3. **Require all three launch conditions.** Consider one fact scout only when (a) the user has explicitly authorized delegation or background work in the current request or applicable instructions, (b) the investigation is independent of the decision questions currently ready on the frontier, and (c) a separate fresh context provides a concrete benefit. Automatic/model invocation of grilling is not delegation authority. Without all three conditions, make no \`subagent\` call.
> 4. **Preflight only after the branch qualifies.** Read [the shared Pi subagent contract](../../../docs/adaptation/pi-subagents-contract.md), confirm the \`subagent\` tool is available, and call \`subagent({ action: "list", capabilities: true })\`. Require an executable, non-disabled native \`scout\` that accepts a per-run read-only tool override. If the tool or capability check is unavailable, stop this optional delegated investigation and report exactly: \`This workflow requires pi-subagents. Install it with: pi install npm:pi-subagents. Then run /reload in the active Pi session, or restart Pi.\` Keep the fact unresolved; do not change execution mode or invent a result.
> 5. **Launch one permission-bounded scout asynchronously.** Because a direct child call cannot narrow tools in the current API, use exactly one top-level workflow call containing one \`runs.run\` child. Set the outer call to \`workflow: true\`, \`async: true\`, \`context: "fresh"\`, the explicit \`cwd\`, and \`mission: false\`. The child uses \`agent: "scout"\`, \`context: "fresh"\`, and \`tools: ["read", "grep", "find", "ls"]\`; do not grant \`bash\`, \`edit\`, \`write\`, \`subagent\`, external tools, or a mutation-capable fallback. Give it one bounded factual question, relevant paths and evidence, the repo/cwd/ref, a read-only/no-project-changes boundary, required citations to file paths and line ranges, a concise output shape, and a stop rule for missing evidence. Await and return that one child's result inside the workflow; the outer async launch must not block the parent conversation.
> 6. **Advance only the independent frontier.** Treat the running fact as an unsettled prerequisite and hold only questions downstream of it. Ask every other currently unblocked frontier question in the normal numbered round. Use Pi's native async completion notification; do not poll, sleep, call \`bg_wait\` merely because the scout is active, or stop asking independent questions.
> 7. **Resolve or expose the gap.** When the scout completes, the parent checks its cited evidence before using it, updates the fact prerequisite, recomputes the frontier, and asks any newly unblocked decisions directly. If launch, tooling, or investigation fails, mark that fact unresolved and report the exact failure/run status; never fabricate the fact or let the child convert uncertainty into a user decision.`,
});

export const CODE_REVIEW_WORKFLOW_RULE = Object.freeze({
  file: "engineering/code-review/SKILL.md",
  anchor: "Two-axis review",
  guard: `${CODE_REVIEW_WORKFLOW_MARKER}
> [!IMPORTANT]
> **Pi adapter — isolated two-axis workflow.** This block replaces upstream execution wording where the two conflict; the review criteria and report shape below remain authoritative.
>
> 1. **Establish delegation authority.** An explicit \`/skill:code-review\` invocation authorizes the independent reviewer workflow described by this skill. When this skill is selected automatically from an ordinary request such as “review,” ask the user to authorize subagent delegation before launching. Without authorization, stop before any \`subagent\` call.
> 2. **Finish parent preflight first.** In the parent session, obtain the fixed point and validate it with \`git rev-parse\`; capture the exact three-dot diff command, reject an empty diff, capture \`git log <fixed-point>..HEAD --oneline\`, find the spec source (or establish that none exists), and find every standards source. Do all of this before capability discovery or reviewer launch. An invalid fixed point, empty diff, unresolved request for a spec source, or other precondition failure launches no reviewer.
> 3. **Preflight Pi.** Read [the shared Pi subagent contract](../../../docs/adaptation/pi-subagents-contract.md), then confirm the \`subagent\` tool is available and call \`subagent({ action: "list", capabilities: true })\`. Require an executable, non-disabled native \`reviewer\`. If the tool or capability call is unavailable, stop and report exactly: \`This workflow requires pi-subagents. Install it with: pi install npm:pi-subagents. Then run /reload in the active Pi session, or restart Pi.\` Do not change execution mode.
> 4. **Build cold-start prompts.** The Standards prompt must contain the exact diff command, the captured commit list, every standards-source path (an explicit empty list is allowed), the complete smell baseline from this skill pasted in full, the upstream Standards brief, and the 400-word limit. The Spec prompt must contain the exact diff command, the captured commit list, the spec path or fetched contents, the upstream Spec brief, and the 400-word limit. Each prompt must identify the repo/cwd/ref, state that the child is read-only, forbid project/source edits and delegation, allow only the configured output artifact, and require findings plus a finding count and most severe issue for that axis.
> 5. **Launch the exact review shape.** When a spec exists, make exactly one top-level workflow call with \`workflow: true\`, \`async: true\`, \`context: "fresh"\`, and the explicit repo \`cwd\`. Its single \`runs.all([...])\` launches exactly two children keyed \`standards\` and \`spec\`. Both use \`agent: "reviewer"\`, \`context: "fresh"\`, \`tools: ["read", "grep", "find", "ls", "watchdog_diff"]\`, distinct prompts, distinct relative outputs (for example \`code-review/standards.md\` and \`code-review/spec.md\`), and \`outputMode: "file-only"\`. Await \`runs.all\`; return a JSON object that preserves each axis separately and includes its \`ok\`, \`runId\`, \`output\`, \`outputReference\`, \`outputPathMapping\`, and \`artifactPaths\`. Do not catch a failed child: either lane failing must fail the workflow. Do not launch either reviewer outside that one workflow.
> 6. **Handle no-spec reviews honestly.** If the user confirms that no spec exists, skip the Spec child. Launch one bounded direct Standards reviewer with the same fresh context, read-only tools, async mode, cwd, prompt, and durable file-only output. Do not construct a workflow or fabricate a second lane. In the final \`## Spec\` section say explicitly that no spec was available and the axis was skipped.
> 7. **Yield and accept in the parent.** Async launch receipts are not completed reviews. Yield to Pi's native completion notification rather than polling. After completion, consume the final child/workflow result and its real \`outputReference\`, \`outputPathMapping\`, or \`artifactPaths\`; verify both requested reports exist, correspond to the exact diff/ref, stay within their assigned axes and word limits, remain read-only, and contain an axis finding count and most severe issue. Child success is evidence, not acceptance. Lightly clean the reports, then print \`## Standards\` and \`## Spec\` separately and preserve the upstream per-axis summary; never merge or cross-rank findings.
> 8. **Fail closed.** A workflow, launch, extension, prompt runtime, child-tooling, output-binding, or lane failure stops aggregation as success. Report the exact error, run/status, repo, cwd, worktree, branch/ref, and clean/partial-diff state. Do not silently retry as a parent-written review, foreground child, CLI, or other execution mode.`,
});

export const RESEARCH_WORKFLOW_RULE = Object.freeze({
  file: "engineering/research/SKILL.md",
  anchor: "Spin up a **background agent**",
  guard: `${RESEARCH_WORKFLOW_MARKER}
> [!IMPORTANT]
> **Pi adapter — bounded background research.** Read [the shared Pi subagent contract](../../../docs/adaptation/pi-subagents-contract.md) before launching.
>
> 1. **Establish delegation authority.** An explicit \`/skill:research\` invocation or a request to delegate research to a background agent authorizes this one-child workflow. If this skill was selected automatically from an ordinary request such as “research this,” ask the user to authorize background delegation before launching. If authorization is absent, do not call \`subagent\`.
> 2. **Choose one output before launch.** Inspect the repository for an existing research-note convention and use it. If none exists, use \`docs/research/<descriptive-slug>.md\` and tell the user. Resolve the repo/cwd and target file explicitly. Convert the target to an absolute path inside that repo before binding it, because a relative child \`output\` is runtime-managed scratch rather than the requested repository note. Create no other research-note output.
> 3. **Preflight the prerequisite.** Confirm the \`subagent\` tool is available, then call \`subagent({ action: "list", capabilities: true })\`. Select one executable, non-disabled native \`researcher\` agent. If the tool is unavailable or the capability call cannot run, stop and report exactly: \`This workflow requires pi-subagents. Install it with: pi install npm:pi-subagents. Then run /reload in the active Pi session, or restart Pi.\` If no eligible researcher is listed, stop and report that capability failure. Do not use an external CLI or another execution mode as fallback.
> 4. **Launch exactly one bounded child.** Make one direct call with \`agent: "researcher"\`, \`context: "fresh"\`, the explicit repo \`cwd\`, \`async: true\`, a finite \`timeoutMs\`, \`output\` bound to the chosen Markdown target's absolute path, and \`outputMode: "file-only"\`. The task must state: the research question; repo and cwd; read-only authority except for the bound report; primary sources only (official docs, specifications, first-party APIs, and source code); an inline Markdown citation for every factual claim plus identifiable primary-source links; the exact output target; completion criteria; and a stop-and-report rule for missing sources, access, or permissions. The \`output\` field is the durable binding—the filename in task prose is not.
> 5. **Yield, then validate.** In an ordinary interactive session, after launch report the run identity and bound target, then yield to Pi's native completion notification; do not poll or call a wait tool merely because the child is active. On completion, consume the child result and report its actual \`outputReference\`, \`outputPathMapping\`, or \`artifactPaths\`. Verify that the bound file exists, citations are recognizable, key claims resolve to primary sources, and unverified inferences are either removed or explicitly labeled. A launch receipt alone is not completion.
> 6. **Fail closed.** If the child/extension fails, the bound file is absent, or the report has no recognizable citations, stop and report the exact failure and run/status plus repo/cwd/ref and worktree state. Preserve any partial artifact as failed evidence, and do not silently retry through a CLI, foreground agent, unbound file, or other fallback.`,
});

/**
 * Pi-specific context, session, and temporary-file behavior. These exact
 * replacements keep the vendored prose attributable to upstream while making
 * wording drift fail closed during the next sync.
 */
export const PLATFORM_RULES = Object.freeze([
  platform(
    "engineering/setup-matt-pocock-skills/SKILL.md",
    "- `AGENTS.md` and `CLAUDE.md` at the repo root: does either exist? Is there already an `## Agent skills` section in either?",
    "- `AGENTS.override.md`, `AGENTS.md`, and `CLAUDE.md` at the repo root: which context file is effective, and is there already an `## Agent skills` section in it? In Pi, a same-directory `AGENTS.override.md` replaces both ordinary context files, so flag that override before proposing edits.",
  ),
  platform(
    "engineering/setup-matt-pocock-skills/SKILL.md",
    "- The `## Agent skills` block to add to whichever of `CLAUDE.md` / `AGENTS.md` is being edited (see step 4 for selection rules)",
    "- The `## Agent skills` block to add to the effective context file selected by step 4",
  ),
  platform(
    "engineering/setup-matt-pocock-skills/SKILL.md",
    "**Pick the file to edit:**\n\n- If `CLAUDE.md` exists, edit it.\n- Else if `AGENTS.md` exists, edit it.\n- If neither exists, ask the user which one to create; don't pick for them.\n\nNever create `AGENTS.md` when `CLAUDE.md` already exists (or vice versa); always edit the one that's already there.\n\nIf an `## Agent skills` block already exists in the chosen file, update its contents in-place rather than appending a duplicate. Don't overwrite user edits to the surrounding sections.",
    "**Pick the effective context file to edit:**\n\n- If `AGENTS.override.md` exists, explain that Pi loads it instead of a same-directory `AGENTS.md` or `CLAUDE.md`. Edit `AGENTS.override.md` unless the user chooses to remove the override first; never write this configuration only to a file the override makes ineffective.\n- Otherwise, if `AGENTS.md` exists, edit `AGENTS.md`.\n- Otherwise, if `CLAUDE.md` exists, respect the existing Claude project and edit `CLAUDE.md`.\n- If none exists, create `AGENTS.md` by default without asking the user to choose between context-file names.\n\nCreate at most one context file. In particular, never create `CLAUDE.md` alongside `AGENTS.md`, or `AGENTS.md` alongside an existing `CLAUDE.md`.\n\nIf an `## Agent skills` block already exists in the selected effective file, update its contents in-place rather than appending a duplicate. Don't overwrite user edits to the surrounding sections.",
  ),
  platform(
    "engineering/retro/SKILL.md",
    "2. Read the primary sources for the session the user specifies. This may mean searching through session logs on this machine. If the user doesn't specify a session, default to the current one.",
    "2. Read the primary sources for the session the user specifies. If no session is specified, locate the current Pi session precisely from the shell-tool environment: `$PI_SESSION_ID` identifies it and `$PI_SESSION_FILE` is its absolute JSONL path when the session is persistent. Treat the path as an opaque, quoted value so Windows drive letters, backslashes, and spaces remain valid. Before reading a session file, warn the user that it may contain prompts, tool arguments, command output, file contents, and other sensitive information. If `$PI_SESSION_FILE` is set and the file exists, read that file first. If it is unset or missing, ask the user to specify a log or run `/session` to obtain the current file and ID; do not recursively scan the home directory. Continue to redact credentials, personal data, and other sensitive values from retrospective output.",
  ),
  platform(
    "productivity/handoff/SKILL.md",
    "Write a handoff document summarising the current conversation so a fresh agent can continue the work. Save to the temporary directory of the user's OS (`$TMPDIR`, else `/tmp`; `%TEMP%` on Windows) - not the current workspace.",
    "Write a handoff document summarising the current conversation so a fresh agent can continue the work. Select the temporary root by platform: on Windows use `%TEMP%` (the `TEMP` environment variable, available as `$TEMP` in a shell); on Unix use `$TMPDIR` when non-empty, otherwise `/tmp`. Resolve the selected directory and final file to absolute paths, and verify the destination is outside the current workspace and repository. If no usable external temporary directory is available, ask the user for one rather than writing into the project. Name the file `pi-handoff-<UTC timestamp>-<unique suffix>.md`, using a filesystem-safe timestamp and an exclusive-create operation so an existing handoff is never overwritten; retry with a new suffix on collision.",
  ),
  platform(
    "productivity/handoff/SKILL.md",
    "Redact any sensitive information, such as API keys, passwords, or personally identifiable information.",
    "Before writing, redact sensitive information such as API keys, passwords, and personally identifiable information. Then report the final handoff file's absolute path.",
  ),
]);

/**
 * Exact upstream sentences which invoke Claude Code's Skill tool. Each Pi
 * replacement loads only model-invoked skills advertised in the system prompt.
 * These literals intentionally make upstream wording drift a hard failure.
 */
export const OPERATIVE_RULES = Object.freeze([
  operative(
    "productivity/grill-me/SKILL.md",
    'Call the Skill tool with "grilling".',
    'Read the advertised SKILL.md for the model-invoked skill `grilling`, then follow it for this phase.',
  ),
  operative(
    "engineering/grill-with-docs/SKILL.md",
    'Call the Skill tool twice, for "grilling" and "domain-modeling".',
    'Read the advertised SKILL.md for the model-invoked skill `grilling` and the advertised SKILL.md for the model-invoked skill `domain-modeling` separately, then follow both for this phase.',
  ),
  operative(
    "engineering/implement/SKILL.md",
    'Call the Skill tool with "tdd" where possible, at pre-agreed seams.',
    'Read the advertised SKILL.md for the model-invoked skill `tdd`, then follow it where possible at pre-agreed seams.',
  ),
  operative(
    "engineering/implement/SKILL.md",
    'Once done, call the Skill tool with "code-review" to review the work.',
    'Once done, read the advertised SKILL.md for the model-invoked skill `code-review`, then follow it to review the work.',
  ),
  operative(
    "engineering/implement-spec/SKILL.md",
    '   - calls the Skill tool with `tdd` to build the ticket;',
    '   - reads the advertised SKILL.md for the model-invoked skill `tdd`, then follows it to build the ticket;',
  ),
  operative(
    "engineering/implement-spec/SKILL.md",
    '7. Once all tickets are complete, call the Skill tool with `code-review` on the integration branch. Fix all issues raised by the code review in a single **implementer subagent**.',
    '7. Once all tickets are complete, read the advertised SKILL.md for the model-invoked skill `code-review`, then follow it on the integration branch. Fix all issues raised by the code review in a single **implementer subagent**.',
  ),
  operative(
    "engineering/improve-codebase-architecture/SKILL.md",
    '- Call the Skill tool with "codebase-design" for the architecture vocabulary (**module**, **interface**, **depth**, **seam**, **adapter**, **leverage**, **locality**) and its principles (the deletion test, "the interface is the test surface", "one adapter = hypothetical seam, two = real"). Use these terms exactly in every suggestion, and don\'t drift into "component," "service," "API," or "boundary."',
    '- Read the advertised SKILL.md for the model-invoked skill `codebase-design` for the architecture vocabulary (**module**, **interface**, **depth**, **seam**, **adapter**, **leverage**, **locality**) and its principles (the deletion test, "the interface is the test surface", "one adapter = hypothetical seam, two = real"). Follow it for this phase. Use these terms exactly in every suggestion, and don\'t drift into "component," "service," "API," or "boundary."',
  ),
  operative(
    "engineering/improve-codebase-architecture/SKILL.md",
    'Once the user picks a candidate, call the Skill tool with "grilling" to walk the decision tree with them: constraints, dependencies, the shape of the deepened module, what sits behind the seam, what tests survive.',
    'Once the user picks a candidate, read the advertised SKILL.md for the model-invoked skill `grilling`, then follow it to walk the decision tree with them: constraints, dependencies, the shape of the deepened module, what sits behind the seam, what tests survive.',
  ),
  operative(
    "engineering/improve-codebase-architecture/SKILL.md",
    'Side effects happen inline as decisions crystallize; call the Skill tool with "domain-modeling" to keep the domain model current as you go:',
    'Side effects happen inline as decisions crystallize; read the advertised SKILL.md for the model-invoked skill `domain-modeling`, then follow it to keep the domain model current as you go:',
  ),
  operative(
    "engineering/improve-codebase-architecture/SKILL.md",
    '- **Want to explore alternative interfaces for the deepened module?** Call the Skill tool with "codebase-design" and use its design-it-twice parallel sub-agent pattern.',
    '- **Want to explore alternative interfaces for the deepened module?** Read the advertised SKILL.md for the model-invoked skill `codebase-design`, then follow its design-it-twice parallel sub-agent pattern.',
  ),
  operative(
    "engineering/retro/SKILL.md",
    '1. Call the Skill tool with `writing-for-agents` for the writing style guide.',
    '1. Read the advertised SKILL.md for the model-invoked skill `writing-for-agents`, then follow its writing style guide for this phase.',
  ),
  operative(
    "engineering/tdd/SKILL.md",
    'When the shape of that interface is itself in question (how deep the module is, where the seam belongs, what the interface should expose), call the Skill tool with "codebase-design" for the vocabulary. It is the shared source of the module, interface, depth, seam, adapter, leverage and locality terms, and it is a reference to consult, not a session to run.',
    'When the shape of that interface is itself in question (how deep the module is, where the seam belongs, what the interface should expose), read the advertised SKILL.md for the model-invoked skill `codebase-design` for the vocabulary, then follow it for this phase. It is the shared source of the module, interface, depth, seam, adapter, leverage and locality terms, and it is a reference to consult, not a session to run.',
  ),
  operative(
    "engineering/triage/SKILL.md",
    '4. **Grill (if needed).** If the request needs fleshing out, call the Skill tool twice, for "grilling" and "domain-modeling", and grill it into shape a round of questions at a time, sharpening domain terms and updating `GLOSSARY.md`/ADRs inline as decisions land.',
    '4. **Grill (if needed).** If the request needs fleshing out, read the advertised SKILL.md for the model-invoked skill `grilling` and the advertised SKILL.md for the model-invoked skill `domain-modeling` separately, then follow both to grill it into shape a round of questions at a time, sharpening domain terms and updating `GLOSSARY.md`/ADRs inline as decisions land.',
  ),
  operative(
    "engineering/wayfinder/SKILL.md",
    '- **Research** (AFK): Reading documentation, third-party APIs, or local resources like knowledge bases to surface a fact a decision waits on. Resolved by a subagent that calls the Skill tool with "research". Use when knowledge outside the current working directory is required.',
    '- **Research** (AFK): Reading documentation, third-party APIs, or local resources like knowledge bases to surface a fact a decision waits on. Resolved by a subagent instructed to read the advertised SKILL.md for the model-invoked skill `research`, then follow it for this phase. Use when knowledge outside the current working directory is required.',
  ),
  operative(
    "engineering/wayfinder/SKILL.md",
    '- **Prototype** (HITL): Raise the fidelity of the discussion by making a cheap, rough, concrete artifact to react to (an outline, a rough take, a stub, or UI/logic code) by calling the Skill tool with "prototype". Links the prototype as an asset. Use when "how should it look" or "how should it behave" is the key question.',
    '- **Prototype** (HITL): Raise the fidelity of the discussion by making a cheap, rough, concrete artifact to react to (an outline, a rough take, a stub, or UI/logic code) by reading the advertised SKILL.md for the model-invoked skill `prototype`, then following it for this phase. Links the prototype as an asset. Use when "how should it look" or "how should it behave" is the key question.',
  ),
  operative(
    "engineering/wayfinder/SKILL.md",
    '- **Grilling** (HITL): Conversation. The default case. Always call the Skill tool twice, for "grilling" and "domain-modeling".',
    '- **Grilling** (HITL): Conversation. The default case. Always read the advertised SKILL.md for the model-invoked skill `grilling` and the advertised SKILL.md for the model-invoked skill `domain-modeling` separately, then follow both for this phase.',
  ),
  operative(
    "engineering/wayfinder/SKILL.md",
    '1. **Name the destination.** Call the Skill tool twice, for "grilling" and "domain-modeling", to pin down what this map is finding its way to: the spec, decision, or change. The destination fixes the scope, so it\'s settled first.',
    '1. **Name the destination.** Read the advertised SKILL.md for the model-invoked skill `grilling` and the advertised SKILL.md for the model-invoked skill `domain-modeling` separately, then follow both to pin down what this map is finding its way to: the spec, decision, or change. The destination fixes the scope, so it\'s settled first.',
  ),
  operative(
    "engineering/wayfinder/SKILL.md",
    '5. **Fire the research subagents.** For each `research` ticket you just created, spin up a subagent that calls the Skill tool with "research" to resolve it in parallel, capturing its findings on a throwaway `research/<name>` branch with a context pointer from the ticket. Push the branch but open no PR: it is never merged.',
    '5. **Fire the research subagents.** For each `research` ticket you just created, spin up a subagent instructed to read the advertised SKILL.md for the model-invoked skill `research`, then follow it to resolve the ticket in parallel, capturing its findings on a throwaway `research/<name>` branch with a context pointer from the ticket. Push the branch but open no PR: it is never merged.',
  ),
  operative(
    "engineering/wayfinder/SKILL.md",
    '3. Resolve it as the type its `wayfinder:<type>` label names (see [Ticket Types](#ticket-types)). Read the label, not just the body: the body never states the type. **Zoom as needed**: fetch the full body of any related or closed ticket on demand; call the Skill tool for whichever skills the `## Notes` block names. If in doubt, call the Skill tool twice, for "grilling" and "domain-modeling".',
    '3. Resolve it as the type its `wayfinder:<type>` label names (see [Ticket Types](#ticket-types)). Read the label, not just the body: the body never states the type. **Zoom as needed**: fetch the full body of any related or closed ticket on demand. For each skill the `## Notes` block names, read its advertised SKILL.md only if it is a model-invoked skill advertised in the system prompt, then follow it for this phase; if it is user-invoked, show the user `/skill:<name>` instead of loading it internally. If in doubt, read the advertised SKILL.md for `grilling` and the advertised SKILL.md for `domain-modeling` separately, then follow both.',
  ),
  operative(
    "productivity/handoff/SKILL.md",
    'Include a "suggested skills" section in the document, naming which skills the next agent should call the Skill tool for.',
    'Include a "suggested skills" section in the document, showing each suggested skill as a Pi command in the form `/skill:<name>` for the next user to invoke.',
  ),
]);

/** Curated command-token counts. Unlisted files are not rewritten. */
export const COMMAND_RULES = Object.freeze({
  "engineering/ask-matt/PHASE-BOUNDARIES.md": { handoff: 4, clear: 3, compact: 5 },
  "engineering/ask-matt/SKILL.md": {
    "diagnosing-bugs": 1, "grill-with-docs": 10, triage: 2,
    "improve-codebase-architecture": 4, "setup-matt-pocock-skills": 1, tdd: 4,
    "to-spec": 3, "to-tickets": 5, wayfinder: 2, implement: 8,
    "implement-spec": 2, prototype: 2, research: 1, "domain-modeling": 1,
    "codebase-design": 2, "code-review": 4, pr: 1, retro: 3, wizard: 1,
    "grill-me": 4, grilling: 2, handoff: 5, teach: 1, "to-questionnaire": 1,
    "wait-what": 1, "writing-for-agents": 1, clear: 2, compact: 2,
  },
  "engineering/code-review/SKILL.md": { "setup-matt-pocock-skills": 1 },
  "engineering/implement-spec/SKILL.md": { "setup-matt-pocock-skills": 1, "to-spec": 1, "to-tickets": 1 },
  "engineering/implement-spec/agents/openai.yaml": { "to-spec": 1, "to-tickets": 1 },
  "engineering/improve-codebase-architecture/HTML-REPORT.md": { "codebase-design": 3 },
  "engineering/improve-codebase-architecture/SKILL.md": { "codebase-design": 1 },
  "engineering/setup-matt-pocock-skills/domain.md": { "grill-with-docs": 1, "improve-codebase-architecture": 1, "domain-modeling": 2 },
  "engineering/setup-matt-pocock-skills/issue-tracker-github.md": { triage: 1, wayfinder: 1 },
  "engineering/setup-matt-pocock-skills/issue-tracker-gitlab.md": { triage: 1, wayfinder: 1 },
  "engineering/setup-matt-pocock-skills/issue-tracker-local.md": { wayfinder: 1 },
  "engineering/to-spec/SKILL.md": { "setup-matt-pocock-skills": 1 },
  "engineering/to-tickets/SKILL.md": { "setup-matt-pocock-skills": 2 },
  "engineering/triage/AGENT-BRIEF.md": { triage: 1 },
  "engineering/triage/SKILL.md": { triage: 1, "setup-matt-pocock-skills": 1 },
  "engineering/wayfinder/SKILL.md": { "setup-matt-pocock-skills": 1 },
  "engineering/wizard/template.sh": { wizard: 1 },
  "productivity/teach/SKILL.md": { teach: 1 },
});

function countLiteral(contents, literal) {
  if (literal.length === 0) return 0;
  return contents.split(literal).length - 1;
}

function drift(message) {
  throw new Error(`Pi adaptation refused (upstream drift): ${message}`);
}

function commandPattern(name) {
  // A command token cannot be embedded in a URL/path (`./tdd`, `/tdd/file`),
  // a longer command, or an already adapted `/skill:<name>` token.
  return new RegExp(`(?<![A-Za-z0-9:./])/${name}(?![A-Za-z0-9/-])`, "g");
}

function countPattern(contents, pattern) {
  return [...contents.matchAll(pattern)].length;
}

export function applyExactRule(contents, rule) {
  const upstreamCount = countLiteral(contents, rule.upstream);
  const piCount = countLiteral(contents, rule.pi);
  if (upstreamCount + piCount !== rule.expected) {
    drift(`${rule.file} expected exactly ${rule.expected} source-or-adapted ${rule.kind} occurrence, found ${upstreamCount} source and ${piCount} adapted`);
  }
  return upstreamCount > 0 ? contents.replaceAll(rule.upstream, rule.pi) : contents;
}

export function applyOperativeRule(contents, rule) {
  return applyExactRule(contents, rule);
}

export function applyCodeReviewWorkflow(contents, rule = CODE_REVIEW_WORKFLOW_RULE) {
  const markerCount = countLiteral(contents, CODE_REVIEW_WORKFLOW_MARKER);
  const anchorCount = countLiteral(contents, rule.anchor);
  if (markerCount === 1) {
    if (contents.includes(`${rule.guard}\n\n${rule.anchor}`) && anchorCount === 1) return contents;
    drift(`${rule.file} has a modified or misplaced Pi code-review workflow`);
  }

  // Migrate the generic guard used before code-review received its full workflow mapping.
  const genericRule = subagentGuard(rule.file, rule.anchor, "skill");
  if (countLiteral(contents, SUBAGENT_GUARD_MARKER) === 1 && contents.includes(genericRule.guard)) {
    const withoutGenericGuard = contents.replace(`${genericRule.guard}\n\n`, "");
    if (countLiteral(withoutGenericGuard, SUBAGENT_GUARD_MARKER) === 0 && anchorCount === 1) {
      return withoutGenericGuard.replace(rule.anchor, `${rule.guard}\n\n${rule.anchor}`);
    }
  }
  if (countLiteral(contents, SUBAGENT_GUARD_MARKER) !== 0 || anchorCount !== 1) {
    drift(`${rule.file} expected one insertion anchor and no adapter workflow, found ${anchorCount} anchor(s)`);
  }
  return contents.replace(rule.anchor, `${rule.guard}\n\n${rule.anchor}`);
}

export function applyGrillingFactScout(contents, rule = GRILLING_FACT_SCOUT_RULE) {
  const markerCount = countLiteral(contents, GRILLING_FACT_SCOUT_MARKER);
  const anchorCount = countLiteral(contents, rule.anchor);
  if (markerCount === 1) {
    if (contents.includes(`${rule.guard}\n\n${rule.anchor}`) && anchorCount === 1) return contents;
    drift(`${rule.file} has a modified or misplaced Pi grilling fact-scout workflow`);
  }

  // Migrate the generic guard used before grilling received its optional scout mapping.
  const genericRule = subagentGuard(rule.file, rule.anchor, "fact-exploration branch");
  if (countLiteral(contents, SUBAGENT_GUARD_MARKER) === 1 && contents.includes(genericRule.guard)) {
    const withoutGenericGuard = contents.replace(`${genericRule.guard}\n\n`, "");
    if (countLiteral(withoutGenericGuard, SUBAGENT_GUARD_MARKER) === 0 && anchorCount === 1) {
      return withoutGenericGuard.replace(rule.anchor, `${rule.guard}\n\n${rule.anchor}`);
    }
  }
  if (countLiteral(contents, SUBAGENT_GUARD_MARKER) !== 0 || anchorCount !== 1) {
    drift(`${rule.file} expected one insertion anchor and no adapter workflow, found ${anchorCount} anchor(s)`);
  }
  return contents.replace(rule.anchor, `${rule.guard}\n\n${rule.anchor}`);
}

export function applyResearchWorkflow(contents, rule = RESEARCH_WORKFLOW_RULE) {
  const markerCount = countLiteral(contents, RESEARCH_WORKFLOW_MARKER);
  const anchorCount = countLiteral(contents, rule.anchor);
  if (markerCount === 1) {
    if (contents.includes(`${rule.guard}\n\n${rule.anchor}`) && anchorCount === 1) return contents;
    drift(`${rule.file} has a modified or misplaced Pi research workflow`);
  }

  // Migrate the generic step-5 guard already present in generated snapshots.
  const genericRule = subagentGuard(rule.file, rule.anchor, "skill");
  if (countLiteral(contents, SUBAGENT_GUARD_MARKER) === 1 && contents.includes(genericRule.guard)) {
    const withoutGenericGuard = contents.replace(`${genericRule.guard}\n\n`, "");
    if (countLiteral(withoutGenericGuard, SUBAGENT_GUARD_MARKER) === 0 && anchorCount === 1) {
      return withoutGenericGuard.replace(rule.anchor, `${rule.guard}\n\n${rule.anchor}`);
    }
  }
  if (countLiteral(contents, SUBAGENT_GUARD_MARKER) !== 0 || anchorCount !== 1) {
    drift(`${rule.file} expected one insertion anchor and no adapter workflow, found ${anchorCount} anchor(s)`);
  }
  return contents.replace(rule.anchor, `${rule.guard}\n\n${rule.anchor}`);
}

function applyDedicatedWorkflow(contents, rule, marker, previousScope) {
  const markerCount = countLiteral(contents, marker);
  const anchorCount = countLiteral(contents, rule.anchor);
  if (markerCount === 1) {
    if (contents.includes(`${rule.guard}\n\n${rule.anchor}`) && anchorCount === 1) return contents;
    drift(`${rule.file} has a modified or misplaced Pi dedicated workflow`);
  }

  const genericRule = subagentGuard(rule.file, rule.anchor, previousScope);
  if (countLiteral(contents, SUBAGENT_GUARD_MARKER) === 1 && contents.includes(genericRule.guard)) {
    const withoutGenericGuard = contents.replace(`${genericRule.guard}\n\n`, "");
    if (countLiteral(withoutGenericGuard, SUBAGENT_GUARD_MARKER) === 0 && anchorCount === 1) {
      return withoutGenericGuard.replace(rule.anchor, `${rule.guard}\n\n${rule.anchor}`);
    }
  }
  if (countLiteral(contents, SUBAGENT_GUARD_MARKER) !== 0 || anchorCount !== 1) {
    drift(`${rule.file} expected one insertion anchor and no adapter workflow, found ${anchorCount} anchor(s)`);
  }
  return contents.replace(rule.anchor, `${rule.guard}\n\n${rule.anchor}`);
}

export function applyArchitectureScout(contents, rule = ARCHITECTURE_SCOUT_RULE) {
  const previousLaunch = '> 4. **Launch one scout, once.** Make one direct asynchronous call with `agent: "scout"`, `context: "fresh"`, `async: true`, the explicit repo `cwd`, `mission: false`, and `tools: ["read", "grep", "find", "ls"]`. Do not grant `bash`, `edit`, `write`, `subagent`, external tools, or a mutation-capable fallback. The cold-start task includes the prepared scope/ref/paths, hot spots, relevant glossary and ADR terms, the deep-module vocabulary and deletion test, and a read-only/no-project-changes boundary. Require only: observed friction; exact file paths and line ranges or symbols as evidence; candidate deepening areas tied to that evidence; confidence and gaps. The scout neither designs interfaces nor writes the HTML report. Do not launch duplicate or per-area scouts.';
  const currentLaunch = rule.guard.split("\n").find((line) => line.startsWith("> 4. **Launch one scout, once.**"));
  if (
    countLiteral(contents, ARCHITECTURE_SCOUT_MARKER) === 1 &&
    countLiteral(contents, previousLaunch) === 1 &&
    currentLaunch
  ) {
    contents = contents.replace(previousLaunch, currentLaunch);
  }
  return applyDedicatedWorkflow(contents, rule, ARCHITECTURE_SCOUT_MARKER, "skill");
}

export function applyDesignItTwiceWorkflow(contents, rule = DESIGN_IT_TWICE_WORKFLOW_RULE) {
  return applyDedicatedWorkflow(
    contents,
    rule,
    DESIGN_IT_TWICE_WORKFLOW_MARKER,
    "Design It Twice branch",
  );
}

export function applyWayfinderWorkflow(contents, rule = WAYFINDER_WORKFLOW_RULE) {
  return applyDedicatedWorkflow(contents, rule, WAYFINDER_WORKFLOW_MARKER, "skill");
}

export function applyImplementSpecWorkflow(contents, rule = IMPLEMENT_SPEC_WORKFLOW_RULE) {
  const previousGuard = rule.guard
    .replace(
      "> 6. **Give implementers cold-start TDD packets.** Every implementer task has explicit fields for ticket identity and objective; spec/ticket context pointers; repository; worktree/cwd (the runtime-assigned managed worktree, which the child must resolve and report before editing); branch/ref and named base ref; allowed and forbidden files/contracts; the absolute path to this package's `tdd/SKILL.md`; test/acceptance commands; expected changed-files, diff, tests, commit/ref, and handoff report; and stop/escalation conditions for missing context, scope overlap, product decisions, base mismatch, failing infrastructure, or inability to validate. It requires reading that absolute TDD skill before editing, confirming the resolved cwd/branch/base and test seams, and working in vertical red→green slices.",
      "> 6. **Give implementers cold-start TDD packets.** Every implementer task states the ticket identity and objective; spec/ticket context pointers; exact repo, worktree/cwd, branch/ref, and base ref; allowed and forbidden files/contracts; the absolute path to this package's `tdd/SKILL.md`; test/acceptance commands; expected changed-files, diff, tests, commit/ref, and handoff report; and stop/escalation conditions for missing context, scope overlap, product decisions, base mismatch, failing infrastructure, or inability to validate. It requires reading that absolute TDD skill before editing, confirming seams, and working in vertical red→green slices.",
    )
    .replace(
      '`agent: "reviewer"`, `context: "fresh"`, `tools: ["read", "grep", "find", "ls", "watchdog_diff"]`, distinct `output` paths with `outputMode: "file-only"`',
      '`agent: "reviewer"`, `context: "fresh"`, read-only tools, distinct file-only outputs',
    );
  if (
    countLiteral(contents, IMPLEMENT_SPEC_WORKFLOW_MARKER) === 1 &&
    contents.includes(`${previousGuard}\n\n${rule.anchor}`)
  ) {
    contents = contents.replace(previousGuard, rule.guard);
  }
  return applyDedicatedWorkflow(contents, rule, IMPLEMENT_SPEC_WORKFLOW_MARKER, "skill");
}

export function applyTrackerWriteGuard(contents, rule) {
  const markerCount = countLiteral(contents, TRACKER_WRITE_GUARD_MARKER);
  const anchorCount = countLiteral(contents, rule.anchor);
  if (markerCount === 1) {
    if (contents.includes(`${rule.guard}\n\n${rule.anchor}`) && anchorCount === 1) return contents;
    drift(`${rule.file} has a modified or misplaced Pi tracker write guard`);
  }
  if (markerCount !== 0 || anchorCount !== 1) {
    drift(`${rule.file} expected one tracker guard insertion anchor, found ${anchorCount} anchor(s)`);
  }
  return contents.replace(rule.anchor, `${rule.guard}\n\n${rule.anchor}`);
}

export function applySubagentGuard(contents, rule) {
  const markerCount = countLiteral(contents, SUBAGENT_GUARD_MARKER);
  const anchorCount = countLiteral(contents, rule.anchor);
  if (markerCount === 1) {
    if (contents.includes(`${rule.guard}\n\n${rule.anchor}`) && anchorCount === 1) return contents;
    if (contents.includes(rule.previousGuard) && anchorCount === 1) {
      const withoutPreviousGuard = contents.replace(`${rule.previousGuard}\n\n`, "");
      if (countLiteral(withoutPreviousGuard, SUBAGENT_GUARD_MARKER) === 0) {
        return withoutPreviousGuard.replace(rule.anchor, `${rule.guard}\n\n${rule.anchor}`);
      }
    }
    drift(`${rule.file} has a modified or misplaced Pi subagent guard`);
  }
  if (markerCount !== 0 || anchorCount !== 1) {
    drift(`${rule.file} expected one insertion anchor and no guard, found ${anchorCount} anchor(s) and ${markerCount} marker(s)`);
  }
  return contents.replace(rule.anchor, `${rule.guard}\n\n${rule.anchor}`);
}

export function applyCommandRule(contents, { file, name, expected }) {
  const sourcePattern = commandPattern(name);
  const sourceCount = countPattern(contents, sourcePattern);
  const adapted = name === "clear" ? "/new" : name === "compact" ? "/compact" : `/skill:${name}`;
  const adaptedPattern = name === "clear" ? commandPattern("new") : commandPattern(`skill:${name}`);
  const adaptedCount = name === "compact" ? 0 : countPattern(contents, adaptedPattern);
  const observed = name === "compact" ? sourceCount : sourceCount + adaptedCount;
  if (observed !== expected) {
    drift(`${file} expected exactly ${expected} /${name}-or-${adapted} command occurrence(s), found ${sourceCount} source and ${adaptedCount} adapted`);
  }
  return name !== "compact" && sourceCount > 0 ? contents.replace(sourcePattern, adapted) : contents;
}

async function readNormalized(filePath) {
  return (await readFile(filePath, "utf8")).replaceAll("\r\n", "\n");
}

async function listFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(entryPath)));
    else if (entry.isFile()) files.push(entryPath);
  }
  return files;
}

export async function validatePiAdaptations({ skillsRoot = DEFAULT_SKILLS_ROOT } = {}) {
  const files = await listFiles(skillsRoot);
  const combined = [];
  for (const file of files) {
    const contents = await readFile(file, "utf8");
    const relative = path.relative(skillsRoot, file).split(path.sep).join("/");
    if (contents.includes("\r")) drift(`${relative} contains CRLF or bare CR line endings`);
    if (/call(?:s|ing|ed)? the Skill tool/i.test(contents)) {
      drift(`${relative} still contains a Skill tool operative invocation`);
    }
    for (const name of OFFICIAL_SKILL_NAMES) {
      if (commandPattern(name).test(contents)) {
        drift(`${relative} still contains the standalone /${name} skill command`);
      }
    }
    if (commandPattern("clear").test(contents)) {
      drift(`${relative} still contains the Claude Code /clear session command`);
    }
    combined.push(contents);
  }

  const allContents = combined.join("\n");
  for (const allowed of ["/skill:", "/compact", "/new"]) {
    if (!allContents.includes(allowed)) drift(`generated skills unexpectedly contain no ${allowed} syntax`);
  }
  for (const rule of PLATFORM_RULES) {
    const contents = await readFile(path.join(skillsRoot, ...rule.file.split("/")), "utf8");
    if (countLiteral(contents, rule.pi) !== rule.expected || countLiteral(contents, rule.upstream) !== 0) {
      drift(`${rule.file} does not contain the reviewed Pi ${rule.kind} adaptation`);
    }
  }
  const guardedFiles = new Set([
    CODE_REVIEW_WORKFLOW_RULE.file,
    RESEARCH_WORKFLOW_RULE.file,
    GRILLING_FACT_SCOUT_RULE.file,
    ARCHITECTURE_SCOUT_RULE.file,
    DESIGN_IT_TWICE_WORKFLOW_RULE.file,
    WAYFINDER_WORKFLOW_RULE.file,
    IMPLEMENT_SPEC_WORKFLOW_RULE.file,
  ]);
  const codeReviewContents = await readFile(
    path.join(skillsRoot, ...CODE_REVIEW_WORKFLOW_RULE.file.split("/")),
    "utf8",
  );
  if (
    countLiteral(codeReviewContents, CODE_REVIEW_WORKFLOW_MARKER) !== 1 ||
    !codeReviewContents.includes(CODE_REVIEW_WORKFLOW_RULE.guard) ||
    codeReviewContents.includes(SUBAGENT_GUARD_MARKER)
  ) {
    drift(`${CODE_REVIEW_WORKFLOW_RULE.file} does not contain the reviewed Pi code-review workflow`);
  }
  const researchContents = await readFile(
    path.join(skillsRoot, ...RESEARCH_WORKFLOW_RULE.file.split("/")),
    "utf8",
  );
  if (
    countLiteral(researchContents, RESEARCH_WORKFLOW_MARKER) !== 1 ||
    !researchContents.includes(RESEARCH_WORKFLOW_RULE.guard) ||
    researchContents.includes(SUBAGENT_GUARD_MARKER)
  ) {
    drift(`${RESEARCH_WORKFLOW_RULE.file} does not contain the reviewed Pi research workflow`);
  }
  const grillingContents = await readFile(
    path.join(skillsRoot, ...GRILLING_FACT_SCOUT_RULE.file.split("/")),
    "utf8",
  );
  if (
    countLiteral(grillingContents, GRILLING_FACT_SCOUT_MARKER) !== 1 ||
    !grillingContents.includes(GRILLING_FACT_SCOUT_RULE.guard) ||
    grillingContents.includes(SUBAGENT_GUARD_MARKER)
  ) {
    drift(`${GRILLING_FACT_SCOUT_RULE.file} does not contain the reviewed Pi grilling fact-scout workflow`);
  }
  for (const [rule, marker, label] of [
    [ARCHITECTURE_SCOUT_RULE, ARCHITECTURE_SCOUT_MARKER, "architecture-scout"],
    [DESIGN_IT_TWICE_WORKFLOW_RULE, DESIGN_IT_TWICE_WORKFLOW_MARKER, "Design It Twice"],
    [WAYFINDER_WORKFLOW_RULE, WAYFINDER_WORKFLOW_MARKER, "wayfinder"],
    [IMPLEMENT_SPEC_WORKFLOW_RULE, IMPLEMENT_SPEC_WORKFLOW_MARKER, "implement-spec"],
  ]) {
    const contents = await readFile(path.join(skillsRoot, ...rule.file.split("/")), "utf8");
    if (
      countLiteral(contents, marker) !== 1 ||
      !contents.includes(rule.guard) ||
      contents.includes(SUBAGENT_GUARD_MARKER)
    ) {
      drift(`${rule.file} does not contain the reviewed Pi ${label} workflow`);
    }
  }
  for (const rule of TRACKER_WRITE_GUARD_RULES) {
    const contents = await readFile(path.join(skillsRoot, ...rule.file.split("/")), "utf8");
    if (countLiteral(contents, TRACKER_WRITE_GUARD_MARKER) !== 1 || !contents.includes(rule.guard)) {
      drift(`${rule.file} does not contain the reviewed Pi tracker write guard`);
    }
  }
  for (const rule of SUBAGENT_GUARD_RULES) {
    const contents = await readFile(path.join(skillsRoot, ...rule.file.split("/")), "utf8");
    if (countLiteral(contents, SUBAGENT_GUARD_MARKER) !== 1 || !contents.includes(rule.guard)) {
      drift(`${rule.file} does not contain the reviewed Pi subagent guard`);
    }
    guardedFiles.add(rule.file);
  }
  for (const file of files) {
    const relative = path.relative(skillsRoot, file).split(path.sep).join("/");
    const contents = await readFile(file, "utf8");
    if (
      !guardedFiles.has(relative) &&
      (contents.includes(SUBAGENT_GUARD_MARKER) ||
        contents.includes(CODE_REVIEW_WORKFLOW_MARKER) ||
        contents.includes(RESEARCH_WORKFLOW_MARKER) ||
        contents.includes(GRILLING_FACT_SCOUT_MARKER) ||
        contents.includes(ARCHITECTURE_SCOUT_MARKER) ||
        contents.includes(DESIGN_IT_TWICE_WORKFLOW_MARKER) ||
        contents.includes(WAYFINDER_WORKFLOW_MARKER) ||
        contents.includes(IMPLEMENT_SPEC_WORKFLOW_MARKER))
    ) {
      drift(`${relative} unexpectedly contains a Pi subagent workflow marker`);
    }
  }
  // /fork and /resume are valid Pi commands but do not occur in this pinned
  // upstream snapshot. The validator deliberately does not ban or rewrite them.
  return { files: files.length };
}

export async function applyPiAdaptations({ skillsRoot = DEFAULT_SKILLS_ROOT } = {}) {
  const cache = new Map();
  const changed = new Set();
  const load = async (relativePath) => {
    if (!cache.has(relativePath)) {
      try {
        cache.set(relativePath, await readNormalized(path.join(skillsRoot, ...relativePath.split("/"))));
      } catch (error) {
        drift(`cannot read ${relativePath}: ${error.message}`);
      }
    }
    return cache.get(relativePath);
  };

  for (const rule of [...PLATFORM_RULES, ...OPERATIVE_RULES]) {
    const contents = await load(rule.file);
    const adapted = applyExactRule(contents, rule);
    if (adapted !== contents) {
      cache.set(rule.file, adapted);
      changed.add(rule.file);
    }
  }

  {
    const contents = await load(CODE_REVIEW_WORKFLOW_RULE.file);
    const adapted = applyCodeReviewWorkflow(contents);
    if (adapted !== contents) {
      cache.set(CODE_REVIEW_WORKFLOW_RULE.file, adapted);
      changed.add(CODE_REVIEW_WORKFLOW_RULE.file);
    }
  }

  {
    const contents = await load(WAYFINDER_WORKFLOW_RULE.file);
    const adapted = applyWayfinderWorkflow(contents);
    if (adapted !== contents) {
      cache.set(WAYFINDER_WORKFLOW_RULE.file, adapted);
      changed.add(WAYFINDER_WORKFLOW_RULE.file);
    }
  }

  {
    const contents = await load(IMPLEMENT_SPEC_WORKFLOW_RULE.file);
    const adapted = applyImplementSpecWorkflow(contents);
    if (adapted !== contents) {
      cache.set(IMPLEMENT_SPEC_WORKFLOW_RULE.file, adapted);
      changed.add(IMPLEMENT_SPEC_WORKFLOW_RULE.file);
    }
  }

  for (const rule of TRACKER_WRITE_GUARD_RULES) {
    const contents = await load(rule.file);
    const adapted = applyTrackerWriteGuard(contents, rule);
    if (adapted !== contents) {
      cache.set(rule.file, adapted);
      changed.add(rule.file);
    }
  }

  {
    const contents = await load(GRILLING_FACT_SCOUT_RULE.file);
    const adapted = applyGrillingFactScout(contents);
    if (adapted !== contents) {
      cache.set(GRILLING_FACT_SCOUT_RULE.file, adapted);
      changed.add(GRILLING_FACT_SCOUT_RULE.file);
    }
  }

  {
    const contents = await load(RESEARCH_WORKFLOW_RULE.file);
    const adapted = applyResearchWorkflow(contents);
    if (adapted !== contents) {
      cache.set(RESEARCH_WORKFLOW_RULE.file, adapted);
      changed.add(RESEARCH_WORKFLOW_RULE.file);
    }
  }

  for (const [rule, apply] of [
    [ARCHITECTURE_SCOUT_RULE, applyArchitectureScout],
    [DESIGN_IT_TWICE_WORKFLOW_RULE, applyDesignItTwiceWorkflow],
  ]) {
    const contents = await load(rule.file);
    const adapted = apply(contents, rule);
    if (adapted !== contents) {
      cache.set(rule.file, adapted);
      changed.add(rule.file);
    }
  }

  for (const rule of SUBAGENT_GUARD_RULES) {
    const contents = await load(rule.file);
    const adapted = applySubagentGuard(contents, rule);
    if (adapted !== contents) {
      cache.set(rule.file, adapted);
      changed.add(rule.file);
    }
  }

  for (const [file, commands] of Object.entries(COMMAND_RULES)) {
    let contents = await load(file);
    for (const [name, expected] of Object.entries(commands)) {
      const adapted = applyCommandRule(contents, { file, name, expected });
      if (adapted !== contents) {
        contents = adapted;
        cache.set(file, contents);
        changed.add(file);
      }
    }
  }

  for (const file of changed) {
    await writeFile(path.join(skillsRoot, ...file.split("/")), cache.get(file), "utf8");
  }
  await validatePiAdaptations({ skillsRoot });
  return { changedFiles: [...changed].sort(), operativeRules: OPERATIVE_RULES.length };
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  applyPiAdaptations()
    .then(({ changedFiles, operativeRules }) => {
      console.log(`Applied ${operativeRules} reviewed operative rules; changed ${changedFiles.length} files.`);
    })
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
