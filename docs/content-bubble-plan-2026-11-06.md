# 内容气泡（hover 详情）可执行方案

- **日期**：2026-11-06
- **状态**：待拍板（本文只做方案，不含代码改动）
- **范围**：首页共用节点图、12 张挂图页的步骤 / 节点 / 表行、11 张结构对照页的 2D 分子
- **前置登记**：[todo-hover-detail.md](todo-hover-detail.md)（2026-11-04 只登记未实现）

## 0. 结论摘要

1. 只做一个**单例气泡**，挂在全局交互层，桌面 hover / 键盘 focus / 触屏长按共用同一套内容模型；无模型时降级为现有的「去向浮签」。
2. 视觉沿用挂图语言：1px 墨线、纸白底、直角、无阴影/渐变；上限 320×180，最多 8 行。
3. 时序：hover **280ms** 弹出、移出 **220ms** 关闭；触屏长按沿用 **450ms**，升级为完整气泡且不自动收起。
4. 内容全部来自现有数据层，**不新增第二份文案**；四类目标各有一张「可取字段 / 缺口」表。
5. 不预渲染。528 个目标（414 挂图 + 114 首页）共用单例 DOM，模型按 `targetId` 惰性缓存。
6. 遮挡硬约束：不得压住自己的目标、不得压住图框内正文文本。

---

## 1. 气泡里放什么

### 1.1 数据源与联表口径

| 用途 | 唯一来源 | 说明 |
|---|---|---|
| 首页节点 / 边 | `src/data/homeMap.ts` | `HOME_NODES`、`HOME_JUNCTIONS`、`HOME_ALL_STEPS`、`HOME_PATHWAYS` |
| 步骤全字段 | 各通路 json（类型见 `src/data/types.ts` 的 `Step`） | 12 条通路各自一份 |
| 结构块与分子 | `src/data/stepComparison.ts` | `StepComparison` / `MolPart` / `PartEvidence` |
| 证据等级 | `src/data/evidenceGrade.ts` | `gradeOfPart()` / `gradesForStep()`，禁止在组件里另写 A/B/C/D |
| 表行当前器官差异 | 页面内 `step.organDiffs` + 当前 `organ` | 由页面传给气泡模型，不在气泡里猜 |

**联表键**：`stepId`。`stepComparison.ts` 注释已声明 stepId 全局唯一，可直接作为跨文件键；首页的 `HomeEdgeSource` 自带 `pathwayId + stepId`，用于消歧与跳转。

**EC 归一化**：`ec = step.ecNumber ?? step.enzyme?.ec ?? null`。
- 旧口径（glycolysis / tca / 尿素等）EC 在 `step.ecNumber`；
- 新口径（amino / cholesterol）EC 在 `step.enzyme.ec`；
- 两者都没有时才显示「EC 未登记」，不补值。

**ΔG 归一化**（三种真实形态，必须由一个 `readDeltaG()` 吞掉）：

| 形态 | 来源样例 | 读取规则 |
|---|---|---|
| `{standard, physiological, unit, source, note?}` | glycolysis `gk-1`：−16.7 / −33.4 kJ/mol，`Lehninger 8e Table 15-1`；tca-1：−32.2 / −32.2，note「生理态数值未核实…」 | 显示 `ΔG 标准 −16.7 / 生理 −33.4 kJ/mol`；有 `note` 原样附在括号里 |
| `{standard:null, physiological:null, qualitative, source}` | 尿素、FAO 多步 | 显示 `ΔG 数值未核实 · <qualitative>` |
| `{value:number\|null, qualitative, source}` | amino `aa-1`、cholesterol `ch-1` 均为 `null` | `value` 非空显示数值；为 null 显示定性句；永不显示 0 |

**禁止**：ΔG 缺失时显示 0、暗示「近平衡」；EC 缺失时留空但仍显示字段名；证据等级在组件里硬编码。

### 1.2 四类目标：能取到什么

#### A. 首页共用节点（`data-node-id`）

来源：`HomeNode`（homeMap.ts L349–356）、`HomeJunction`（L387–393）、`JunctionOccurrence`（L379–385）。

