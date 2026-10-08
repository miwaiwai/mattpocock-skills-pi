import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { chmod, mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { syncFromCheckout, UPSTREAM_REF } from "../scripts/sync-upstream.mjs";

const REVIEWED_SKILLS = [
  "./skills/engineering/ask-matt",
  "./skills/engineering/diagnosing-bugs",
  "./skills/engineering/grill-with-docs",
  "./skills/engineering/triage",
  "./skills/engineering/improve-codebase-architecture",
  "./skills/engineering/setup-matt-pocock-skills",
  "./skills/engineering/tdd",
  "./skills/engineering/to-spec",
  "./skills/engineering/to-tickets",
  "./skills/engineering/wayfinder",
  "./skills/engineering/implement",
  "./skills/engineering/implement-spec",
  "./skills/engineering/prototype",
  "./skills/engineering/research",
  "./skills/engineering/domain-modeling",
  "./skills/engineering/codebase-design",
  "./skills/engineering/code-review",
  "./skills/engineering/pr",
  "./skills/engineering/retro",
  "./skills/engineering/wizard",
  "./skills/productivity/grill-me",
  "./skills/productivity/grilling",
  "./skills/productivity/handoff",
  "./skills/productivity/teach",
  "./skills/productivity/to-questionnaire",
  "./skills/productivity/wait-what",
  "./skills/productivity/writing-for-agents",
];

const COMMIT = "0123456789abcdef0123456789abcdef01234567";

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function createFixture(t, manifestSkills = REVIEWED_SKILLS) {
  const root = await mkdtemp(path.join(os.tmpdir(), "sync-upstream-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const checkoutRoot = path.join(root, "checkout");
  const projectRoot = path.join(root, "project");

  await writeJson(path.join(checkoutRoot, ".claude-plugin", "plugin.json"), {
    name: "fixture",
    version: "1.3.1",
    skills: manifestSkills,
  });
  await writeJson(path.join(checkoutRoot, "package.json"), { name: "fixture", version: "1.3.1" });
  await writeFile(path.join(checkoutRoot, "LICENSE"), "MIT fixture\n", "utf8");
  await writeJson(path.join(projectRoot, "upstream", "SKILLS.lock.json"), {
    schemaVersion: 1,
    upstreamRef: UPSTREAM_REF,
    skills: REVIEWED_SKILLS,
  });

  for (const skill of REVIEWED_SKILLS) {
    const directory = path.join(checkoutRoot, ...skill.slice(2).split("/"));
    await mkdir(path.join(directory, "agents"), { recursive: true });
    await writeFile(path.join(directory, "SKILL.md"), `# ${path.basename(directory)}\n`, "utf8");
    await writeFile(path.join(directory, "agents", "openai.yaml"), "name: fixture\n", "utf8");
  }

  const snapshotSkills = {};
  for (const skill of REVIEWED_SKILLS) {
    const relative = skill.slice(2);
    const frontmatter = `---\nname: ${path.basename(relative)}\ndescription: Fixture skill.\n---\n`;
    const directory = path.join(checkoutRoot, ...relative.split("/"));
    await writeFile(path.join(directory, "SKILL.md"), `${frontmatter}# ${path.basename(directory)}\n`, "utf8");
    const frontmatterHash = createHash("sha256").update(frontmatter.slice(4, -4)).digest("hex");
    snapshotSkills[skill] = {
      files: ["SKILL.md", "agents/openai.yaml"],
      upstreamFrontmatterSha256: frontmatterHash,
      adaptedFrontmatterSha256: frontmatterHash,
    };
  }
  await writeJson(path.join(projectRoot, "upstream", "SNAPSHOT.lock.json"), {
    schemaVersion: 1,
    upstreamRef: UPSTREAM_REF,
    skills: snapshotSkills,
  });

  return { checkoutRoot, projectRoot };
}

async function runFixture(fixture, overrides = {}) {
  return syncFromCheckout({
    ...fixture,
    actualCommit: COMMIT,
    requestedRef: UPSTREAM_REF,
    repository: "https://example.invalid/upstream.git",
    commitDate: "2026-02-26T12:00:00+00:00",
    // Synchronization fixtures intentionally contain placeholder skills. The
    // real adapter has its own exact-rule tests; this seam verifies sync calls it.
    adaptSkills: async () => {},
    ...overrides,
  });
}

async function snapshotTree(root) {
  const records = [];
  async function walk(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);
      const relativePath = path.relative(root, fullPath).split(path.sep).join("/");
      if (entry.isDirectory()) {
        records.push(`d ${relativePath}`);
        await walk(fullPath);
      } else {
        const contents = await readFile(fullPath);
        const mode = (await stat(fullPath)).mode & 0o777;
        const digest = createHash("sha256").update(contents).digest("hex");
        records.push(`f ${relativePath} ${mode.toString(8)} ${digest}`);
      }
    }
  }
  await walk(root);
  return records;
}

test("copies only manifest-declared skill directories and all their support files", async (t) => {
  const fixture = await createFixture(t);
  const declared = path.join(fixture.checkoutRoot, "skills", "engineering", "ask-matt");
  await mkdir(path.join(declared, "scripts"), { recursive: true });
  await writeFile(path.join(declared, "scripts", "helper.sh"), "#!/bin/sh\n", "utf8");
  await chmod(path.join(declared, "scripts", "helper.sh"), 0o755);
  const snapshotPath = path.join(fixture.projectRoot, "upstream", "SNAPSHOT.lock.json");
  const snapshot = JSON.parse(await readFile(snapshotPath, "utf8"));
  snapshot.skills[REVIEWED_SKILLS[0]].files.push("scripts/helper.sh");
  snapshot.skills[REVIEWED_SKILLS[0]].files.sort();
  await writeJson(snapshotPath, snapshot);

  const undeclared = path.join(fixture.checkoutRoot, "skills", "misc", "not-promoted");
  await mkdir(undeclared, { recursive: true });
  await writeFile(path.join(undeclared, "SKILL.md"), "must not copy\n", "utf8");

  await runFixture(fixture);

  assert.equal(
    await readFile(path.join(fixture.projectRoot, "skills", "engineering", "ask-matt", "scripts", "helper.sh"), "utf8"),
    "#!/bin/sh\n",
  );
  await assert.rejects(stat(path.join(fixture.projectRoot, "skills", "misc")), { code: "ENOENT" });
  assert.equal((await readdir(path.join(fixture.projectRoot, "skills", "engineering"))).length, 20);
  assert.equal((await readdir(path.join(fixture.projectRoot, "skills", "productivity"))).length, 7);
});

test("rejects a missing declared skill directory without replacing the old snapshot", async (t) => {
  const fixture = await createFixture(t);
  const oldSnapshot = path.join(fixture.projectRoot, "skills");
  await mkdir(oldSnapshot, { recursive: true });
  await writeFile(path.join(oldSnapshot, "keep.txt"), "old snapshot\n", "utf8");
  await rm(path.join(fixture.checkoutRoot, "skills", "engineering", "ask-matt"), {
    recursive: true,
    force: true,
  });

  await assert.rejects(runFixture(fixture), /missing skill directory/);
  assert.equal(await readFile(path.join(oldSnapshot, "keep.txt"), "utf8"), "old snapshot\n");
});

test("rejects an illegal path", async (t) => {
  const skills = [...REVIEWED_SKILLS];
  skills[0] = "./skills/engineering/../misc";
  const fixture = await createFixture(t, skills);
  await assert.rejects(runFixture(fixture), /illegal or out-of-scope skill path/);
});

test("rejects duplicate skill names even across categories", async (t) => {
  const skills = [...REVIEWED_SKILLS];
  skills[20] = "./skills/productivity/ask-matt";
  const fixture = await createFixture(t, skills);
  await assert.rejects(runFixture(fixture), /duplicate skill name/);
});

test("rejects reviewed support-file and frontmatter drift before publishing", async (t) => {
  const supportFixture = await createFixture(t);
  await writeFile(
    path.join(supportFixture.checkoutRoot, "skills", "engineering", "ask-matt", "unreviewed.txt"),
    "drift\n",
    "utf8",
  );
  await assert.rejects(runFixture(supportFixture), /support-file inventory drift/);

  const frontmatterFixture = await createFixture(t);
  const skillFile = path.join(frontmatterFixture.checkoutRoot, "skills", "engineering", "ask-matt", "SKILL.md");
  const contents = await readFile(skillFile, "utf8");
  await writeFile(skillFile, contents.replace("description: Fixture skill.", "description: Drifted."), "utf8");
  await assert.rejects(runFixture(frontmatterFixture), /frontmatter drift/);
});

test("runs Pi adaptations on the staged tree before publishing it", async (t) => {
  const fixture = await createFixture(t);
  let adaptedRoot;

  await runFixture(fixture, {
    adaptSkills: async ({ skillsRoot }) => {
      adaptedRoot = skillsRoot;
      const target = path.join(skillsRoot, "engineering", "ask-matt", "SKILL.md");
      const current = await readFile(target, "utf8");
      await writeFile(target, current.replace("# ask-matt", "# adapted for Pi"), "utf8");
    },
  });

  assert.match(path.basename(path.dirname(adaptedRoot)), /^\.sync-upstream-/);
  assert.equal(
    await readFile(path.join(fixture.projectRoot, "skills", "engineering", "ask-matt", "SKILL.md"), "utf8"),
    "---\nname: ask-matt\ndescription: Fixture skill.\n---\n# adapted for Pi\n",
  );
});

test("an adaptation failure leaves the prior snapshot untouched", async (t) => {
  const fixture = await createFixture(t);
  const oldSnapshot = path.join(fixture.projectRoot, "skills");
  await mkdir(oldSnapshot, { recursive: true });
  await writeFile(path.join(oldSnapshot, "keep.txt"), "old snapshot\n", "utf8");

  await assert.rejects(
    runFixture(fixture, {
      adaptSkills: async () => {
        throw new Error("fixture upstream drift");
      },
    }),
    /fixture upstream drift/,
  );
  assert.equal(await readFile(path.join(oldSnapshot, "keep.txt"), "utf8"), "old snapshot\n");
});

test("a second sync produces byte-for-byte and mode-for-mode identical output", async (t) => {
  const fixture = await createFixture(t);
  await runFixture(fixture);
  const first = await snapshotTree(fixture.projectRoot);
  await runFixture(fixture);
  const second = await snapshotTree(fixture.projectRoot);
  assert.deepEqual(second, first);
});
