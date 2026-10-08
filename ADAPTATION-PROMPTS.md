# Matt Pocock 正式技能的 Pi 适配提示词

本文件包含一组可按顺序交给 Pi 执行的提示词。每个提示词都已经包含完整的通用前缀，可以单独复制到新会话中使用。

## 使用说明

1. 将所有 `<UPSTREAM_REF>` 替换为要同步的上游 tag 或 commit。首次适配可使用分析时固定的提交：

   `f3fc5632f401156837ee3872f14fe33ccf1024ea`

2. 发布 adapter 前，将所有 `<ADAPTER_GIT_URL>` 替换为实际 Git 仓库地址，例如：

   `github.com/your-name/mattpocock-skills-pi`

3. 建议每完成一个步骤后检查测试结果和 diff，确认无误后再由你决定是否提交。
4. 建议在以下边界开启新会话，减少上下文污染：
   - 步骤 0–5 可以在一个会话中完成；
   - 步骤 6、7、8A、8B、8C 分别使用独立会话；
   - 步骤 9 单独使用一个会话；
   - 步骤 10–11 可以在一个会话中完成；
   - 步骤 12 使用全新会话进行独立审查。
5. `pi-subagents` 采用方案 A：用户独立安装，adapter 不捆绑该扩展。

## 执行顺序

1. 步骤 0：初始化和架构决策
2. 步骤 1：上游同步
3. 步骤 2：Pi package manifest
4. 步骤 3：通用技能调用适配
5. 步骤 4：setup、retro 和 handoff
6. 步骤 5：方案 A 的 subagent 运行契约
7. 步骤 6：research
8. 步骤 7：code-review
9. 步骤 8A：grilling 的事实探索分支
10. 步骤 8B：架构扫描与 Design It Twice
11. 步骤 8C：wayfinder
12. 步骤 9：implement-spec
13. 步骤 10：完整验证套件
14. 步骤 11：安装、迁移和更新文档
15. 步骤 12：最终独立审查

---

## 步骤 0：初始化仓库并记录适配决策

```text
你正在 D:/develop/tools/mattpocock-skills-pi 中实现 Matt Pocock 正式技能的 Pi-native 适配包。

基本约束：

1. 上游仓库是 https://github.com/mattpocock/skills。
2. 正式技能清单只能来自上游 `.claude-plugin/plugin.json` 的 `skills` 数组，不能通过扫描整个 `skills/` 猜测。
3. 当前固定上游版本下预期有 27 个正式技能；不得发布 `misc`、`in-progress` 或 `deprecated`。
4. 尽量保持上游技能正文不变。Pi 特有变更必须能够和上游内容区分，并通过可重复的同步/转换脚本生成。
5. `pi-subagents` 使用方案 A：它是用户单独安装的前置依赖。本包不得把 `pi-subagents` 放进 dependencies，不得复制它的扩展代码，也不得注册一个替代的 subagent 工具。
6. 不要直接修改 Pi 或 pi-subagents 的安装目录。
7. 不要修改真实的 `~/.pi/agent/settings.json`。需要安装测试时，使用临时的 `PI_CODING_AGENT_DIR`。
8. 不要执行 git commit、git push、创建 PR、关闭 issue 或修改远程 tracker，除非本提示词明确授权。
9. 不要使用 `git reset --hard`、`git clean` 等破坏性命令。
10. 修改 Pi 包装前，完整阅读当前安装版本的 Pi `docs/skills.md`、`docs/packages.md` 及其相关引用。处理 subagent 工作流时，读取已安装的 `pi-subagents` 技能文档和对应 guide，不要凭印象实现。
11. Windows 是一等支持平台；路径、临时目录、LF 换行和 bash 脚本都要验证。
12. 每一步完成后报告：
    - 修改/创建的文件；
    - 运行的检查及结果；
    - 尚未解决的风险；
    - 下一步需要依赖的输出。

执行适配步骤 0：初始化项目骨架并记录已经确定的架构决策。

任务：

1. 检查当前目录状态。如果还不是 Git 仓库，初始化 Git 仓库；不要创建 commit。
2. 创建最小的项目骨架：
   - package.json
   - README.md
   - LICENSE
   - docs/adaptation/
   - scripts/
   - tests/
   - upstream/
3. package.json 暂时只放基本包信息和 scripts 占位，不要提前声明不确定的文件路径。
4. 在 `docs/adaptation/architecture.md` 记录以下决定：
   - 本项目是 `mattpocock/skills` 正式 promoted skills 的 Pi-native adapter，不是整个上游仓库的镜像；
   - 正式清单的单一来源是上游 `.claude-plugin/plugin.json`；
   - 上游技能以固定 ref 同步；
   - Pi adapter 使用可重复生成，而不是手工维护 27 份独立副本；
   - `pi-subagents` 采用独立安装的方案 A；
   - adapter 本身不依赖、复制或注册 pi-subagents；
   - 用户显式调用使用 `/skill:<name>`；
   - Pi model-invoked 技能通过读取广告出来的 `SKILL.md` 加载，不实现假的 “Skill tool”。
5. 创建 `upstream/UPSTREAM.json` 的格式定义或初始文件，字段至少包括：
   - repository
   - ref
   - commit
   - version
   - promotedSkillsManifest
   - syncedAt
6. 加入适用于 Node、Pi 临时文件、测试临时目录的 `.gitignore`。
7. README 目前只写项目目标、非目标和“尚未完成，请勿安装”的状态说明。
8. 运行 JSON/Markdown 的最小结构检查。

完成标准：

- 项目结构清晰；
- 架构决策有单一文档来源；
- 没有 vendored 技能；
- 没有 pi-subagents 依赖；
- 没有修改用户 Pi 配置。
```

---

## 步骤 1：实现上游同步与正式技能筛选

```text
你正在 D:/develop/tools/mattpocock-skills-pi 中实现 Matt Pocock 正式技能的 Pi-native 适配包。

基本约束：

1. 上游仓库是 https://github.com/mattpocock/skills。
2. 正式技能清单只能来自上游 `.claude-plugin/plugin.json` 的 `skills` 数组，不能通过扫描整个 `skills/` 猜测。
3. 当前固定上游版本下预期有 27 个正式技能；不得发布 `misc`、`in-progress` 或 `deprecated`。
4. 尽量保持上游技能正文不变。Pi 特有变更必须能够和上游内容区分，并通过可重复的同步/转换脚本生成。
5. `pi-subagents` 使用方案 A：它是用户单独安装的前置依赖。本包不得把 `pi-subagents` 放进 dependencies，不得复制它的扩展代码，也不得注册一个替代的 subagent 工具。
6. 不要直接修改 Pi 或 pi-subagents 的安装目录。
7. 不要修改真实的 `~/.pi/agent/settings.json`。需要安装测试时，使用临时的 `PI_CODING_AGENT_DIR`。
8. 不要执行 git commit、git push、创建 PR、关闭 issue 或修改远程 tracker，除非本提示词明确授权。
9. 不要使用 `git reset --hard`、`git clean` 等破坏性命令。
10. 修改 Pi 包装前，完整阅读当前安装版本的 Pi `docs/skills.md`、`docs/packages.md` 及其相关引用。处理 subagent 工作流时，读取已安装的 `pi-subagents` 技能文档和对应 guide，不要凭印象实现。
11. Windows 是一等支持平台；路径、临时目录、LF 换行和 bash 脚本都要验证。
12. 每一步完成后报告：
    - 修改/创建的文件；
    - 运行的检查及结果；
    - 尚未解决的风险；
    - 下一步需要依赖的输出。

执行适配步骤 1：实现可重复的上游同步流程。

固定上游 ref：

<UPSTREAM_REF>

任务：

1. 实现 `scripts/sync-upstream.mjs`。
2. 同步脚本必须：
   - 将上游仓库检出到临时目录，而不是仓库内部的长期嵌套 Git 仓库；
   - checkout 指定 ref；
   - 读取 `.claude-plugin/plugin.json`；
   - 只复制其 `skills` 数组明确列出的技能目录；
   - 保留每个正式技能的所有支持文件，包括 Markdown、scripts、template 和 `agents/openai.yaml`；
   - 拒绝复制路径逃逸、缺失目录和缺失 `SKILL.md`；
   - 清除旧的生成目录后原子性地写入新的 `skills/`；
   - 不复制 `misc`、`in-progress`、`deprecated`；
   - 复制或记录上游 MIT LICENSE；
   - 更新 `upstream/UPSTREAM.json`，记录实际 commit 和上游 package version。
3. 当前固定 ref 下，校验正式技能总数必须是 27：
   - engineering 20；
   - productivity 7。
4. 正式清单发生变化时，脚本必须明确失败并提示人工审核，而不是静默引入或删除技能。可以通过单独的 lock 文件记录已审核清单。
5. 同步脚本必须幂等：连续运行两次，第二次不应产生内容变化。注意 `syncedAt` 等非确定字段不得让正常同步每次都制造 diff；如需记录时间，应设计成不会破坏幂等验证的方式。
6. 加入测试：
   - 只复制 manifest 声明的目录；
   - 缺失技能时报错；
   - 非法路径时报错；
   - 重复技能名时报错；
   - 第二次同步无变化。
7. 不要在这一步做 Pi 文本改写；先保留纯上游快照。
8. 如果网络不可用或指定 ref 不存在，保留当前工作区状态并清楚报告，不得自动换成另一个 ref。

完成标准：

- `npm run sync-upstream` 或等价脚本可从固定 ref 生成正式技能；
- 生成结果与 manifest 一致；
- 27 个技能全部带齐支持文件；
- 不存在非正式技能；
- 同步结果可追溯到精确 commit；
- 重复运行不会产生无意义 diff。
```