| 气泡行 | 字段 | 是否必有 |
|---|---|---|
| 标题 | `fullName`（+ `abbr`） | 必有 |
| 涉及通路 | `pathwayIds[]` → `HOME_PATHWAYS` 名称 | 必有 |
| 共用关系 | `junction` 布尔 + `occurrences.length` | 必有（非共用节点写「本通路专用节点」） |
| 各通路落点 | `occurrences[].pathwayId / stepId / stepName / enzyme / via` | 共用节点必有，最多列 3 条，余下写「另 N 处」 |
| 入口 | 点击 → 相关步骤（沿用现有节点点击逻辑） | 必有 |

样例（共用节点，值为数据层实测；处数与全部落点以 `occurrences` 实际长度为准）：
```
葡糖-6-磷酸（G6P）
涉及通路：糖酵解 · 糖异生 · 磷酸戊糖途径
共用节点 {occurrences.length} 处
  gk-1 · 己糖激酶 · 糖酵解 · main
  gn-11 · 葡萄糖-6-磷酸酶 · 糖异生 · main
  ppp-o1 · 葡萄糖-6-磷酸脱氢酶 · 磷酸戊糖途径 · main
→ 点击查看相关步骤
```
> stepId、stepName、enzyme、via 全部直接取 `JunctionOccurrence`；超过 3 条时第 4 行写「另 N 处」。

**缺口**：`HomeNode` / `HomeJunction` 无 EC、无 ΔG、无证据等级。要显示这些必须按 `stepId` 联表 json 与 `comparisonConfig`；而首页只接入 6 条通路（`SOURCES` 仅 glycolysis / tca / gluconeogenesis / ppp / fao / oxphos），其余通路的联表结果为空。

#### B. 首页步骤边 / 步骤引用（`data-step-id` / `data-link-step`）

来源：`HomeEdge`（L364–377）、`HomeEdgeSource`（L358–362）、`HomeStepRef`（L883–889）。

| 气泡行 | 字段 |
|---|---|
| 标题 | `HOME_PATHWAYS[name] · primaryStepId` + `HomeStepRef.stepName` |
| 酶 | `HomeEdge.enzyme` |
| 方向 | `irreversible` → 「不可逆」/「可逆」；`kind` → 「主链」/「支路」 |
| 来源 | `sources.length` + 每条 `pathwayId / linkType` |
| 入口 | 点击 → 该 stepId 的挂图 |

样例：
```
三羧酸循环 · tca-1 · 柠檬酸合酶
不可逆 · 主链
底物来源 1 处 · main
→ 点击查看步骤
```

**缺口**：`HomeEdge` 无 EC / ΔG / equation。方案不在此层补字段，气泡按 `primaryStepId` 联表取 EC 与 ΔG；联表失败时这两行**整行不渲染**，不写「暂无」。

#### C. 挂图步骤 / 节点 / 表行

来源：各通路 json 的 `Step`（types.ts L59–94），表行另加 `[data-plate-row]` 所在行的 `step` 对象与当前 organ 的 `organDiffs` 条目。

| 气泡行 | 字段 | 渲染规则 |
|---|---|---|
| 标题 | `第 {index} 步 · {name}` | `name` 为步骤名（非酶名） |
| 酶 + EC | `enzyme.name`（`isozyme` 有则附）+ `ecNumber ?? enzyme.ec` | EC 缺失写「EC 未登记」 |
| 方向 | `irreversible` | 不可逆 / 可逆 |
| 反应式 | `equation` | 单行截断；无则用 `substrates → products`（id 转实体名） |
| ΔG | `readDeltaG(step)` | 见 1.1；null 不显示 0 |
| 证据 | `gradesForStep(comparison)` | A/B/C/D + `calc` / `2d` 覆盖标签；无块写「未分级」 |
| 器官差异（仅表行） | 当前 organ 的 `organDiffs[].text` | 无差异写「本器官无差异」 |
| 入口 | 结构对照（有块时）、单步详情 | 结构对照缺失时只留单步详情 |

