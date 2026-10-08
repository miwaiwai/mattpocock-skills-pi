---
name: wayfinder
description: Plan a huge chunk of work (more than one agent session can hold) as a shared map of decision tickets on your issue tracker, and resolve them one at a time until the way to the destination is clear.
disable-model-invocation: true
---

<!-- pi-adapter: wayfinder-workflow -->
> [!IMPORTANT]
> **Pi adapter — recoverable frontier orchestration.** This block governs Pi execution where the upstream child-launch, tracker-write, or publication wording differs. The destination, shared map, decision tickets, frontier, fog of war, HITL/AFK split, and ticket types below remain authoritative.
>
> 1. **Separate delegation from remote authority.** An explicit `/skill:wayfinder` invocation authorizes the subagent workflow declared here. It does not authorize git push, creating/editing/closing a remote issue, assigning an assignee, or creating/modifying a PR/MR. Those operations require separate explicit user authorization in the current request. Without it, prepare local artifacts and a proposed operation list, show the exact remote mutations awaiting approval, and stop before them. Keep using the configured tracker; missing credentials or authorization never permits a silent switch to another tracker.
> 2. **Preflight before every child wave.** Read [the shared Pi subagent contract](../../../docs/adaptation/pi-subagents-contract.md), confirm the `subagent` tool is available, and call `subagent({ action: "list", capabilities: true })`. Require an executable, non-disabled native `researcher` that supports fresh context, the `research` skill, and file-only output. If the tool or capability call is unavailable, stop and report exactly: `This workflow requires pi-subagents. Install it with: pi install npm:pi-subagents. Then run /reload in the active Pi session, or restart Pi.` Do not change execution mode.
> 3. **Recompute the frontier from current tracker state.** Before selecting work, re-read the map, each candidate ticket's open/claimed state, type, and every blocking edge. Select only open, unclaimed, unblocked `research` tickets. Prototype, grilling, and HITL task tickets remain with the parent and human; no child may impersonate the human, answer a HITL ticket, or convert it to AFK. Recompute again after any observed concurrent tracker change. When remote claim authority exists, immediately before launch re-read and recompute once more, claim each selected ticket, then confirm the claims; without that separate authority, keep the remote tracker unchanged and identify the local research artifacts as provisional.
> 4. **Launch one parallel research workflow.** For two or more ready research tickets, write one `js workflow` block and make exactly one top-level call with `workflow: true`, `async: true`, `context: "fresh"`, and the explicit repo `cwd`; launch all tickets inside one awaited `runs.all([...])`. A single ready research ticket may use one bounded direct child. Each child has a stable key derived from the tracker ticket identity, `agent: "researcher"`, `context: "fresh"`, `skill: "research"`, a distinct absolute Markdown `output` inside the approved repo research-note convention, and `outputMode: "file-only"`. Do not set child `async: true`; the workflow awaits final results rather than dispatch receipts.
> 5. **Give each child exactly one AFK ticket.** Repeat the ticket identity, title, question, map destination, repo/cwd/ref, relevant notes, and known dependencies in its cold-start task. Limit authority to research and the bound report: no tracker mutation, assignment, issue comment/closure, branch creation, commit, push, PR/MR, implementation, or subdelegation. Require the child to load the `research` skill and apply its primary-source, citation, and durable-output contract directly in this child; its nested-launch wording grants no subdelegation. Require primary sources only, an identifiable link for every factual claim, labeled uncertainty, and a stop on missing access or evidence. One child handles one ticket and never handles or answers HITL work.
> 6. **Return an identity-preserving result.** The workflow returns one entry per ticket containing `ticketIdentity`, stable `key`, `ok`, `runId`, `output`, `outputReference`, `outputPathMapping`, and `artifactPaths`. Do not catch, replace, or relaunch a rejected child inside or outside the workflow. Stable keys and the terminal workflow receipt must make every successful or failed lane recoverable and map every artifact back to its tracker identity.
> 7. **Apply results with optimistic revalidation.** A launch receipt is not a resolution. After terminal completion, verify each bound Markdown file, citations, and ticket match. Immediately before every map/ticket write—claim, comment, close, edge change, map edit, or new ticket—re-read that ticket's state and blocking edges and recompute the frontier. If it was claimed, closed, edited, or newly blocked by another session, leave it unresolved and preserve the artifact as recovery evidence. Perform an authorized remote mutation only after this fresh read; otherwise append it to the proposed-operation list and await confirmation.
> 8. **Fail recoverably and stop at planning.** A failed workflow or lane leaves that ticket open/unresolved, never appends it to Decisions-so-far, and never lets the map be declared complete. Record the exact run/status, failed key and ticket identity, workflow receipt/output references, repo/cwd/ref, worktree state, partial artifact, and safe same-protocol retry point. Do not treat successful sibling lanes as proof that a failed ticket resolved, and do not switch to CLI/foreground/another tracker. When no decisions or fog remain, present `/skill:to-spec`; do not enter `implement` automatically.