---

## 步骤 2：建立 Pi package manifest

```text
你正在 D:/develop/tools/mattpocock-skills-pi 中实现 Matt Pocock 正式技能的 Pi-native 适配包。

基本约束：

1. 上游仓库是 https://github.com/mattpocock/skills。
2. 正式技能清单只能来自上游 `.claude-plugin/plugin.json` 的 `skills` 数组，不能通过扫描整个 `skills/` 猜测。
3. 当前固定上游版本下预期有 27 个正式技能；不得发布 `misc`、`in-progress` 或 `deprecated`。
4. 尽量保持上游技能正文不变。Pi 特有变更必须能够和上游内容区分，并通过可重复的同步/转换脚本生成。
5. `pi-subagents` 使用方案 A：它是用户单独安装的前置依赖。本包不得把 `pi-subagents` 放进 dependencies，不得复制它的扩展代码，也不得注册一个替代的 subagent 工具。
6. 不要直接修改 Pi 或 pi-subagents 的安装目录。
7. 不要修改真实的 `~/.pi/agent/settings.json`。需要安装测试时，使用临时的 `PI_CODING_AGENT_DIR`。
8. 不要执行 git commit、git push、创建 PR、关闭 issue 或修改远程 tracker，除非本提示词明确授权。
9. 不要使用 `git reset --hard`、`git clean` 等破坏性命令。
10. 修改 Pi 包装前，完整阅读当前安装版本的 Pi `docs/skills.md`、`docs/packages.md` 及其相关引用。处理 subagent 工作流时，读取已安装的 `pi-subagents` 技能文档和对应 guide，不要凭印象实现。
11. Windows 是一等支持平台；路径、临时目录、LF 换行和 bash 脚本都要验证。
12. 每一步完成后报告：
    - 修改/创建的文件；
    - 运行的检查及结果；
    - 尚未解决的风险；
    - 下一步需要依赖的输出。

执行适配步骤 2：把同步后的正式技能包装成 Pi package。

任务：

1. 更新 package.json：
   - 添加 `pi-package` keyword；
   - 使用显式 `pi.skills` 数组；
   - 每个正式技能目录单独列出；
   - 不要写成 `./skills` 递归扫描；
   - 不声明 extensions、prompts 或 themes，除非项目实际提供它们；
   - 不添加 `pi-subagents` dependency。
2. `pi.skills` 必须由已审核正式技能 lock 清单生成或校验，避免 package.json 与上游清单漂移。
3. 添加 package 校验脚本，验证：
   - manifest 正好暴露当前锁定的 27 个技能；
   - 每个路径存在并包含 SKILL.md；
   - skill `name` 唯一；
   - skill `name` 与目录名一致；
   - description 非空；
   - 16 个 user-invoked 技能保留 `disable-model-invocation: true`；
   - 11 个 model-invoked 技能没有该禁用标记。
4. 使用临时 `PI_CODING_AGENT_DIR` 做本地包加载 smoke test：
   - 不修改真实用户配置；
   - 验证 Pi 能发现 27 个 `/skill:<name>` 命令；
   - 验证 system prompt 只广告 11 个 model-invoked 技能；
   - 验证 16 个 user-invoked 技能不会出现在模型可自动调用清单中。
5. 如果当前 Pi CLI 没有便于无模型验证的命令，优先使用 Pi 的 resource loader/API 或隔离测试脚本，不要为了测试发起不必要的付费模型请求。
6. 将验证命令加入 package.json scripts。
7. 测试使用的临时目录必须在成功和失败路径上都能清理；不要删除不是测试创建的目录。

完成标准：

- Pi 包只暴露 27 个正式技能；
- user/model invocation 边界与上游一致；
- 不依赖自动目录扫描；
- 不触碰真实用户配置；
- 默认验证不需要调用模型。
```

---

## 步骤 3：实现通用 Pi 文本转换

```text
你正在 D:/develop/tools/mattpocock-skills-pi 中实现 Matt Pocock 正式技能的 Pi-native 适配包。

基本约束：

1. 上游仓库是 https://github.com/mattpocock/skills。
2. 正式技能清单只能来自上游 `.claude-plugin/plugin.json` 的 `skills` 数组，不能通过扫描整个 `skills/` 猜测。
3. 当前固定上游版本下预期有 27 个正式技能；不得发布 `misc`、`in-progress` 或 `deprecated`。
4. 尽量保持上游技能正文不变。Pi 特有变更必须能够和上游内容区分，并通过可重复的同步/转换脚本生成。
5. `pi-subagents` 使用方案 A：它是用户单独安装的前置依赖。本包不得把 `pi-subagents` 放进 dependencies，不得复制它的扩展代码，也不得注册一个替代的 subagent 工具。
6. 不要直接修改 Pi 或 pi-subagents 的安装目录。
7. 不要修改真实的 `~/.pi/agent/settings.json`。需要安装测试时，使用临时的 `PI_CODING_AGENT_DIR`。
8. 不要执行 git commit、git push、创建 PR、关闭 issue 或修改远程 tracker，除非本提示词明确授权。
9. 不要使用 `git reset --hard`、`git clean` 等破坏性命令。
10. 修改 Pi 包装前，完整阅读当前安装版本的 Pi `docs/skills.md`、`docs/packages.md` 及其相关引用。处理 subagent 工作流时，读取已安装的 `pi-subagents` 技能文档和对应 guide，不要凭印象实现。
11. Windows 是一等支持平台；路径、临时目录、LF 换行和 bash 脚本都要验证。
12. 每一步完成后报告：
    - 修改/创建的文件；
    - 运行的检查及结果；
    - 尚未解决的风险；
    - 下一步需要依赖的输出。

执行适配步骤 3：把上游的技能调用语法转换为 Pi-native 语法。

要求通过可重复脚本生成，不要只手工编辑生成后的 skills 文件。创建类似 `scripts/apply-pi-adaptations.mjs` 的转换层，并为每条转换写测试。

需要区分两类内容：

A. 面向用户展示的技能命令：

- `/tdd` 应变为 `/skill:tdd`；
- `/to-spec` 应变为 `/skill:to-spec`；
- `/setup-matt-pocock-skills` 应变为 `/skill:setup-matt-pocock-skills`；
- 其他正式技能同理。

B. 技能内部的 operative 调用：

- 不要简单改成让模型“执行 `/skill:tdd`”；
- Pi 中模型应读取 system prompt 广告出来的 model-invoked 技能位置；
- 将 “Call the Skill tool with X” 转换为明确的 Pi 指令，例如：
  “Read the advertised SKILL.md for the model-invoked skill `X`, then follow it for this phase.”
- 两个技能必须分别加载，例如 grilling 和 domain-modeling；
- 不允许内部调用 user-invoked 技能。

特殊命令：

1. Claude Code 的 `/clear` 转换为 Pi 的 `/new`。
2. Pi 原生 `/compact`、`/fork`、`/resume`、`/new` 保留。
3. 不得错误改写 URL、文件路径、Markdown 相对链接或代码示例中的普通斜杠。
4. `ask-matt` 作为 router，应展示 Pi 命令 `/skill:<name>`，而不是声称它能直接调用 user-invoked 技能。
5. `handoff` 输出的 suggested skills 应使用 `/skill:<name>`。
6. 转换应尽量使用精确、可审查的规则；如果预期原文不存在或出现次数变化，应失败并提示 upstream drift，不能宽泛地全局替换后继续。

加入静态测试，阻止生成结果中重新出现：

- `Call the Skill tool`；
- 独立的 `/setup-matt-pocock-skills`；
- 作为会话命令的 `/clear`。

同时确认允许存在：

- `/skill:...`；
- `/compact`；
- `/new`；
- `/fork`；
- `/resume`。

完成标准：

- 所有正式技能中的用户命令符合 Pi；
- 所有内部技能依赖可以通过 Pi 的 read 机制加载；
- 没有实现额外 Skill 工具；
- 转换脚本幂等且有测试；
- 上游文本漂移会显式失败。
```

