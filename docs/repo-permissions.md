# 仓库权限与安全设计（biochem-atlas）

适用范围：`https://github.com/snownmouse/biochem-atlas`。本文记录「已经通过 API 生效」与「必须由仓库管理员在网页手动完成」两部分，避免把未生效的配置当成已完成。

## 0. 现状快照（2026-11-05）

| 项目 | 状态 |
| --- | --- |
| 可见性 | **Public**（由仓库所有者手动切换） |
| 默认分支 | `main` |
| 分支保护 | 已启用：禁 force push、禁删除、规则对 admin 同样生效（`enforce_admins=true`） |
| 必须走 PR / 1 个 approval / 状态检查 | **未启用**，原因见 §3.2 |
| Secret scanning + push protection | 已启用 |
| Secret scanning 非提供商模式 / 有效性校验 | 未启用（API 返回 disabled） |
| Dependabot 漏洞告警（alerts） | 已启用 |
| Dependabot 自动安全修复（security updates） | 已启用 |
| 协作者 | 仅仓库所有者一人（无第二维护者） |
| CODEOWNERS | 未创建（建议见 §4） |
| Issue / PR 模板 | 未创建（建议见 §6） |
| LICENSE | **未添加**，待所有者拍板（§7） |

## 1. 公开后的读权限边界

仓库转为 public 后：

- **任何人都可以**：浏览 / clone 全部代码、查看提交历史、查看 issue、PR、Actions 运行日志（不含 secrets）、下载 release 与资产。
- **任何人都不能**：向仓库推送、改设置、删分支、查看 Actions secrets 与环境变量、查看 Dependabot 告警详情、查看 Security advisories（安全公告仅维护者可见）。
- **派生权利由许可证决定**：public 只代表「看得见」，不代表「可以复用」。没有 LICENSE 时默认适用著作权法（保留所有权利），他人不得复制、修改、再分发——这一点必须在 §7 拍板后写清。
- 教学演示定位下，公开可显著降低「结构来源与缺口说明」被断章取义的风险，但也意味着任何未清理的 URL、内网地址、凭据都会永久留在历史里；推送前请确认工作区无 `.env`、无个人 token、无内网地址。

## 2. 角色划分与写权限

原则：**写权限只给维护者**。外部贡献走 fork + PR，不需要给仓库写权限。

| 角色 | 谁 | 可以做什么 | 建议 |
| --- | --- | --- | --- |
| `admin` | 仓库所有者 `snownmouse`（唯一） | 全部：设置、分支保护、协作者、删除仓库 | 保持**仅 1 人** |
| `maintain` | 未来的核心维护者（目前无人） | 管理 issue/PR、推送部分分支、管理 release；**不能**改仓库设置、不能改分支保护 | 第二位长期维护者到位后再给 |
| `write` | 内容/代码贡献者（目前无人） | 推送分支、开 PR；**不能**直接推 `main`（受分支保护约束） | 默认不给；必须给时只给单条通路目录 |
| `triage` | 助教 / 内容校对（可选） | 打标签、指派、关闭 issue；不能改代码 | 只在确实需要收外部反馈时给 |
| `read` | 公众 | 只读 | public 仓库无需显式授予 |

补充约定：

- 机器人 / CI 账号**暂不建**：本仓库无自动发布流程，加机器人等于多一个长期凭据面。
- 任何协作者都不要给 `admin`：`admin` 可以改分支保护，等于可以取消本文所有约束。
- 若未来给 `write`，按「一人一通路」原则授予（例如只允许改 `src/data/amino-acid/` 与对应 `public/assets/structures/2d/`），避免结构对照配置与证据分级被多人同时改。

## 3. `main` 分支保护

### 3.1 已通过 API 生效

调用 `PUT /repos/snownmouse/biochem-atlas/branches/main/protection`，实际生效项：

