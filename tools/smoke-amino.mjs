// 氨基酸代谢挂图冒烟（playwright-core + 本机 Edge/Chrome，与 smoke-urea / smoke-glycogen 同款机制）。
//
// 校验口径：路由（含别名）可达、20 种芯片按 3 簇分组、两道闸的两条接口弧、
// 七去路 + 乙酰乙酰-CoA unbuilt、三条临床支路可折叠、点击步骤 / 分子 / 酶 / 去路 / 接口芯片、
// ?step= 还原、图框 1px 直角 + 四向 24px、无缩放控件、无 emoji / 圆角 / 渐变、
// 结构对照 7 块可达，以及 1440 / 1280 三档首页标题落屏数字（如实记录，不为塞进首屏调坐标）。
// 需先 `npm run build`，再 `npm run preview`（或 BASE_URL 指向本地服务）。
import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.BASE_URL ?? "http://localhost:4173";
let failed = false;
const check = (label, ok, detail) => {
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? `  ${detail}` : ""}`);
  if (!ok) failed = true;
};

async function launch() {
  for (const channel of ["msedge", "chrome"]) {
    try {
      return await chromium.launch({ channel, headless: true });
    } catch (e) {
      console.warn(`channel ${channel} 不可用：${e.message}`);
    }
  }
  throw new Error("未找到可用的 Edge/Chrome 浏览器");
}

const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

mkdirSync(join(ROOT, "preview"), { recursive: true });
const CONSOLES = () => errors.filter((e) => !/favicon|404/i.test(e));

// ===== 1) 路由可达 + 20 种 / 三簇 / 两闸 / 七去路 =====
const resp = await page.goto(`${BASE}/pathway/amino-acids`, { waitUntil: "networkidle" });
check("路由 /pathway/amino-acids 可达（200）", resp?.status() === 200);
check("挂图 svg 存在且唯一", (await page.locator("svg[data-frame='amino']").count()) === 1);
check("无控制台报错", CONSOLES().length === 0, CONSOLES().slice(0, 3).join(" | "));

const plate = page.locator("svg[data-frame='amino']");
check("画布 1980×1240", (await plate.getAttribute("width")) === "1980" && (await plate.getAttribute("height")) === "1240");
check("三分类分组标记 data-class-groups=3", (await plate.getAttribute("data-class-groups")) === "3");
check("20 种氨基酸计数 data-amino-count=20", (await plate.getAttribute("data-amino-count")) === "20");
check("七去路计数 data-fate-count=7", (await plate.getAttribute("data-fate-count")) === "7");
check("三条临床支路 data-clinical-branches=3", (await plate.getAttribute("data-clinical-branches")) === "3");
check("七步 data-step-count=7", (await plate.getAttribute("data-step-count")) === "7");
check("无缩放标记 data-no-zoom=1", (await plate.getAttribute("data-no-zoom")) === "1");

const groupBands = page.locator("svg[data-frame='amino'] [data-group-id]");
check("分类分组带存在（3 条）", (await groupBands.count()) === 3, String(await groupBands.count()));
const groupIds = await groupBands.evaluateAll((els) => els.map((el) => el.getAttribute("data-group-id")));
check("分组带为 grp-glucogenic / grp-both / grp-ketogenic", ["grp-glucogenic", "grp-both", "grp-ketogenic"].every((id) => groupIds.includes(id)), groupIds.join(","));
check("分组带标签写「生糖 · GLUCOGENIC（14）」", (await page.locator("svg[data-frame='amino']").evaluate((el) => el.textContent ?? "")).includes("生糖 · GLUCOGENIC（14）"));
check("分组带标签写「生糖兼生酮 · BOTH（4）」", (await plate.evaluate((el) => el.textContent ?? "")).includes("生糖兼生酮 · BOTH（4）"));
check("分组带标签写「生酮 · KETOGENIC（2）」", (await plate.evaluate((el) => el.textContent ?? "")).includes("生酮 · KETOGENIC（2）"));

const chips = page.locator("svg[data-frame='amino'] [data-node-kind='amino']");
check("氨基酸芯片 20 个（不是 20 个节点平铺）", (await chips.count()) === 20);
const chipEntityIds = await chips.evaluateAll((els) => els.map((el) => el.getAttribute("data-entity-id")));
check("20 种实体齐全且唯一", chipEntityIds.length === 20 && new Set(chipEntityIds).size === 20, chipEntityIds.join(","));
check("生酮组只有 Leu / Lys 芯片", chipEntityIds.includes("leu") && chipEntityIds.includes("lys"));

const chipsByBand = await page.evaluate(() => {
  const band = (id) => {
    const el = document.querySelector(`[data-group-id="${id}"] rect`);
    return el ? { x: +el.getAttribute("x"), y: +el.getAttribute("y"), w: +el.getAttribute("width"), h: +el.getAttribute("height") } : null;
  };
  const inside = (id, r) => r && r.x0 >= r.x && r.x1 <= r.x + r.w && r.y0 >= r.y && r.y1 <= r.y + r.h;
  const rect = (el) => {
    const x = +el.getAttribute("x");
    const y = +el.getAttribute("y");
    const w = +el.getAttribute("width");
    const h = +el.getAttribute("height");
    return { x0: x, x1: x + w, y0: y, y1: y + h };
  };
  const out = { glucogenic: 0, both: 0, ketogenic: 0, misfiled: [] };
  for (const g of document.querySelectorAll("svg[data-frame='amino'] [data-node-kind='amino']")) {
    const r = rect(g.querySelector("rect"));
    const id = g.getAttribute("data-entity-id");
    let hit = null;
    for (const key of ["glucogenic", "both", "ketogenic"]) {
      const box = band(`grp-${key}`);
      if (box && r.x0 >= box.x && r.x1 <= box.x + box.w && r.y0 >= box.y && r.y1 <= box.y + box.h) hit = key;
    }
    if (hit) out[hit] += 1;
    else out.misfiled.push(id);
  }
  return out;
});
check("生糖簇 14 个芯片全在带内", chipsByBand.glucogenic === 14, JSON.stringify(chipsByBand));
check("生糖兼生酮簇 4 个芯片全在带内", chipsByBand.both === 4, JSON.stringify(chipsByBand));
check("生酮簇 2 个芯片全在带内", chipsByBand.ketogenic === 2, JSON.stringify(chipsByBand));
check("无芯片落在分组带外", chipsByBand.misfiled.length === 0, chipsByBand.misfiled.join(","));

// ===== 2) 两道闸 + 双氮源接口 =====
const stepLabels = page.locator("svg[data-frame='amino'] [data-step-label='1']");
check("五条主链步骤标签（aa-1…aa-5）", (await stepLabels.count()) === 5, String(await stepLabels.count()));
const stepIds = await stepLabels.evaluateAll((els) => els.map((el) => el.getAttribute("data-step-id")));
check("步骤标签 id 为 aa-1…aa-5", ["aa-1", "aa-2", "aa-3", "aa-4", "aa-5"].every((id) => stepIds.includes(id)), stepIds.join(","));
check("转氨闸 ALT / AST 在图上", (await plate.evaluate((el) => el.textContent ?? "")).includes("ALT · 丙氨酸转氨酶") && (await plate.evaluate((el) => el.textContent ?? "")).includes("AST · 天冬氨酸转氨酶"));
check("氧化脱氨闸 GLDH / GLS1 在图上", (await plate.evaluate((el) => el.textContent ?? "")).includes("GLDH · 谷氨酸脱氢酶") && (await plate.evaluate((el) => el.textContent ?? "")).includes("GLS1 · 谷氨酰胺酶"));
check("NH₄⁺ 接口芯片 if-nh4 存在", (await page.locator("svg[data-frame='amino'] [data-node-id='if-nh4']").count()) === 1);
check("接口芯片写明「血氨处置见尿素循环 PLATE 09」", (await plate.evaluate((el) => el.textContent ?? "")).includes("血氨处置见尿素循环 PLATE 09"));
check("两条接口弧（GLDH / GLS1 → if-nh4）", (await page.locator("svg[data-frame='amino'] [data-link-type='interface']").count()) === 2);
check("接口芯片不重画尿素循环", (await page.locator("svg[data-frame='amino'] [data-node-id^='urea-']").count()) === 0);

// ===== 3) 七去路 + unbuilt =====
const fateNodes = page.locator("svg[data-frame='amino'] [data-node-kind='fate']");
check("七个去路节点", (await fateNodes.count()) === 7, String(await fateNodes.count()));
check("乙酰乙酰-CoA 节点标注 linked（生酮已建 PLATE 13）", (await page.locator("svg[data-frame='amino'] [data-node-id='fate-acacoa']").getAttribute("data-fate-status")) === "linked");
check("已接入去路写明 ketone:kt-1 / ketone:kt-3", (await page.locator("svg[data-frame='amino'] [data-node-id='fate-acacoa']").evaluate((el) => el.textContent ?? "")).includes("ketone:kt-3"));
const fateText = await page.locator("svg[data-frame='amino']").evaluate((el) => el.textContent ?? "");
check("去路写真实 id：glycolysis:gk-10", fateText.includes("glycolysis:gk-10"));
check("去路写真实 id：tca:tca-1 / tca:tca-4 / tca:tca-5", ["tca:tca-1", "tca:tca-4", "tca:tca-5"].every((s) => fateText.includes(s)));

// ===== 4) 临床支路可折叠 =====
check("临床节点默认三条", (await page.locator("svg[data-frame='amino'] [data-node-id^='clin-']").count()) === 3);
check("临床折叠开关默认展开", (await plate.getAttribute("data-clinical-open")) === "1");
await page.locator("[data-clinical-toggle='1']").click();
check("收起后临床节点 0 条", (await page.locator("svg[data-frame='amino'] [data-node-id^='clin-']").count()) === 0);
check("收起后临床分区带消失", (await page.locator("svg[data-frame='amino'] [data-zone-id='zone-clinical']").count()) === 0);
check("收起后 data-clinical-open=0", (await plate.getAttribute("data-clinical-open")) === "0");
await page.locator("[data-clinical-toggle='1']").click();
check("展开后临床节点恢复 3 条", (await page.locator("svg[data-frame='amino'] [data-node-id^='clin-']").count()) === 3);

// ===== 5) 点击语义：步骤 / 分子 / 酶 / 去路 / 接口 =====
await page.locator("svg[data-frame='amino'] [data-step-id='aa-1']").click({ force: true });
await page.waitForURL(/step=aa-1/, { timeout: 3000 }).catch(() => {});
check("点步骤标签 aa-1 → URL step=aa-1", page.url().includes("step=aa-1"));
check("右栏 ALT 详情出现", (await page.locator("aside [data-detail-kind='step'] .d-enzyme").innerText()).includes("丙氨酸氨基转移酶"));
check("ALT ΔG 不出现具体数值", !/(kJ\/mol|kcal\/mol|eQuilibrator)/.test(await page.locator("aside [data-detail-kind='step']").innerText()));

await page.locator("svg[data-frame='amino'] [data-node-id='aa-chip-glu']").click({ force: true });
check("点 Glu 芯片 → 分子详情", (await page.locator("aside [data-detail-kind='entity']").count()) === 1);
check("分子详情出现 L-谷氨酸", (await page.locator("aside [data-detail-kind='entity'] .d-step").innerText()).includes("L-谷氨酸"));
check("分子式带上标 C₅H₈NO₄⁻", (await page.locator("aside [data-detail-kind='entity']").innerText()).includes("C₅H₈NO₄⁻"));
check("电离态逐项：α-羧基 / γ-羧基 / α-氨基", (await page.locator("aside [data-detail-kind='entity'] [data-ionizable='1']").innerText()).includes("α-羧基") && (await page.locator("aside [data-detail-kind='entity'] [data-ionizable='1']").innerText()).includes("γ-羧基"));
check("分子详情写明分类归属", (await page.locator("aside [data-detail-kind='entity']").innerText()).includes("生糖"));

await page.locator("svg[data-frame='amino'] [data-node-id='enz-gldh']").click({ force: true });
await page.waitForURL(/step=aa-3/, { timeout: 3000 }).catch(() => {});
check("点 GLDH 酶盒 → step=aa-3", page.url().includes("step=aa-3"));
check("右栏 GLDH 详情出现", (await page.locator("aside [data-detail-kind='step'] .d-enzyme").innerText()).includes("谷氨酸脱氢酶"));
check("GLDH 详情写 NAD(P)⁺ 辅因子", (await page.locator("aside [data-detail-kind='step']").innerText()).includes("NAD(P)⁺"));

await page.locator("svg[data-frame='amino'] [data-node-id='fate-pyr']").click({ force: true });
check("点丙酮酸去路 → 去路详情", (await page.locator("aside [data-detail-kind='fate']").count()) === 1);
check("去路详情出现 糖酵解 · gk-10 链接", (await page.locator("aside [data-detail-kind='fate']").innerText()).includes("糖酵解 · gk-10"));
check("去路链接 href 指向 /pathway/glycolysis?step=gk-10", (await page.locator("aside [data-detail-kind='fate'] a").first().getAttribute("href")) === "/pathway/glycolysis?step=gk-10");

await page.locator("svg[data-frame='amino'] [data-node-id='fate-acacoa']").click({ force: true });
check("点乙酰乙酰-CoA → 去路详情写 酮体代谢", (await page.locator("aside [data-detail-kind='fate']").innerText()).includes("酮体代谢 · kt-3"));
check("已接入去路给出两条生酮链接", (await page.locator("aside [data-detail-kind='fate'] a").count()) === 2);

await page.locator("svg[data-frame='amino'] [data-node-id='if-nh4']").click({ force: true });
check("点 NH₄⁺ 接口芯片 → 接口详情", (await page.locator("aside [data-detail-kind='interface']").count()) === 1);
check("接口详情写「血氨处置见尿素循环 PLATE 09」", (await page.locator("aside [data-detail-kind='interface']").innerText()).includes("血氨处置见尿素循环 PLATE 09"));
check("接口链接指向 /pathway/urea-cycle?step=urea-1", (await page.locator("aside [data-detail-kind='interface'] a").getAttribute("href")) === "/pathway/urea-cycle?step=urea-1");

await page.locator("svg[data-frame='amino'] [data-node-id='clin-pku']").click({ force: true });
check("点 PKU 临床节点 → step=aa-6", page.url().includes("step=aa-6"));
check("右栏 PAH 详情出现", (await page.locator("aside [data-detail-kind='step'] .d-enzyme").innerText()).includes("苯丙氨酸羟化酶"));

// ===== 6) ?step= 还原 =====
await page.goto(`${BASE}/pathway/amino-acids?step=aa-2`, { waitUntil: "networkidle" });
check("URL 还原：aa-2 唯一选中态", (await page.locator("svg[data-frame='amino'] g[data-step-id='aa-2'].sel").count()) === 1);
check("URL 还原：右栏 AST 详情", (await page.locator("aside [data-detail-kind='step'] .d-enzyme").innerText()).includes("天冬氨酸氨基转移酶"));
await page.goto(`${BASE}/pathway/amino-acid-metabolism`, { waitUntil: "networkidle" });
check("别名路由 /pathway/amino-acid-metabolism 可达", (await page.locator("svg[data-frame='amino']").count()) === 1);
check("别名路由渲染同一页（20 芯片）", (await page.locator("svg[data-frame='amino'] [data-node-kind='amino']").count()) === 20);

// ===== 7) 图框 / 无缩放 / 无 emoji / 无圆角 / 无渐变 =====
await page.goto(`${BASE}/pathway/amino-acids`, { waitUntil: "networkidle" });
const frame = await page.locator(".plate-scroll").evaluate((el) => {
  const s = getComputedStyle(el);
  return {
    border: [s.borderTopWidth, s.borderRightWidth, s.borderBottomWidth, s.borderLeftWidth],
    radius: [s.borderTopLeftRadius, s.borderTopRightRadius, s.borderBottomRightRadius, s.borderBottomLeftRadius],
    padding: [s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft],
    overflowX: s.overflowX,
    scrollW: el.scrollWidth,
    clientW: el.clientWidth,
  };
});
check("图框四边 1px", frame.border.every((w) => Math.abs(parseFloat(w) - 1) <= 0.1), frame.border.join(" "));
check("图框直角（四角 border-radius=0）", frame.radius.every((r) => parseFloat(r) === 0), frame.radius.join(" "));
check("图框四向内边距 ≥24px", frame.padding.every((p) => parseFloat(p) >= 24), frame.padding.join(" "));
check("图容器横向可滚（1980 > 可视宽）", frame.scrollW > frame.clientW, `${frame.scrollW} / ${frame.clientW}`);
const docFit = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
check("页面级无横向溢出（横向只在图容器内滚）", docFit.scroll <= docFit.client + 2, JSON.stringify(docFit));
const canvasBg = await page.locator(".poster-amino .plate-canvas").evaluate((el) => getComputedStyle(el).backgroundImage);
check("画布无网格渐变（background-image=none）", canvasBg === "none", canvasBg);
const rounded = await page.locator("svg[data-frame='amino'] rect").evaluateAll((els) =>
  els.filter((el) => Number(el.getAttribute("rx") ?? 0) > 0 || Number(el.getAttribute("ry") ?? 0) > 0).length,
);
check("SVG 图元无圆角（rx / ry = 0）", rounded === 0, String(rounded));
const defsBad = await page.locator("svg[data-frame='amino']").evaluate((el) => ({
  grad: el.querySelectorAll("linearGradient, radialGradient, filter, pattern").length,
}));
check("SVG 无渐变 / 滤镜 / 图案", defsBad.grad === 0, String(defsBad.grad));
const emoji = await page.evaluate(() => {
  const text = document.querySelector(".poster-amino")?.textContent ?? "";
  return /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u.test(text);
});
check("页面无 emoji", emoji === false);
const zoomCount = await page.locator("button, input, [role=slider], [class*=zoom]").evaluateAll((els) =>
  els.filter((el) => /zoom|缩放|放大|缩小/.test((el.textContent ?? "").trim()) || /zoom/i.test(String(el.className))).length,
);
check("无缩放控件", zoomCount === 0, String(zoomCount));

// ===== 8) 右栏口径块 =====
const clsText = await page.locator("aside [data-amino-classification='1']").innerText();
check("右栏分类口径写 Lehninger 8e Ch.18", clsText.includes("Lehninger") && clsText.includes("8e") && clsText.includes("Ch.18"));
check("右栏分类口径写 14 / 4 / 2", clsText.includes("14") && clsText.includes("4") && clsText.includes("2"));
check("右栏 Thr 分歧并列", clsText.includes("Thr") && clsText.includes("生糖兼生酮"));
check("右栏七去路 7 行", (await page.locator("aside [data-fate-row]").count()) === 7);
check("右栏器官差异 3 行", (await page.locator("aside [data-organ-row]").count()) === 3);
check("右栏能量账写「无净收支」", (await page.locator("aside [data-amino-energy='1']").innerText()).includes("无净收支"));
check("右栏 PDB 核验 10 条", (await page.locator("aside [data-amino-pdb='1'] [data-pdb-id]").count()) === 10);
const pdbIds = await page.locator("aside [data-amino-pdb='1'] [data-pdb-id]").evaluateAll((els) => els.map((el) => el.getAttribute("data-pdb-id")));
check("PDB 无 2CG5 / 1XKT / 1C9S / 4F2Y", ["2CG5", "1XKT", "1C9S", "4F2Y"].every((id) => !pdbIds.includes(id)), pdbIds.join(","));
check("右栏写明 3D pending / 只做 2D", (await page.locator("aside [data-amino-open='1']").innerText()).includes("2D"));

// ===== 9) 结构对照页可达 =====
await page.goto(`${BASE}/structures/amino-acids`, { waitUntil: "networkidle" });
check("结构对照 /structures/amino-acids 可达", (await page.locator("h1").first().innerText()).includes("氨基酸"));
const cmpIds = await page.locator("[data-step-id]").evaluateAll((els) => els.map((el) => el.getAttribute("data-step-id")));
check("结构对照 7 块（aa-1…aa-7）", cmpIds.length === 7 && ["aa-1", "aa-2", "aa-3", "aa-4", "aa-5", "aa-6", "aa-7"].every((id) => cmpIds.includes(id)), cmpIds.join(","));
check("结构对照页无控制台报错", CONSOLES().length === 0, CONSOLES().slice(0, 3).join(" | "));

// ===== 10) 首页 11 条标题：1440 / 1280 三档如实记录 =====
for (const width of [1440, 1280]) {
  for (const fold of ["default", "center", "open"]) {
    await page.setViewportSize({ width, height: 900 });
    const url = fold === "default" ? `${BASE}/` : `${BASE}/?fold=${fold}`;
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForTimeout(300);
    const titles = await page.locator("[data-pathway-title]").evaluateAll((els) =>
      els.map((el) => {
        const r = el.getBoundingClientRect();
        return {
          id: el.getAttribute("data-pathway-title"),
          y: Math.round(r.y),
          bottom: Math.round(r.bottom),
          right: Math.round(r.right),
        };
      }),
    );
    const visible = titles.filter((t) => t.y >= 0 && t.bottom <= 900 && t.right <= width);
    const lowest = Math.max(...titles.map((t) => t.bottom));
    const offTop = titles.filter((t) => t.y < 0 || t.bottom > 900).map((t) => t.id);
    check(`首页 ${width} / ${fold}：标题 22 条`, titles.length === 22, titles.map((t) => t.id).join(","));
    check(`首页 ${width} / ${fold}：含 amino-acids`, titles.some((t) => t.id === "amino-acids"));
    console.log(`  · ${width} / ${fold}：首屏可见 ${visible.length}/22，最低底边 ${lowest}px，出屏 ${offTop.join(",") || "无"}`);
  }
}

// ===== 11) 截图（供人审，断言自检不读图） =====
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(`${BASE}/pathway/amino-acids`, { waitUntil: "networkidle" });
await page.waitForTimeout(300);
await page.screenshot({ path: join(ROOT, "preview", "poster-amino-1440.png") });
console.log("✓ 截图 preview/poster-amino-1440.png（1440×900 首屏）");
await page.screenshot({ path: join(ROOT, "preview", "poster-amino.png"), fullPage: true });
console.log("✓ 截图 preview/poster-amino.png（1440 宽 fullPage）");

check("全程无控制台报错", CONSOLES().length === 0, CONSOLES().slice(0, 3).join(" | "));

await browser.close();
process.exit(failed ? 1 : 0);