---

## 步骤 4：适配 setup、retro 和 handoff

```text
你正在 D:/develop/tools/mattpocock-skills-pi 中实现 Matt Pocock 正式技能的 Pi-native 适配包。

基本约束：

1. 上游仓库是 https://github.com/mattpocock/skills。
2. 正式技能清单只能来自上游 `.claude-plugin/plugin.json` 的 `skills` 数组，不能通过扫描整个 `skills/` 猜测。
3. 当前固定上游版本下预期有 27 个正式技能；不得发布 `misc`、`in-progress` 或 `deprecated`。
4. 尽量保持上游技能正文不变。Pi 特有变更必须能够和上游内容区分，并通过可重复的同步/转换脚本生成。
5. `pi-subagents` 使用方案 A：它是用户单独安装的前置依赖。本包不得把 `pi-subagents` 放进 dependencies，不得复制它的扩展代码，也不得注册一个替代的 subagent 工具。
6. 不要直接修改 Pi 或 pi-subagents 的安装目录。
7. 不要修改真实的 `~/.pi/agent/settings.json`。需要安装测试时，使用临时的 `PI_CODING_AGENT_DIR`。
8. 不要执行 git commit、git push、创建 PR、关闭 issue 或修改远程 tracker，除非本提示词明确授权。
9. 不要使用 `git reset --hard`、`git clean` 等破坏性命令。
10. 修改 Pi 包装前，完整阅读当前安装版本的 Pi `docs/skills.md`、`docs/packages.md` 及其相关引用。处理 subagent 工作流时，读取已安装的 `pi-subagents` 技能文档和对应 guide，不要凭印象实现。
11. Windows 是一等支持平台；路径、临时目录、LF 换行和 bash 脚本都要验证。
12. 每一步完成后报告：
    - 修改/创建的文件；
    - 运行的检查及结果；
    - 尚未解决的风险；
    - 下一步需要依赖的输出。

执行适配步骤 4：处理与 Pi 平台、上下文文件和会话格式直接相关的技能。

重点适配三个技能：

## 1. setup-matt-pocock-skills

调整上下文文件选择规则：

- 已存在 `AGENTS.md` 时，编辑 `AGENTS.md`；
- 否则已存在 `CLAUDE.md` 时，尊重现有项目并编辑 `CLAUDE.md`；
- 两者都不存在时，默认创建 `AGENTS.md`，不再要求用户在两个文件之间选择；
- 如果存在 `AGENTS.override.md`，说明其覆盖关系，避免把配置写进实际不会生效的文件；
- 不要同时创建 `AGENTS.md` 和 `CLAUDE.md`；
- 保留对已有 `## Agent skills` 块的原位更新行为。

## 2. retro

让当前 Pi 会话日志定位使用：

- `$PI_SESSION_FILE`；
- `$PI_SESSION_ID`。

行为要求：

- 当前会话持久化且 `PI_SESSION_FILE` 存在时，优先读取它；
- 不存在时，请用户指定日志或通过 `/session` 获取信息；
- 不要默认递归扫描整个 home 目录；
- 兼容 Windows 路径；
- 读取会话文件前提醒其中可能包含敏感信息，输出中继续执行脱敏。

## 3. handoff

要求：

- Windows 使用 `%TEMP%`/`$TEMP`，Unix 使用 `$TMPDIR` 或 `/tmp`；
- 使用可靠的跨平台临时目录选择；
- suggested skills 写成 `/skill:<name>`；
- 继续执行敏感信息脱敏；
- 输出最终文件的绝对路径；
- 不把 handoff 写入当前项目仓库；
- 不覆盖已有同名 handoff 文件，使用唯一且可识别的名称。

为这些行为增加静态或 fixture 测试。

完成标准：

- 新 Pi 项目默认得到 `AGENTS.md`；
- 已有 Claude 项目不会被破坏；
- retro 可以精确定位 Pi 当前会话；
- handoff 在 Windows 和 Unix 的临时目录策略都有测试。
```

---

## 步骤 5：建立方案 A 的 subagent 运行契约

```text
你正在 D:/develop/tools/mattpocock-skills-pi 中实现 Matt Pocock 正式技能的 Pi-native 适配包。

基本约束：

1. 上游仓库是 https://github.com/mattpocock/skills。
2. 正式技能清单只能来自上游 `.claude-plugin/plugin.json` 的 `skills` 数组，不能通过扫描整个 `skills/` 猜测。
3. 当前固定上游版本下预期有 27 个正式技能；不得发布 `misc`、`in-progress` 或 `deprecated`。
4. 尽量保持上游技能正文不变。Pi 特有变更必须能够和上游内容区分，并通过可重复的同步/转换脚本生成。
5. `pi-subagents` 使用方案 A：它是用户单独安装的前置依赖。本包不得把 `pi-subagents` 放进 dependencies，不得复制它的扩展代码，也不得注册一个替代的 subagent 工具。
6. 不要直接修改 Pi 或 pi-subagents 的安装目录。
7. 不要修改真实的 `~/.pi/agent/settings.json`。需要安装测试时，使用临时的 `PI_CODING_AGENT_DIR`。
8. 不要执行 git commit、git push、创建 PR、关闭 issue 或修改远程 tracker，除非本提示词明确授权。
9. 不要使用 `git reset --hard`、`git clean` 等破坏性命令。
10. 修改 Pi 包装前，完整阅读当前安装版本的 Pi `docs/skills.md`、`docs/packages.md` 及其相关引用。处理 subagent 工作流时，读取已安装的 `pi-subagents` 技能文档和对应 guide，不要凭印象实现。
11. Windows 是一等支持平台；路径、临时目录、LF 换行和 bash 脚本都要验证。
12. 每一步完成后报告：
    - 修改/创建的文件；
    - 运行的检查及结果；
    - 尚未解决的风险；
    - 下一步需要依赖的输出。

执行适配步骤 5：建立所有 subagent 技能共享的 Pi 运行契约，但暂时不要逐个重写复杂工作流。

架构决定：

- `pi-subagents` 是独立安装的前置依赖；
- adapter package 不声明它为 dependency；
- adapter 不复制或注册任何 subagent 扩展；
- 缺少 subagent 工具时必须 fail fast，不得静默切换到其他 CLI 或后台执行方式。

任务：

1. 创建维护者文档 `docs/adaptation/pi-subagents-contract.md`。
2. 列出依赖 subagent 的正式技能：
   - research；
   - code-review；
   - implement-spec；
   - wayfinder；
   - improve-codebase-architecture；
   - codebase-design 的 Design It Twice 分支；
   - grilling 的事实探索分支。
3. 定义运行规则：
   - 显式执行 `/skill:<name>` 且该技能描述明确声明会使用 subagent，可以视为对该技能既定委派流程的授权；
   - 普通请求触发 model-invoked 技能，但用户没有要求 delegation、background、parallel 或 independent review 时，必须先询问授权，或者由父代理直接完成不要求独立上下文的部分；
   - 启动前先调用 subagent capability list；
   - 多步骤或并行工作必须只有一次顶层 workflow 调用；
   - async 为默认；
   - workflow、child launch、extension load 或 child tooling 失败属于基础设施阻塞；
   - 发生基础设施阻塞时停止并报告，不得切换到 `pi -ne`、Claude CLI、Codex CLI 或其他隐式 fallback；
   - mutation 工作必须保持一个 cwd/worktree 一个 writer；
   - reviewer 使用 fresh read-only context；
   - durable output 必须通过 output/artifact 路径绑定，而不是只写在 prompt 中；
   - 父代理保留最终验收、发布和远程变更权限。
