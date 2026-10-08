import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  PACKAGE_PATH,
  PROJECT_ROOT,
  packageSkillPaths,
  readJson,
  readSkillsLock,
} from "../scripts/package-manifest.mjs";
import { parseSkillFrontmatter, validatePackage } from "../scripts/validate-package.mjs";

const SNAPSHOT_LOCK = path.join(PROJECT_ROOT, "upstream", "SNAPSHOT.lock.json");
const NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ILLUSTRATIVE_MISSING_LINKS = new Set([
  "skills/engineering/domain-modeling/GLOSSARY-FORMAT.md::./src/ordering/GLOSSARY.md",
  "skills/engineering/domain-modeling/GLOSSARY-FORMAT.md::./src/billing/GLOSSARY.md",
  "skills/engineering/domain-modeling/GLOSSARY-FORMAT.md::./src/fulfillment/GLOSSARY.md",
  "skills/engineering/wayfinder/SKILL.md::link",
]);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizedFrontmatter(contents, label) {
  const match = /^---\n([\s\S]*?)\n---(?:\n|$)/.exec(contents.replaceAll("\r\n", "\n"));
  assert.ok(match, `[upstream drift] ${label} has no frontmatter`);
  return `${match[1]}\n`;
}

async function listFiles(root) {
  const files = [];
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(target);
      else if (entry.isFile()) files.push(target);
    }
  }
  await walk(root);
  return files.sort();
}