| 规则 | 值 | 效果 |
| --- | --- | --- |
| 禁 force push | `allow_force_pushes=false` | 任何人都不能改写 `main` 历史 |
| 禁删除分支 | `allow_deletions=false` | `main` 不能被删除 |
| 规则包含管理员 | `enforce_admins=true` | 所有者自己也不能 force push / 删除，规避「管理员例外」 |
| 要求线性对话解决 | `required_conversation_resolution=true` | PR 中未解决的评论会阻止合并（当前未强制 PR，故实际作用于 PR 场景） |

### 3.2 为什么暂不启用「必须 PR + 1 approval + 状态检查」

三项同时启用会**把仓库锁死**，原因有两条，都是硬约束：

1. **没有 CI**：仓库当前没有 `.github/workflows`。若把状态检查设为必需，所有 PR 会永久停在 “Expected — waiting for status”，无法合并。必须先有工作流、跑出稳定的 check 名称，才能设 `required_status_checks`。
2. **只有一个账号**：GitHub 不允许批准自己的 PR。`enforce_admins=true` 下没有第二个人可以点 Approve，所有 PR（包括所有者自己的）都无法合并；`enforce_admins=false` 又等于允许管理员绕过保护，与「包含 admin」的初衷相反。

因此现阶段取「禁 force push + 禁删除 + 包含 admin + 直推可用」，等**第二位维护者 + CI**齐备后再升级。

### 3.3 升级步骤（齐备后执行其一）

**方式 A：网页（推荐，可读性最好）**

1. 打开 `Settings` → 左侧 `Branches`（经典保护规则）或 `Rules` → `Rulesets`。
2. 在 `main` 的规则上点 `Edit`。
3. 勾选 `Require a pull request before merging`，`Required approvals` 设为 `1`。
4. 勾选 `Require status checks to pass before merging`，在搜索框里选中真实存在的 check（例如后续 CI 的 `build` / `validate`）。
5. 勾选 `Do not allow bypassing the above settings`（等价 `enforce_admins=true`）。
6. `Save changes`。

**方式 B：API**

```bash
curl -X PUT \
  -H "Authorization: token <你的-token>" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/snownmouse/biochem-atlas/branches/main/protection \
  -d '{
    "required_status_checks": {"strict": true, "contexts": ["build"]},
    "enforce_admins": true,
    "required_pull_request_reviews": {"required_approving_review_count": 1, "dismiss_stale_reviews": true},
    "restrictions": null,
    "allow_force_pushes": false,
    "allow_deletions": false,
    "required_conversation_resolution": true
  }'
```

注意：`contexts` 必须与真实工作流的 check 名称完全一致；在第二位维护者到位前不要打开 approval=1。

## 4. CODEOWNERS 建议

建议**先写文件、后开强制**：

- 路径：`.github/CODEOWNERS`
- 内容建议（单人仓库可直接用）：

```text
# 默认由仓库所有者审阅
*                       @snownmouse

# 结构对照与证据分级：口径改动必须所有者过目
/src/data/comparisonConfig.ts   @snownmouse
/src/data/evidenceGrade.ts      @snownmouse
/tools/validate-*               @snownmouse

# 资产与脚本：改动会改变页面事实
/public/assets/                 @snownmouse
/tools/fix-sdf-bond-orders.py   @snownmouse
```

- 只有在「第二位维护者已存在」且分支保护已开 PR 必审后，才在规则里勾选 `Require review from Code Owners`；否则 CODEOWNERS 只会让所有 PR 停在等待审阅。

## 5. Dependabot 与 Secret scanning

已生效（public 仓库免费）：

- **Dependabot alerts**：依赖出现已知漏洞时向维护者告警。
- **Dependabot security updates**：自动为有漏洞的依赖开升级 PR（仍走正常合并流程，不直接改 `main`）。
- **Secret scanning + push protection**：推送含已知格式凭据时在客户端被拦下；已推送的历史凭据会在 Security 页告警。

尚未启用 / 仍可补：

| 项目 | 现状 | 手动位置 |
| --- | --- | --- |
| Secret scanning 非提供商模式（自定义正则） | API 返回 disabled | `Settings` → `Code security` → `Secret scanning` → 勾选 `Non-provider patterns` |
| Secret scanning 有效性校验（validity checks） | API 返回 disabled | 同上页面的 `Validity checks` |
| Dependabot 版本更新（非安全类） | 无配置 | 新增 `.github/dependabot.yml`，见下 |