4. 定义缺少依赖时的统一提示：
   - 安装命令：`pi install npm:pi-subagents`；
   - 安装后在运行中的 Pi 会话执行 `/reload`，或重启 Pi。
5. 明确 adapter 安装顺序：
   - 先安装 `pi-subagents`；
   - 再安装 adapter。
6. 在每个需要 subagent 的技能中加入最小的 Pi 运行守卫，避免复制整篇契约。
7. 不要给完全不需要 subagent 的技能增加额外上下文。
8. 运行守卫应由转换层生成或应用，不要把生成目录变成不可追溯的手工分叉。

完成标准：

- 方案 A 被代码、文档和技能指令一致表达；
- 缺少依赖时有清晰错误；
- 不存在隐式 fallback；
- 不存在重复注册 pi-subagents 的可能；
- 不需要 subagent 的技能没有额外常驻负担。
```

---

## 步骤 6：适配 research

```text
你正在 D:/develop/tools/mattpocock-skills-pi 中实现 Matt Pocock 正式技能的 Pi-native 适配包。

基本约束：

1. 上游仓库是 https://github.com/mattpocock/skills。
2. 正式技能清单只能来自上游 `.claude-plugin/plugin.json` 的 `skills` 数组，不能通过扫描整个 `skills/` 猜测。
3. 当前固定上游版本下预期有 27 个正式技能；不得发布 `misc`、`in-progress` 或 `deprecated`。
4. 尽量保持上游技能正文不变。Pi 特有变更必须能够和上游内容区分，并通过可重复的同步/转换脚本生成。
5. `pi-subagents` 使用方案 A：它是用户单独安装的前置依赖。本包不得把 `pi-subagents` 放进 dependencies，不得复制它的扩展代码，也不得注册一个替代的 subagent 工具。
6. 不要直接修改 Pi 或 pi-subagents 的安装目录。
7. 不要修改真实的 `~/.pi/agent/settings.json`。需要安装测试时，使用临时的 `PI_CODING_AGENT_DIR`。
8. 不要执行 git commit、git push、创建 PR、关闭 issue 或修改远程 tracker，除非本提示词明确授权。
9. 不要使用 `git reset --hard`、`git clean` 等破坏性命令。
10. 修改 Pi 包装前，完整阅读当前安装版本的 Pi `docs/skills.md`、`docs/packages.md` 及其相关引用。处理 subagent 工作流时，读取已安装的 `pi-subagents` 技能文档和对应 guide，不要凭印象实现。
11. Windows 是一等支持平台；路径、临时目录、LF 换行和 bash 脚本都要验证。
12. 每一步完成后报告：
    - 修改/创建的文件；
    - 运行的检查及结果；
    - 尚未解决的风险；
    - 下一步需要依赖的输出。

执行适配步骤 6：将 research 技能改造成符合 Pi 和 pi-subagents 契约的后台研究流程。

开始前完整读取：

- `research/SKILL.md`；
- `docs/adaptation/pi-subagents-contract.md`；
- 已安装的 pi-subagents 技能文档；
- pi-subagents 关于 async、durable output、validation 和 error handling 的 guide。

运行语义：

1. 用户显式执行 `/skill:research`，或明确要求“委派给后台代理研究”，视为 delegation 授权。
2. 普通“帮我研究”请求只是自动触发该技能时，如果要启动 child，先向用户确认。
3. 启动前检查 subagent 能力；缺失时停止并给出独立安装命令。
4. 使用一个有界后台 child，不要启动多代理仪式。
5. 子代理任务必须包含：
   - 研究问题；
   - 当前 repo/cwd；
   - 只使用一手来源；
   - 每个事实如何引用；
   - 输出文件的目标位置；
   - 完成标准；
   - 缺少来源或权限时停止并报告。
6. durable output 必须绑定到明确文件或 artifact。
7. 如果 repo 已有研究笔记约定，使用该约定；没有时选择稳定位置并说明。
8. 子代理完成时，父代理验证：
   - 文件存在；
   - 引用可识别；
   - 关键事实确实来自一手来源；
   - 没有把未验证推断写成事实。
9. 普通交互会话中，启动 async child 后让出控制，等待 Pi 原生完成通知；不要通过轮询模拟等待。
10. child 或 extension 失败时停止并报告，不得切换到外部 CLI。
11. 不要仅仅在提示词里要求 child 保存文件；必须使用 pi-subagents 支持的 durable output 绑定，并返回实际 output reference 或 artifact path。

为以下情况增加测试或 fixture：

- 缺少 subagent；
- 未获得 delegation 授权；
- 成功绑定 Markdown 输出；
- child 没有产生文件；
- 输出存在但没有引用。

完成标准：

- research 保持上游的一手来源和文件产出语义；
- 后台行为符合 Pi；
- 没有不受追踪的文件输出；
- 没有隐式 fallback。
```

---

## 步骤 7：适配 code-review

```text
你正在 D:/develop/tools/mattpocock-skills-pi 中实现 Matt Pocock 正式技能的 Pi-native 适配包。

基本约束：

1. 上游仓库是 https://github.com/mattpocock/skills。
2. 正式技能清单只能来自上游 `.claude-plugin/plugin.json` 的 `skills` 数组，不能通过扫描整个 `skills/` 猜测。
3. 当前固定上游版本下预期有 27 个正式技能；不得发布 `misc`、`in-progress` 或 `deprecated`。
4. 尽量保持上游技能正文不变。Pi 特有变更必须能够和上游内容区分，并通过可重复的同步/转换脚本生成。
5. `pi-subagents` 使用方案 A：它是用户单独安装的前置依赖。本包不得把 `pi-subagents` 放进 dependencies，不得复制它的扩展代码，也不得注册一个替代的 subagent 工具。
6. 不要直接修改 Pi 或 pi-subagents 的安装目录。
7. 不要修改真实的 `~/.pi/agent/settings.json`。需要安装测试时，使用临时的 `PI_CODING_AGENT_DIR`。
8. 不要执行 git commit、git push、创建 PR、关闭 issue 或修改远程 tracker，除非本提示词明确授权。
9. 不要使用 `git reset --hard`、`git clean` 等破坏性命令。
10. 修改 Pi 包装前，完整阅读当前安装版本的 Pi `docs/skills.md`、`docs/packages.md` 及其相关引用。处理 subagent 工作流时，读取已安装的 `pi-subagents` 技能文档和对应 guide，不要凭印象实现。
11. Windows 是一等支持平台；路径、临时目录、LF 换行和 bash 脚本都要验证。
12. 每一步完成后报告：
    - 修改/创建的文件；
    - 运行的检查及结果；
    - 尚未解决的风险；
    - 下一步需要依赖的输出。

执行适配步骤 7：将 code-review 的 Standards/Spec 双轴评审映射到 Pi workflow。

开始前完整读取：

- `code-review/SKILL.md`；
- `docs/adaptation/pi-subagents-contract.md`；
- pi-subagents 关于 workflows、parallel review、fresh context、acceptance 和 durable output 的文档。

保留上游核心语义：

- Standards 和 Spec 是两个独立轴；
- 两个 reviewer 不能污染彼此上下文；
- 最终不得把两个轴合并排序；
- 缺少 spec 时跳过 Spec 轴并明确说明。

Pi 适配要求：

1. 显式 `/skill:code-review` 视为对技能描述中并行独立 reviewer 的授权。
2. 自动触发时，如果用户只说普通“review”，在启动 subagents 前确认授权。
3. 父代理先完成：
   - fixed point 校验；
   - diff 非空校验；
   - commit list；
   - spec source 查找；
   - standards source 查找。
4. 在这些前置条件失败时，不得启动 reviewer。
5. 有两个轴时：
   - 使用一次顶层 workflow；
   - workflow 内并行启动两个 fresh、read-only reviewer；
   - workflow 使用 async；
   - 不允许 reviewer 修改文件。