A loose idea has arrived, too big for one agent session, and wrapped in fog: the way from here to the **destination** isn't visible yet. Wayfinding is about finding that way, not charging at the destination. This skill charts the way as a **shared map** on the repo's issue tracker, then works its **decision tickets** (questions whose resolution is a decision, not slices of a build to execute) one at a time until the route is clear.

The destination varies per effort, and naming it is the first act of charting: it shapes every ticket. It might be a spec to hand off and iterate on, a decision to lock before planning starts, or a change made in place like a data-structure migration. The map is domain-agnostic: engineering work, course content, whatever fits the shape.

## Plan, don't do

Wayfinder is **planning** by default: each ticket resolves a decision, and the map is done when the way is clear, with nothing left to decide before someone goes and does the thing. The pull to just do the work is usually the signal you've reached the edge of the map and it's time to hand off. An effort can override this in its **Notes**, carrying execution into the map itself, but absent that, produce decisions, not deliverables.

## Refer by name

Every map and ticket is an issue, so it has a **name**: its title. In everything the human reads (narration, the map's Decisions-so-far), refer to it by that name, never by a bare id, number, or slug. A wall of `#42, #43, #44` is illegible; names read at a glance. The id and URL don't vanish; a name wraps its link, but they ride _inside_ the name, never stand in for it.

## The Map

The map is a single issue on this repo's issue tracker, labelled `wayfinder:map`, the canonical artifact. Its tickets are child issues of the map.

The map is an **index**, not a store. It lists the decisions made and points at the tickets that hold their detail; a decision lives in exactly one place, its ticket, so the map never restates it, only gists it and links.

**Where the map, its child tickets, blocking, and frontier queries physically live is tracker-specific.** The issue tracker should have been provided to you. If not, tell the user to run `/skill:setup-matt-pocock-skills`. Consult the tracker doc's "Wayfinding operations" section for how _this_ repo expresses them. If no tracker has been provided, default to the local-markdown tracker.

### The map body

The whole map at low resolution, loaded once per session. Open tickets are **not** listed: they are open child issues, found by query.

```markdown
## Destination

<what reaching the end of this map looks like: the spec, decision, or change this effort is finding its way to. One or two lines; every session orients to it before choosing a ticket.>

## Notes

<domain; skills every session should consult; standing preferences for this effort>

## Decisions so far

<!-- the index: one line per closed ticket, enough to judge relevance, then zoom the link for the detail the ticket holds -->

- [<closed ticket title>](link): <one-line gist of the answer>

## Not yet specified

<!-- see "Fog of war": in-scope fog you can't ticket yet; graduates as the frontier advances -->

## Out of scope

<!-- see "Out of scope": work ruled beyond the destination; closed, never graduates -->
```

### Tickets

Each ticket is a **child issue** of the map; the tracker's issue id is its identity. Its body is the question, sized to one 100K token agent session:

```markdown
## Question

<the decision or investigation this ticket resolves>
```

Each ticket carries a `wayfinder:<type>` label, one of `research`, `prototype`, `grilling`, `task` (see [Ticket Types](#ticket-types)). `wayfinder:` labels are the only labels a map and its tickets carry, never a triage label like `ready-for-agent`: they are decisions, not implementation work.

A session **claims** a ticket by assigning it to the dev driving the map, **first**, before any work, so concurrent sessions skip it. That assignee _is_ the claim: an open, unassigned ticket is unclaimed.

Blocking uses the tracker's **native** dependency relationship: essential because it renders the frontier _visually_ in the tracker's own UI, so the human sees what's takeable without opening the map. Only a tracker that lacks native blocking falls back to a body convention. A ticket is **unblocked** when every ticket blocking it is closed; the **frontier** is the open, unblocked, unclaimed children, the edge of the known.

The answer isn't part of the body; it's recorded on resolution (see [Work through the map](#work-through-the-map)). Assets created while resolving a ticket are linked from the issue, not pasted in.

## Ticket Types

Every ticket is either **HITL** (human in the loop, worked _with_ a human who speaks for themselves) or **AFK**, driven by the agent alone. A HITL ticket only resolves through that live exchange; the agent never stands in for the human's side of it (a grilling agent that answers its own questions has broken this).

- **Research** (AFK): Reading documentation, third-party APIs, or local resources like knowledge bases to surface a fact a decision waits on. Resolved by a subagent instructed to read the advertised SKILL.md for the model-invoked skill `research`, then follow it for this phase. Use when knowledge outside the current working directory is required.
- **Prototype** (HITL): Raise the fidelity of the discussion by making a cheap, rough, concrete artifact to react to (an outline, a rough take, a stub, or UI/logic code) by reading the advertised SKILL.md for the model-invoked skill `prototype`, then following it for this phase. Links the prototype as an asset. Use when "how should it look" or "how should it behave" is the key question.
- **Grilling** (HITL): Conversation. The default case. Always read the advertised SKILL.md for the model-invoked skill `grilling` and the advertised SKILL.md for the model-invoked skill `domain-modeling` separately, then follow both for this phase.
- **Task** (HITL or AFK): Manual work that must happen before a _decision_ can be made: nothing to decide, prototype, or research, but the discussion is blocked until it's done. Signing up for a service so its API can be judged, provisioning access, moving data so its shape can be seen. This is the one type that _does_ rather than decides, and it earns its place by unblocking a decision, not by delivering the destination. The agent drives it alone where it can (AFK); otherwise it hands the human a precise checklist (HITL). Resolved when the work is done; the answer records what was done and any resulting facts (credentials location, new URLs, row counts) later tickets depend on.

## Fog of war

The map is _deliberately_ incomplete: don't chart what you can't yet see. Beyond the live tickets lies the **fog of war**: the dim view of decisions and investigations you can tell are coming but can't yet pin down, because they hang on questions still open. Resolving a ticket clears the fog ahead of it, graduating whatever's now specifiable into fresh tickets, one at a time, until the way to the destination is clear and no tickets remain.

The map's **Not yet specified** section is where that dim view is written down: the suspected question, the area to revisit later. It's the undiscovered frontier _toward_ the destination: everything here is in scope, just not sharp enough to ticket. Write as loosely or as fully as the view allows; it doubles as a signpost for collaborators reading where the effort is headed.

**Fog or ticket?** The test is whether you can state the question precisely now, _not_ whether you can answer it now.

- **Ticket when** the question is already sharp, even if it's blocked and you can't act on it yet.
- **Not yet specified when** you can't yet phrase it that sharply. Don't pre-slice the fog into ticket-sized pieces: it's coarser than a ticket, and one patch may graduate into several tickets, or none, once the frontier reaches it.

**Not yet specified** excludes what's already decided (Decisions so far), what's already a live ticket, and what's out of scope (the next section).

## Out of scope

Fog only ever gathers _toward_ the destination. The destination fixes the scope, so work beyond it is **out of scope**: it isn't fog, and it doesn't belong in **Not yet specified**. It gets its own **Out of scope** section on the map: work you've consciously ruled out of _this_ effort. Scope, not sharpness, lands it here.

Out-of-scope work never graduates (the frontier stops at the destination), so it returns only if the destination is redrawn, and then as a fresh effort, not a resumption.

Ruling something out of scope is a scoping act, not a step on the route. When a ticket that already exists turns out to sit past the destination (mis-scoped in while charting, or exposed by a resolution), **close it** (a closed ticket is unambiguously off the frontier) and leave one line in the **Out of scope** section: the gist plus why it's out of scope, linking the closed ticket. It stays out of **Decisions so far**, which records the route actually walked; a scope boundary isn't a step on it.

## Invocation

Two modes. Either way, **never resolve more than one ticket per session**, with the exception of research tickets.

### Chart the map

User invokes with a loose idea.

1. **Name the destination.** Read the advertised SKILL.md for the model-invoked skill `grilling` and the advertised SKILL.md for the model-invoked skill `domain-modeling` separately, then follow both to pin down what this map is finding its way to: the spec, decision, or change. The destination fixes the scope, so it's settled first.
2. **Map the frontier.** Grill again, **breadth-first** this time: fan out across the whole space rather than deep on any one thread, surfacing the open decisions and the first steps takeable now. **If this surfaces no fog** (the way to the destination is already clear, the whole journey small enough for one session), you don't need a map. Stop and ask the user how they'd like to proceed.
3. **Create the map** (label `wayfinder:map`): Destination and Notes filled in, Decisions-so-far empty, the fog sketched into **Not yet specified**.
4. **Create the tickets you can specify now** as child issues of the map, then wire blocking edges in a **second pass** (issues need ids before they can reference each other). Write cross-references in that pass too, with real ids: a placeholder `#<n>` auto-links to an unrelated issue. Wiring sorts them into the frontier and the blocked; everything you can't yet specify stays in the fog: the **Not yet specified** section.
5. **Fire the research subagents.** For each `research` ticket you just created, spin up a subagent instructed to read the advertised SKILL.md for the model-invoked skill `research`, then follow it to resolve the ticket in parallel, capturing its findings on a throwaway `research/<name>` branch with a context pointer from the ticket. Push the branch but open no PR: it is never merged.
6. Stop: charting is one session's work; it hand-resolves nothing.

### Work through the map

User invokes with a map (URL or number). A ticket is **optional**: without one, you pick the next decision, not the user.

1. Load the **map**: the low-res view, not every ticket body.
2. Choose the ticket. If the user named one, use it. Otherwise take the first frontier ticket in order. **Claim it**: assign it to yourself before any work.
3. Resolve it as the type its `wayfinder:<type>` label names (see [Ticket Types](#ticket-types)). Read the label, not just the body: the body never states the type. **Zoom as needed**: fetch the full body of any related or closed ticket on demand. For each skill the `## Notes` block names, read its advertised SKILL.md only if it is a model-invoked skill advertised in the system prompt, then follow it for this phase; if it is user-invoked, show the user `/skill:<name>` instead of loading it internally. If in doubt, read the advertised SKILL.md for `grilling` and the advertised SKILL.md for `domain-modeling` separately, then follow both.
4. Record the resolution: post the answer as a **resolution comment**, **close** the issue, and **append a context pointer** to the map's Decisions-so-far.
5. Add newly-surfaced tickets (create-then-wire); graduate any fog the answer has made specifiable, clearing each graduated patch from **Not yet specified** so it lives only as its new ticket. If the answer reveals that a ticket (this one or another) sits beyond the destination, **rule it out of scope** rather than resolving it on the route. If the decision invalidates other parts of the map, update or delete those tickets.

The user may run unblocked tickets in parallel, so expect other sessions to be editing the tracker concurrently.
