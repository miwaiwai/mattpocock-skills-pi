import assert from "node:assert/strict";
import { cp, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  applyArchitectureScout,
  applyCodeReviewWorkflow,
  applyCommandRule,
  applyDesignItTwiceWorkflow,
  applyExactRule,
  applyGrillingFactScout,
  applyImplementSpecWorkflow,
  applyOperativeRule,
  applyPiAdaptations,
  applyResearchWorkflow,
  applySubagentGuard,
  applyTrackerWriteGuard,
  applyWayfinderWorkflow,
  ARCHITECTURE_SCOUT_MARKER,
  ARCHITECTURE_SCOUT_RULE,
  CODE_REVIEW_WORKFLOW_MARKER,
  CODE_REVIEW_WORKFLOW_RULE,
  COMMAND_RULES,
  DEFAULT_SKILLS_ROOT,
  DESIGN_IT_TWICE_WORKFLOW_MARKER,
  DESIGN_IT_TWICE_WORKFLOW_RULE,
  GRILLING_FACT_SCOUT_MARKER,
  GRILLING_FACT_SCOUT_RULE,
  IMPLEMENT_SPEC_WORKFLOW_MARKER,
  IMPLEMENT_SPEC_WORKFLOW_RULE,
  OFFICIAL_SKILL_NAMES,
  OPERATIVE_RULES,
  PLATFORM_RULES,
  RESEARCH_WORKFLOW_MARKER,
  RESEARCH_WORKFLOW_RULE,
  SUBAGENT_GUARD_MARKER,
  SUBAGENT_GUARD_RULES,
  TRACKER_WRITE_GUARD_MARKER,
  TRACKER_WRITE_GUARD_RULES,
  WAYFINDER_WORKFLOW_MARKER,
  WAYFINDER_WORKFLOW_RULE,
  validatePiAdaptations,
} from "../scripts/apply-pi-adaptations.mjs";

function readyFrontier(tickets, integrated) {
  const integratedSet = new Set(integrated);
  return tickets
    .filter((ticket) => !integratedSet.has(ticket.id))
    .filter((ticket) => ticket.blockedBy.every((blocker) => integratedSet.has(blocker)))
    .map((ticket) => ticket.id);
}

async function temporarySkills(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "pi-adaptations-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const skillsRoot = path.join(root, "skills");
  await cp(DEFAULT_SKILLS_ROOT, skillsRoot, { recursive: true });
  return skillsRoot;
}

test("every reviewed operative rule produces its exact Pi read instruction and is idempotent", () => {
  assert.equal(OPERATIVE_RULES.length, 20);
  for (const rule of OPERATIVE_RULES) {
    const adapted = applyOperativeRule(rule.upstream, rule);
    assert.equal(adapted, rule.pi, rule.file);
    assert.equal(applyOperativeRule(adapted, rule), adapted, `${rule.file} was not idempotent`);
    assert.doesNotMatch(adapted, /call(?:s|ing|ed)? the Skill tool/i);
  }
});

test("platform rules produce exact Pi-native text and are idempotent", () => {
  assert.equal(PLATFORM_RULES.length, 6);
  for (const rule of PLATFORM_RULES) {
    const adapted = applyExactRule(rule.upstream, rule);
    assert.equal(adapted, rule.pi, rule.file);
    assert.equal(applyExactRule(adapted, rule), adapted, `${rule.file} was not idempotent`);
  }
});

test("operative rules target only reviewed model-invoked skills", async () => {
  const lock = JSON.parse(
    await readFile(path.resolve(DEFAULT_SKILLS_ROOT, "..", "upstream", "SKILLS.lock.json"), "utf8"),
  );
  const modelInvoked = new Set(lock.invocation.modelInvoked);
  for (const rule of OPERATIVE_RULES) {
    const targets = [...rule.pi.matchAll(/model-invoked skill `([a-z0-9-]+)`/g)].map((match) => match[1]);
    for (const target of targets) {
      assert.equal(modelInvoked.has(target), true, `${rule.file} internally loads user-invoked ${target}`);
    }
  }

  const dualRules = OPERATIVE_RULES.filter((rule) =>
    rule.upstream.includes('"grilling" and "domain-modeling"'),
  );
  assert.ok(dualRules.length > 0);
  for (const rule of dualRules) {
    assert.match(rule.pi, /advertised SKILL\.md for (?:the model-invoked skill )?`grilling`/);
    assert.match(
      rule.pi,
      /advertised SKILL\.md for (?:the model-invoked skill )?`domain-modeling` separately/,
    );
  }
});

test("operative rules fail loudly when upstream wording or occurrence counts drift", () => {
  const rule = OPERATIVE_RULES[0];
  assert.throws(() => applyOperativeRule("changed upstream prose", rule), /upstream drift/);
  assert.throws(() => applyOperativeRule(`${rule.upstream}\n${rule.upstream}`, rule), /upstream drift/);
});

test("generic subagent guards remain empty after dedicated workflow migrations", () => {
  assert.equal(SUBAGENT_GUARD_RULES.length, 0);
  assert.deepEqual(SUBAGENT_GUARD_RULES.map((rule) => rule.file), []);
  for (const rule of SUBAGENT_GUARD_RULES) {
    const upstream = `before\n${rule.anchor}\nafter`;
    const adapted = applySubagentGuard(upstream, rule);
    assert.equal(adapted.split(SUBAGENT_GUARD_MARKER).length - 1, 1, rule.file);
    assert.match(adapted, /subagent\(\{ action: "list", capabilities: true \}\)/);
    assert.match(adapted, /pi install npm:pi-subagents/);
    assert.match(adapted, /run \/reload in the active Pi session, or restart Pi/);
    assert.match(adapted, /Do not switch to a CLI, background process, or other implicit fallback/);
    assert.equal(applySubagentGuard(adapted, rule), adapted, `${rule.file} was not idempotent`);
    assert.throws(() => applySubagentGuard("anchor drift", rule), /upstream drift/);
  }
});