6. 只有 Standards 轴时，可以启动单个有界 reviewer，不要伪造第二个 lane。
7. Standards reviewer prompt 必须包含：
   - 精确 diff 命令；
   - commit list；
   - standards 文件路径；
   - 完整 smell baseline；
   - 400 words 限制。
8. Spec reviewer prompt 必须包含：
   - 精确 diff 命令；
   - commit list；
   - spec 路径或内容；
   - 400 words 限制。
9. 为两个报告绑定 durable output 或清晰的结构化 workflow 输出。
10. 父代理只做轻度清理，然后分别输出：
    - `## Standards`；
    - `## Spec`。
11. 保留每轴 finding 数和每轴最严重问题；不得选跨轴“总冠军”。
12. workflow 基础设施失败时停止，报告 run/worktree/cwd/ref 状态，不得由父代理静默重跑为普通 review。
13. 最终验收由父代理负责；child 返回成功状态不是审查正确性的充分证据。

测试：

- 非法 fixed point；
- 空 diff；
- 无 spec；
- 双轴并行；
- reviewer 保持只读；
- 聚合不交叉排序；
- 某个 lane 失败时整体不伪装成功。

完成标准：

- 双轴上下文隔离；
- 只有一次顶层并行 workflow；
- 输出结构与上游一致；
- Pi 的 async 和失败语义正确。
```

---

## 步骤 8A：适配 grilling 的事实探索分支

```text
你正在 D:/develop/tools/mattpocock-skills-pi 中实现 Matt Pocock 正式技能的 Pi-native 适配包。

基本约束：

1. 上游仓库是 https://github.com/mattpocock/skills。
2. 正式技能清单只能来自上游 `.claude-plugin/plugin.json` 的 `skills` 数组，不能通过扫描整个 `skills/` 猜测。
3. 当前固定上游版本下预期有 27 个正式技能；不得发布 `misc`、`in-progress` 或 `deprecated`。
4. 尽量保持上游技能正文不变。Pi 特有变更必须能够和上游内容区分，并通过可重复的同步/转换脚本生成。
5. `pi-subagents` 使用方案 A：它是用户单独安装的前置依赖。本包不得把 `pi-subagents` 放进 dependencies，不得复制它的扩展代码，也不得注册一个替代的 subagent 工具。
6. 不要直接修改 Pi 或 pi-subagents 的安装目录。
7. 不要修改真实的 `~/.pi/agent/settings.json`。需要安装测试时，使用临时的 `PI_CODING_AGENT_DIR`。
8. 不要执行 git commit、git push、创建 PR、关闭 issue 或修改远程 tracker，除非本提示词明确授权。
9. 不要使用 `git reset --hard`、`git clean` 等破坏性命令。
10. 修改 Pi 包装前，完整阅读当前安装版本的 Pi `docs/skills.md`、`docs/packages.md` 及其相关引用。处理 subagent 工作流时，读取已安装的 `pi-subagents` 技能文档和对应 guide，不要凭印象实现。
11. Windows 是一等支持平台；路径、临时目录、LF 换行和 bash 脚本都要验证。
12. 每一步完成后报告：
    - 修改/创建的文件；
    - 运行的检查及结果；
    - 尚未解决的风险；
    - 下一步需要依赖的输出。

执行适配步骤 8A：适配 grilling 中“查事实”的 subagent 分支。

开始前读取：

- `grilling/SKILL.md`；
- `docs/adaptation/pi-subagents-contract.md`；
- pi-subagents 关于单 child、async 和 read-only scout 的指导。

保留上游设计树、frontier 和按轮提问的行为，不要把整个 grilling 改写成多代理流程。

要求：

1. 用户决策仍由父代理直接向用户提问。
2. 能通过父代理已有 read/bash 等工具快速确认的本地事实，由父代理直接查，不要为了“有 subagent”而委派。
3. 只有以下情况才考虑事实探索 child：
   - 用户明确授权 background/delegation；
   - 调查与当前提问可以独立并行；
   - 独立上下文能带来实际收益。
4. 如果 grilling 是自动触发且没有 delegation 授权，不得自行启动 child。
5. 事实探索 child 必须是 read-only scout，不得修改项目。
6. scout 运行时：
   - 只阻塞依赖该事实的问题；
   - 其他 frontier 问题继续向用户提出；
   - 不通过轮询等待。
7. scout 失败时，将对应事实标为未解决并报告，不得编造答案。
8. 不改变“事实是代理的责任、决策是用户的责任”这一原则。
9. 如果没有启动 child 的授权，父代理仍应尽力使用自己的工具查明事实；不能把本可查明的事实甩给用户。

加入测试或文本验收，确保：

- 普通 grilling 不会无条件启动 subagent；
- 已授权的独立事实调查可以异步进行；
- 用户决策不会被 child 代答；
- child 不具备 mutation 权限。
```

---

## 步骤 8B：适配架构扫描与 Design It Twice

```text
你正在 D:/develop/tools/mattpocock-skills-pi 中实现 Matt Pocock 正式技能的 Pi-native 适配包。

基本约束：

1. 上游仓库是 https://github.com/mattpocock/skills。
2. 正式技能清单只能来自上游 `.claude-plugin/plugin.json` 的 `skills` 数组，不能通过扫描整个 `skills/` 猜测。
3. 当前固定上游版本下预期有 27 个正式技能；不得发布 `misc`、`in-progress` 或 `deprecated`。
4. 尽量保持上游技能正文不变。Pi 特有变更必须能够和上游内容区分，并通过可重复的同步/转换脚本生成。
5. `pi-subagents` 使用方案 A：它是用户单独安装的前置依赖。本包不得把 `pi-subagents` 放进 dependencies，不得复制它的扩展代码，也不得注册一个替代的 subagent 工具。
6. 不要直接修改 Pi 或 pi-subagents 的安装目录。
7. 不要修改真实的 `~/.pi/agent/settings.json`。需要安装测试时，使用临时的 `PI_CODING_AGENT_DIR`。
8. 不要执行 git commit、git push、创建 PR、关闭 issue 或修改远程 tracker，除非本提示词明确授权。
9. 不要使用 `git reset --hard`、`git clean` 等破坏性命令。
10. 修改 Pi 包装前，完整阅读当前安装版本的 Pi `docs/skills.md`、`docs/packages.md` 及其相关引用。处理 subagent 工作流时，读取已安装的 `pi-subagents` 技能文档和对应 guide，不要凭印象实现。
11. Windows 是一等支持平台；路径、临时目录、LF 换行和 bash 脚本都要验证。
12. 每一步完成后报告：
    - 修改/创建的文件；
    - 运行的检查及结果；
    - 尚未解决的风险；
    - 下一步需要依赖的输出。

执行适配步骤 8B：适配 improve-codebase-architecture 和 codebase-design 的 subagent 分支。

开始前完整读取：

- `improve-codebase-architecture/SKILL.md`；
- `codebase-design/SKILL.md`；
- `codebase-design/DESIGN-IT-TWICE.md`；
- `docs/adaptation/pi-subagents-contract.md`；
- pi-subagents 关于 parallel read-only review、async workflow 和 failure handling 的指导。

## improve-codebase-architecture

1. 显式执行 `/skill:improve-codebase-architecture` 时，技能描述已经声明会扫描代码库，可视为对一个 read-only scout 的授权。
2. 使用一个代码库扫描 scout，不要创建多个重复扫描代理。
3. scout 只报告摩擦、路径、证据和 deepening candidates，不修改代码。
4. 父代理负责生成 HTML 报告、向用户展示候选项并继续交互。
5. 用户选择候选项后，再加载 grilling 和 domain-modeling。
6. 不要在用户选择前提出具体新接口。
7. 报告中的每个候选项必须能追溯到 scout 提供的文件或代码证据。

## codebase-design / Design It Twice

1. 只有用户明确要探索多个替代接口，或显式授权该分支时，才启动并行设计。
2. 使用一次顶层 async workflow。
3. workflow 中启动至少三个 fresh、read-only designer。
4. 每个 designer 必须有不同约束，例如：
   - 最小接口；
   - 最强 locality；
   - 最少迁移成本；
   - 最清晰 seam。
5. 每个 designer 的 prompt 都包含：
   - 技术 brief；
   - 相关文件；
   - deep-module 术语；
   - 项目 GLOSSARY 术语；
   - 预期输出格式。
