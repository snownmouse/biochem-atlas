// 酮体代谢挂图冒烟（PLATE 13 · SF-13）。
// 校验口径：路由可达、6 步 + 1 段运输、3 区室、16 节点、三态（步骤 / 节点 / 运输段）点击语义、
// ?step= 深链还原、接口面板只指向真实步骤、全图只做 2D（无 3D 开关、无「待结构核验」）、
// 结构与分子档案入口可点、1440 无横向溢出、audit-layout 本页 0 重叠 0 裁切。
// 需先 `npm run build` 与 `npm run preview`（或 BASE_URL 指向本地服务）。
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

// ===== 1) 路由 / 画布 / 计数 =====
const resp = await page.goto(`${BASE}/pathway/ketone`, { waitUntil: "networkidle" });
check("路由 /pathway/ketone 可达（200）", resp?.status() === 200);
const frame = page.locator("svg[data-frame='ketone']");
check("挂图 svg 存在且唯一", (await frame.count()) === 1);
check("报头 PLATE 13 · SF-13", (await page.locator(".plate-no").innerText()).includes("PLATE 13"));
check("画布原生 1360×640", (await frame.getAttribute("width")) === "1360" && (await frame.getAttribute("height")) === "640");
check("三区室泳道 liver-mito / blood / extra-mito", (await frame.getAttribute("data-lanes")) === "liver-mito,blood,extra-mito");
check("data-step-count = 6", (await frame.getAttribute("data-step-count")) === "6");
check("data-node-count = 16", (await frame.getAttribute("data-node-count")) === "16");
check("无控制台报错", errors.length === 0, errors.slice(0, 3).join(" | "));

// ===== 2) 6 步标签齐全 =====
const stepIds = await frame.locator("[data-step-id]").evaluateAll((els) =>
  [...new Set(els.map((el) => el.getAttribute("data-step-id")))]
);
check("图上 6 个步骤 id 齐全（去重，运输段不计入）", stepIds.filter((id) => !id.startsWith("kt-t")).length === 6 && ["kt-1", "kt-2", "kt-3", "kt-4", "kt-5", "kt-6"].every((id) => stepIds.includes(id)), stepIds.join(","));
check("运输段命中带存在（≥2 条边 + 1 块点击面）", (await frame.locator("[data-transport-id='kt-t1']").count()) >= 2, String(await frame.locator("[data-transport-id='kt-t1']").count()));

const nodeIds = await frame.locator("[data-node-id]").evaluateAll((els) =>
  [...new Set(els.map((el) => el.getAttribute("data-node-id")))]
);
check("图上 16 个节点 id（去重）", nodeIds.length === 16, String(nodeIds.length));
check("运输段点击面 kt-t1 存在", (await frame.locator("[data-transport-id='kt-t1']").count()) >= 2);

// ===== 3) 点击步骤 → 详情栏（含酶 / 区室 / 定性 ΔG） =====
await frame.locator(".step-badge[data-step-id='kt-2']").click();
await page.waitForTimeout(120);
check("点击 kt-2 后详情栏出现步骤名", (await page.locator("[data-transport-detail]").count()) === 0 && (await page.locator(".d-step").first().innerText()).includes("HMG"));
check("详情栏酶名含 HMGCS2", (await page.locator(".d-enzyme").first().innerText()).includes("HMGCS2"));
check("详情栏标「不可逆」与「肝线粒体」", (await page.locator(".d-step").first().innerText()).includes("不可逆") && (await page.locator(".d-step").first().innerText()).includes("肝线粒体"));
const dgText = await page.locator("[data-dg='1']").first().innerText();
check("ΔG 只给定性、不含数值", dgText.includes("定性") && !/[-−]?\d+(\.\d+)?\s*kJ/i.test(dgText), dgText.replace(/\n/g, " "));
check("无「待结构核验」占位", !(await page.locator("body").innerText()).includes("待结构核验"));
check("全图只做 2D：无 3D 切换控件", (await page.locator("[data-3d-toggle], .d-3d-toggle, button:has-text('3D')").count()) === 0);
check("2D-only 说明存在（不登记 PDB）", (await page.locator("[data-2d-only='1']").first().innerText()).includes("PDB"));

// ===== 4) 接口面板只指向真实步骤 =====
const interfaces = page.locator("[data-chain-interfaces='1'] [data-interface-step]");
check("接口面板 4 条", (await interfaces.count()) === 4, String(await interfaces.count()));
const ifaceIds = await interfaces.evaluateAll((els) => els.map((el) => el.getAttribute("data-interface-step")));
check("接口 id 为 fao-4 / tca-1 / tca-4 / ch-3", ["fao-4", "tca-1", "tca-4", "ch-3"].every((id) => ifaceIds.includes(id)), ifaceIds.join(","));
const ifaceHrefs = await interfaces.locator("a").evaluateAll((els) => els.map((a) => a.getAttribute("href")));
check("接口链接均为「既有通路?step=」", ifaceHrefs.every((h) => h && h.includes("?step=")), ifaceHrefs.join(","));