**节点目标（`data-node-id`）**：取页面实体表里的实体名（`entities`）+ 现有 `NODE_TO_STEP` / 节点点击逻辑给出的目标步骤；不另造映射。`index` 为 null 的支路步骤，标题写「支路 · {name}」而非「第 N 步」。

真实样例（数据层实测值）：

- **tca-1**：柠檬酸合酶，EC `2.3.3.1`，ΔG `−32.2 / −32.2 kJ/mol`，note「生理态数值未核实，暂按标准态口径显示」。
- **aa-1**：丙氨酸氨基转移酶，EC `2.6.1.2`，ΔG `value:null` + `qualitative`。
- **ch-1**：乙酰-CoA 乙酰转移酶 2，EC `2.3.1.9`，ΔG `value:null`。
- **尿素**：`standard/physiological` 均 null，`qualitative:「强放能（两步 ATP 驱动，生理上不可逆）」`。

渲染样例（tca-1）：
```
三羧酸循环 · 第 1 步 · 柠檬酸合酶
EC 2.3.3.1 · 不可逆
乙酰-CoA + 草酰乙酸 → 柠檬酸
ΔG −32.2 / −32.2 kJ/mol（生理态数值未核实，暂按标准态口径显示）
证据 A · 本酶人源
→ 结构对照
```
> 「A」为占位示例，实际值一律由 `gradesForStep()` 给出，文档不预设等级。

#### D. 结构页 2D 分子（`data-testid="mol-2d"` / `data-mol-id`）

来源：`MolPart`（stepComparison.ts L22–46）、所属 `StepComparison`（L87–117）、`PartEvidence`（L62–70）、`gradeOfPart()`。

| 气泡行 | 字段 |
|---|---|
| 标题 | `MolPart.name` + `formula` |
| 所属 | `StepComparison.enzyme`（+ `isozyme`）+ 底物/产物侧（按该分子落在 `substrate.parts` 还是 `product.parts`） |
| 反应上下文 | `StepComparison.equation` 或 `change` 单行 |
| 标注 | `marks[]` 文本 + `caveat` |
| 2D 来源 | `sourceNote`；`asset2d === null` 时用 `missing2dReason` |
| 3D 缺口 | `no3dReason`（有则单行「3D 无资产：…」） |
| 证据 | `gradeOfPart(evidence)`：A/B/C/D 或 `计算构象` / `仅2D`；未分级给 `ungradedReason` |
| 入口 | 结构对照（回到该块） |

样例（尖括号处按 `MolPart` 原文填入，不二次改写）：
```
柠檬酸 · C6H8O7
本步柠檬酸合酶的底物 · 2D 视角
反应：乙酰-CoA + 草酰乙酸 → 柠檬酸
标注：<marks 逐条拼接>
来源：<sourceNote>
本分子证据：A 本酶人源
→ 结构对照
```

**缺口**：`StepComparison` 无 EC、无 ΔG。按 `stepId` 联表 json 可补齐；若该步不在任何通路 json（理论上不会），则不渲染这两行。

### 1.3 证据等级的显示口径

| 推导结果 | 气泡文案 |
|---|---|
| A | `证据 A · 本酶人源` |
| B | `证据 B · 本酶跨种` |
| C | `证据 C · 人源非本酶` |
| D | `证据 D · 跨种非本酶` |
| `computed` | `覆盖：计算构象（不进 A–D）` |
| `none` | `覆盖：仅 2D（不进 A–D）` |
| 无块 / 未覆盖 | `证据 未分级（本步骤无结构对照块）` |
| 两侧不同 | 追加一句 `底物 X / 产物 Y（两侧不一致）` |

覆盖现状（实测）：共 77 块；amino 覆盖 `aa-1…aa-7`；cholesterol 仅 `ch-4,5,6,7,11,12,13`；`ch-1/2/3/8/9/10`、oxphos、Cori 无块 → 一律显示「未分级」，且不显示结构对照入口。

### 1.4 结构对照入口

- 只在「该 stepId 有对照块」时出现；路由沿用现有结构对照页入口，**本方案不新增路由**。
- 未固定态下入口只是文字（`→ 结构对照`），不可点（气泡 `pointer-events:none`）；固定态才变成真实链接。

---