6. designer 不修改代码。
7. 父代理对方案按 depth、locality、seam placement 进行比较，不简单投票。
8. workflow 失败时停止并报告，不得悄悄只保留父代理自己的第一个设计。
9. 不同 designer 的任务必须在设计约束上真正不同，不能只是编号不同的重复 prompt。

为两个技能补充缺少 subagent、未授权、正常并行和某 lane 失败的测试。

完成标准：

- 扫描阶段只有一个 read-only scout；
- 多方案设计只有一次顶层 workflow；
- designer 相互独立且不修改代码；
- 父代理保留比较与最终决策权。
```

---

## 步骤 8C：适配 wayfinder

```text
你正在 D:/develop/tools/mattpocock-skills-pi 中实现 Matt Pocock 正式技能的 Pi-native 适配包。

基本约束：

1. 上游仓库是 https://github.com/mattpocock/skills。
2. 正式技能清单只能来自上游 `.claude-plugin/plugin.json` 的 `skills` 数组，不能通过扫描整个 `skills/` 猜测。
3. 当前固定上游版本下预期有 27 个正式技能；不得发布 `misc`、`in-progress` 或 `deprecated`。
4. 尽量保持上游技能正文不变。Pi 特有变更必须能够和上游内容区分，并通过可重复的同步/转换脚本生成。
5. `pi-subagents` 使用方案 A：它是用户单独安装的前置依赖。本包不得把 `pi-subagents` 放进 dependencies，不得复制它的扩展代码，也不得注册一个替代的 subagent 工具。
6. 不要直接修改 Pi 或 pi-subagents 的安装目录。
7. 不要修改真实的 `~/.pi/agent/settings.json`。需要安装测试时，使用临时的 `PI_CODING_AGENT_DIR`。
8. 不要执行 git commit、git push、创建 PR、关闭 issue 或修改远程 tracker，除非本提示词明确授权。
9. 不要使用 `git reset --hard`、`git clean` 等破坏性命令。
10. 修改 Pi 包装前，完整阅读当前安装版本的 Pi `docs/skills.md`、`docs/packages.md` 及其相关引用。处理 subagent 工作流时，读取已安装的 `pi-subagents` 技能文档和对应 guide，不要凭印象实现。
11. Windows 是一等支持平台；路径、临时目录、LF 换行和 bash 脚本都要验证。
12. 每一步完成后报告：
    - 修改/创建的文件；
    - 运行的检查及结果；
    - 尚未解决的风险；
    - 下一步需要依赖的输出。

执行适配步骤 8C：适配 wayfinder 的并行研究和 tracker 副作用。

开始前完整读取：

- `wayfinder/SKILL.md`；
- `research/SKILL.md`；
- tracker 配置模板；
- `docs/adaptation/pi-subagents-contract.md`；
- pi-subagents 关于动态 workflow、async、durable output 和失败恢复的指导。

保留上游核心概念：

- destination；
- shared map；
- decision tickets；
- frontier；
- fog of war；
- HITL/AFK；
- research/prototype/grilling ticket 类型。

Pi 适配要求：

1. 显式 `/skill:wayfinder` 可以视为对其已声明 subagent 流程的授权。
2. 启动任何 child 前检查 pi-subagents 能力。
3. 多个 ready research tickets 必须通过一次顶层 async workflow 并行启动，不能从父代理分别发出多个无关联顶层调用。
4. 每个 research child：
   - 只处理一个 ticket；
   - 加载 research skill；
   - 使用一手来源；
   - 产出 durable Markdown；
   - 不代替用户处理 HITL ticket。
5. HITL ticket 永远不能由 child 假装用户回答。
6. tracker 可能被其他会话并发修改；每次写入前重新读取 ticket 状态和 blocking edges。
7. 以下行为属于远程副作用，除非用户明确授权，不得执行：
   - git push；
   - 创建、编辑或关闭远程 issue；
   - 分配 assignee；
   - 创建或修改 PR/MR。
8. 未授权时：
   - 可以生成拟议变更和本地 artifact；
   - 必须向用户展示待执行远程操作；
   - 等待确认。
9. 禁止把缺少远程权限当成可以静默切换到另一个 tracker 的理由。
10. child 或 workflow 失败时保持 ticket 未解决，并记录可恢复状态。
11. 不要自动把 wayfinder 直接接到 implement；仍然通过 `/skill:to-spec` 收束。
12. workflow 输出必须能把每个 child artifact 映射回对应 ticket identity。

测试：

- 两个无依赖 research ticket 并行；
- HITL ticket 不被 child 处理；
- tracker 并发变化后重新计算 frontier；
- 未授权时不 push、不改远程 issue；
- 一个 research lane 失败时 map 不被错误标为完成。

完成标准：

- frontier 调度正确；
- HITL/AFK 边界没有被破坏；
- 远程副作用有独立授权门；
- 失败 ticket 保持可恢复状态。
```

---

## 步骤 9：适配 implement-spec

> 这是风险最高的一步，建议在新会话中单独执行。

```text
你正在 D:/develop/tools/mattpocock-skills-pi 中实现 Matt Pocock 正式技能的 Pi-native 适配包。

基本约束：

1. 上游仓库是 https://github.com/mattpocock/skills。
2. 正式技能清单只能来自上游 `.claude-plugin/plugin.json` 的 `skills` 数组，不能通过扫描整个 `skills/` 猜测。
3. 当前固定上游版本下预期有 27 个正式技能；不得发布 `misc`、`in-progress` 或 `deprecated`。
4. 尽量保持上游技能正文不变。Pi 特有变更必须能够和上游内容区分，并通过可重复的同步/转换脚本生成。
5. `pi-subagents` 使用方案 A：它是用户单独安装的前置依赖。本包不得把 `pi-subagents` 放进 dependencies，不得复制它的扩展代码，也不得注册一个替代的 subagent 工具。
6. 不要直接修改 Pi 或 pi-subagents 的安装目录。
7. 不要修改真实的 `~/.pi/agent/settings.json`。需要安装测试时，使用临时的 `PI_CODING_AGENT_DIR`。
8. 不要执行 git commit、git push、创建 PR、关闭 issue 或修改远程 tracker，除非本提示词明确授权。
9. 不要使用 `git reset --hard`、`git clean` 等破坏性命令。
10. 修改 Pi 包装前，完整阅读当前安装版本的 Pi `docs/skills.md`、`docs/packages.md` 及其相关引用。处理 subagent 工作流时，读取已安装的 `pi-subagents` 技能文档和对应 guide，不要凭印象实现。
11. Windows 是一等支持平台；路径、临时目录、LF 换行和 bash 脚本都要验证。
12. 每一步完成后报告：
    - 修改/创建的文件；
    - 运行的检查及结果；
    - 尚未解决的风险；
    - 下一步需要依赖的输出。

执行适配步骤 9：将 implement-spec 改造成 Pi-native 的受控 task-graph workflow。

这是本项目风险最高的适配。开始前完整阅读：

- `implement-spec/SKILL.md`；
- `tdd/SKILL.md`；
- `code-review/SKILL.md`；
- `docs/adaptation/pi-subagents-contract.md`；
- pi-subagents workflows guide；
- pi-subagents multi-lane/worktree guide；
- pi-subagents review-and-validation guide；
- pi-subagents constraints/error-handling guide。

不要在没有理解现有 Pi workflow API 的情况下凭空设计语法。

授权边界：

- 用户显式执行 `/skill:implement-spec`，视为授权使用该技能描述中的 implementer、reviewer 和受控 worktree 工作流；
- 该授权不自动包含 git push、创建 PR、关闭远程 issue 或其他远程写入；远程副作用仍需单独确认。

实现要求：

## 1. 前置解析

父代理先读取 spec、tickets 和 blocking edges，构建 task graph。

必须验证：

- ticket identity 唯一；
- blocker 存在；
- 图无环；
- 至少有一个 ready frontier；
- 每个 ticket 有完成标准；
- integration base/ref 明确。

前置验证失败时，不得启动 child。

## 2. 一次顶层 workflow

- 整个复杂委派流程使用一次顶层 async workflow；
- 不允许父代理为每个 ticket 发出互不关联的顶层调用；
- 使用动态 frontier 或受控 lanes；
- 每个 ticket 使用稳定 key 和清晰 label；
- workflow 状态必须能够识别 completed、failed、blocked、ready；
- workflow 脚本中的每个已启动 run promise 都必须被直接 await、Promise.all 或 Promise.race 观察，不能遗留无人接收的运行。

