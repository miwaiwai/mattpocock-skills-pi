import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { PROJECT_ROOT } from "../../scripts/package-manifest.mjs";

const enabled = process.env.PI_RUN_INTEGRATION === "1";
const model = process.env.PI_INTEGRATION_MODEL;

function run(command, args, options = {}) {
  const executable = process.platform === "win32" && command === "pi" ? "pi.cmd" : command;
  const result = spawnSync(executable, args, {
    cwd: options.cwd,
    env: options.env,
    encoding: "utf8",
    windowsHide: true,
    shell: false,
    timeout: options.timeout ?? 180_000,
  });
  if (result.error) throw result.error;
  assert.equal(
    result.status,
    0,
    `[environment missing] ${command} ${args.join(" ")} failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );
  return `${result.stdout}\n${result.stderr}`;
}

test("opt-in: isolated Pi/provider/pi-subagents can load and reason about an adapted workflow", { skip: !enabled }, async (t) => {
  assert.ok(model, "[environment missing] set PI_INTEGRATION_MODEL (for example provider/model-id)");
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "mattpocock-skills-pi-live-"));
  t.after(() => rm(temporaryRoot, { recursive: true, force: true }));
  const agentDir = path.join(temporaryRoot, "agent");
  const workspace = path.join(temporaryRoot, "workspace");
  await Promise.all([mkdir(agentDir), mkdir(workspace)]);
  const sentinel = path.join(temporaryRoot, "outside-agent-settings.json");
  await writeFile(sentinel, "do not modify\n", "utf8");

  const env = {
    ...process.env,
    PI_CODING_AGENT_DIR: agentDir,
    PI_CODING_AGENT_SESSION_DIR: path.join(temporaryRoot, "sessions"),
  };

  // Both installs are deliberately confined to PI_CODING_AGENT_DIR. This test is
  // opt-in because it may use the network and the following Pi call uses a provider.
  run("pi", ["install", "npm:pi-subagents"], { cwd: workspace, env });
  run("pi", ["install", PROJECT_ROOT], { cwd: workspace, env });

  const settings = JSON.parse(await readFile(path.join(agentDir, "settings.json"), "utf8"));
  assert.equal(settings.packages.length, 2);
  assert.equal(await readFile(sentinel, "utf8"), "do not modify\n");

  const output = run(
    "pi",
    [
      "--model",
      model,
      "--no-session",
      "--no-mcp",
      "--print",
      "/skill:research Call subagent with action list and capabilities true, then report whether an executable native researcher exists. Do not launch a child and do not modify files. Also state the durable-output rule and fail-closed behavior from this skill.",
    ],
    { cwd: workspace, env, timeout: 300_000 },
  );
  assert.match(output, /researcher/i, "[environment missing] live pi-subagents capability result was absent");
  assert.match(output, /output|artifact/i, "[Pi adaptation drift] live response omitted durable output");
  assert.match(output, /fail|stop/i, "[Pi adaptation drift] live response omitted fail-closed behavior");
  assert.equal(await readFile(sentinel, "utf8"), "do not modify\n");
});
