#!/usr/bin/env node

import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  PACKAGE_PATH,
  PROJECT_ROOT,
  packageSkillPaths,
  readJson,
  readSkillsLock,
} from "./package-manifest.mjs";
import { validatePiAdaptations } from "./apply-pi-adaptations.mjs";

const EXPECTED_TOTAL = 27;
const EXPECTED_USER_INVOKED = 16;
const EXPECTED_MODEL_INVOKED = 11;

function fail(message) {
  throw new Error(`[Pi adaptation drift] Package validation failed: ${message}`);
}

function parseScalar(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    if (trimmed.startsWith('"')) return JSON.parse(trimmed);
    return trimmed.slice(1, -1).replaceAll("''", "'");
  }
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  return trimmed;
}

export function parseSkillFrontmatter(contents, skillPath) {
  const normalized = contents.replaceAll("\r\n", "\n");
  const match = /^---\n([\s\S]*?)\n---(?:\n|$)/.exec(normalized);
  if (!match) fail(`${skillPath} has no valid YAML frontmatter`);

  const frontmatter = {};
  for (const line of match[1].split("\n")) {
    if (line.trim() === "" || /^\s/.test(line)) continue;
    const field = /^([A-Za-z0-9-]+):(?:\s*(.*))?$/.exec(line);
    if (field) frontmatter[field[1]] = parseScalar(field[2] ?? "");
  }
  return frontmatter;
}

function assertUniqueStrings(values, label) {
  if (values.some((value) => typeof value !== "string" || value.length === 0)) {
    fail(`${label} must contain only non-empty strings`);
  }
  if (new Set(values).size !== values.length) fail(`${label} contains duplicates`);
}

export async function validatePackage() {
  const [manifest, lock] = await Promise.all([readJson(PACKAGE_PATH), readSkillsLock()]);
  const lockedPaths = packageSkillPaths(lock);

  if (!Array.isArray(manifest.keywords) || !manifest.keywords.includes("pi-package")) {
    fail("package.json must include the pi-package keyword");
  }
  if (!manifest.pi || Object.keys(manifest.pi).some((key) => key !== "skills")) {
    fail("package.json pi manifest must declare only skills");
  }
  if (!Array.isArray(manifest.pi.skills)) fail("package.json pi.skills must be an array");
  if (manifest.pi.skills.length !== EXPECTED_TOTAL) {
    fail(`manifest must expose exactly ${EXPECTED_TOTAL} skills, found ${manifest.pi.skills.length}`);
  }
  if (JSON.stringify(manifest.pi.skills) !== JSON.stringify(lockedPaths)) {
    fail("package.json pi.skills differs from the reviewed skills lock; run npm run generate:manifest");
  }
  if (manifest.pi.skills.some((entry) => entry === "./skills" || /[*?{}[\]]/.test(entry))) {
    fail("pi.skills must list each skill directory explicitly, without recursive roots or globs");
  }
  for (const field of ["dependencies", "optionalDependencies", "peerDependencies", "devDependencies"]) {
    if (manifest[field] && Object.hasOwn(manifest[field], "pi-subagents")) {
      fail(`pi-subagents must remain a separately installed prerequisite, not ${field}`);
    }
  }
  if (manifest.pi.extensions !== undefined) {
    fail("adapter must not register extensions or a replacement subagent tool");
  }

  const userInvoked = lock.invocation.userInvoked;
  const modelInvoked = lock.invocation.modelInvoked;
  assertUniqueStrings(userInvoked, "lock invocation.userInvoked");
  assertUniqueStrings(modelInvoked, "lock invocation.modelInvoked");
  if (userInvoked.length !== EXPECTED_USER_INVOKED) {
    fail(`expected ${EXPECTED_USER_INVOKED} user-invoked skills, found ${userInvoked.length}`);
  }
  if (modelInvoked.length !== EXPECTED_MODEL_INVOKED) {
    fail(`expected ${EXPECTED_MODEL_INVOKED} model-invoked skills, found ${modelInvoked.length}`);
  }
  const expectedNames = lockedPaths.map((entry) => path.posix.basename(entry));
  assertUniqueStrings(expectedNames, "locked skill names");
  const invocationNames = [...userInvoked, ...modelInvoked];
  assertUniqueStrings(invocationNames, "locked invocation names");
  if (
    expectedNames.length !== invocationNames.length ||
    expectedNames.some((name) => !invocationNames.includes(name))
  ) {
    fail("invocation classification does not partition the locked skill names");
  }

  const loadedNames = new Set();
  for (const relativePath of lockedPaths) {
    const directory = path.resolve(PROJECT_ROOT, relativePath);
    const relativeToRoot = path.relative(PROJECT_ROOT, directory);
    if (relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) {
      fail(`skill path escapes package root: ${relativePath}`);
    }
    const skillFile = path.join(directory, "SKILL.md");
    let info;
    try {
      info = await stat(skillFile);
    } catch (error) {
      fail(`${relativePath} does not contain SKILL.md: ${error.message}`);
    }
    if (!info.isFile()) fail(`${relativePath}/SKILL.md is not a file`);

    const frontmatter = parseSkillFrontmatter(await readFile(skillFile, "utf8"), relativePath);
    const directoryName = path.basename(directory);
    if (frontmatter.name !== directoryName) {
      fail(`${relativePath} declares name ${JSON.stringify(frontmatter.name)}, expected ${directoryName}`);
    }
    if (loadedNames.has(frontmatter.name)) fail(`duplicate skill name: ${frontmatter.name}`);
    loadedNames.add(frontmatter.name);
    if (typeof frontmatter.description !== "string" || frontmatter.description.trim() === "") {
      fail(`${relativePath} has an empty description`);
    }

    if (userInvoked.includes(frontmatter.name)) {
      if (frontmatter["disable-model-invocation"] !== true) {
        fail(`${frontmatter.name} must retain disable-model-invocation: true`);
      }
    } else if (Object.hasOwn(frontmatter, "disable-model-invocation")) {
      fail(`${frontmatter.name} is model-invoked and must not declare disable-model-invocation`);
    }
  }

  await validatePiAdaptations({ skillsRoot: path.join(PROJECT_ROOT, "skills") });
  return { total: loadedNames.size, userInvoked: userInvoked.length, modelInvoked: modelInvoked.length };
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  validatePackage()
    .then(({ total, userInvoked, modelInvoked }) => {
      console.log(
        `Validated ${total} explicit skills (${userInvoked} user-invoked, ${modelInvoked} model-invoked).`,
      );
    })
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