test("wayfinder launches ready research tickets in one identity-preserving async workflow", () => {
  const adapted = applyWayfinderWorkflow(`before\n${WAYFINDER_WORKFLOW_RULE.anchor}\nafter`);

  assert.match(adapted, /explicit `\/skill:wayfinder` invocation authorizes the subagent workflow/);
  assert.match(adapted, /Preflight before every child wave/);
  assert.match(adapted, /subagent\(\{ action: "list", capabilities: true \}\)/);
  assert.match(adapted, /For two or more ready research tickets.*exactly one top-level call/s);
  assert.match(adapted, /`workflow: true`, `async: true`, `context: "fresh"`/);
  assert.match(adapted, /one awaited `runs\.all\(\[\.\.\.\]\)`/);
  assert.match(adapted, /stable key derived from the tracker ticket identity/);
  assert.match(adapted, /`skill: "research"`/);
  assert.match(adapted, /distinct absolute Markdown `output`/);
  assert.match(adapted, /`outputMode: "file-only"`/);
  assert.match(adapted, /`ticketIdentity`.*`outputReference`.*`outputPathMapping`.*`artifactPaths`/);
  assert.equal(applyWayfinderWorkflow(adapted), adapted);
});

test("wayfinder children never handle HITL tickets or remote tracker side effects", () => {
  const adapted = applyWayfinderWorkflow(`before\n${WAYFINDER_WORKFLOW_RULE.anchor}\nafter`);

  assert.match(adapted, /Prototype, grilling, and HITL task tickets remain with the parent and human/);
  assert.match(adapted, /no child may impersonate the human, answer a HITL ticket, or convert it to AFK/);
  assert.match(adapted, /One child handles one ticket and never handles or answers HITL work/);
  assert.match(adapted, /no tracker mutation, assignment, issue comment\/closure, branch creation, commit, push, PR\/MR/);
  assert.match(adapted, /does not authorize git push.*remote issue.*PR\/MR.*separate explicit user authorization/s);
  assert.match(adapted, /proposed operation list.*awaiting approval/);
  assert.match(adapted, /never permits a silent switch to another tracker/);
});

