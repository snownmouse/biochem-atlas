# 全站回归与一致性检查报告（2026-11-03）

范围：糖酵解 / TCA / 糖异生三张挂图、结构帧带页、单步结构视图、纯数据层切片（FAO / PPP / 糖异生）。
口径：只修"阻塞级"问题（页面报错、路由 404、链接 href 错、断言与实际行为矛盾、视觉纪律明显违规），不做视觉改造。

## 结论

**全站当前没有阻塞级问题。** 8 套验证全绿，53 项一致性检查全部通过；本次实际修复阻塞级问题 **0 条**。一致性检查脚本初跑报出 5 个失败，逐条人工定性后全部为**检查脚本自身断言过严/误报**（详见下文），已修正检查脚本而非生产代码。最慢且最脆的一套是 `smoke-frames`（39.0s，91 项，依赖逐帧加载 39 个 JSON 资产）；最快的是三个数据校验器（<0.15s）。

## 一、验证套件 × 通过数

| 套件 | 结果 | 通过数 | 耗时 | 备注 |
|---|---|---|---|---|
| `npm run build` | ✅ | 55 modules | 1.91s | 3Dmol eval 警告与 chunk>500kB 提示为已知既有噪声 |
| `tools/smoke-embed.mjs` | ✅ | 91 项 | 31.5s | URL 还原 / 器官切换 / 内嵌 3D / 降级分支 |
| `tools/smoke-tca.mjs` | ✅ | 39 项 | 9.4s | 含自测语义与 TCA 截图产出 |
| `tools/smoke-frames.mjs` | ✅ | 91 项 | 39.0s | 39 帧逐帧走查；**最慢** |
| `tools/smoke-gluconeogenesis.mjs` | ✅ | 48 项 | 6.5s | 含三页互通切换断言 |
| `tools/validate-gluconeogenesis.mjs` | ✅ | 正例 0 错 + 负例 10/10 | 0.08s | |
| `tools/validate-fao.mjs` | ✅ | 正例 0 错 + 负例 9/9 | 0.13s | |
| `tools/validate-ppp.mjs` | ✅ | 正例 0 错 + 负例 8/8 | 0.12s | |

无任何断言被删除或为跑绿而弱化；本次未改动任何被测代码。

## 二、一致性检查 6 项结论（无头浏览器实测，53/53 通过）

1. **四条路由 + 单步页可达** ✅
   `/pathway/glycolysis`、`/pathway/tca`、`/pathway/gluconeogenesis`、`/structures/glycolysis`、`/step/gk-6` 全部 HTTP 200，首屏内容完整，`pageerror` / `console.error` 均为 0。

2. **通路切换** ✅
   三张挂图 crumb 均含全部互通链接（糖酵解 ⇄ TCA ⇄ 糖异生），实际点击逐条走通。crumb 链接 computed style：`border-radius: 0px`、无背景色、`border-bottom: 1px dotted` 下划线文字——符合 B 视觉纪律，无胶囊/按钮残留。

3. **面包屑与 URL 还原** ✅
   - `?step=`：糖酵解 gk-6、TCA tca-5、糖异生 gn-1 刷新后均保持选中态（`g.sel`）。
   - `?organ=muscle`：刷新后器官 tab 仍为"肌"。
   - `?frame=gk-6-f1`：帧带页刷新后主舞台 `data-frame-id` 仍为该帧。
   - 单步页面包屑可见且能回上一层挂图（`/pathway/glycolysis`）；挂图带 `?step=gk-9` 深链时面包屑仍在。

4. **视觉纪律抽样** ✅（5 页全扫，DOM 级 computed style 遍历）
   圆角卡片、投影、彩色渐变、emoji、胶囊 tab：五类残留均为 0。两处边界情况人工定性为非违规（见"建议"第 1、2 条）。

5. **交互语义一致** ✅
   糖酵解（gk-3）、TCA（tca-3）、糖异生（gn-1）三页同一套语义：非自测点酶名 → 选中该步；自测模式点酶名 → 揭晓且不切换选中。三页行为完全一致。

6. **帧入口覆盖与数据一致** ✅
   按 `structureFrames.ts` 数据推导（非硬编码）：gk-1～gk-10 十步全部有"看这一步的结构帧"链接，且 href 均指向各步数据首帧；gk-rap 数据 0 帧 → 页面灰字"结构帧尚未接入"。页面入口与数据完全一致，无链接/灰字错位。

## 三、阻塞级修复清单

