#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { constants } from "node:fs";
import {
  access,
  cp,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash, randomUUID } from "node:crypto";

import { applyPiAdaptations } from "./apply-pi-adaptations.mjs";

export const UPSTREAM_REPOSITORY = "https://github.com/mattpocock/skills.git";
export const UPSTREAM_REF = "f3fc5632f401156837ee3872f14fe33ccf1024ea";
export const MANIFEST_PATH = ".claude-plugin/plugin.json";
export const LOCK_PATH = "upstream/SKILLS.lock.json";
export const SNAPSHOT_LOCK_PATH = "upstream/SNAPSHOT.lock.json";

const EXPECTED_COUNTS = Object.freeze({ engineering: 20, productivity: 7 });
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_PROJECT_ROOT = path.resolve(SCRIPT_DIR, "..");

function fail(message) {
  throw new Error(`[upstream drift] Upstream sync refused: ${message}`);
}

async function readJson(filePath, label) {
  let contents;
  try {
    contents = await readFile(filePath, "utf8");
  } catch (error) {
    fail(`could not read ${label} at ${filePath}: ${error.message}`);
  }

  try {
    return JSON.parse(contents);
  } catch (error) {
    fail(`${label} is not valid JSON: ${error.message}`);
  }
}

function normalizedSkillPath(entry) {
  if (typeof entry !== "string" || entry.length === 0) {
    fail("plugin.json contains a non-string or empty skill path");
  }
  if (entry.includes("\\")) {
    fail(`illegal skill path uses a backslash: ${JSON.stringify(entry)}`);
  }
  if (!entry.startsWith("./")) {
    fail(`illegal skill path must start with './': ${JSON.stringify(entry)}`);
  }

  const withoutPrefix = entry.slice(2);
  const segments = withoutPrefix.split("/");
  if (
    path.posix.isAbsolute(withoutPrefix) ||
    segments.some((segment) => segment === "" || segment === "." || segment === "..") ||
    segments.length !== 3 ||
    segments[0] !== "skills" ||
    !Object.hasOwn(EXPECTED_COUNTS, segments[1])
  ) {
    fail(`illegal or out-of-scope skill path: ${JSON.stringify(entry)}`);
  }

  return { relativePath: segments.join("/"), category: segments[1], name: segments[2] };
}

export function validateManifestSkills(skills, reviewedSkills) {
  if (!Array.isArray(skills)) fail("plugin.json 'skills' must be an array");
  if (!Array.isArray(reviewedSkills)) fail("skills lock 'skills' must be an array");

  const parsed = skills.map(normalizedSkillPath);
  const names = new Set();
  for (const skill of parsed) {
    if (names.has(skill.name)) fail(`duplicate skill name: ${JSON.stringify(skill.name)}`);
    names.add(skill.name);
  }

  const exactMatch =
    skills.length === reviewedSkills.length &&
    skills.every((skill, index) => skill === reviewedSkills[index]);
  if (!exactMatch) {
    fail(
      `${MANIFEST_PATH} skills differ from the reviewed lock ${LOCK_PATH}; ` +
        "review the upstream additions/removals/reordering and update the lock deliberately",
    );
  }

  const counts = Object.fromEntries(Object.keys(EXPECTED_COUNTS).map((key) => [key, 0]));
  for (const skill of parsed) counts[skill.category] += 1;
  for (const [category, expected] of Object.entries(EXPECTED_COUNTS)) {
    if (counts[category] !== expected) {
      fail(`expected ${expected} ${category} skills, found ${counts[category]}`);
    }
  }
  if (parsed.length !== 27) fail(`expected 27 promoted skills, found ${parsed.length}`);

  return parsed;
}

async function assertDirectoryInsideCheckout(checkoutRoot, skillPath, manifestEntry) {
  let info;
  try {
    info = await lstat(skillPath);
  } catch (error) {
    fail(`missing skill directory ${JSON.stringify(manifestEntry)}: ${error.message}`);
  }
  if (!info.isDirectory() || info.isSymbolicLink()) {
    fail(`skill path is not a real directory: ${JSON.stringify(manifestEntry)}`);
  }

  const [realCheckout, realSkill] = await Promise.all([realpath(checkoutRoot), realpath(skillPath)]);
  const relative = path.relative(realCheckout, realSkill);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    fail(`skill path escapes the upstream checkout: ${JSON.stringify(manifestEntry)}`);
  }

  async function inspectTree(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) {
        fail(
          `skill ${JSON.stringify(manifestEntry)} contains a symbolic link, which could escape ` +
            `the declared directory: ${path.relative(skillPath, entryPath)}`,
        );
      }
      if (entry.isDirectory()) await inspectTree(entryPath);
      else if (!entry.isFile()) {
        fail(
          `skill ${JSON.stringify(manifestEntry)} contains an unsupported special file: ` +
            path.relative(skillPath, entryPath),
        );
      }
    }
  }
  await inspectTree(skillPath);

  try {
    const skillFile = await stat(path.join(skillPath, "SKILL.md"));
    if (!skillFile.isFile()) fail(`missing SKILL.md in ${JSON.stringify(manifestEntry)}`);
  } catch (error) {
    if (error.message.includes("Upstream sync refused:")) throw error;
    fail(`missing SKILL.md in ${JSON.stringify(manifestEntry)}: ${error.message}`);
  }
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizedFrontmatter(contents, label) {
  const match = /^---\n([\s\S]*?)\n---(?:\n|$)/.exec(contents.replaceAll("\r\n", "\n"));
  if (!match) fail(`${label} has no valid frontmatter`);
  return `${match[1]}\n`;
}

