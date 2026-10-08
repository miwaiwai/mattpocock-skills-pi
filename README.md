# mattpocock-skills-pi

[`mattpocock/skills`](https://github.com/mattpocock/skills) 正式技能的 Pi-native 适配包。

本包只发布固定上游版本中 `.claude-plugin/plugin.json` 的 `skills` 数组声明的 27 个正式技能，不通过扫描 `skills/` 猜测清单，也不发布 `misc`、`in-progress` 或 `deprecated`。当前固定上游版本和 commit 见 [`upstream/UPSTREAM.json`](upstream/UPSTREAM.json)。Pi 专有变更由可重复的转换脚本生成，并以 `<!-- pi-adapter: ... -->` 等标记与上游正文区分。

> [!IMPORTANT]
> 本包采用**方案 A**：`pi-subagents` 是用户单独安装和管理的前置依赖。本 adapter 不会自动安装、捆绑或替代它。

## 安装

将 `<ADAPTER_GIT_URL>` 替换为本 adapter 仓库的 Git URL，并严格按以下顺序安装：

```bash
pi install npm:pi-subagents
pi install git:<ADAPTER_GIT_URL>
```

安装完成后：

- 新启动的 Pi 会话直接生效；
- 已经运行的会话执行 `/reload`；
- 使用 `/skill:ask-matt` 或 `/skill:setup-matt-pocock-skills` 验证技能可调用。

可另外运行 `pi list` 确认两个 package source 都已配置。不要把第二条命令简写成普通文件复制；使用 Pi package 安装才能保留可更新的 source 身份。

## 1. 前置要求

| 要求 | 说明 |
| --- | --- |
| Pi | Pi `1.1.0` 已验证；更早版本未测试。本文命令已按该版本的 package、skill command、project trust 和 update CLI 核对。使用 `pi --version` 检查；使用其他版本时先以该版本的 `pi <command> --help` 复核命令。 |
| Node.js | 建议 Node.js 20 或更高版本；维护脚本当前在 Node.js 22 上验证。 |
| Git | 安装 git source、固定上游 ref、维护同步和部分技能工作流需要。 |
| Bash | 技能附带的 `.sh` 脚本需要 Bash。Windows 请使用 Git for Windows 自带的 Git Bash、WSL，或另一个兼容 Bash；不要假设 `cmd.exe`/PowerShell 能直接执行 Bash 脚本。 |
| `pi-subagents` | 需要 subagent、并行 review、background research 或 worktree 流程时的独立前置 package；必须先安装。 |
| `gh` | 可选；使用 GitHub issue/PR 工作流时需要，并应单独完成认证。 |
| `glab` | 可选；使用 GitLab issue/MR 工作流时需要，并应单独完成认证。 |
| `shellcheck` | 可选；`wizard` 等生成或审查 shell 脚本的流程可用它做静态检查。 |
| `jq` | 可选；部分 shell/JSON 处理脚本可能需要。 |
| 网络工具或 MCP | 外部研究需要可访问相应来源的网络工具或已配置的 MCP server；仅安装技能不会自动提供网页访问能力。 |

第三方 CLI、MCP 和 provider 凭据均由用户独立安装与配置，本包不会代管认证。

## 2. 为什么 `pi-subagents` 单独安装

本 adapter 是技能包，不捆绑执行扩展：

- 不把 `pi-subagents` 放入 `dependencies`、`optionalDependencies` 或其他依赖字段；
- 不复制它的扩展代码，也不注册替代的 `subagent` 工具；
- 避免同一工具被多个 package 重复注册；
- 允许用户单独更新、固定版本和审计 `pi-subagents`；
- 缺失时，需要 subagent 的技能会 fail fast，明确提示先安装 `pi-subagents`，而不会偷偷改用其他执行方式；
- 普通、不需要 subagent 的技能仍可加载和使用，但这**不代表**并行、child、独立 review 或 worktree 工作流已经完整可用。

如果只安装了 adapter，`/skill:ask-matt` 等普通技能可能能加载，但不要据此判断 `/skill:implement-spec`、并行 review 或 background research 的 subagent 分支已经可运行。

## 3. 同名技能冲突迁移

Pi 遇到同名技能时保留**先发现的技能**，并输出 collision warning。因此，旧的单技能副本、项目 `.pi/skills`/`.agents/skills`、用户技能目录或其他 package 可能遮蔽本 adapter 的版本。

安全迁移步骤：

1. 运行 `pi list`，记录当前配置的所有 package source。
2. 运行 `pi config`；如果冲突来自项目配置，也检查 `pi config --local`。使用 Tab 可在交互配置界面切换 scope。
3. 根据 collision warning、package 清单和启动资源路径，确认旧技能来自哪个 package、用户技能目录或项目技能目录。
4. 在确认来源和用途后，禁用该资源，或用与其 scope 匹配的命令移除旧 package：用户级用 `pi remove <old-source>`，项目级用 `pi remove --local <old-source>`。
5. 在已有会话中执行 `/reload`，或启动新会话。
6. 检查启动 diagnostics；需要完整资源信息时以 `pi --verbose` 启动，确认不再出现该技能的 collision warning。
7. 再次运行 `pi list`，并在 diagnostics 中确认技能路径位于 `mattpocock-skills-pi` package；随后用 `/skill:ask-matt` 验证。

不要因为看到 collision warning 就盲目删除未知目录。先判断它是用户维护的技能、项目资源还是其他 package 的文件；如需保留，优先在 `pi config` 中禁用冲突资源或移除明确的 package source。

## 4. 用户级、项目级与本地 package

### 用户级安装

默认的 `pi install` 把 package 声明写入用户 agent 目录（默认 `~/.pi/agent/settings.json`），对所有项目可用：

```bash
pi install npm:pi-subagents
pi install git:<ADAPTER_GIT_URL>
```

卸载时使用安装时的 source 身份；可先用 `pi list` 复制准确 source：

```bash
pi remove git:<ADAPTER_GIT_URL>
pi remove npm:pi-subagents
```

如果其他 package 或项目仍使用 `pi-subagents`，不要仅因卸载 adapter 就移除它。

### 项目级安装

`--local`（或 `-l`）把声明写入项目的 `.pi/settings.json`：

```bash
pi install --local npm:pi-subagents
pi install --local git:<ADAPTER_GIT_URL>
```

项目 package 只有在 **project trust** 已解决并允许加载后才会安装和加载。交互会话可审查项目内容后作出信任决定；自动化命令应显式使用 `--approve` 或 `--no-approve`，不要依赖无法显示的交互提示。Project trust 只控制项目资源是否加载，不是文件系统或命令执行的安全沙箱。

项目级卸载同样带 `--local`：

```bash
pi remove --local git:<ADAPTER_GIT_URL>
pi remove --local npm:pi-subagents
```

### 测试本地 checkout

Pi 支持直接加载本地 package 目录；本地 source 不会被复制，修改文件后在会话中执行 `/reload` 即可重载。为了不修改真实的 `~/.pi/agent/settings.json`，测试时使用临时 `PI_CODING_AGENT_DIR`，并向 `pi install` 传入 checkout 的**绝对路径**。

Git Bash / Unix Bash：

```bash
TEST_AGENT_DIR="$(mktemp -d)"
export PI_CODING_AGENT_DIR="$TEST_AGENT_DIR"
ADAPTER_PATH="$(pwd)"
pi install npm:pi-subagents
pi install "$ADAPTER_PATH"
pi list
pi --verbose
```

Windows Git Bash 如果 `pwd` 返回的 POSIX 路径不被本机 Node/Pi 正确解析，可使用 `ADAPTER_PATH="$(pwd -W)"`。Windows PowerShell 示例：

```powershell
$testAgentDir = Join-Path ([System.IO.Path]::GetTempPath()) ("mattpocock-skills-pi-" + [guid]::NewGuid())
New-Item -ItemType Directory -Path $testAgentDir | Out-Null
$env:PI_CODING_AGENT_DIR = $testAgentDir
$adapterPath = (Resolve-Path .).Path
pi install npm:pi-subagents
pi install $adapterPath
pi list
pi --verbose
```

测试结束后先退出测试 Pi 进程，再删除自己创建的临时目录。不要把测试命令指向真实 agent 目录。本仓库的自动 smoke test 也使用隔离的临时 `PI_CODING_AGENT_DIR`、`HOME` 和 `USERPROFILE`。

## 5. 更新

先运行 `pi list` 查看已配置的准确 source。Pi `1.1.0` 官方 CLI 支持以下命令：

```bash
# 单独更新 pi-subagents（按该 source 安装时）
pi update npm:pi-subagents

# 单独更新 adapter
pi update git:<ADAPTER_GIT_URL>

# 更新全部已安装 package，不更新 Pi 本体
pi update --extensions
```

如果 `pi list` 显示的是带版本、tag、commit 或其他写法的 source，应把该**已配置 source**原样传给 `pi update <source>`，而不是猜测一个新字符串。项目 package 的更新仍受 project trust 影响；自动化环境按需显式传 `--approve`。

版本行为：

- 未固定移动分支的 git source 可在 update 时前进；
- 固定 git tag 或 commit 的 source 是 pinned，`pi update` 会 reconcile checkout，但不会把配置的 ref 自动移动到另一个版本；
- 固定 npm version 同样不会自动跨版本；要升级 pin，应移除旧 source 后安装经过审计的新 source；
- 更新后，已有会话执行 `/reload`，新会话直接使用更新后的资源。

`pi update`（无参数）更新的是 Pi 本体，不等同于更新 package；更新全部 package 应明确使用 `pi update --extensions`。

## 6. 使用方式

Pi 技能命令使用 `/skill:<name>`。例如：

```text
/skill:ask-matt
/skill:setup-matt-pocock-skills
/skill:grill-with-docs
/skill:implement-spec
```

可在命令后继续附加请求参数。在 Pi 中请始终保留 `/skill:` 前缀，例如 `/skill:ask-matt`。

当前 package 显式发布 27 个正式技能。其中 16 个仅供用户显式调用，11 个可以由模型按描述选择；清单与 invocation 分类锁定在 [`upstream/SKILLS.lock.json`](upstream/SKILLS.lock.json)。

## 7. 安全说明

- Skills 是给模型的可执行工作指引，可能指导模型运行脚本、读取资料和修改文件；安装前应审查 `SKILL.md` 及其 support files。
- `pi-subagents` 是独立的执行扩展，可以创建 child、后台 run 和 Git worktree。它的 receipt 或 child 结果是证据，不是发布授权。
- Git push、创建或修改 PR/MR、创建/关闭 issue、修改 label/assignee 和其他远程 tracker 写入，都应在当前请求中获得明确授权。调用技能本身不自动授予这些远程权限。
- 安装任何第三方 Pi package 前都应审计源码。扩展以 Pi 进程的操作系统权限运行；project trust 不是沙箱。
- 仅提供任务所需的凭据和网络权限。外部内容、命令输出和技能文本都可能包含 prompt injection。
- 不要直接修改 Pi 或 `pi-subagents` 的安装目录，也不要用本项目测试修改真实的 `~/.pi/agent/settings.json`。

## 8. 维护者同步上游

### 当前来源与不变量

- 上游仓库：`https://github.com/mattpocock/skills.git`。
- 固定 ref：[`scripts/sync-upstream.mjs`](scripts/sync-upstream.mjs) 中的 `UPSTREAM_REF`；应使用完整 commit SHA，而不是会移动的分支。
- 正式技能清单唯一来源：该 ref 的 `.claude-plugin/plugin.json` 中 `skills` 数组。
- 已审查清单：[`upstream/SKILLS.lock.json`](upstream/SKILLS.lock.json)。
- 已审查文件 inventory 与 frontmatter 指纹：[`upstream/SNAPSHOT.lock.json`](upstream/SNAPSHOT.lock.json)。
- 生成结果：`skills/`、`upstream/UPSTREAM.json` 和 `upstream/LICENSE`。

不得扫描整个上游 `skills/` 来补齐清单，也不得加入 `misc`、`in-progress` 或 `deprecated`。不得通过绕过或跳过 lock 校验来强行引入新技能。

### 指定并审查新的上游 ref

1. 选择一个完整的上游 commit SHA，并在独立临时 checkout 中检查它；不要先覆盖当前 vendored `skills/`。
2. 完整读取该 commit 的 `.claude-plugin/plugin.json`，只取 `skills` 数组，并确认 `plugin.json` 与上游 `package.json` 的版本一致。
3. 将新数组与 `upstream/SKILLS.lock.json` 逐项比较。对新增、删除、重命名、重排、分类变化以及 invocation/frontmatter 变化逐项做人工审查。
4. 如果正式清单不再是预期的 27（engineering 20、productivity 7），先更新设计决策、验证器、测试和发布预期并完成审查；不要先放宽数量断言让同步“通过”。
5. 审查每个正式技能的全部 support-file inventory、符号链接/特殊文件风险、`SKILL.md` frontmatter、license/metadata、`disable-model-invocation` 分类及正文变化。
6. 只有完成上述审查后，才同时更新：
   - `scripts/sync-upstream.mjs` 的 `UPSTREAM_REF`；
   - `upstream/SKILLS.lock.json` 的 `upstreamRef`、正式路径和 invocation 分类；
   - `upstream/SNAPSHOT.lock.json` 的 `upstreamRef`、逐技能文件 inventory、`upstreamFrontmatterSha256`，以及经审查的 `adaptedFrontmatterSha256`；
   - 任何确因正式清单变化而需要调整的显式数量测试与架构文档。

Lock 是审查结果，不是失败后删除的障碍。不要删除 lock、把校验改成目录扫描、临时注释校验，或用旧 hash 配新 ref。

### 运行同步和检查 patch drift

完成 lock 审查后运行：

```bash
npm run sync-upstream
npm run generate:manifest
npm run check
```

`npm run sync-upstream` 会：

1. 在临时目录 fetch 固定 ref，并验证实际 commit；
2. 从 `.claude-plugin/plugin.json` 读取且只读取正式清单；
3. 对照两个 reviewed lock 验证路径、数量、inventory 和 frontmatter；
4. staging 复制正式技能；
5. 自动运行 `scripts/apply-pi-adaptations.mjs`；
6. 验证适配后的 frontmatter；
7. 原子替换 `skills/` 并记录 provenance。

若出现 `upstream drift`，先审查新的上游文本和 adapter 语义。逐条检查 [`scripts/apply-pi-adaptations.mjs`](scripts/apply-pi-adaptations.mjs) 中按“文件 + 精确原文 + 预期次数”锁定的规则：

- 上游原文只是机械变化时，更新规则的 upstream anchor，并确认生成结果仍保持原意；
- 上游已经实现等价行为时，评估是否能删除对应 adapter patch；
- 上游语义变化时，重新设计 Pi patch 和测试，不能只改字符串让检查变绿；
- 新增的 Pi 专有正文必须继续带 adapter marker，并由转换脚本生成，不能直接手改 vendored `skills/`；
- 用 Git diff 审查生成的 `skills/`、manifest、provenance、license 和 lock 变化，确认没有非正式目录或意外 support files。

`npm run adapt:pi` 只用于对当前 vendored 快照重复应用/验证同一转换，不替代上游同步和 lock 审查。

### 必须通过的检查

```bash
npm run validate:package
npm test
npm run smoke:package
# 等价汇总命令：
npm run check
```

这些无模型检查验证：正式 manifest 和 lock、27/20/7 与 16/11 数量、frontmatter 指纹、support-file inventory、LF 换行、Pi 文本适配、方案 A 依赖边界、行为 fixtures，以及使用临时 agent 目录的 Pi resource-loader smoke test。

需要真实 Pi/provider/`pi-subagents` 的集成测试是显式 opt-in，可能联网和产生 provider 费用：

```bash
PI_RUN_INTEGRATION=1 PI_INTEGRATION_MODEL=provider/model-id npm run test:integration
```

Windows PowerShell：

```powershell
$env:PI_RUN_INTEGRATION = "1"
$env:PI_INTEGRATION_MODEL = "provider/model-id"
npm run test:integration
```

该测试只继承当前进程已有的 provider 环境变量，并使用测试创建的临时 package settings、sessions、workspace 和安装目录；不得改成读取或写入真实 `~/.pi/agent/settings.json`。发布前应在具备凭据和网络条件的受控环境中运行一次，并人工审查生成 diff、启动 diagnostics、collision diagnostics 和四个代表性命令：`/skill:ask-matt`、`/skill:setup-matt-pocock-skills`、`/skill:grill-with-docs`、`/skill:implement-spec`。

## 许可证与来源

Adapter 代码使用仓库根目录 [`LICENSE`](LICENSE)。Vendored 上游内容的来源、版本和许可证副本分别见 [`upstream/UPSTREAM.json`](upstream/UPSTREAM.json) 与 [`upstream/LICENSE`](upstream/LICENSE)。