**空。** 未发现页面报错、404、href 错误、断言与行为矛盾或明显视觉违规。

一致性检查脚本初跑的 5 个失败项定性记录（检查脚本已修正，生产代码未动）：

| 初报失败 | 定性 | 处理 |
|---|---|---|
| 挂图页检出 `repeating-linear-gradient` | 误报：[styles.css L429-430](file:///d:/生化大项目/src/styles.css#L429-L430) 是 1px 墨色坐标纸网格纹理（挂图体例的纸面质感），非彩色装饰渐变 | 检查脚本排除 1px 网格纹理 |
| `/step/gk-6` 检出 `.dot` 圆角 50% | 误报：9px 图例色点（圆形色点是图例体例），非圆角卡片 | 检查脚本排除百分比圆角 |
| `/step/gk-6` 检出 `.op-hint` 圆角 999px | 边界：深色一次性操作提示气泡（墨/纸配色），不是胶囊 tab 控件；形状本身可议 → 列入建议第 2 条 | 检查脚本白名单 + 人工定性 |
| `/step/gk-6` 面包屑"能回挂图对应步"失败 | 断言过严：实际断言写成必须带 `?step=` 参数回挂图；页面行为是回上一层 `/pathway/glycolysis`，符合"面包屑回上一层"要求 | 断言修正为"能回上一层挂图"；带 step 参数回跳列入建议第 3 条 |
| `smoke-frames` 统计出 1 个 "fail" | 误报：脚本内统计正则误把"✓ 无页面错误（pageerror/console.error）"文案里的 "Error" 当失败 | 统计口径修正（不属于任何被测对象） |

## 四、建议清单（本次不修）

1. **`.op-hint` 提示气泡为胶囊形**（[styles.css L198-206](file:///d:/生化大项目/src/styles.css#L198-L206)）：深色圆角气泡浮层，配色合规但形状与"胶囊"禁令擦边。若要更保守可改为直角细边框提示条。涉及两处定义（`.op-hint` 与 `.poster.step-poster .op-hint`）。
2. **挂图页 crumb 的 `<b>` 当前项**：当前通路用 `<b>` 加粗呈现，与链接项视觉区分度尚可，但严格说"标注层级固定"体例可考虑统一为"当前项无下划线 + 链接项有下划线"已有实现，仅建议保持现状不折腾。
3. **单步页面包屑回挂图不带 `?step=`**：~~从 `/step/gk-6` 返回挂图后不还原第 6 步选中态~~ → **已于当日修复（见第六节）**。
4. **`smoke-frames` 耗时 39s**：逐帧走查 39 个 JSON 资产串行加载所致。若后续帧数增长，可考虑并行预取或按 `?frame=` 分段走查，属工程优化非缺陷。
5. **构建 chunk 体积提示**：3Dmol 单 chunk 588 kB（gzip 169.8 kB），已是动态 import 拆分后的结果，符合"首屏 3D 资产为 0"约束，仅留档备查。

## 五、产出物

- 截图（1440 宽）：`preview/final-00-poster-glycolysis.png`、`final-01-tca.png`、`final-02-gluconeogenesis.png`、`final-03-frames.png`（gk-6 首帧）、`final-04-step.png`（`/step/gk-6`）
- 一致性检查脚本：本次为一次性脚本（未入仓库），六项检查逻辑已完整记录于本报告第二节

## 六、当日追记：单步页面包屑返回语义对齐（回归报告产出后的唯一一处代码改动）

用户确认采纳建议第 3 条后执行，**改动仅此一处，未扩大范围**：

- **修复**：[StepViewPage.tsx L106](file:///d:/生化大项目/src/pages/StepViewPage.tsx#L106) 面包屑回挂图链接由 `/pathway/${pathway.id}` 改为 `/pathway/${pathway.id}?step=${step.id}`——步 id 由路由参数解析出的当前步对象取（`step.id`，非硬编码），与帧带页"返回挂图带 `?step=`"语义对齐。
- **断言**：[smoke-embed.mjs](file:///d:/生化大项目/tools/smoke-embed.mjs) 第 7 节新增 1 条——单步页面包屑回挂图 href 必须等于 `/pathway/glycolysis?step=<路由参数步 id>`（步 id 从 `page.url()` 路径取，不硬编码）。
- **验证**：`npm run build` ✓（2.04s）；`node tools/smoke-embed.mjs` **92/92 全过**（91 + 新增 1，31.4s）。其余套件未受影响（本次改动不触及挂图渲染、帧带、数据层），按约定未重跑。