## 2. 形态

### 2.1 视觉与尺寸

| 项 | 值 |
|---|---|
| 边框 | `1px solid #22282A` |
| 底色 | `#F6F3EC`（纸白） |
| 圆角 | `0` |
| 阴影 / 渐变 | 无 |
| 字号 / 行高 | 12px / 1.5（标题 12px 加粗，不放大） |
| 内边距 | 10px 12px |
| 最大尺寸 | 320 × 180 |
| 降级尺寸 | 视口宽 < 900 → 280×160；< 640 → 240×150；最小 200 宽 |
| 文本截断 | 单行 2 行封顶，超出加 `…`；`equation` 强制单行 |

**行预算（最多 8 行）**：1 标题 + 6 字段 + 1 入口。超预算时按「器官差异 → 3D 缺口 → 标注 → 反应上下文」顺序丢弃，**入口行最后丢**。丢弃不改变内容语义，只减少行数。

### 2.2 定位规则

优先序：**上 → 下 → 右 → 左**，间距 8px。

```
1. 目标 rect = target.getBoundingClientRect()（只读一次）
2. 上方 y = rect.top - h - 8，若 y >= 8 → 采用
3. 下方 y = rect.bottom + 8，若 y + h <= vh - 8 → 采用
4. 右侧 x = rect.right + 8，若 x + w <= vw - 8 → 采用
5. 左侧 x = rect.left - w - 8，若 x >= 8 → 采用
6. 全部失败 → 跟随指针：x = clientX + 16，y = clientY + 16（夹紧 8px）
7. 横向（或纵向）夹紧到 8px 视口边距；夹紧后若与目标相交 → 换下一候选位
8. 最终仍相交 → 允许「指针跟随」但保持与目标交集为 0
```

补充：
- 滚动容器内目标：坐标用视口矩形，气泡用 `position: fixed`，滚动即关闭，不做跟随重算。
- 多显示器 / 负坐标：夹紧到主视口内。
- 目标被缩放控件改变尺寸：打开时读一次，resize 关闭。

---

## 3. 触发与关闭

### 3.1 时序

| 场景 | 现有行为 | 方案 |
|---|---|---|
| 桌面 hover 弹出 | 无内容（仅 120ms 关闭的去向浮签） | **280ms** 后弹完整气泡 |
| 指针移出目标 | 120ms 关闭 | **220ms** 关闭；闭包期内指针落入气泡矩形则取消 |
| 指针移出气泡 | — | 220ms 关闭（未固定态） |
| 点击目标 | 跳转 | 单击仍跳转（气泡不拦截） |
| `Shift + 单击` | — | 固定（pin） |
| 固定后再次 `Shift + 单击` 同一目标 | — | 取消固定并关闭 |
| `Esc` | — | 关闭，固定态同样关闭 |
| 滚动 > 6px | — | 关闭 |
| 窗口 resize | — | 关闭 |
| 路由变化 | — | 关闭并清缓存 |
| 目标从 DOM 移除 | — | 关闭 |

**280ms 的理由**：挂图 12 页合计 373 个可点 SVG 目标，单页常有 20–60 个、且边线与节点密集；低于 200ms 时指针穿过相邻目标会连续闪出多个气泡，读不完也打断视觉；高于 350ms 又会被误认为「没有反应」。280ms 约等于一次短停顿，与移动端长按 450ms 不冲突。

**220ms 的理由**：比现有 120ms 略长，给「从目标移到气泡」留出容错；比 300ms 短，避免残影。

### 3.2 与 `PlateInteraction` 共存

现有 `PlateInteraction` 通过 `data-*` 发现目标（`data-step-id` / `data-node-id` / `data-step-block` / `data-link-step` / `data-module-id` / `data-transport-id` / `data-plate-row`），负责去浮签、折角、焦点框、触屏长按。

共存规则：

