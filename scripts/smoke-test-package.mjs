#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { PROJECT_ROOT, readSkillsLock } from "./package-manifest.mjs";
import { validatePackage } from "./validate-package.mjs";

async function importPiApi() {
  try {
    return await import("@earendil-works/pi-coding-agent");
  } catch (directError) {
    const npmRoot = spawnSync("npm", ["root", "-g"], {
      encoding: "utf8",
      windowsHide: true,
      shell: process.platform === "win32",
    });
    if (npmRoot.status !== 0) {
      throw new Error(
        `Could not locate the installed Pi API (direct import: ${directError.message}; npm root -g failed: ${(npmRoot.stderr || npmRoot.stdout).trim()})`,
      );
    }
    const entry = path.join(
      npmRoot.stdout.trim(),
      "@earendil-works",
      "pi-coding-agent",
      "dist",
      "index.js",
    );
    try {
      return await import(pathToFileURL(entry).href);
    } catch (fallbackError) {
      throw new Error(
        `Could not import the installed Pi API from ${entry}: ${fallbackError.message}`,
      );
    }
  }
}

function skillTag(name) {
  return `<name>${name}</name>`;
}

async function smokeTest() {
  await validatePackage();
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "mattpocock-skills-pi-smoke-"));
  const agentDir = path.join(temporaryRoot, "agent");
  const workspace = path.join(temporaryRoot, "workspace");
  const previousEnvironment = {
    PI_CODING_AGENT_DIR: process.env.PI_CODING_AGENT_DIR,
    HOME: process.env.HOME,
    USERPROFILE: process.env.USERPROFILE,
  };

  try {
    await Promise.all([mkdir(agentDir), mkdir(workspace)]);
    await writeFile(
      path.join(agentDir, "settings.json"),
      `${JSON.stringify(
        {
          packages: [PROJECT_ROOT],
          enableSkillCommands: true,
          extensions: ["-builtin:mcp", "-builtin:codemode", "-builtin:tool-search", "-builtin:llama.cpp"],
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
    process.env.PI_CODING_AGENT_DIR = agentDir;
    process.env.HOME = temporaryRoot;
    process.env.USERPROFILE = temporaryRoot;

    const [{ DefaultResourceLoader, SettingsManager, formatSkillsForPrompt }, lock] =
      await Promise.all([importPiApi(), readSkillsLock()]);
    const settingsManager = SettingsManager.create(workspace, agentDir, { projectTrusted: false });
    assert.equal(settingsManager.getEnableSkillCommands(), true, "skill commands must be enabled");

    const loader = new DefaultResourceLoader({
      cwd: workspace,
      agentDir,
      settingsManager,
      noExtensions: true,
      noPromptTemplates: true,
      noThemes: true,
      noContextFiles: true,
    });
    await loader.reload();
    const { skills, diagnostics } = loader.getSkills();
    assert.deepEqual(diagnostics, [], `Pi skill loader diagnostics: ${JSON.stringify(diagnostics)}`);

    const expectedNames = lock.skills.map((entry) => path.posix.basename(entry)).sort();
    const loadedNames = skills.map((skill) => skill.name).sort();
    assert.deepEqual(loadedNames, expectedNames, "Pi must load exactly the 27 locked package skills");
    for (const skill of skills) {
      assert.equal(skill.sourceInfo.origin, "package", `${skill.name} was not loaded as a package resource`);
      assert.equal(
        path.resolve(skill.sourceInfo.baseDir),
        PROJECT_ROOT,
        `${skill.name} was loaded from an unexpected package root`,
      );
    }

    // Pi's RPC/TUI command registries expose every loaded skill using this native name.
    const commands = skills.map((skill) => `/skill:${skill.name}`);
    assert.equal(new Set(commands).size, 27, "Pi must discover 27 unique /skill:<name> commands");

    const systemPromptSkills = formatSkillsForPrompt(skills, "read");
    const advertised = skills
      .filter((skill) => systemPromptSkills.includes(skillTag(skill.name)))
      .map((skill) => skill.name)
      .sort();
    assert.deepEqual(
      advertised,
      [...lock.invocation.modelInvoked].sort(),
      "system prompt must advertise only the 11 model-invoked skills",
    );
    for (const name of lock.invocation.userInvoked) {
      assert.equal(
        systemPromptSkills.includes(skillTag(name)),
        false,
        `user-invoked skill ${name} leaked into the model-visible skill list`,
      );
    }

    return {
      commands: commands.length,
      advertised: advertised.length,
      hidden: lock.invocation.userInvoked.length,
      temporaryRoot,
    };
  } finally {
    for (const [name, value] of Object.entries(previousEnvironment)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

smokeTest()
  .then(({ commands, advertised, hidden }) => {
    console.log(
      `Pi smoke test passed: ${commands} commands, ${advertised} model-invoked advertised, ${hidden} user-invoked hidden.`,
    );
  })
  .catch((error) => {
    console.error(error.stack ?? error.message);
    process.exitCode = 1;
  });