function localMarkdownTargets(contents) {
  const targets = [];
  for (const match of contents.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const raw = match[1].trim().replace(/^<|>$/g, "");
    if (/^(?:[a-z][a-z+.-]*:|#)/i.test(raw)) continue;
    targets.push(raw.split(/[?#]/, 1)[0]);
  }
  return targets;
}

test("A: promoted manifest lock is exactly 27 skills split 20/7 and 16/11", async () => {
  const [manifest, lock] = await Promise.all([readJson(PACKAGE_PATH), readSkillsLock()]);
  const paths = packageSkillPaths(lock);
  assert.deepEqual(manifest.pi.skills, paths, "[upstream drift] package manifest differs from reviewed lock");
  assert.equal(paths.length, 27, "[upstream drift] promoted skill baseline is no longer 27");
  assert.equal(paths.filter((value) => value.startsWith("./skills/engineering/")).length, 20);
  assert.equal(paths.filter((value) => value.startsWith("./skills/productivity/")).length, 7);
  assert.equal(lock.invocation.userInvoked.length, 16);
  assert.equal(lock.invocation.modelInvoked.length, 11);
  assert.equal(paths.some((value) => /\/(?:misc|in-progress|deprecated)(?:\/|$)/.test(value)), false);
});

test("B: frontmatter names are legal/unique and every field matches the reviewed adapted baseline", async () => {
  const [lock, snapshot] = await Promise.all([readSkillsLock(), readJson(SNAPSHOT_LOCK)]);
  assert.equal(snapshot.upstreamRef, lock.upstreamRef, "[upstream drift] snapshot lock ref differs");
  const names = new Set();
  for (const relative of lock.skills) {
    const file = path.join(PROJECT_ROOT, relative.slice(2), "SKILL.md");
    const contents = await readFile(file, "utf8");
    const frontmatter = parseSkillFrontmatter(contents, relative);
    assert.match(frontmatter.name, NAME_PATTERN, `[Pi adaptation drift] illegal name in ${relative}`);
    assert.ok(frontmatter.name.length <= 64, `[Pi adaptation drift] overlong name in ${relative}`);
    assert.equal(frontmatter.name, path.posix.basename(relative));
    assert.equal(names.has(frontmatter.name), false, `[Pi adaptation drift] duplicate ${frontmatter.name}`);
    names.add(frontmatter.name);
    assert.ok(frontmatter.description?.trim(), `[Pi adaptation drift] empty description in ${relative}`);
    assert.ok(frontmatter.description.length <= 1024, `[Pi adaptation drift] overlong description in ${relative}`);
    assert.equal(
      sha256(normalizedFrontmatter(contents, relative)),
      snapshot.skills[relative]?.adaptedFrontmatterSha256,
      `[Pi adaptation drift] frontmatter fields changed in ${relative}; this includes license/metadata`,
    );
    assert.equal(
      frontmatter["disable-model-invocation"] === true,
      lock.invocation.userInvoked.includes(frontmatter.name),
      `[Pi adaptation drift] invocation flag changed for ${frontmatter.name}`,
    );
  }
});

test("C: every reviewed upstream support file is present and no undeclared file entered a skill", async () => {
  const [lock, snapshot] = await Promise.all([readSkillsLock(), readJson(SNAPSHOT_LOCK)]);
  for (const relative of lock.skills) {
    const root = path.join(PROJECT_ROOT, relative.slice(2));
    const actual = (await listFiles(root)).map((file) => path.relative(root, file).split(path.sep).join("/"));
    assert.deepEqual(
      actual,
      snapshot.skills[relative]?.files,
      `[upstream drift] support-file inventory differs for ${relative}`,
    );
  }
});

test("C: Markdown relative links resolve, with only reviewed illustrative examples exempted", async () => {
  const files = (await listFiles(path.join(PROJECT_ROOT, "skills"))).filter((file) => file.endsWith(".md"));
  const seenExemptions = new Set();
  for (const file of files) {
    const relative = path.relative(PROJECT_ROOT, file).split(path.sep).join("/");
    for (const target of localMarkdownTargets(await readFile(file, "utf8"))) {
      const key = `${relative}::${target}`;
      try {
        await stat(path.resolve(path.dirname(file), target));
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
        assert.ok(ILLUSTRATIVE_MISSING_LINKS.has(key), `[upstream drift] missing Markdown target ${key}`);
        seenExemptions.add(key);
      }
    }
  }
  assert.deepEqual(seenExemptions, ILLUSTRATIVE_MISSING_LINKS, "[upstream drift] stale link exemption");
});

test("C: referenced bundled scripts/templates exist and shell scripts use LF", async () => {
  const expected = [
    "skills/engineering/diagnosing-bugs/scripts/hitl-loop.template.sh",
    "skills/engineering/wizard/template.sh",
  ];
  for (const relative of expected) {
    const contents = await readFile(path.join(PROJECT_ROOT, relative));
    assert.equal(contents.includes(13), false, `[Pi adaptation drift] ${relative} contains CR/CRLF`);
  }
  const diagnosing = await readFile(path.join(PROJECT_ROOT, "skills/engineering/diagnosing-bugs/SKILL.md"), "utf8");
  const wizard = await readFile(path.join(PROJECT_ROOT, "skills/engineering/wizard/SKILL.md"), "utf8");
  assert.match(diagnosing, /scripts\/hitl-loop\.template\.sh/);
  assert.match(wizard, /\[template\.sh\]\(template\.sh\)/);
});

test("E: adapted skill text has no operative legacy command, auto-install, or CLI fallback", async () => {
  const files = (await listFiles(path.join(PROJECT_ROOT, "skills"))).filter((file) => file.endsWith(".md"));
  for (const file of files) {
    const relative = path.relative(PROJECT_ROOT, file).split(path.sep).join("/");
    const contents = await readFile(file, "utf8");
    assert.doesNotMatch(contents, /call(?:s|ing|ed)? the Skill tool/i, `[Pi adaptation drift] ${relative}`);
    assert.doesNotMatch(contents, /(?:adapter|this package|package) (?:automatically |will )?(?:installs?|bundles?) pi-subagents/i, `[Pi adaptation drift] ${relative}`);
    assert.doesNotMatch(contents, /(?:fall back|fallback|switch) to (?:the )?(?:Claude|Codex|Cursor|external) CLI/i, `[Pi adaptation drift] ${relative}`);
    assert.doesNotMatch(contents, /(?:run|execute|type|use)\s+`?\/(?:clear|ask-matt|diagnosing-bugs|grill-with-docs|triage|improve-codebase-architecture|setup-matt-pocock-skills|tdd|to-spec|to-tickets|wayfinder|implement|implement-spec|prototype|research|domain-modeling|codebase-design|code-review|pr|retro|wizard|grill-me|grilling|handoff|teach|to-questionnaire|wait-what|writing-for-agents)(?![a-z0-9-]|\/)/i, `[Pi adaptation drift] ${relative}`);
  }
});

test("F: Scheme A has no dependency or copied extension and documents fail-fast installation", async () => {
  const manifest = await readJson(PACKAGE_PATH);
  for (const field of ["dependencies", "optionalDependencies", "peerDependencies", "devDependencies"]) {
    assert.equal(Object.hasOwn(manifest[field] ?? {}, "pi-subagents"), false, `[Pi adaptation drift] ${field}`);
  }
  assert.equal(manifest.pi.extensions, undefined, "[Pi adaptation drift] package registers an extension");
  const files = await listFiles(PROJECT_ROOT);
  const suspicious = files.filter((file) => {
    const relative = path.relative(PROJECT_ROOT, file).split(path.sep).join("/");
    return !relative.startsWith(".git/") && !relative.startsWith("node_modules/") && /(^|\/)(?:extensions?|pi-subagents)(\/|$)/.test(relative);
  });
  assert.deepEqual(suspicious, [], "[Pi adaptation drift] copied pi-subagents/extension files detected");
  const readme = await readFile(path.join(PROJECT_ROOT, "README.md"), "utf8");
  assert.match(readme, /pi install npm:pi-subagents/);
  const guarded = ["research", "code-review", "implement-spec", "wayfinder", "improve-codebase-architecture"];
  for (const name of guarded) {
    const relative = lockPathForName(name);
    const contents = await readFile(path.join(PROJECT_ROOT, relative.slice(2), "SKILL.md"), "utf8");
    assert.match(contents, /This workflow requires pi-subagents\. Install it with: pi install npm:pi-subagents\./);
    assert.match(contents, /subagent\(\{ action: "list", capabilities: true \}\)/);
  }
});

function lockPathForName(name) {
  const categories = name === "wayfinder" || name === "research" || name === "code-review" || name === "implement-spec" || name === "improve-codebase-architecture" ? "engineering" : "productivity";
  return `./skills/${categories}/${name}`;
}

test("default static validator reports the complete package as valid", async () => {
  assert.deepEqual(await validatePackage(), { total: 27, userInvoked: 16, modelInvoked: 11 });
});