| 条件 | 谁接管 | 表现 |
|---|---|---|
| 鼠标 hover，模型存在 | **完整气泡** | 280ms 弹出；浮签不出现 |
| 鼠标 hover，模型缺失（未接入通路 / 无对照块 / 无 json） | 现有浮签 | 目的地文案，120ms 关闭 |
| 键盘 focus，模型存在 | 完整气泡 | 120ms 弹出 |
| 键盘 focus，模型缺失 | 现有浮签 | 同上 |
| 触屏长按 450ms，模型存在 | 完整气泡 | 不自动收起 |
| 触屏长按，模型缺失 | 现有目的地浮签 | 沿用 2600ms 自动收起 |
| 触屏长按后点击 | 目标跳转 | 沿用 `suppressClickUntil = now + 500ms` |

**互斥**：同一时刻只允许一个浮层。完整气泡打开时立即清掉浮签的 `hideTimer` 与 `pressTimer`；浮签打开时不得弹气泡。两者共用同一个「当前目标 id」，避免状态分叉。

实现上建议把「内容模型是否可用」作为唯一分流判据（`bubbleModel(target) → Model | null`），而不是按目标类型判断。

### 3.3 固定（pin）

- 默认**不固定**：`pointer-events: none`，鼠标可穿过气泡点中下面的目标，避免遮挡引发误操作。气泡不接收 hover，但交互层在 `document` 上监听 `pointermove`，指针落入气泡矩形即视为「仍在停留」，不会误关。
- `Shift + 单击` 固定：气泡获得 `pointer-events: auto`，入口链接可点；显示一个小 `×`（1px 线，非图标字体）。
- 固定态下：hover 其他目标不换内容；`Esc` / `×` / 点空白 / 滚动关闭。
- 为什么要 Shift：单击目前承载「选中步骤 / 跳转」语义，直接改成 pin 会破坏现有流程；修饰键让高级用法可发现又不抢主路径。

---

## 4. 触屏

| 行为 | 方案 |
|---|---|
| 长按 450ms | 触发**完整气泡**，替换现有目的地浮签；不自动收起 |
| 长按期间移动 > 10px | 取消（沿用现有阈值） |
| 长按后抬手 | 只显示气泡，**不跳转**（沿用 `suppressClickUntil` 500ms 抑制合成点击） |
| 再点目标本体 | 跳转（气泡 `pointer-events:none`，点击穿透；长按后 500ms 内的合成点击仍被抑制） |
| 点气泡外 / 滚动 | 关闭 |
| 双击 | 不做，避免与浏览器双击缩放冲突 |
| 无模型 | 降级为现有浮签，2600ms 自动收起 |

降级条件：目标不在任何通路 json（Cori 等首页专有节点）、模型构建时缺关键字段、或目标在数据层已失效 → 回到浮签，不做半成品气泡。

---

## 5. 键盘

| 项 | 方案 |
|---|---|
| focus 弹出 | **120ms** 后弹（键盘是显式意图，无需 280ms 防误触） |
| focus 移出 | 220ms 关闭；Tab 到气泡内链接时不关闭（仅固定态可达） |
| `role` | `role="tooltip"`；固定态若含链接，外层改 `role="dialog"` + `aria-label` |
| `aria-describedby` | 打开时动态 `id`（如 `cb-<n>`）挂到目标元素；关闭时移除；目标原有属性关闭后还原 |
| 读屏文案 | 只念 2 句摘要：`<名称>，<通路>。酶 <enzyme>，证据等级 <X>。` 不逐字段朗读 |
| `Esc` | 关闭并把焦点留在目标元素上 |
| Tab 顺序 | 未固定态气泡不在 Tab 序列（`pointer-events:none` + 无 tabindex）；固定态才把入口加入 |

与现有焦点框的关系：`PlateInteraction` 已有的 `.plate-aff-focus` 继续显示，气泡不替代焦点框。

---

## 6. 性能

### 6.1 规模

| 区域 | 可点目标 | 构成 |
|---|---|---|
| 12 张挂图页 | **414** | 373 个 SVG 目标 + 41 个表行 |
| 首页 | **114** | 节点 + 步骤边 / 步骤引用 |
| 结构页 2D 分子 | 按步骤 `parts` 实际数量 | `[data-mol-id]` |
| 合计 | 528 + 分子 | — |

### 6.2 建议做法

