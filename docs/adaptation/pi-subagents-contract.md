# `pi-subagents` 共享运行契约

本文档是本 adapter 中所有 subagent 流程的单一 Pi 运行契约。技能文件中的 Pi 专有守卫或工作流块均带 `<!-- pi-adapter: ... -->` 标记；这些标记块和本文档由 adapter 维护，与上游正文明确区分，并由可重复的同步/转换脚本生成。

## 集成边界（方案 A）

`pi-subagents` 是用户独立安装的前置依赖，不是本包的依赖或组成部分。本包：

- 不在 `dependencies`、`optionalDependencies` 或其他依赖字段中声明 `pi-subagents`；
- 不复制它的扩展代码；
- 不注册 `subagent` 工具或任何替代工具；
- 不修改 Pi 或 `pi-subagents` 的安装目录；
- 不修改用户真实的 `~/.pi/agent/settings.json`。

安装顺序固定为：

```text
1. pi install npm:pi-subagents
2. pi install <adapter-source>
```

安装后若 Pi 会话已在运行，执行 `/reload`；也可以重启 Pi。

## 适用技能与分支

以下正式技能会进入 subagent 流程：

| 技能 | 适用范围 |
| --- | --- |
| `research` | 整个技能 |
| `code-review` | 整个技能 |
| `implement-spec` | 整个技能 |
| `wayfinder` | 整个技能 |
| `improve-codebase-architecture` | 整个技能 |
| `codebase-design` | 仅 Design It Twice 分支（`DESIGN-IT-TWICE.md`） |
| `grilling` | 仅需要查找环境事实的探索分支 |

其他正式技能不加载这份契约，也不注入 subagent 守卫。

## 委派授权

父代理默认直接执行。

- 用户显式执行 `/skill:<name>`，且该技能的描述明确声明会使用 subagent 时，可视为用户授权该技能既定的委派流程。授权范围仅限技能所述流程，不扩大到发布、远程变更或其他委派。
- 技能由普通请求触发（model-invoked），而用户没有要求 delegation、background、parallel 或 independent review 时，父代理必须先询问是否授权委派；或者由父代理直接完成不要求独立上下文的部分。
- 显式调用本身不覆盖技能描述：描述未明确声明 subagent 的技能仍须按上一条取得授权后才能启动 child。

## 启动与编排

取得授权后，首次启动 child 前必须：

1. 确认 `subagent` 工具可用。
2. 调用 `subagent({ action: "list", capabilities: true })`。
3. 只选择 capability list 中可执行且未禁用的 agent；该列表是预检，不代表认证、版本或实际启动已经成功。
4. 按已安装版本读取 `pi-subagents` 的技能文档；复杂流程还要通过 guide 读取相应 workflow/tool reference，不凭记忆构造调用。

运行规则：

- 单个有界 child 可直接调用；多步骤或并行工作必须只有一次顶层 workflow 调用，所有 child 在该 workflow 内启动。
- `async` 是默认值。仅当父代理必须阻塞时才使用 `async: false`；最终 review、validation gate 和 publication check 仍保持 async。
- mutation 工作保持一个 `cwd`/worktree 只有一个 writer。并发 writer 必须使用彼此隔离的 worktree，且职责互斥。
- 独立 reviewer 使用 `fresh`、read-only context；父代理汇总结果并决定是否修改。
- 需要留存的结果必须通过 child/workflow 的 `output` 路径绑定，并返回 `outputReference`、`outputPathMapping` 或 `artifactPaths`。仅在 prompt 中要求写某文件不构成 durable output 绑定。
- 父代理保留最终验收、发布以及任何远程变更权限。child 的结果、receipt、检查或 review 都只是证据，不是授权。

## 基础设施阻塞与统一错误

workflow、child launch、extension load、prompt runtime 或 child tooling 的失败均属于基础设施阻塞。发生阻塞时：

1. 停止该委派流程；
2. 报告准确错误、run/status，以及 repo、`cwd`、worktree、branch/ref 状态；
3. 验证 worktree 干净，或记录已有 partial diff；
4. 只进行明确的同协议修复/重试，或等待用户决定。

不得静默切换到 `pi -ne`、Claude CLI、Codex CLI、Cursor CLI、普通后台进程或其他执行模式。Pi 自身可能显示的通用 `pi -ne` 提示不构成本契约允许的 fallback。

当 `subagent` 工具缺失或 capability list 无法调用时，必须停止并原样报告：

```text
This workflow requires pi-subagents. Install it with: pi install npm:pi-subagents. Then run /reload in the active Pi session, or restart Pi.
```