`.github/dependabot.yml` 最小示例（npm 依赖每周检查，不自动合并）：

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5
```

## 6. Issue / PR 模板

建议**要**，但本轮不新增文件（保持本次提交只含 README 与本文档）。建议落地三个文件：

| 文件 | 用途 | 关键字段 |
| --- | --- | --- |
| `.github/ISSUE_TEMPLATE/data-correction.md` | 结构 / 化学事实纠错 | 通路 + 步骤 id、当前写法、依据（PDB ID / 文献 / pKa）、证据等级是否变化 |
| `.github/ISSUE_TEMPLATE/bug.md` | 页面缺陷 | 路由、浏览器、复现步骤、期望 vs 实际、是否 `?fold=` / `?step=` 参数相关 |
| `.github/pull_request_template.md` | PR 自检 | 是否跑过 `npm run build`；跑了哪些 `validate-*` / `smoke-*`；是否改动证据等级或电离态；是否新增 PDB 来源 |

模板的作用不是形式主义：本项目的对外承诺是「来源可见、缺口明说」，让纠错必须附依据，比事后核查有效。

## 7. License（需要拍板）

**本轮未添加 LICENSE 文件**，两种候选：

| 方案 | 好处 | 代价 |
| --- | --- | --- |
| **MIT** | 最宽松：他人可自由使用、修改、再分发（保留版权声明）；教学 / 学生项目引用无障碍；GitHub 上常见、易被检索 | 他人可商用、可闭源二次分发；出问题时无担保条款保护作者；后续想收紧需征得已获授权者同意 |
| **私有版权（All rights reserved）** | 保留全部权利：可控制商用、可另行授权、可换许可证；适合作为课程 / 教材资产 | 公开可见但不可复用，他人 fork / 教学改编需逐个询问；无 LICENSE 时默认就是这一档，但**建议显式写明**，避免「public = 随便用」的误解 |

拍板后需要做的事（由所有者操作）：

1. 新增根目录 `LICENSE`（MIT 用标准全文，年份 + 版权人）。
2. 在 README 末尾把「许可证尚未确定」替换为实际许可证名称。
3. 若选私有版权，考虑在 README 增加一段「引用与授权联系」说明。

## 8. 需要用户在网页上完成的清单

1. **升级分支保护（等第二位维护者 + CI 之后）**：`Settings` → `Branches`（或 `Rules`）→ `main` → `Edit`，按 §3.3 勾选。
2. **添加协作者**：`Settings` → `Collaborators and teams` → `Add collaborator`，按 §2 选角色（默认不加 `write`）。
3. **确认协作者不能是 admin**：同一页面查看角色列。
4. **Secret scanning 高级项**：`Settings` → `Code security` → `Secret scanning`，勾选 `Non-provider patterns` 与 `Validity checks`。
5. **CODEOWNERS**：新建 `.github/CODEOWNERS`（内容见 §4），再在分支保护里勾选 `Require review from Code Owners`。
6. **Issue / PR 模板**：按 §6 新建三个文件。
7. **Dependabot 版本更新**：新建 `.github/dependabot.yml`（见 §5）。
8. **License**：按 §7 拍板并新增 `LICENSE`。

## 9. 本轮 API 操作记录

- 使用的凭据：本机 git 凭据管理器中已有的 GitHub 凭据（账号 `snownmouse`，具备 `repo` scope 与仓库 admin 权限）。**未写入任何文件、未写入 git config。**
- 已执行：建仓、`PUT branches/main/protection`（禁 force push / 禁删除 / 包含 admin / 对话解决）、`PUT vulnerability-alerts`、`PUT automated-security-fixes`、`PATCH security_and_analysis`（secret scanning + push protection）。
- 被拒绝或未生效：`security_and_analysis` 中的 `secret_scanning_non_provider_patterns` 与 `secret_scanning_validity_checks`（返回 disabled）；「必须 PR / 1 approval / 状态检查」按 §3.2 主动未启用，需人工升级。