- **不预渲染**：528 个气泡节点一次性挂 DOM 会显著抬高首屏节点数与内存，且 99% 永远不打开。
- **单例 DOM**：整个应用只有一个气泡节点，打开时填充内容。
- **事件委托**：在交互层监听 `pointerover` / `pointerout` / `focusin` / `focusout`（捕获阶段），用 `closest('[data-*]')` 命中目标；不给每个目标单独绑事件。
- **惰性模型缓存**：`Map<targetId, Model>`；首次打开才构建，构建内容是一次字段读取 + 一次 `gradesForStep()`，量级 0.2–0.5ms。
- **矩形只读一次**：打开时 `getBoundingClientRect()` 一次，定位计算在内存里完成；关闭/滚动即失效。
- **缓存失效**：organ 切换、路由变化、数据版本变化时清空 Map；不做逐目标 `ResizeObserver`。

### 6.3 代价与风险

| 项 | 代价 |
|---|---|
| 首次打开延迟 | 0.2–0.5ms（远低于 280ms 延迟，不可感知） |
| 事件委托 | 需处理 `pointerover` 冒泡误命中，必须 `closest` + 目标 id 去重 |
| 缓存 | 需在 organ / 路由切换时显式清空，否则表行器官差异会串味 |
| 结构页 | 分子目标只在当前块渲染，模型可复用同一 `stepId` 缓存 |

**不采用**：IntersectionObserver 预取（对本场景过量）、requestIdleCallback 预构建全部模型（首页 114 个会产生无谓计算）。

---

## 7. 与「半透明 / 遮挡」的关系

现有页面有半透明压底层（选中步骤置灰、区域带底纹等）。气泡必须是**不透明纸白底**，否则与背景文字叠加会不可读。

验收口径（2026-11-06 定稿：保留就近弹出，改软指标口径）：

| 约束 | 阈值 | 性质 |
|---|---|---|
| 气泡 ∩ 自身目标 | **0 px²** | 硬（定位算法保证） |
| 气泡 ∩ 图框内正文文本块 | **0 px²** | 硬（文本块含步骤注脚、表头、图例） |
| 气泡面积 | **≤ 5% 视口** | 硬 |
| 气泡与非目标图框的关系 | **落在图框内的部分均为非文本区**（整块在内 / 整块在外 / 跨边界均通过） | 软指标（定性判据，取代原 12,000 px² 绝对上限） |
| 气泡透明度 | **不透明**（alpha = 1） | 硬 |

**原「图框非文本区 ≤ 12,000 px²」为何不适用**：挂图画布 `.plate-canvas` 为 1760×750（约 132 万 px²）且几乎覆盖整个视口，气泡 260×158 约 41,200 px²；只要气泡靠近目标，就会整块落在画布内，绝对面积上限恒被突破（实测 41,177.5 px² 恰好等于气泡自身面积）。因此改为定性判据：只要求气泡落在图框内的部分不含正文；整块在框内、整块在框外、或跨框边界都通过（跨边界时框外那部分不遮挡任何内容）。「压正文」已由上一行硬指标单独约束为 0。

实测（1440×900，121 个样本）：遮挡自身目标 0 px²、压正文 0 px²、视口占比最大 3.18%。图框分布：糖酵解 整块在内 3 / 整块在外 0 / 跨边界 17；TCA 8 / 0 / 5；首页 7 / 9 / 79；结构页 0 / 2 / 0。最大图框交面积 41,177.5 px²（糖酵解、TCA）与 26,747.5 px²（首页），均 ≤ 气泡自身面积，且落框部分不含任何文本块。

实测口径：沿用 `preview/layout-audit-after.json` 的矩形求交方式（`getBoundingClientRect` + 面积交），新增一项「气泡 vs 目标」「气泡 vs 文本块」「气泡 vs 图框」三组交面积。当前审计结果为 clipped 0 / svgClipped 0 / unreachable 0 / significantOverlaps 0，可作为回归基线。

若某目标四面都放不下（例如贴在视口右下角且四周有文字），降级为「指针跟随 + 8px 夹紧」，并允许气泡贴边但不压目标；仍无法满足时**不弹**，保留浮签。

---