// ===== 5) 运输段三态语义 =====
// 血流转运带宽 813×270，正中间（600,330）被 bhb-blood 节点盖住——节点优先，点击那里打开的是步骤；
// 这里点带内右下空白处（避开 β-羟丁酸/乙酰乙酸/丙酮节点与其标签），验证的是「带 → 运输详情」这一层语义。
const transportBand = frame.locator("g[data-transport-id='kt-t1'] rect");
const bandBox = await transportBand.boundingBox();
if (!bandBox) throw new Error("运输段点击面没有布局盒");
await transportBand.click({
  position: { x: Math.round(bandBox.width * 0.7), y: Math.round(bandBox.height * 0.85) },
});
await page.waitForTimeout(120);
check("点击运输段 → 运输详情面板", (await page.locator("[data-transport-detail='1']").count()) === 1);
const transportText = await page.locator("[data-transport-detail='1']").innerText();
check("运输详情写明血液与不计入步数", transportText.includes("血液") && transportText.includes("不计入步数"));

// ===== 6) 节点点击 → 打开该节点所属步骤 =====
await frame.locator("[data-node-id='bhb']").first().click();
await page.waitForTimeout(120);
check("点击节点 bhb 打开 kt-4 步骤详情", (await page.locator(".d-enzyme").first().innerText()).includes("BDH1"));

// ===== 7) ?step= 深链还原 =====
await page.goto(`${BASE}/pathway/ketone?step=kt-4`, { waitUntil: "networkidle" });
check("?step=kt-4 直接还原详情", (await page.locator(".d-step").first().innerText()).includes("BDH1") || (await page.locator(".d-enzyme").first().innerText()).includes("BDH1"));
check("深链还原后结构对照入口指向 kt-4", (await page.locator("[data-testid='chain-structure-cmp-entry']").getAttribute("data-cmp-step")) === "kt-4");

// ===== 8) 结构与分子档案入口 =====
check("步骤详情有「看这一步的结构对照」入口", (await page.locator("[data-testid='chain-structure-cmp-entry']").count()) === 1);
check("步骤详情有「本步物质简介」入口", (await page.locator("[data-testid='chain-molecule-archive-entry-profile']").count()) === 1);

// ===== 9) 结构页 SF-13 可达 =====
const sresp = await page.goto(`${BASE}/structures/ketone`, { waitUntil: "networkidle" });
check("路由 /structures/ketone 可达（200）", sresp?.status() === 200);
check("结构页标 SF-13", (await page.locator(".plate-no").innerText()).includes("SF-13"));
const cmpIds = await page.locator("[data-step-id]").evaluateAll((els) => [...new Set(els.map((el) => el.getAttribute("data-step-id")))]);
check("结构页 6 块对照（kt-1…kt-6）", cmpIds.length === 6 && ["kt-1", "kt-2", "kt-3", "kt-4", "kt-5", "kt-6"].every((id) => cmpIds.includes(id)), cmpIds.join(","));

// ===== 10) 1440 无横向溢出 + 截图 =====
await page.goto(`${BASE}/pathway/ketone`, { waitUntil: "networkidle" });
await page.waitForTimeout(200);
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
check("1440 宽无横向溢出", overflow <= 1, `scrollWidth 超出 ${overflow}px`);
await page.screenshot({ path: join(ROOT, "preview", "poster-ketone-1440.png") });
await page.screenshot({ path: join(ROOT, "preview", "poster-ketone.png"), fullPage: true });
console.log("✓ 截图 preview/poster-ketone-1440.png / poster-ketone.png");

// ===== 11) 版式审计交叉核对（audit-layout 由外部单独运行，结果写在 preview/） =====
let audit = null;
try {
  audit = JSON.parse(
    (await import("node:fs")).readFileSync(join(ROOT, "preview", "layout-audit.json"), "utf8"),
  );
} catch {
  console.log("· 未找到 preview/layout-audit.json，跳过交叉核对（请先跑 audit-layout --tag after）");
}
if (audit) {
  const ketoneEntry = audit.pages?.find((p) => p.page === "ketone");
  const clipped = ketoneEntry ? ketoneEntry.clipped.length + (ketoneEntry.svgClipped?.length ?? 0) : -1;
  check(
    "audit-layout：/pathway/ketone 0 重叠 / 0 裁切",
    Boolean(ketoneEntry) && ketoneEntry.significantOverlaps.length === 0 && clipped === 0,
    ketoneEntry ? `重叠 ${ketoneEntry.significantOverlaps.length}｜裁切 ${clipped}` : "无本页记录",
  );
}

check("全程无控制台报错", errors.length === 0, errors.slice(0, 3).join(" | "));

await browser.close();
process.exit(failed ? 1 : 0);