## 3. Worktree 隔离

- 每个 mutation ticket 使用独立 worktree/branch；
- 一个 cwd/worktree 只有一个 writer；
- 不允许两个实现代理同时写同一 worktree；
- 不使用 `git reset --hard` 修正错误 base；
- base 错误时停止、报告并重新创建受控 worktree；
- 记录每个 lane 的 repo、cwd、branch、base ref；
- 分配 worktree 前验证源工作区状态，保留已有用户修改。

## 4. Implementer

每个 implementer prompt 必须包含：

- ticket objective；
- spec/ticket 的 context pointer；
- worktree/cwd/ref；
- 允许修改的范围；
- 不允许修改的范围；
- TDD 技能的绝对 SKILL.md 路径；
- 测试/验收命令；
- 预期输出；
- 停止并求助的条件。

implementer 必须先读取 tdd skill，再以 vertical slice 工作。

## 5. 集成

- 集成分支只有一个 integration owner；
- worker 不直接互相 merge；
- 完成 lane 必须提供 diff、测试结果和 commit/ref 证据；
- integration owner 在合并前验证 ticket acceptance；
- 合并冲突进入明确的 blocked 状态，不得由多个 writer 同时解决；
- frontier 只在成功集成后重新计算。

## 6. 最终 review

- 所有 tickets 集成后运行适配后的 code-review；
- Standards 和 Spec reviewer 使用 fresh read-only context；
- review 发现的问题进入单独的 fix lane；
- fix lane 完成后重新运行相关验证；
- 不允许“review 启动失败”被记录成 review passed。

## 7. 远程副作用

以下操作需要用户明确授权：

- push integration branch；
- 创建或更新 PR/MR；
- 将 draft 标为 ready；
- 关闭 tickets；
- 修改远程 labels/assignees。

没有授权时，只报告：

- integration branch；
- 本地 commits；
- 测试结果；
- 建议执行的远程操作。

## 8. 清理

- 只清理 workflow 自己创建且已经安全集成的 worktree；
- 有未集成改动、失败 lane 或未知状态时不得删除；
- 清理前生成计划并验证；
- 报告残留 worktree 和恢复方式。

## 9. 基础设施失败

任何 workflow、child、extension、worktree 或 tooling 初始化失败：

- 立即停止新 lane；
- 报告 run id、cwd、branch、ref、worktree 和 partial diff；
- 不切换到外部 CLI；
- 不让父代理静默接管全部实现；
- 只允许明确的同协议重试，或等待用户批准新的执行方式。

至少建立以下 fixture：

1. 两个无依赖 ticket 并行；
2. 第三个 ticket 等待前两个完成；
3. 一个实现 lane 失败；
4. 一个测试失败；
5. 合并冲突；
6. final review 发现问题后进入 fix lane；
7. 未授权时不 push、不开 PR、不关 issue；
8. cleanup 保留有未集成改动的 worktree。

完成标准：

- task graph frontier 正确；
- worktree writer 隔离正确；
- 只有一个顶层 workflow；
- final review 使用 fresh context；
- 远程副作用有独立授权门；
- 失败状态可恢复且不会丢失工作。
```

---

## 步骤 10：建立完整验证套件

```text
你正在 D:/develop/tools/mattpocock-skills-pi 中实现 Matt Pocock 正式技能的 Pi-native 适配包。

基本约束：

1. 上游仓库是 https://github.com/mattpocock/skills。
2. 正式技能清单只能来自上游 `.claude-plugin/plugin.json` 的 `skills` 数组，不能通过扫描整个 `skills/` 猜测。
3. 当前固定上游版本下预期有 27 个正式技能；不得发布 `misc`、`in-progress` 或 `deprecated`。
4. 尽量保持上游技能正文不变。Pi 特有变更必须能够和上游内容区分，并通过可重复的同步/转换脚本生成。
5. `pi-subagents` 使用方案 A：它是用户单独安装的前置依赖。本包不得把 `pi-subagents` 放进 dependencies，不得复制它的扩展代码，也不得注册一个替代的 subagent 工具。
6. 不要直接修改 Pi 或 pi-subagents 的安装目录。
7. 不要修改真实的 `~/.pi/agent/settings.json`。需要安装测试时，使用临时的 `PI_CODING_AGENT_DIR`。
8. 不要执行 git commit、git push、创建 PR、关闭 issue 或修改远程 tracker，除非本提示词明确授权。
9. 不要使用 `git reset --hard`、`git clean` 等破坏性命令。
10. 修改 Pi 包装前，完整阅读当前安装版本的 Pi `docs/skills.md`、`docs/packages.md` 及其相关引用。处理 subagent 工作流时，读取已安装的 `pi-subagents` 技能文档和对应 guide，不要凭印象实现。
11. Windows 是一等支持平台；路径、临时目录、LF 换行和 bash 脚本都要验证。
12. 每一步完成后报告：
    - 修改/创建的文件；
    - 运行的检查及结果；
    - 尚未解决的风险；
    - 下一步需要依赖的输出。

执行适配步骤 10：建立完整的静态、资源加载和行为验证套件。

测试层次：

## A. 清单测试

验证：

- 正式技能与上游锁定 manifest 完全一致；
- 当前基线为 27；
- engineering 20；
- productivity 7；
- user-invoked 16；
- model-invoked 11；
- 不包含 misc/in-progress/deprecated。

## B. Frontmatter 测试

验证：

- name 合法且唯一；
- description 非空；
- name 与目录一致；
- disable-model-invocation 与上游一致；
- 不意外修改 license/metadata 等字段。

## C. 文件完整性

验证：

- 所有 Markdown 相对链接存在；
- 所有引用的 template/script 存在；
- 上游正式技能支持文件未丢失；
- Shell 脚本使用 LF；
- Windows 路径不会破坏测试。

## D. Pi 资源加载

使用隔离的临时 `PI_CODING_AGENT_DIR` 验证：

- package 可以加载；
- 27 个 `/skill:<name>` 命令存在；
- 只有 11 个技能进入 model-invoked 列表；
- 没有 collision；
- 没有 missing path warning；
- 不修改真实用户配置。

## E. 文本适配

拒绝以下残留：

- operative `Call the Skill tool`；
- 旧的用户技能命令 `/tdd`、`/to-spec` 等；
- Claude Code 会话命令 `/clear`；
- 声称 adapter 会自动安装 pi-subagents；
- 外部 CLI fallback 指令。

测试不得误报 URL、普通文件路径、引用上游原文的维护者文档或明确标注为反例的 fixture。

## F. 方案 A 检查

验证：

- package.json 没有 pi-subagents dependency；
- package 没有复制 pi-subagents extension；
- README 明确独立安装；
- subagent 技能包含缺失依赖时的 fail-fast 行为。

## G. 行为 fixture

覆盖：

- setup；
- handoff；
- retro；
- research；
- code-review；
- Design It Twice；
- wayfinder research frontier；
- implement-spec task graph。

将测试分成：

- 默认 CI 可运行的无模型测试；
- 需要真实 Pi/provider/pi-subagents 的 opt-in integration tests。

真实 provider 测试不得默认在普通 `npm test` 中产生费用。

完成标准：

- 一条默认检查命令可运行所有无模型验证；
- opt-in 集成测试有清晰说明；
- 测试失败信息能指出是 upstream drift、Pi adaptation drift 还是环境缺失；
- 测试不会读写真实用户 Pi 配置。
```

---

## 步骤 11：编写安装、迁移和更新文档

```text
你正在 D:/develop/tools/mattpocock-skills-pi 中实现 Matt Pocock 正式技能的 Pi-native 适配包。

基本约束：

