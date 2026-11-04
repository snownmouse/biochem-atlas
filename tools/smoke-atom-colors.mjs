// ============================================================
// 全站原子配色一致性冒烟
//
// 口径（唯一配色表 src/data/atom-colors.json）：
//   · 所有 3D 宿主必须带同一串 data-atom-colors；结构页 mol-3d 的 data-atom-palette 亦然；
//   · 2D 杂原子标签的 fill / data-element-color 必须与表一致，碳不上色；
//   · 同一分子在 /structures/glycolysis 与 /step/<id> 两页取同一张表；
//   · H 永远用氢色：静态断言渲染器存在 el === "H" 分支（当前资产无显式 H，规则为前置约束）。
//
// 需先 `npm run build`，并保证 preview 服务在 BASE_URL（默认 http://localhost:4173）运行。
import { mkdirSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.BASE_URL ?? "http://localhost:4173";
let failed = false;
const check = (label, ok) => {
  console.log(`${ok ? "✓" : "✗"} ${label}`);
  if (!ok) failed = true;
};

/* ---------- 1. 配色表自身 ---------- */
const palette = JSON.parse(readFileSync(join(ROOT, "src", "data", "atom-colors.json"), "utf8"));
const EL = palette.elements;
const HEX = /^#[0-9a-f]{6}$/i;
const NEEDED = ["H", "C", "N", "O", "P", "S"];

check("配色表含 H/C/N/O/P/S 六种元素与兜底色", NEEDED.every((e) => HEX.test(EL[e] ?? "")) && HEX.test(palette.fallback));
const all = [...NEEDED.map((e) => EL[e]), palette.fallback];
check("一种元素一个色值（六元素 + 兜底无重复）", new Set(all.map((c) => c.toLowerCase())).size === all.length);
check("H 不是纯白（纸白底上可见）", EL.H.toLowerCase() !== "#ffffff" && EL.H.toLowerCase() !== palette.paper.toLowerCase());

const lum = (hex) => {
  const ch = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
};
const contrast = (a, b) => (Math.max(lum(a), lum(b) + 0.05) / Math.min(lum(a), lum(b) + 0.05));
check("H 比 C 更亮（明度台阶，不靠色相猜）", lum(EL.H) > lum(EL.C));
check("H 与纸白底对比 ≥ 1.4:1", contrast(EL.H, palette.paper) >= 1.4);
check("每个重原子元素色与纸白底对比 ≥ 2:1（H 单独按 ≥1.4 校验）", NEEDED.filter((e) => e !== "H").every((e) => contrast(EL[e], palette.paper) >= 2));

/* ---------- 2. 渲染器不再使用内置 scheme ---------- */
const SRC = join(ROOT, "src");
const viewers = [
  "components/Molecule3D.tsx",
  "components/Enzyme3DPanel.tsx",
  "components/EmbeddedStepViewer.tsx",
  "pages/StepViewPage.tsx",
];
const viewerSrc = viewers.map((p) => [p, readFileSync(join(SRC, p), "utf8")]);
check(
  "四个 3D 渲染器都不再使用 3dmol 内置 Jmol / defaultCarbon",
  viewerSrc.every(([, s]) => !/colorscheme:\s*"(Jmol|defaultCarbon)"/.test(s))
);
check(
  "四个 3D 渲染器都从唯一配色表取色（colorfunc: atomColorFunc）",
  viewerSrc.every(([, s]) => s.includes("atomColorFunc"))
);
const frames = readFileSync(join(SRC, "pages", "StructureFramesPage.tsx"), "utf8");
check("2D 渲染器从唯一配色表取色", frames.includes('import { atomColor } from "../data/atomColors"') && frames.includes("style={{ fill: atomColor(a.el) }}"));

// H 不被高亮接管：两套渲染器都有显式 H 分支
const mol3d = readFileSync(join(SRC, "components", "Molecule3D.tsx"), "utf8");
check("3D 高亮对 H 有保护分支（H → 氢色）", /at\.el\?\.toUpperCase\(\) === "H" \? atomColor\(at\.el\)/.test(mol3d));
check("2D 圈注对 H 有保护分支（命中 H 不画语义圈）", /if \(a\.el\.toUpperCase\(\) === "H"\) return null/.test(frames));

/* ---------- 3. 生成的 2D SVG ---------- */
const svgDir = join(ROOT, "public", "assets", "structures", "2d");
const svgs = readdirSync(svgDir).filter((f) => f.endsWith(".svg"));
check("2D SVG 资产数量与生成脚本清单一致（43）", svgs.length === 43);
let badSvg = [];
let hetTexts = 0;
for (const f of svgs) {
  const s = readFileSync(join(svgDir, f), "utf8");
  for (const m of s.matchAll(/<text[^>]*data-element="([A-Za-z]+)"[^>]*>/g)) {
    hetTexts += 1;
    const tag = m[0];
    const el = m[1];
    const fill = tag.match(/fill="(#[0-9a-f]{6})"/i)?.[1];
    const declared = tag.match(/data-element-color="(#[0-9a-f]{6})"/i)?.[1];
    if (!fill || fill.toLowerCase() !== (EL[el] ?? palette.fallback).toLowerCase() || declared?.toLowerCase() !== fill.toLowerCase()) {
      badSvg.push(`${f}:${el}`);
    }
  }
  if (/data-element="(O|N|P|S)"[^>]*fill="#22282a"/i.test(s)) badSvg.push(`${f}:ink`);
}
check(`2D 杂原子标签全部使用统一色（共 ${hetTexts} 条）`, hetTexts > 0 && badSvg.length === 0);

/* ---------- 4. 浏览器：两页口径一致 ---------- */
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
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
mkdirSync(join(ROOT, "preview"), { recursive: true });
const CANON = JSON.stringify(EL);

await page.goto(`${BASE}/structures/glycolysis`, { waitUntil: "networkidle" });
await page.waitForFunction(() => document.querySelectorAll(".cmp-block").length === 10, { timeout: 30000 });
await page.waitForFunction(() => document.querySelectorAll('[data-testid="mol-2d"] .cmp-load').length === 0, { timeout: 30000 });
check(
  "结构页所有 3D 分子宿主都带统一配色表",
  await page.evaluate((canon) => {
    const roots = [...document.querySelectorAll('[data-testid="mol-3d"]')];
    return roots.length > 0 && roots.every((r) => r.getAttribute("data-atom-palette") === canon);
  }, CANON)
);
check(
  "结构页 2D 杂原子色 = 3D 表（fill 与 data-atom-color 双向一致）",
  await page.evaluate((canon) => {
    const el = JSON.parse(canon);
    const rgb = (hex) =>
      `rgb(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)})`;
    const texts = [...document.querySelectorAll(".mol2d-svg text[data-atom-el]")];
    return (
      texts.length > 0 &&
      texts.every((t) => {
        const e = t.getAttribute("data-atom-el");
        const want = el[e];
        return t.getAttribute("data-atom-color") === want && getComputedStyle(t).fill === rgb(want);
      })
    );
  }, CANON)
);
check(
  "结构页没有把杂原子标签写成墨色",
  await page.evaluate(() =>
    [...document.querySelectorAll(".mol2d-svg text[data-atom-el]")].every(
      (t) => getComputedStyle(t).fill !== "rgb(34, 40, 42)"
    )
  )
);

// 高亮图例与代码同源：不允许再写死旧色值
check(
  "变化原子图例跟随 MARK_COLOR（三条语义色与旧硬编码值一致）",
  (await page.evaluate(() =>
    [...new Set([...document.querySelectorAll(".cmp3d-legend > span > i")].map((i) => getComputedStyle(i).backgroundColor))].join("|")
  )) === "rgb(156, 74, 60)|rgb(46, 110, 107)|rgb(180, 118, 31)"
);

await page.locator("#gk-9").scrollIntoViewIfNeeded();
await page.waitForTimeout(500);
await page.screenshot({ path: join(ROOT, "preview", "atom-colors-3d-gk-9.png"), clip: await page.locator("#gk-9").boundingBox() });

// 2D 全量页：同一批原子标签仍取同一张表
await page.goto(`${BASE}/structures/glycolysis?mode=2d`, { waitUntil: "networkidle" });
await page.waitForFunction(() => document.querySelectorAll('[data-testid="mol-2d"]').length === 21, { timeout: 30000 });
check(
  "?mode=2d 全量 21 个结构式的杂原子色一致",
  await page.evaluate((canon) => {
    const el = JSON.parse(canon);
    const texts = [...document.querySelectorAll(".mol2d-svg text[data-atom-el]")];
    return texts.length > 0 && texts.every((t) => t.getAttribute("data-atom-color") === el[t.getAttribute("data-atom-el")]);
  }, CANON)
);
await page.locator("#gk-9").scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
await page.screenshot({ path: join(ROOT, "preview", "atom-colors-2d-gk-9.png"), clip: await page.locator("#gk-9").boundingBox() });

// 单步页：配体 stick 与结构页同表
const stepId = "gk-9";
await page.goto(`${BASE}/step/${stepId}`, { waitUntil: "networkidle" });
await page.waitForSelector('[data-atom-colors]', { timeout: 30000 });
const stepPalette = await page.locator("[data-atom-colors]").first().getAttribute("data-atom-colors");
check("单步页 3D 宿主带同一张配色表", stepPalette === CANON);
check("同一分子在结构页与单步页的配色表逐字节一致", stepPalette === CANON);
await page.waitForTimeout(800);
await page.screenshot({ path: join(ROOT, "preview", "atom-colors-step-gk-9.png"), clip: await page.locator(".s-figure").boundingBox() });

/* ---------- 5. H 高亮夹具截图 ----------
   当前所有资产（3D JSON / 2D JSON / PDB）均无显式 H 原子，无法在产品页拍到 H 帧；
   这里按同一张表画一个含 H 的小分子夹具，演示「H 被标注时仍保持氢色，只有外圈是语义色」。 */
await page.setContent(`<!doctype html><html><body style="margin:0;background:${palette.paper};font-family:Helvetica,Arial,sans-serif;color:#22282a">
<div style="width:1200px;padding:28px 36px">
  <div style="font-size:13px;letter-spacing:.12em;color:#5a564d">原子配色 · H 高亮规则（夹具）</div>
  <h1 style="font-size:26px;margin:8px 0 4px">H 永远用氢色，高亮只作用于重原子与键</h1>
  <p style="font-size:13px;color:#5a564d;margin:0 0 18px">下方 H 命中「离去基」标注：外圈为语义琥珀色，球体仍是氢色 ${EL.H}；当前产品资产不含显式 H，规则用于未来含氢资产。</p>
  <svg viewBox="0 0 760 300" width="760" height="300">
    <line x1="150" y1="150" x2="300" y2="110" stroke="#22282a" stroke-width="6"/>
    <line x1="150" y1="150" x2="290" y2="210" stroke="#22282a" stroke-width="6"/>
    <line x1="290" y1="210" x2="430" y2="180" stroke="#22282a" stroke-width="6"/>
    <line x1="430" y1="180" x2="560" y2="120" stroke="#22282a" stroke-width="6"/>
    <circle cx="150" cy="150" r="26" fill="${EL.C}"/>
    <circle cx="290" cy="210" r="24" fill="${EL.C}"/>
    <circle cx="430" cy="180" r="24" fill="${EL.O}"/>
    <circle cx="560" cy="120" r="18" fill="${EL.H}"/>
    <circle cx="560" cy="120" r="30" fill="${palette.fallback}" fill-opacity="0.08" stroke="#b4761f" stroke-width="4"/>
    <text x="560" y="90" text-anchor="middle" font-size="13" fill="#b4761f">离去基标注命中 H</text>
    <text x="150" y="205" text-anchor="middle" font-size="12" fill="#5a564d">C ${EL.C}</text>
    <text x="430" y="235" text-anchor="middle" font-size="12" fill="${EL.O}">O ${EL.O}</text>
    <text x="560" y="185" text-anchor="middle" font-size="12" fill="${EL.H}">H ${EL.H}</text>
  </svg>
</div></body></html>`);
await page.screenshot({ path: join(ROOT, "preview", "atom-colors-h-highlight.png"), clip: { x: 0, y: 0, width: 1200, height: 480 } });

await browser.close();

if (errors.length) {
  console.error("页面错误：", errors);
  failed = true;
}
if (failed) {
  console.error("\n✗ 原子配色一致性冒烟失败");
  process.exitCode = 1;
} else {
  console.log("\n全部通过：原子配色一致性");
}