## 8. 落地成本

### 8.1 文件与行数

| 文件 | 动作 | 估计行数 |
|---|---|---|
| `src/lib/bubbleModel.ts` | 新增：四类模型构建 + `readDeltaG` / EC 归一 / 等级包装 | ~260 |
| `src/components/ContentBubble.tsx` | 新增：单例气泡、定位、pin、`aria-describedby` | ~240 |
| `src/components/PlateInteraction.tsx` | 改：分流、时序、长按升级、互斥清理 | +80 / −30 |
| 现有 poster / plate 样式 | 改：气泡样式与降级尺寸 | +150 |
| `src/pages/HomePage.tsx` | 改：把节点/边模型接入交互层 | +35 |
| `src/pages/StructureFramesPage.tsx` | 改：分子目标接入（`data-mol-id` 已有） | +20 |
| 12 个挂图页 | 改：每页传 `pathwayId` 给交互层做联表 | 每页 +1 |
| `src/data/homeMap.ts` 或新增 `src/data/stepIndex.ts` | 改/新增：`pathwayId + stepId → Step` 索引 | +25 / ~70 |
| `tools/smoke-content-bubble.mjs` | 新增：冒烟 | ~200 |

合计约 **1,200 行**，无新依赖、无新路由、无新组件库。

### 8.2 数据层缺口清单

| # | 缺口 | 影响 | 建议 |
|---|---|---|---|
| 1 | `HomeStepRef` / `HomeEdge` 无 EC、ΔG、equation | 首页气泡需联表；联表失败则少两行 | 优先用 `stepId` 联表；若首页要覆盖全部 11 条通路，再考虑补字段 |
| 2 | `StepComparison` 无 EC、ΔG | 结构页分子气泡需联表 | 同上，联表即可，不急着改类型 |
| 3 | `DeltaG` 类型声明 `standard/physiological: number`，尿素实际 `null` | TS 严格模式下直接读会误判 | 新增归一化读取函数，类型放宽为 `number \| null` |
| 4 | `comparisonConfig` 覆盖不全（cholesterol 仅 7/13 步；oxphos、Cori 无块） | 这些目标只能显示「未分级」 | 如实显示，不补等级 |
| 5 | 首页 `SOURCES` 仅接 6 条通路 | 其余通路节点无 ΔG / 等级 | 气泡按「有则显示」策略，不阻止上线 |

**结论**：本方案**不强制新增数据字段**；所有字段都能从现有数据层取到或按 `stepId` 联表补齐。缺口 3 需要在实现时改一处类型（或包一层归一化函数），属于最小改动。

### 8.3 建议实施顺序

1. 先做 `bubbleModel.ts` + 单元口径（四类目标各一个真实样例）。
2. 再做 `ContentBubble.tsx` + 定位算法（先只接挂图步骤，验证遮挡）。
3. 接入 `PlateInteraction` 分流与长按升级（保证浮签不打架）。
4. 接首页节点 / 边，再接结构页分子。
5. 最后跑冒烟与 54 页审计复核。

---

## 9. 需要用户拍板的点（4 条）

1. **时序**：hover 280ms 弹出、移出 220ms 关闭（触屏长按沿用 450ms）——是否按此定稿？
2. **固定方式**：单击保持跳转、`Shift + 单击` 才固定（气泡默认 `pointer-events:none` 不挡点击）——是否接受，还是希望单击即固定？
3. **触屏长按**：是否用完整气泡取代现有「目的地浮签」（模型缺失时仍降级为浮签）？
4. **遮挡验收**：遮挡自身目标 0 px²（硬）、压图框内正文 0 px²（硬）、气泡 ≤ 5% 视口（硬）、气泡落在图框内的部分均为非文本区（软，取代原 12,000 px² 绝对上限）——是否按此验收？

## 10. 本文明确不做的事

- 不新建组件、不改 `src/` 任何文件、不跑构建、不提交。
- 不新增路由、不新增数据文件、不引入依赖。
- 不把气泡做成侧栏或右侧阅读栏（那是另一套方案，见 `todo-hover-detail.md` 的备选）。
- 不为缺失字段编造文案。