async function relativeFileInventory(root) {
  const files = [];
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(target);
      else if (entry.isFile()) files.push(path.relative(root, target).split(path.sep).join("/"));
    }
  }
  await walk(root);
  return files.sort();
}

async function validateReviewedSnapshot(checkoutRoot, manifestSkills, snapshot, expectedRef) {
  if (snapshot.schemaVersion !== 1) fail(`unsupported snapshot lock schema ${snapshot.schemaVersion}`);
  if (snapshot.upstreamRef !== expectedRef) {
    fail(`snapshot lock was reviewed for ${snapshot.upstreamRef}, not ${expectedRef}`);
  }
  for (const manifestEntry of manifestSkills) {
    const record = snapshot.skills?.[manifestEntry];
    if (!record) fail(`${SNAPSHOT_LOCK_PATH} has no reviewed inventory for ${manifestEntry}`);
    const root = path.join(checkoutRoot, ...manifestEntry.slice(2).split("/"));
    const actualFiles = await relativeFileInventory(root);
    if (JSON.stringify(actualFiles) !== JSON.stringify(record.files)) {
      fail(`support-file inventory drift for ${manifestEntry}; review upstream additions/removals`);
    }
    const frontmatter = normalizedFrontmatter(
      await readFile(path.join(root, "SKILL.md"), "utf8"),
      manifestEntry,
    );
    if (sha256(frontmatter) !== record.upstreamFrontmatterSha256) {
      fail(`frontmatter drift for ${manifestEntry}; review license/metadata/invocation fields`);
    }
  }
}

async function validateAdaptedFrontmatter(skillsRoot, manifestSkills, snapshot) {
  for (const manifestEntry of manifestSkills) {
    const record = snapshot.skills?.[manifestEntry];
    const relative = manifestEntry.slice("./skills/".length);
    const file = path.join(skillsRoot, ...relative.split("/"), "SKILL.md");
    const frontmatter = normalizedFrontmatter(await readFile(file, "utf8"), manifestEntry);
    if (sha256(frontmatter) !== record?.adaptedFrontmatterSha256) {
      fail(`Pi adaptation frontmatter drift for ${manifestEntry}; review license/metadata/invocation fields`);
    }
  }
}

