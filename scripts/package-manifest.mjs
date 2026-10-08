import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = path.resolve(SCRIPT_DIR, "..");
export const LOCK_PATH = path.join(PROJECT_ROOT, "upstream", "SKILLS.lock.json");
export const PACKAGE_PATH = path.join(PROJECT_ROOT, "package.json");

export async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

export async function readSkillsLock() {
  const lock = await readJson(LOCK_PATH);
  if (lock.schemaVersion !== 2) {
    throw new Error(`Unsupported skills lock schema: ${JSON.stringify(lock.schemaVersion)}`);
  }
  if (!Array.isArray(lock.skills)) throw new Error("Skills lock has no skills array");
  if (!Array.isArray(lock.invocation?.userInvoked)) {
    throw new Error("Skills lock has no userInvoked array");
  }
  if (!Array.isArray(lock.invocation?.modelInvoked)) {
    throw new Error("Skills lock has no modelInvoked array");
  }
  return lock;
}

export function packageSkillPaths(lock) {
  return lock.skills.map((skillPath) => {
    if (typeof skillPath !== "string" || !skillPath.startsWith("./skills/")) {
      throw new Error(`Invalid locked skill path: ${JSON.stringify(skillPath)}`);
    }
    return skillPath;
  });
}

export async function updatePackageManifest() {
  const [manifest, lock] = await Promise.all([readJson(PACKAGE_PATH), readSkillsLock()]);
  const keywords = Array.isArray(manifest.keywords) ? manifest.keywords : [];
  manifest.keywords = [...new Set([...keywords, "pi-package"])];
  manifest.pi = { skills: packageSkillPaths(lock) };
  await writeFile(PACKAGE_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return manifest;
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  updatePackageManifest()
    .then((manifest) => console.log(`Generated ${manifest.pi.skills.length} pi.skills entries from the reviewed lock.`))
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