test("wayfinder revalidates concurrent tracker state and keeps failed lanes recoverable", () => {
  const adapted = applyWayfinderWorkflow(`before\n${WAYFINDER_WORKFLOW_RULE.anchor}\nafter`);

  assert.match(adapted, /re-read the map, each candidate ticket's open\/claimed state, type, and every blocking edge/);
  assert.match(adapted, /Recompute again after any observed concurrent tracker change/);
  assert.match(adapted, /Immediately before every map\/ticket write.*re-read that ticket's state and blocking edges/s);
  assert.match(adapted, /claimed, closed, edited, or newly blocked.*leave it unresolved/s);
  assert.match(adapted, /failed workflow or lane leaves that ticket open\/unresolved/);
  assert.match(adapted, /never appends it to Decisions-so-far/);
  assert.match(adapted, /Do not treat successful sibling lanes as proof that a failed ticket resolved/);
  assert.match(adapted, /terminal workflow receipt.*recoverable/);
  assert.match(adapted, /present `\/skill:to-spec`; do not enter `implement` automatically/);
});

test("tracker templates independently gate remote writes and re-read before writes", () => {
  assert.equal(TRACKER_WRITE_GUARD_RULES.length, 3);
  for (const rule of TRACKER_WRITE_GUARD_RULES) {
    const adapted = applyTrackerWriteGuard(`before\n${rule.anchor}\nafter`, rule);
    assert.equal(adapted.split(TRACKER_WRITE_GUARD_MARKER).length - 1, 1, rule.file);
    assert.match(adapted, /Immediately before every wayfinding write, re-read the affected ticket's current state and blocking edges/);
    assert.match(adapted, /recompute the frontier/);
    assert.match(adapted, /leave the ticket unresolved/);
    assert.match(adapted, /Never silently change tracker/);
    if (rule.file.endsWith("github.md") || rule.file.endsWith("gitlab.md")) {
      assert.match(adapted, /require separate explicit user authorization/);
      assert.match(adapted, /exact proposed operations and wait for confirmation/);
    } else {
      assert.match(adapted, /Local Markdown tracker writes are local project changes/);
      assert.match(adapted, /Git push.*require separate explicit user authorization/);
    }
    assert.equal(applyTrackerWriteGuard(adapted, rule), adapted);
  }
});

test("architecture scan requires authority and exactly one read-only scout", () => {
  const adapted = applyArchitectureScout(`before\n${ARCHITECTURE_SCOUT_RULE.anchor}\nafter`);

  assert.match(adapted, /explicit `\/skill:improve-codebase-architecture` invocation authorizes exactly one/);
  assert.match(adapted, /without it, make no `subagent` call/);
  assert.match(adapted, /exactly one awaited `runs\.run` child/);
  assert.match(adapted, /one top-level call with `workflow: true`, `async: true`/);
  assert.match(adapted, /key `architecture-scout`, `agent: "scout"`/);
  assert.match(adapted, /`context: "fresh"`/);
  assert.match(adapted, /do not set child `async: true`/);
  assert.match(adapted, /`tools: \["read", "grep", "find", "ls"\]`/);
  assert.match(adapted, /do not grant `bash`, `edit`, `write`, `subagent`/);
  assert.match(adapted, /Do not launch duplicate or per-area scouts/);
  assert.equal(applyArchitectureScout(adapted), adapted);
});

test("architecture scout precisely migrates the invalid direct-child tool override", () => {
  const current = applyArchitectureScout(`before\n${ARCHITECTURE_SCOUT_RULE.anchor}\nafter`);
  const currentLaunch = current.split("\n").find((line) => line.startsWith("> 4. **Launch one scout, once.**"));
  const previousLaunch = '> 4. **Launch one scout, once.** Make one direct asynchronous call with `agent: "scout"`, `context: "fresh"`, `async: true`, the explicit repo `cwd`, `mission: false`, and `tools: ["read", "grep", "find", "ls"]`. Do not grant `bash`, `edit`, `write`, `subagent`, external tools, or a mutation-capable fallback. The cold-start task includes the prepared scope/ref/paths, hot spots, relevant glossary and ADR terms, the deep-module vocabulary and deletion test, and a read-only/no-project-changes boundary. Require only: observed friction; exact file paths and line ranges or symbols as evidence; candidate deepening areas tied to that evidence; confidence and gaps. The scout neither designs interfaces nor writes the HTML report. Do not launch duplicate or per-area scouts.';
  const previous = current.replace(currentLaunch, previousLaunch);

  assert.equal(applyArchitectureScout(previous), current);
  assert.throws(
    () => applyArchitectureScout(previous.replace("Make one direct asynchronous call", "Make two direct calls")),
    /upstream drift/,
  );
});

test("architecture parent owns evidence-bound report, interaction, and interface timing", () => {
  const adapted = applyArchitectureScout(`before\n${ARCHITECTURE_SCOUT_RULE.anchor}\nafter`);

  assert.match(adapted, /scout neither designs interfaces nor writes the HTML report/);
  assert.match(adapted, /parent verifies every cited path\/symbol/);
  assert.match(adapted, /Every candidate card must cite the supporting scout evidence/);
  assert.match(adapted, /omit unsupported candidates/);
  assert.match(adapted, /do not propose a concrete new interface before the user selects/);
  assert.match(adapted, /then—and only then—read and follow `grilling` and `domain-modeling`/);
  assert.match(adapted, /parent conducts the conversation and retains every architecture decision/);
});

test("architecture scout missing capability or failure stops without fallback", () => {
  const adapted = applyArchitectureScout(`before\n${ARCHITECTURE_SCOUT_RULE.anchor}\nafter`);

  assert.match(adapted, /subagent\(\{ action: "list", capabilities: true \}\)/);
  assert.match(adapted, /This workflow requires pi-subagents\. Install it with: pi install npm:pi-subagents/);
  assert.match(adapted, /child launch\/runtime\/tooling failure.*stops the scan\/report flow/);
  assert.match(adapted, /Do not silently scan in a second child/);
  assert.match(adapted, /switch to a parent-written scan, CLI, foreground child/);
});

test("Design It Twice requires explicit multi-interface authority", () => {
  const adapted = applyDesignItTwiceWorkflow(`before\n${DESIGN_IT_TWICE_WORKFLOW_RULE.anchor}\nafter`);

  assert.match(adapted, /asking for one interface.*does not authorize delegation or parallel design/);
  assert.match(adapted, /only when the user explicitly asks to explore multiple alternative interfaces/);
  assert.match(adapted, /Otherwise.*makes no `subagent` call/);
  assert.equal(applyDesignItTwiceWorkflow(adapted), adapted);
});

test("Design It Twice uses one async workflow with distinct fresh read-only designers", () => {
  const adapted = applyDesignItTwiceWorkflow(`before\n${DESIGN_IT_TWICE_WORKFLOW_RULE.anchor}\nafter`);

  assert.match(adapted, /exactly one async workflow/);
  assert.match(adapted, /`workflow: true`/);
  assert.match(adapted, /`async: true`/);
  assert.match(adapted, /await exactly one `runs\.all\(\[\.\.\.\]\)`/);
  for (const lane of ["minimal-interface", "strongest-locality", "least-migration", "clearest-seam"]) {
    assert.equal(adapted.includes(`\`${lane}\``), true, lane);
  }
  assert.match(adapted, /These are different design constraints, not numbered copies/);
  assert.match(adapted, /Each lane uses `agent: "reviewer"`, `context: "fresh"`/);
  assert.match(adapted, /`tools: \["read", "grep", "find", "ls"\]`/);
  assert.match(adapted, /grant no `bash`, `edit`, `write`, `subagent`/);
  assert.match(adapted, /Do not set child `async: true`/);
});

test("Design It Twice prompts are complete and parent compares instead of voting", () => {
  const adapted = applyDesignItTwiceWorkflow(`before\n${DESIGN_IT_TWICE_WORKFLOW_RULE.anchor}\nafter`);

  assert.match(adapted, /relevant file paths and coupling evidence/);
  assert.match(adapted, /exact deep-module terms/);
  assert.match(adapted, /relevant project `GLOSSARY\.md` terms/);
  assert.match(adapted, /required five-part upstream output format/);
  assert.match(adapted, /Each task repeats the complete shared technical brief/);
  assert.match(adapted, /compares them by `depth`, `locality`, and `seam placement`/);
  assert.match(adapted, /parent—not a vote, score total, or child—recommends/);
  assert.match(adapted, /retains final decision authority/);
});

test("Design It Twice fails the whole comparison when one lane fails", () => {
  const adapted = applyDesignItTwiceWorkflow(`before\n${DESIGN_IT_TWICE_WORKFLOW_RULE.anchor}\nafter`);

  assert.match(adapted, /Do not catch or replace a rejected child; any lane failure fails the workflow/);
  assert.match(adapted, /On workflow.*or lane failure, stop the design comparison/);
  assert.match(adapted, /report the exact error, failed lane, run\/status/);
  assert.match(adapted, /Do not omit the failed lane, compare only survivors/);
  assert.match(adapted, /present the parent's first idea as the multi-design result/);
});

test("grilling does not launch a scout without explicit authority and parent-local need", () => {
  const adapted = applyGrillingFactScout(`before\n${GRILLING_FACT_SCOUT_RULE.anchor}\nafter`);

  assert.match(adapted, /Check local facts directly first/);
  assert.match(adapted, /parent's existing `read`, `bash`/);
  assert.match(adapted, /Lack of delegation authority never transfers a discoverable fact to the user/);
  assert.match(adapted, /Require all three launch conditions/);
  assert.match(adapted, /explicitly authorized delegation or background work/);
  assert.match(adapted, /investigation is independent/);
  assert.match(adapted, /separate fresh context provides a concrete benefit/);
  assert.match(adapted, /Automatic\/model invocation of grilling is not delegation authority/);
  assert.match(adapted, /Without all three conditions, make no `subagent` call/);
  assert.equal(applyGrillingFactScout(adapted), adapted);
});

test("authorized independent grilling facts use one asynchronous permission-bounded scout", () => {
  const adapted = applyGrillingFactScout(`before\n${GRILLING_FACT_SCOUT_RULE.anchor}\nafter`);

  assert.match(adapted, /exactly one top-level workflow call containing one `runs\.run` child/);
  assert.match(adapted, /`workflow: true`/);
  assert.match(adapted, /`async: true`/);
  assert.match(adapted, /`context: "fresh"`/);
  assert.match(adapted, /`mission: false`/);
  assert.match(adapted, /`agent: "scout"`/);
  assert.match(adapted, /`tools: \["read", "grep", "find", "ls"\]`/);
  assert.match(adapted, /do not grant `bash`, `edit`, `write`, `subagent`/);
  assert.match(adapted, /read-only\/no-project-changes boundary/);
  assert.match(adapted, /outer async launch must not block the parent conversation/);
});

test("grilling keeps decisions and unrelated frontier questions with the parent", () => {
  const adapted = applyGrillingFactScout(`before\n${GRILLING_FACT_SCOUT_RULE.anchor}\nafter`);

  assert.match(adapted, /parent asks every decision question directly/);
  assert.match(adapted, /child may return facts only/);
  assert.match(adapted, /must never answer, recommend, settle, or ask the user a decision/);
  assert.match(adapted, /hold only questions downstream of it/);
  assert.match(adapted, /Ask every other currently unblocked frontier question/);
  assert.match(adapted, /do not poll, sleep, call `bg_wait`/);
  assert.match(adapted, /mark that fact unresolved/);
  assert.match(adapted, /never fabricate the fact/);
});

test("grilling fixture migrates the prior generic guard", () => {
  const generic = SUBAGENT_GUARD_RULES.find((rule) => rule.file === GRILLING_FACT_SCOUT_RULE.file);
  assert.equal(generic, undefined);
  const previous = [
    SUBAGENT_GUARD_MARKER,
    "> [!IMPORTANT]",
    '> **Pi adapter — subagent prerequisite (fact-exploration branch).** Before the first subagent step, read [the shared Pi subagent contract](../../../docs/adaptation/pi-subagents-contract.md); that contract governs Pi execution when upstream workflow wording differs. Call `subagent({ action: "list", capabilities: true })`. If the tool is unavailable or that capability check cannot run, stop and report: `This workflow requires pi-subagents. Install it with: pi install npm:pi-subagents. Then run /reload in the active Pi session, or restart Pi.` Do not switch to a CLI, background process, or other implicit fallback.',
  ].join("\n");
  const migrated = applyGrillingFactScout(`${previous}\n\n${GRILLING_FACT_SCOUT_RULE.anchor}`);
  assert.equal(migrated.includes(SUBAGENT_GUARD_MARKER), false);
  assert.equal(migrated.split(GRILLING_FACT_SCOUT_MARKER).length - 1, 1);
  assert.match(migrated, /optional read-only fact scout/);
});

test("code-review fixture gates launch on fixed-point, diff, sources, and authority", () => {
  const adapted = applyCodeReviewWorkflow(`before\n${CODE_REVIEW_WORKFLOW_RULE.anchor}\nafter`);

  assert.match(adapted, /explicit `\/skill:code-review` invocation authorizes/);
  assert.match(adapted, /selected automatically.*ask the user to authorize subagent delegation/);
  assert.match(adapted, /validate it with `git rev-parse`/);
  assert.match(adapted, /reject an empty diff/);
  assert.match(adapted, /`git log <fixed-point>\.\.HEAD --oneline`/);
  assert.match(adapted, /find the spec source.*find every standards source/);
  assert.match(adapted, /before capability discovery or reviewer launch/);
  assert.match(adapted, /precondition failure launches no reviewer/);
  assert.equal(applyCodeReviewWorkflow(adapted), adapted);
});

test("code-review fixture runs one async fresh two-axis workflow with read-only durable lanes", () => {
  const adapted = applyCodeReviewWorkflow(`before\n${CODE_REVIEW_WORKFLOW_RULE.anchor}\nafter`);

  assert.match(adapted, /exactly one top-level workflow call/);
  assert.match(adapted, /`workflow: true`/);
  assert.match(adapted, /`async: true`/);
  assert.match(adapted, /`context: "fresh"`/);
  assert.match(adapted, /single `runs\.all\(\[\.\.\.\]\)`/);
  assert.match(adapted, /exactly two children keyed `standards` and `spec`/);
  assert.match(adapted, /`tools: \["read", "grep", "find", "ls", "watchdog_diff"\]`/);
  assert.match(adapted, /`code-review\/standards\.md`.*`code-review\/spec\.md`/);
  assert.match(adapted, /`outputMode: "file-only"`/);
  assert.match(adapted, /includes its `ok`, `runId`, `output`, `outputReference`, `outputPathMapping`, and `artifactPaths`/);
  assert.match(adapted, /Do not catch a failed child: either lane failing must fail the workflow/);
  assert.match(adapted, /This block replaces upstream execution wording where the two conflict/);
});

test("code-review fixture preserves prompt contracts and skips only the absent Spec lane", () => {
  const adapted = applyCodeReviewWorkflow(`before\n${CODE_REVIEW_WORKFLOW_RULE.anchor}\nafter`);

  assert.match(adapted, /Standards prompt must contain the exact diff command/);
  assert.match(adapted, /complete smell baseline from this skill pasted in full/);
  assert.match(adapted, /Spec prompt must contain the exact diff command/);
  assert.match(adapted, /spec path or fetched contents/);
  assert.match(adapted, /400-word limit/);
  assert.match(adapted, /If the user confirms that no spec exists, skip the Spec child/);
  assert.match(adapted, /Launch one bounded direct Standards reviewer/);
  assert.match(adapted, /Do not construct a workflow or fabricate a second lane/);
  assert.match(adapted, /`## Spec` section say explicitly that no spec was available and the axis was skipped/);
});

test("code-review fixture keeps parent acceptance and axis aggregation separate", () => {
  const adapted = applyCodeReviewWorkflow(`before\n${CODE_REVIEW_WORKFLOW_RULE.anchor}\nafter`);

  assert.match(adapted, /Async launch receipts are not completed reviews/);
  assert.match(adapted, /Child success is evidence, not acceptance/);
  assert.match(adapted, /print `## Standards` and `## Spec` separately/);
  assert.match(adapted, /never merge or cross-rank findings/);
  assert.match(adapted, /finding count and most severe issue for that axis/);
  assert.match(adapted, /workflow.*lane failure stops aggregation as success/);
  assert.match(adapted, /run\/status, repo, cwd, worktree, branch\/ref/);
  assert.match(adapted, /Do not silently retry as a parent-written review/);
});

test("implement-spec validates the complete graph and source state before child launch", () => {
  const adapted = applyImplementSpecWorkflow(`before\n${IMPLEMENT_SPEC_WORKFLOW_RULE.anchor}\nafter`);

  assert.match(adapted, /explicit `\/skill:implement-spec` invocation authorizes/);
  assert.match(adapted, /Reject duplicate identities, a missing blocker, a cycle, an empty initial ready frontier/);
  assert.match(adapted, /ticket without completion criteria/);
  assert.match(adapted, /absent\/ambiguous integration base\/ref/);
  assert.match(adapted, /No validation failure may reach capability discovery or child launch/);
  assert.match(adapted, /record the repository, source `cwd`, current branch\/ref, integration base\/ref, status, and existing user changes/);
  assert.match(adapted, /preserve user changes and ask the user to commit or stash/);
  assert.equal(applyImplementSpecWorkflow(adapted), adapted);
});

test("implement-spec uses one dynamic async workflow and observes every run", () => {
  const adapted = applyImplementSpecWorkflow(`before\n${IMPLEMENT_SPEC_WORKFLOW_RULE.anchor}\nafter`);

  assert.match(adapted, /exactly one top-level workflow/);
  assert.match(adapted, /`subagent\(\{ workflow: true, async: true, cwd: <repo>, \.\.\. \}\)`/);
  assert.match(adapted, /Do not launch per-ticket top-level calls or a second workflow for code review/);
  assert.match(adapted, /awaited `runs\.all` for each ready frontier/);
  assert.match(adapted, /awaited `runs\.run` for dependent integration\/review\/fix steps/);
  assert.match(adapted, /Every started run promise is observed directly by `await`, `Promise\.all`, or `Promise\.race`/);
  assert.match(adapted, /identifies every ticket as `ready`, `blocked`, `completed`, or `failed`/);
});

test("implement-spec fixture supports two parallel tickets and a dependent third frontier", () => {
  const adapted = applyImplementSpecWorkflow(`before\n${IMPLEMENT_SPEC_WORKFLOW_RULE.anchor}\nafter`);
  const tickets = [
    { id: "A", blockedBy: [], completionCriteria: ["A accepted"] },
    { id: "B", blockedBy: [], completionCriteria: ["B accepted"] },
    { id: "C", blockedBy: ["A", "B"], completionCriteria: ["C accepted"] },
  ];

  assert.deepEqual(readyFrontier(tickets, []), ["A", "B"]);
  assert.deepEqual(readyFrontier(tickets, ["A"]), ["B"]);
  assert.deepEqual(readyFrontier(tickets, ["A", "B"]), ["C"]);
  assert.match(adapted, /awaited `runs\.all` for each ready frontier/);
  assert.match(adapted, /derive each frontier from integrated predecessors/);
  assert.match(adapted, /Recompute the ready frontier only from tickets successfully integrated/);
  assert.match(adapted, /failed implementation or test blocks its dependants/);
});

test("implement-spec isolates ticket writers and supplies complete TDD packets", () => {
  const adapted = applyImplementSpecWorkflow(`before\n${IMPLEMENT_SPEC_WORKFLOW_RULE.anchor}\nafter`);

  assert.match(adapted, /`agent: "worker"`, `context: "fresh"`, `worktree: true`/);
  assert.match(adapted, /verified named integration `baseRef`/);
  assert.match(adapted, /One ticket owns one managed worktree\/branch and one writer/);
  assert.match(adapted, /Never run two writers in one `cwd`\/worktree/);
  assert.match(adapted, /absolute path to this package's `tdd\/SKILL\.md`/);
  assert.match(adapted, /reading that absolute TDD skill before editing/);
  assert.match(adapted, /vertical red→green slices/);
  assert.match(adapted, /allowed and forbidden files\/contracts/);
  assert.match(adapted, /test\/acceptance commands/);
  assert.match(adapted, /stop\/escalation conditions/);
});

test("implement-spec serializes integration and preserves failed tests and merge conflicts", () => {
  const adapted = applyImplementSpecWorkflow(`before\n${IMPLEMENT_SPEC_WORKFLOW_RULE.anchor}\nafter`);

  assert.match(adapted, /exactly one `worker` as the integration owner/);
  assert.match(adapted, /implementation workers never merge one another/);
  assert.match(adapted, /verify ticket acceptance, diff, tests, commit\/head\/base evidence/);
  assert.match(adapted, /merge conflict yields an explicit blocked ticket and preserved lane\/worktree/);
  assert.match(adapted, /failed implementation or test blocks its dependants/);
  assert.match(adapted, /preserving successful, unintegrated handoffs/);
  assert.match(adapted, /Never use `git reset --hard`/);
});

test("implement-spec final review is fresh, read-only, and enters a fix lane", () => {
  const adapted = applyImplementSpecWorkflow(`before\n${IMPLEMENT_SPEC_WORKFLOW_RULE.anchor}\nafter`);

  assert.match(adapted, /launch one awaited `runs\.all` containing `standards` and `spec` reviewer children/);
  assert.match(adapted, /`agent: "reviewer"`, `context: "fresh"`/);
  assert.match(adapted, /`tools: \["read", "grep", "find", "ls", "watchdog_diff"\]`/);
  assert.match(adapted, /distinct `output` paths with `outputMode: "file-only"`/);
  assert.match(adapted, /reviewer launch\/output\/tooling failure fails review/);
  assert.match(adapted, /create one separate managed fix lane/);
  assert.match(adapted, /rerun the affected commands, and rerun the relevant fresh read-only review axis/);
  assert.match(adapted, /Cap review\/fix rounds/);
});

test("implement-spec gates remote effects and conservatively cleans worktrees", () => {
  const adapted = applyImplementSpecWorkflow(`before\n${IMPLEMENT_SPEC_WORKFLOW_RULE.anchor}\nafter`);

  assert.match(adapted, /does not authorize push, PR\/MR creation or updates, draft-to-ready changes, ticket closure, labels, assignees/);
  assert.match(adapted, /Without separate remote authorization, report only the integration branch, local commits/);
  assert.match(adapted, /`subagent\(\{ action: "worktree\.cleanup", repo: <repo>, mode: "plan" \}\)`/);
  assert.match(adapted, /`mode: "apply"` with its `planId`/);
  assert.match(adapted, /retains every dirty, failed, unknown, conflicted, or unintegrated lane/);
  assert.match(adapted, /Never use destructive discard as cleanup/);
});

test("implement-spec infrastructure failures stop new lanes with recovery evidence", () => {
  const adapted = applyImplementSpecWorkflow(`before\n${IMPLEMENT_SPEC_WORKFLOW_RULE.anchor}\nafter`);

  assert.match(adapted, /stop launching new lanes/);
  assert.match(adapted, /workflow\/child run IDs, repo, cwd, worktree, branch\/ref\/base, status, and partial diff\/handoff paths/);
  assert.match(adapted, /Preserve failed, dirty, unknown, conflicted, and unintegrated worktrees/);
  assert.match(adapted, /Retry only through an explicit same-protocol action/);
  assert.match(adapted, /do not switch to an external CLI or foreground agent/);
  assert.match(adapted, /do not let the parent silently implement the tickets/);
});

test("implement-spec migrates the previous generic guard", () => {
  const previous = [
    SUBAGENT_GUARD_MARKER,
    "> [!IMPORTANT]",
    '> **Pi adapter — subagent prerequisite (skill).** Before the first subagent step, read [the shared Pi subagent contract](../../../docs/adaptation/pi-subagents-contract.md); that contract governs Pi execution when upstream workflow wording differs. Call `subagent({ action: "list", capabilities: true })`. If the tool is unavailable or that capability check cannot run, stop and report: `This workflow requires pi-subagents. Install it with: pi install npm:pi-subagents. Then run /reload in the active Pi session, or restart Pi.` Do not switch to a CLI, background process, or other implicit fallback.',
  ].join("\n");
  const migrated = applyImplementSpecWorkflow(`${previous}\n\n${IMPLEMENT_SPEC_WORKFLOW_RULE.anchor}`);
  assert.equal(migrated.includes(SUBAGENT_GUARD_MARKER), false);
  assert.equal(migrated.split(IMPLEMENT_SPEC_WORKFLOW_MARKER).length - 1, 1);
});

test("research fixture requires delegation authority before launching", () => {
  const adapted = applyResearchWorkflow(`before\n${RESEARCH_WORKFLOW_RULE.anchor}\nafter`);
  assert.match(adapted, /explicit `\/skill:research` invocation/);
  assert.match(adapted, /ask the user to authorize background delegation before launching/);
  assert.match(adapted, /If authorization is absent, do not call `subagent`/);
});

test("research fixture fails closed when pi-subagents is missing", () => {
  const adapted = applyResearchWorkflow(`before\n${RESEARCH_WORKFLOW_RULE.anchor}\nafter`);
  assert.match(adapted, /subagent\(\{ action: "list", capabilities: true \}\)/);
  assert.match(adapted, /This workflow requires pi-subagents\. Install it with: pi install npm:pi-subagents/);
  assert.match(adapted, /Do not use an external CLI or another execution mode as fallback/);
});

test("research fixture binds one Markdown output through pi-subagents", () => {
  const adapted = applyResearchWorkflow(`before\n${RESEARCH_WORKFLOW_RULE.anchor}\nafter`);
  assert.match(adapted, /docs\/research\/<descriptive-slug>\.md/);
  assert.match(adapted, /Launch exactly one bounded child/);
  assert.match(adapted, /`agent: "researcher"`/);
  assert.match(adapted, /`async: true`/);
  assert.match(adapted, /`output` bound to the chosen Markdown target's absolute path/);
  assert.match(adapted, /relative child `output` is runtime-managed scratch/);
  assert.match(adapted, /`outputMode: "file-only"`/);
  assert.match(adapted, /actual `outputReference`, `outputPathMapping`, or `artifactPaths`/);
  assert.match(adapted, /do not poll or call a wait tool/);
});

test("research fixture treats a missing child output as failure", () => {
  const adapted = applyResearchWorkflow(`before\n${RESEARCH_WORKFLOW_RULE.anchor}\nafter`);
  assert.match(adapted, /Verify that the bound file exists/);
  assert.match(adapted, /bound file is absent/);
  assert.match(adapted, /Preserve any partial artifact as failed evidence/);
});

test("research fixture rejects output without citations and checks primary-source facts", () => {
  const adapted = applyResearchWorkflow(`before\n${RESEARCH_WORKFLOW_RULE.anchor}\nafter`);
  assert.match(adapted, /inline Markdown citation for every factual claim/);
  assert.match(adapted, /key claims resolve to primary sources/);
  assert.match(adapted, /unverified inferences are either removed or explicitly labeled/);
  assert.match(adapted, /report has no recognizable citations/);
  assert.equal(applyResearchWorkflow(adapted), adapted);
});

test("each curated command rule converts only a standalone slash command", () => {
  for (const [file, commands] of Object.entries(COMMAND_RULES)) {
    for (const name of Object.keys(commands)) {
      const input = name === "compact" ? "/compact" : `run /${name} now`;
      const expected = name === "clear" ? "run /new now" : name === "compact" ? "/compact" : `run /skill:${name} now`;
      const adapted = applyCommandRule(input, { file, name, expected: 1 });
      assert.equal(adapted, expected, `${file}: /${name}`);
      assert.equal(
        applyCommandRule(adapted, { file, name, expected: 1 }),
        adapted,
        `${file}: /${name} was not idempotent`,
      );
    }
  }
});

test("command rules reject drift and do not rewrite URLs, paths, links, or longer routes", () => {
  assert.throws(
    () => applyCommandRule("upstream removed it", { file: "fixture.md", name: "tdd", expected: 1 }),
    /upstream drift/,
  );
  assert.throws(
    () => applyCommandRule("/tdd and /tdd", { file: "fixture.md", name: "tdd", expected: 1 }),
    /upstream drift/,
  );

  const ordinarySlashes = [
    "https://example.com/tdd",
    "docs/tdd",
    "[TDD](./tdd)",
    "/prototype/<name>",
    "https://example.com/setup-matt-pocock-skills",
  ];
  for (const text of ordinarySlashes) {
    assert.throws(
      () => applyCommandRule(text, { file: "fixture.md", name: "tdd", expected: 1 }),
      /upstream drift/,
    );
    assert.equal(text.includes("/skill:"), false);
  }
});

test("setup context-file fixtures select one effective file and preserve in-place updates", () => {
  const setupRules = PLATFORM_RULES.filter((rule) =>
    rule.file === "engineering/setup-matt-pocock-skills/SKILL.md",
  );
  const generated = setupRules.map((rule) => applyExactRule(rule.upstream, rule)).join("\n");

  assert.match(generated, /If `AGENTS\.override\.md` exists/);
  assert.match(generated, /Edit `AGENTS\.override\.md` unless the user chooses to remove the override first/);
  assert.match(generated, /Otherwise, if `AGENTS\.md` exists, edit `AGENTS\.md`/);
  assert.match(generated, /Otherwise, if `CLAUDE\.md` exists, respect the existing Claude project/);
  assert.match(generated, /If none exists, create `AGENTS\.md` by default/);
  assert.match(generated, /Create at most one context file/);
  assert.match(generated, /update its contents in-place rather than appending a duplicate/);
  assert.doesNotMatch(generated, /ask the user which one to create/);
});

test("retro fixture uses the exact Pi session environment without home-directory scanning", () => {
  const [rule] = PLATFORM_RULES.filter((candidate) =>
    candidate.file === "engineering/retro/SKILL.md",
  );
  const generated = applyExactRule(rule.upstream, rule);

  assert.match(generated, /\$PI_SESSION_FILE/);
  assert.match(generated, /\$PI_SESSION_ID/);
  assert.match(generated, /If `\$PI_SESSION_FILE` is set and the file exists, read that file first/);
  assert.match(generated, /Windows drive letters, backslashes, and spaces/);
  assert.match(generated, /run `\/session`/);
  assert.match(generated, /do not recursively scan the home directory/);
  assert.match(generated, /warn the user that it may contain/);
  assert.match(generated, /Continue to redact credentials/);
});

test("handoff fixtures cover Windows and Unix temporary roots and collision-safe output", () => {
  const rules = PLATFORM_RULES.filter((rule) =>
    rule.file === "productivity/handoff/SKILL.md",
  );
  const generated = rules.map((rule) => applyExactRule(rule.upstream, rule)).join("\n");

  assert.match(generated, /on Windows use `%TEMP%`/);
  assert.match(generated, /available as `\$TEMP`/);
  assert.match(generated, /on Unix use `\$TMPDIR` when non-empty, otherwise `\/tmp`/);
  assert.match(generated, /outside the current workspace and repository/);
  assert.match(generated, /`pi-handoff-<UTC timestamp>-<unique suffix>\.md`/);
  assert.match(generated, /exclusive-create operation/);
  assert.match(generated, /never overwritten/);
  assert.match(generated, /report the final handoff file's absolute path/);
});

test("the generated snapshot is idempotent, LF-only, and passes static guards", async (t) => {
  const skillsRoot = await temporarySkills(t);
  const first = await applyPiAdaptations({ skillsRoot });
  const second = await applyPiAdaptations({ skillsRoot });
  assert.deepEqual(first.changedFiles, []);
  assert.deepEqual(second.changedFiles, []);
  await validatePiAdaptations({ skillsRoot });
});

test("only the reviewed subagent skills and branches carry the generated guard", async () => {
  const guarded = [];
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(target);
      else {
        const contents = await readFile(target, "utf8");
        if (
          contents.includes(SUBAGENT_GUARD_MARKER) ||
          contents.includes(CODE_REVIEW_WORKFLOW_MARKER) ||
          contents.includes(RESEARCH_WORKFLOW_MARKER) ||
          contents.includes(GRILLING_FACT_SCOUT_MARKER) ||
          contents.includes(ARCHITECTURE_SCOUT_MARKER) ||
          contents.includes(DESIGN_IT_TWICE_WORKFLOW_MARKER) ||
          contents.includes(WAYFINDER_WORKFLOW_MARKER) ||
          contents.includes(IMPLEMENT_SPEC_WORKFLOW_MARKER)
        ) {
          guarded.push(path.relative(DEFAULT_SKILLS_ROOT, target).split(path.sep).join("/"));
        }
      }
    }
  }
  await walk(DEFAULT_SKILLS_ROOT);
  assert.deepEqual(
    guarded.sort(),
    [
      CODE_REVIEW_WORKFLOW_RULE.file,
      RESEARCH_WORKFLOW_RULE.file,
      GRILLING_FACT_SCOUT_RULE.file,
      ARCHITECTURE_SCOUT_RULE.file,
      DESIGN_IT_TWICE_WORKFLOW_RULE.file,
      WAYFINDER_WORKFLOW_RULE.file,
      IMPLEMENT_SPEC_WORKFLOW_RULE.file,
      ...SUBAGENT_GUARD_RULES.map((rule) => rule.file),
    ].sort(),
  );
  const research = await readFile(
    path.join(DEFAULT_SKILLS_ROOT, "engineering", "research", "SKILL.md"),
    "utf8",
  );
  assert.equal(research.includes(RESEARCH_WORKFLOW_MARKER), true);
});

test("full-tree adaptation fails on an exact-rule drift without writing other changes", async (t) => {
  const skillsRoot = await temporarySkills(t);
  const rule = OPERATIVE_RULES[0];
  const file = path.join(skillsRoot, ...rule.file.split("/"));
  const before = await readFile(file, "utf8");
  await writeFile(file, before.replace(rule.pi, "drifted sentence"), "utf8");

  await assert.rejects(applyPiAdaptations({ skillsRoot }), /upstream drift/);
  assert.equal(await readFile(file, "utf8"), before.replace(rule.pi, "drifted sentence"));
});

test("the static guard covers all 27 official legacy command names", async () => {
  assert.equal(OFFICIAL_SKILL_NAMES.length, 27);
  assert.equal(new Set(OFFICIAL_SKILL_NAMES).size, 27);
});

test("static guards reject forbidden syntax but allow Pi native session commands", async (t) => {
  const skillsRoot = await temporarySkills(t);
  const fixture = path.join(skillsRoot, "engineering", "ask-matt", "SKILL.md");
  const original = await readFile(fixture, "utf8");

  for (const forbidden of [
    "Call the Skill tool with tdd.",
    ...OFFICIAL_SKILL_NAMES.map((name) => `Run /${name}.`),
    "Use /clear for a new session.",
  ]) {
    await writeFile(fixture, `${original}\n${forbidden}\n`, "utf8");
    await assert.rejects(validatePiAdaptations({ skillsRoot }), /upstream drift/);
  }

  await writeFile(fixture, `${original}\n/skill:tdd /compact /new /fork /resume\n`, "utf8");
  await validatePiAdaptations({ skillsRoot });
});

test("router and handoff adaptations never claim they can internally invoke user-only skills", async () => {
  const askMatt = await readFile(path.join(DEFAULT_SKILLS_ROOT, "engineering", "ask-matt", "SKILL.md"), "utf8");
  const handoff = await readFile(path.join(DEFAULT_SKILLS_ROOT, "productivity", "handoff", "SKILL.md"), "utf8");
  const wayfinder = await readFile(path.join(DEFAULT_SKILLS_ROOT, "engineering", "wayfinder", "SKILL.md"), "utf8");

  assert.match(askMatt, /\/skill:to-spec/);
  assert.match(askMatt, /\/skill:setup-matt-pocock-skills/);
  assert.match(handoff, /\/skill:<name>/);
  assert.match(wayfinder, /if it is user-invoked, show the user `\/skill:<name>`/);
});