async function replaceDirectoryAtomically(stagedDirectory, destinationDirectory) {
  const parent = path.dirname(destinationDirectory);
  const backup = path.join(parent, `.skills-backup-${randomUUID()}`);
  let hadDestination = false;

  try {
    await access(destinationDirectory, constants.F_OK);
    hadDestination = true;
    await rename(destinationDirectory, backup);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  try {
    await rename(stagedDirectory, destinationDirectory);
  } catch (error) {
    if (hadDestination) await rename(backup, destinationDirectory);
    throw error;
  }

  if (hadDestination) await rm(backup, { recursive: true, force: true });
}

/**
 * Generate the vendored snapshot from an already checked-out upstream tree.
 * This export is intentionally usable by fixture-based tests without network access.
 */
export async function syncFromCheckout({
  checkoutRoot,
  projectRoot = DEFAULT_PROJECT_ROOT,
  actualCommit,
  requestedRef = UPSTREAM_REF,
  repository = UPSTREAM_REPOSITORY,
  commitDate = null,
  adaptSkills = applyPiAdaptations,
}) {
  const manifest = await readJson(path.join(checkoutRoot, MANIFEST_PATH), "upstream plugin manifest");
  const [lock, snapshotLock] = await Promise.all([
    readJson(path.join(projectRoot, LOCK_PATH), "reviewed skills lock"),
    readJson(path.join(projectRoot, SNAPSHOT_LOCK_PATH), "reviewed snapshot lock"),
  ]);
  if (lock.upstreamRef !== requestedRef) {
    fail(
      `skills lock was reviewed for ${JSON.stringify(lock.upstreamRef)}, not requested ref ` +
        JSON.stringify(requestedRef),
    );
  }
  const parsedSkills = validateManifestSkills(manifest.skills, lock.skills);

  const upstreamPackage = await readJson(path.join(checkoutRoot, "package.json"), "upstream package.json");
  if (typeof upstreamPackage.version !== "string" || upstreamPackage.version.length === 0) {
    fail("upstream package.json has no valid version");
  }
  if (manifest.version !== upstreamPackage.version) {
    fail(
      `plugin version ${JSON.stringify(manifest.version)} does not match package version ` +
        JSON.stringify(upstreamPackage.version),
    );
  }
  if (typeof actualCommit !== "string" || !/^[0-9a-f]{40}$/.test(actualCommit)) {
    fail(`actual commit is not a full lowercase SHA-1: ${JSON.stringify(actualCommit)}`);
  }

  for (let index = 0; index < parsedSkills.length; index += 1) {
    const source = path.join(checkoutRoot, ...parsedSkills[index].relativePath.split("/"));
    await assertDirectoryInsideCheckout(checkoutRoot, source, manifest.skills[index]);
  }
  await validateReviewedSnapshot(checkoutRoot, manifest.skills, snapshotLock, requestedRef);

  const licenseSource = path.join(checkoutRoot, "LICENSE");
  try {
    const license = await stat(licenseSource);
    if (!license.isFile()) fail("upstream LICENSE is not a file");
  } catch (error) {
    if (error.message.includes("Upstream sync refused:")) throw error;
    fail(`missing upstream LICENSE: ${error.message}`);
  }

  await mkdir(projectRoot, { recursive: true });
  const stageRoot = await mkdtemp(path.join(projectRoot, ".sync-upstream-"));
  const stagedSkills = path.join(stageRoot, "skills");

  try {
    for (const skill of parsedSkills) {
      const source = path.join(checkoutRoot, ...skill.relativePath.split("/"));
      const destination = path.join(stagedSkills, skill.category, skill.name);
      await mkdir(path.dirname(destination), { recursive: true });
      await cp(source, destination, { recursive: true, force: true, errorOnExist: false });
    }

    await adaptSkills({ skillsRoot: stagedSkills });
    await validateAdaptedFrontmatter(stagedSkills, manifest.skills, snapshotLock);

    const upstreamDirectory = path.join(projectRoot, "upstream");
    await mkdir(upstreamDirectory, { recursive: true });
    await replaceDirectoryAtomically(stagedSkills, path.join(projectRoot, "skills"));

    const metadata = {
      repository,
      ref: requestedRef,
      commit: actualCommit,
      version: upstreamPackage.version,
      promotedSkillsManifest: MANIFEST_PATH,
      skillsLock: LOCK_PATH,
      skillCount: parsedSkills.length,
      categoryCounts: EXPECTED_COUNTS,
      license: "upstream/LICENSE",
      upstreamCommitDate: commitDate,
    };

    const metadataTemporary = path.join(upstreamDirectory, `.UPSTREAM-${randomUUID()}.json`);
    const licenseTemporary = path.join(upstreamDirectory, `.LICENSE-${randomUUID()}`);
    await writeJson(metadataTemporary, metadata);
    await cp(licenseSource, licenseTemporary, { force: true });
    await rename(metadataTemporary, path.join(upstreamDirectory, "UPSTREAM.json"));
    await rename(licenseTemporary, path.join(upstreamDirectory, "LICENSE"));

    return metadata;
  } finally {
    await rm(stageRoot, { recursive: true, force: true });
  }
}

function git(args, options = {}) {
  const result = spawnSync("git", args, {
    cwd: options.cwd,
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.error) fail(`could not run git: ${result.error.message}`);
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || "unknown git error").trim();
    fail(`git ${args[0]} failed: ${detail}`);
  }
  return result.stdout.trim();
}

export async function syncUpstream({ projectRoot = DEFAULT_PROJECT_ROOT } = {}) {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "mattpocock-skills-sync-"));
  const checkoutRoot = path.join(temporaryRoot, "checkout");

  try {
    await mkdir(checkoutRoot);
    git(["init", "--quiet"], { cwd: checkoutRoot });
    git(["config", "core.autocrlf", "false"], { cwd: checkoutRoot });
    git(["config", "core.eol", "lf"], { cwd: checkoutRoot });
    git(["remote", "add", "origin", UPSTREAM_REPOSITORY], { cwd: checkoutRoot });
    git(["fetch", "--quiet", "--depth=1", "origin", UPSTREAM_REF], { cwd: checkoutRoot });
    git(["checkout", "--quiet", "--detach", "FETCH_HEAD"], { cwd: checkoutRoot });

    const actualCommit = git(["rev-parse", "HEAD"], { cwd: checkoutRoot });
    if (actualCommit !== UPSTREAM_REF) {
      fail(`requested ref resolved to unexpected commit ${actualCommit}; expected ${UPSTREAM_REF}`);
    }
    const commitDate = git(["show", "-s", "--format=%cI", "HEAD"], { cwd: checkoutRoot });

    return await syncFromCheckout({
      checkoutRoot,
      projectRoot,
      actualCommit,
      requestedRef: UPSTREAM_REF,
      repository: UPSTREAM_REPOSITORY,
      commitDate,
    });
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  syncUpstream()
    .then((metadata) => {
      console.log(
        `Synced ${metadata.skillCount} promoted skills from ${metadata.commit} ` +
          `(upstream ${metadata.version}).`,
      );
    })
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
