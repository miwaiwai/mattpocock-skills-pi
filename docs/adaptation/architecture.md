# 适配架构决策

本文档是本项目已确定适配架构决策的单一文档来源。

## 范围与上游清单

- 本项目是 [`mattpocock/skills`](https://github.com/mattpocock/skills) 正式 promoted skills 的 Pi-native adapter，不是整个上游仓库的镜像。
- 正式技能清单的单一来源是固定上游版本中的 `.claude-plugin/plugin.json` 的 `skills` 数组。不得通过扫描整个 `skills/` 目录推断正式技能。
- 当前目标上游版本预期包含 27 个正式技能；`misc`、`in-progress` 和 `deprecated` 不属于发布范围。
- 上游技能必须以固定 ref 同步，并记录该 ref 最终解析出的精确 commit，以保证来源可追溯。

## 生成模型

- Pi adapter 由可重复的同步和转换流程生成，而不是手工维护 27 份彼此独立的副本。
- 上游正文应尽量保持不变。Pi 特有内容必须能与上游内容区分，并由可重复执行的转换脚本生成。
- `skills/` 是固定上游版本的 vendored 快照，由 `scripts/sync-upstream.mjs` 根据审核 lock 重建；同步在发布快照前必须运行 `scripts/apply-pi-adaptations.mjs`，不得手工扩展发布范围。
- Pi 转换层按文件、精确上游文本和预期出现次数维护规则：用户命令变为 `/skill:<name>`，Claude Code `/clear` 变为 Pi `/new`，operative Skill tool 调用变为读取 system prompt 中已广告的 model-invoked `SKILL.md`。规则缺失、重复或文本漂移时生成失败。
- `package.json` 的显式 `pi.skills` 清单由 `scripts/package-manifest.mjs` 从同一审核 lock 生成，`scripts/validate-package.mjs` 负责检测漂移、禁用语法和 invocation 边界变化。

## Pi 技能加载与调用

- 用户显式调用技能时使用 Pi 原生语法 `/skill:<name>`。
- Pi 的 model-invoked 技能依赖 Pi 广告技能的名称、描述和路径；模型在需要时读取对应的 `SKILL.md` 来加载完整指令。
- 当前 lock 将 16 个技能固定为 user-invoked（保留 `disable-model-invocation: true`），将其余 11 个固定为 model-invoked；无模型 smoke test 使用 Pi resource loader 和 `formatSkillsForPrompt` 验证这一边界。
- 本 adapter 不实现或注册虚假的 “Skill tool”。

## `pi-subagents` 集成边界

- `pi-subagents` 采用方案 A：由用户单独安装，作为需要 subagent 工作流时的前置依赖。
- 本 adapter 不在 `dependencies` 中依赖 `pi-subagents`，不复制其扩展代码，也不注册替代的 `subagent` 工具。
- 本 adapter 不修改 Pi 或 `pi-subagents` 的安装目录，也不修改用户真实的 `~/.pi/agent/settings.json`。
- 共享授权、capability preflight、单一 workflow、async、隔离、durable output、基础设施失败和统一安装错误规则见 [`pi-subagents-contract.md`](pi-subagents-contract.md)。转换层只向确实使用 subagent 的技能或分支注入带标记的最小守卫。