1. 上游仓库是 https://github.com/mattpocock/skills。
2. 正式技能清单只能来自上游 `.claude-plugin/plugin.json` 的 `skills` 数组，不能通过扫描整个 `skills/` 猜测。
3. 当前固定上游版本下预期有 27 个正式技能；不得发布 `misc`、`in-progress` 或 `deprecated`。
4. 尽量保持上游技能正文不变。Pi 特有变更必须能够和上游内容区分，并通过可重复的同步/转换脚本生成。
5. `pi-subagents` 使用方案 A：它是用户单独安装的前置依赖。本包不得把 `pi-subagents` 放进 dependencies，不得复制它的扩展代码，也不得注册一个替代的 subagent 工具。
6. 不要直接修改 Pi 或 pi-subagents 的安装目录。
7. 不要修改真实的 `~/.pi/agent/settings.json`。需要安装测试时，使用临时的 `PI_CODING_AGENT_DIR`。
8. 不要执行 git commit、git push、创建 PR、关闭 issue 或修改远程 tracker，除非本提示词明确授权。
9. 不要使用 `git reset --hard`、`git clean` 等破坏性命令。
10. 修改 Pi 包装前，完整阅读当前安装版本的 Pi `docs/skills.md`、`docs/packages.md` 及其相关引用。处理 subagent 工作流时，读取已安装的 `pi-subagents` 技能文档和对应 guide，不要凭印象实现。
11. Windows 是一等支持平台；路径、临时目录、LF 换行和 bash 脚本都要验证。
12. 每一步完成后报告：
    - 修改/创建的文件；
    - 运行的检查及结果；
    - 尚未解决的风险；
    - 下一步需要依赖的输出。

执行适配步骤 11：编写用户安装、冲突迁移和上游更新文档。

README 必须明确方案 A 的安装顺序：

1. `pi install npm:pi-subagents`
2. `pi install git:<ADAPTER_GIT_URL>`

安装后：

- 新会话直接生效；
- 已运行会话执行 `/reload`；
- 用 `/skill:ask-matt` 或 `/skill:setup-matt-pocock-skills` 验证。

文档必须包括：

## 1. 前置要求

- Pi 兼容版本；
- Node.js；
- Git；
- Bash；
- `pi-subagents`；
- GitHub 可选 `gh`；
- GitLab 可选 `glab`；
- wizard 可选 `shellcheck`；
- 部分脚本可能需要 `jq`；
- 外部研究需要可用网络工具或 MCP。

## 2. 为什么 pi-subagents 单独安装

说明：

- adapter 不捆绑执行扩展；
- 避免重复工具注册；
- 用户可单独更新和审计；
- 缺失时相关技能 fail fast；
- 普通非 subagent 技能仍可加载，但不得伪装完整并行工作流已经可用。

## 3. 同名技能冲突迁移

Pi 对同名技能保留先发现者并产生 collision warning。提供步骤：

1. `pi list`；
2. `pi config`；
3. 找出旧的单技能副本或其他 package 来源；
4. 禁用或移除旧副本；
5. `/reload`；
6. 检查启动 diagnostics；
7. 验证技能路径来自 adapter。

不要建议用户盲目删除未知目录。

## 4. 用户级和项目级安装

分别说明：

- 用户级 `pi install`；
- 项目级 `pi install --local`；
- project trust 的影响；
- 本地 package 的测试方式。

## 5. 更新

说明：

- `pi update npm:pi-subagents` 或适用于已配置 source 的更新方式；
- `pi update git:<ADAPTER_GIT_URL>`；
- `pi update --extensions` 更新全部包；
- 固定 git ref 时不会自动移动到新版本。

所有更新命令必须根据当前 Pi 官方 CLI 文档核实，不要凭记忆编写。

## 6. 使用方式

明确 Pi 命令：

- `/skill:ask-matt`；
- `/skill:setup-matt-pocock-skills`；
- `/skill:grill-with-docs`；
- `/skill:implement-spec`。

不要继续展示 Claude Code 风格的 `/ask-matt`。

## 7. 安全说明

说明：

- skills 可以指导模型执行脚本和修改文件；
- pi-subagents 可以创建 worktree 和 child；
- Git push、PR、issue 变更应有明确授权；
- 安装第三方 package 前应审计源码。

## 8. 维护者同步流程

说明：

- 如何指定新的上游 ref；
- 如何运行同步；
- 如何处理正式技能清单变化；
- 如何审查 adapter patch drift；
- 必须运行哪些检查；
- 不得通过跳过 lock 校验来强行引入新技能。

完成标准：

- 用户可以只按 README 完成方案 A 安装；
- 不会误以为 adapter 自动安装 subagent；
- 冲突排查、更新、卸载和 Windows 注意事项都有说明；
- 维护者能够安全同步新上游版本。
```

---

## 步骤 12：最终独立审查

> 此步骤明确授权使用 subagents，但只允许只读审查；不要让 reviewer 修改文件。

```text
你正在 D:/develop/tools/mattpocock-skills-pi 中实现 Matt Pocock 正式技能的 Pi-native 适配包。

基本约束：

1. 上游仓库是 https://github.com/mattpocock/skills。
2. 正式技能清单只能来自上游 `.claude-plugin/plugin.json` 的 `skills` 数组，不能通过扫描整个 `skills/` 猜测。
3. 当前固定上游版本下预期有 27 个正式技能；不得发布 `misc`、`in-progress` 或 `deprecated`。
4. 尽量保持上游技能正文不变。Pi 特有变更必须能够和上游内容区分，并通过可重复的同步/转换脚本生成。
5. `pi-subagents` 使用方案 A：它是用户单独安装的前置依赖。本包不得把 `pi-subagents` 放进 dependencies，不得复制它的扩展代码，也不得注册一个替代的 subagent 工具。
6. 不要直接修改 Pi 或 pi-subagents 的安装目录。
7. 不要修改真实的 `~/.pi/agent/settings.json`。需要安装测试时，使用临时的 `PI_CODING_AGENT_DIR`。
8. 不要执行 git commit、git push、创建 PR、关闭 issue 或修改远程 tracker，除非本提示词明确授权。
9. 不要使用 `git reset --hard`、`git clean` 等破坏性命令。
10. 修改 Pi 包装前，完整阅读当前安装版本的 Pi `docs/skills.md`、`docs/packages.md` 及其相关引用。处理 subagent 工作流时，读取已安装的 `pi-subagents` 技能文档和对应 guide，不要凭印象实现。
11. Windows 是一等支持平台；路径、临时目录、LF 换行和 bash 脚本都要验证。
12. 每一步完成后报告：
    - 修改/创建的文件；
    - 运行的检查及结果；
    - 尚未解决的风险；
    - 下一步需要依赖的输出。

执行适配步骤 12：对整个 adapter 做最终独立审查。

我明确授权你使用 pi-subagents 做本次只读并行审查。

开始前：

1. 检查 git status；
2. 确定审查 fixed point；如果仓库还没有可比较的提交，先说明限制，并选择不会遗漏当前文件的审查方式；
3. 读取项目架构文档、上游 lock、正式技能 manifest 和测试说明；
4. 调用 subagent capability list；
5. 如果 pi-subagents 不可用，停止并报告，不要切换到其他执行方式；
6. 完整读取 pi-subagents 关于 workflow、parallel review 和 failure handling 的指导。

使用一次顶层 async workflow，并行运行以下三个 fresh read-only reviewer：

## Reviewer A：上游忠实度

检查：

- 27 个正式技能是否都来自上游 manifest；
- 是否遗漏支持文件；
- 是否意外引入 misc/in-progress/deprecated；
- Pi patch 是否只修改必要的平台差异；
- 是否存在不可追溯的手工漂移。

## Reviewer B：Pi 规范

检查：

- package.json 的 pi manifest；
- user/model invocation 边界；
- `/skill:<name>` 命令；
- read-based skill composition；
- project trust；
- Windows 路径；
- 临时 `PI_CODING_AGENT_DIR` 测试；
- skill collision 处理。

## Reviewer C：Subagent 安全与正确性

检查：

- 方案 A 是否贯彻；
- adapter 是否错误捆绑 pi-subagents；
- delegation 授权门；
- capability preflight；
- 一次顶层 workflow；
- async 行为；
- fresh read-only reviewers；
- worktree writer 隔离；
- durable output；
- 基础设施失败是否 fail closed；
- 是否存在隐式 CLI fallback；
- 远程副作用是否有确认门。

父代理聚合时：

- 分别保留三个审查轴；
- 不将不同轴的 finding 混合排序；
- 为每个 finding 标注文件和证据；
- 区分 blocker、important、suggestion；
- 运行默认测试套件；
- 不直接修改文件，先给出审查报告。

报告最后给出：

- 每个轴的 finding 数；
- 发布 blocker；
- 可以延后的事项；
- 推荐修复顺序；
- 是否满足首次发布条件。

不要 commit、push、发版或创建 PR。
```
