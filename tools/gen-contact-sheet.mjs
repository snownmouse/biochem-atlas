// 一次性脚本：生成「帧带连拍总图」preview/contact-sheet.html + 截图 preview/contact-sheet.png。
// 数据源：src/data/structureFrames.ts（用 esbuild 现场转译后 import，不手抄）+ public/assets/structures/*/frame-*.json。
// 渲染：逐帧打开现有 /structures/glycolysis?frame= 页面，直接抓取主舞台 SVG 的 outerHTML 内嵌，
//      不重写绘制逻辑；声明帧（assetUrl=null）画成声明卡片。
// 用法：先 npm run build && npm run preview -- --port 4173，再 node tools/gen-contact-sheet.mjs
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { transform } from "esbuild";
import { chromium } from "playwright-core";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.BASE_URL ?? "http://localhost:4173";
const STRUCT_DIR = join(ROOT, "public", "assets", "structures");
const OUT_HTML = join(ROOT, "preview", "contact-sheet.html");
const OUT_PNG = join(ROOT, "preview", "contact-sheet.png");
const BRICK = "#9C4A3C";
const ALLOWED_BOUNDARY = ["同结构连续", "配体级叠合（", "跨结构声明", "相机重建（已断开）", "2D→3D 过渡"];

let failed = false;
const check = (label, ok, extra = "") => {
  console.log(`${ok ? "✓" : "✗"} ${label}${extra ? ` —— ${extra}` : ""}`);
  if (!ok) failed = true;
};

// ===== 1) 读 structureFrames.ts（转译后 import，确保 39 帧数据不靠手抄）=====
const tsSrc = readFileSync(join(ROOT, "src", "data", "structureFrames.ts"), "utf8");
const js = (await transform(tsSrc, { loader: "ts", format: "esm", target: "node18" })).code;
const tmp = join(tmpdir(), `structureFrames-${Date.now()}.mjs`);
writeFileSync(tmp, js);
const { glycolysisFrameSequence: seq } = await import(pathToFileURL(tmp).href);
const frames = seq.frames;

const groups = [];
for (const f of frames) {
  let g = groups.at(-1);
  if (!g || g.stepId !== f.stepId) {
    g = { stepId: f.stepId, stepIndex: f.stepIndex, frames: [] };
    groups.push(g);
  }
  g.frames.push(f);
}

const alignOf = (stepId) => {
  const p = join(STRUCT_DIR, stepId, "index.json");
  return existsSync(p) ? JSON.parse(readFileSync(p, "utf8")).alignment ?? {} : {};
};

/** 取本步 alignment 中第一条 T 键（跨步配体级叠合记录） */
const firstT = (align) => {
  const key = Object.keys(align).find((k) => /^T\d/.test(k));
  if (!key) return null;
  const m = align[key].match(/RMSD\s+([\d.]+)\s*Å/);
  return m ? { key, rmsd: m[1], desc: align[key] } : { key, rmsd: null, desc: align[key] };
};

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const roleLabel = (f) => {
  if (f.assetUrl === null) return "声明";
  const base =
    { substrate: "底物", pocket: "口袋", apo: "apo（空口袋）", bound: "结合态", product: "产物", allosteric: "产物（异位）" }[
      f.role
    ] ?? f.role;
  return f.renderMode === "2d" ? `${base} · 2D` : base;
};

const cornerText = (f) => {
  if (f.cornerNote) return f.cornerNote;
  const bits = [f.pdbId, f.species, f.resolution ? `${f.resolution} Å` : null].filter(Boolean);
  return bits.length ? bits.join(" · ") : "无角标记录";
};

const pdbOfStep = (g) => {
  const ids = [...new Set(g.frames.map((f) => f.pdbId).filter(Boolean))];
  return ids.length ? ids.join(" / ") : "无 PDB";
};

// ===== 2) 边界分类（全部由 boundaryNote / index.alignment / renderMode 推导，不编）=====
const boundaries = [];
for (let i = 0; i < groups.length - 1; i++) {
  const prevLast = groups[i].frames.at(-1);
  const nextFirst = groups[i + 1].frames[0];
  const nextAlign = alignOf(groups[i + 1].stepId);
  const t = firstT(nextAlign);
  const prev2d = prevLast.renderMode === "2d";
  const next2d = nextFirst.renderMode === "2d";
  let kind;
  let kindBase;
  if (prev2d && next2d) {
    kindBase = "相机重建（已断开）";
    kind = "相机重建（已断开）";
  } else if (prev2d && !next2d) {
    kindBase = "2D→3D 过渡";
    kind = "2D→3D 过渡（相机重建）";
  } else if (nextAlign.camera) {
    kindBase = "相机重建（已断开）";
    kind = "相机重建（已断开）";
  } else if (t) {
    kindBase = "配体级叠合（";
    kind = `配体级叠合（${t.key} ${t.rmsd} Å）`;
  } else {
    kindBase = "同结构连续";
    kind = "同结构连续";
  }
  boundaries.push({
    from: groups[i].stepId,
    to: groups[i + 1].stepId,
    kind,
    kindBase,
    note: nextFirst.boundaryNote ?? "",
  });
}

// ===== 3) 抓取现有页面渲染的 SVG（直接复用现有渲染逻辑）=====
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
const svgByFrame = new Map();
const captureErrors = [];
page.on("pageerror", (e) => captureErrors.push(String(e)));

for (const f of frames) {
  if (f.assetUrl === null) continue; // 声明帧画卡片，不取页面
  await page.goto(`${BASE}/structures/glycolysis?frame=${f.frameId}`, {
    waitUntil: "networkidle",
    timeout: 30000,
  });
  await page.waitForSelector(".stage-canvas svg", { timeout: 15000 });
  const svg = await page.$eval(".stage-canvas svg", (el) => el.outerHTML);
  if (!svg.includes("viewBox")) throw new Error(`${f.frameId} 抓取到的 SVG 无 viewBox`);
  svgByFrame.set(f.frameId, svg);
  console.log(`  captured ${f.frameId} (${svg.length} chars)`);
}
await browser.close();

check(
  `抓取到 ${svgByFrame.size} 个渲染帧（非声明帧数=${frames.filter((f) => f.assetUrl !== null).length}）`,
  svgByFrame.size === frames.filter((f) => f.assetUrl !== null).length
);
check(`抓帧过程无页面错误（${captureErrors.length}）`, captureErrors.length === 0, captureErrors.join(" | "));

// ===== 4) 生成单文件 HTML =====
const declareCount = frames.filter((f) => f.assetUrl === null).length;
const twoDCount = frames.filter((f) => f.renderMode === "2d").length;

const alignmentRows = (stepId) => {
  const align = alignOf(stepId);
  const keys = Object.keys(align);
  if (!keys.length) {
    return `<p class="ap-empty">无跨结构对齐记录<br>本步 ${groups.find((g) => g.stepId === stepId).frames.length} 帧同结构</p>`;
  }
  return keys
    .map((k) => {
      const v = align[k];
      const m = v.match(/RMSD\s+([\d.]+)\s*Å/);
      return `<div class="ap-entry">
        <div class="ap-top"><span class="ap-key">${esc(k)}</span><span class="ap-rmsd${m ? "" : " ap-na"}">${m ? `${m[1]} Å` : "—"}</span></div>
        <div class="ap-desc" title="${esc(v)}">${esc(v)}</div>
      </div>`;
    })
    .join("");
};

const frameCard = (f) => {
  if (f.assetUrl === null) {
    return `<figure class="frame-card declare-card" data-frame-card data-declare-card data-frame-id="${esc(f.frameId)}" data-kind="declare">
      <div class="shot declare-shot">
        <span class="dc-mark">${esc(cornerText(f))}</span>
        <p class="dc-text" title="${esc(f.gapStatement ?? "本帧为文字声明帧。")}">${esc(f.gapStatement ?? "本帧为文字声明帧。")}</p>
      </div>
      <figcaption class="cap">
        <div class="cap-top"><span class="fc-id num">${esc(f.frameId.split("-").at(-1))}</span><span class="fc-role">声明</span><span class="fc-src num">${esc(f.pdbId ?? "—")}${f.resolution ? ` · ${f.resolution} Å` : ""}</span></div>
        <div class="fc-corner">角标 · ${esc(cornerText(f))}</div>
      </figcaption>
    </figure>`;
  }
  const kind = f.renderMode === "2d" ? "2d" : "3d";
  return `<figure class="frame-card" data-frame-card data-frame-id="${esc(f.frameId)}" data-kind="${kind}">
    <div class="shot">${svgByFrame.get(f.frameId)}</div>
    <figcaption class="cap">
      <div class="cap-top"><span class="fc-id num">${esc(f.frameId.split("-").at(-1))}</span><span class="fc-role${kind === "2d" ? " fc-role-2d" : ""}">${esc(roleLabel(f))}</span><span class="fc-src num">${esc(f.pdbId ?? "—")}${f.resolution ? ` · ${f.resolution} Å` : ""}${f.method ? ` · ${f.method}` : ""}</span></div>
      <div class="fc-corner">角标 · ${esc(cornerText(f))}</div>
    </figcaption>
  </figure>`;
};

const bandsHtml = groups
  .map((g, i) => {
    const boundary = i > 0 ? boundaries[i - 1] : null;
    const boundaryHtml = boundary
      ? `<div class="boundary-sep" data-boundary="${esc(boundary.from)}→${esc(boundary.to)}">
          <div class="bs-rule"></div>
          <div class="bs-label">${esc(boundary.kind)}</div>
          <div class="bs-note"><span class="bs-pair num">${esc(boundary.from)} → ${esc(boundary.to)}</span> ${esc(boundary.note)}</div>
        </div>`
      : "";
    return `${boundaryHtml}
    <section class="step-band" data-step-id="${esc(g.stepId)}" data-step-index="${g.stepIndex}" data-frame-count="${g.frames.length}">
      <header class="band-head">
        <span class="bh-step serif">第 ${g.stepIndex} 步</span>
        <span class="bh-id num">${esc(g.stepId)}</span>
        <span class="bh-pdb num">${esc(pdbOfStep(g))}</span>
        <span class="bh-count num">${g.frames.length} 帧</span>
      </header>
      <div class="band-body">
        <div class="frames" style="--n:${g.frames.length}">${g.frames.map(frameCard).join("")}</div>
        <aside class="align-panel">
          <div class="ap-title">对齐 RMSD · index.json 照录</div>
          ${alignmentRows(g.stepId)}
        </aside>
      </div>
    </section>`;
  })
  .join("\n");

const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>糖酵解 · 帧带连拍总图</title>
<style>
:root{
  --ink:#22282A; --paper:#F6F3EC; --brick:${BRICK}; --teal:#2E6E6B; --amber:#B4761F;
  --hair:#6b6862; --hair-faint:#a9a49a; --hair-soft:#c9c3b6; --line:#8a8578;
  --serif:"Source Han Serif SC","Noto Serif SC","Songti SC",SimSun,serif;
  --sans:"PingFang SC","Microsoft YaHei",system-ui,sans-serif;
}
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:var(--paper);color:var(--ink);font-family:var(--sans);-webkit-font-smoothing:antialiased}
.sheet{width:1440px;padding:32px 28px 56px;margin:0 auto}
.num{font-variant-numeric:tabular-nums;letter-spacing:.08em}
.serif{font-family:var(--serif)}
.sheet-head{border-bottom:2px solid var(--ink);padding-bottom:14px}
.plate{font-size:10px;letter-spacing:.24em;opacity:.6}
h1{font-family:var(--serif);font-size:36px;font-weight:600;margin:8px 0 6px;letter-spacing:.02em}
.meta{font-size:11px;line-height:1.7;opacity:.62}
.guide{margin:14px 0 0;border-left:2px solid var(--teal);padding:8px 14px;font-size:12.5px;line-height:1.8;background:rgba(46,110,107,.045)}
.guide b{color:var(--teal);font-weight:700}
.legend{display:flex;gap:26px;align-items:center;margin-top:12px;font-size:10px;opacity:.7;letter-spacing:.06em}
.legend span{display:flex;align-items:center;gap:7px}
.lg-brick{width:34px;height:3px;background:var(--brick);display:inline-block}
.lg-dash{width:34px;height:12px;border:1px dashed var(--brick);display:inline-block}
.lg-paper{width:34px;height:12px;border:1px solid var(--hair-soft);background:#fff;display:inline-block}
.step-band{margin-top:16px;padding-top:10px;border-top:1px solid var(--hair-soft)}
.step-band:first-of-type{border-top:none}
.band-head{display:flex;align-items:baseline;gap:12px}
.bh-step{font-size:20px;font-weight:600}
.bh-id{font-size:10px;letter-spacing:.16em;opacity:.55}
.bh-pdb{font-size:10px;letter-spacing:.12em;opacity:.5}
.bh-count{margin-left:auto;font-size:10px;letter-spacing:.14em;opacity:.55}
.band-body{display:flex;gap:16px;align-items:flex-start;margin-top:8px}
.frames{flex:1;display:grid;grid-template-columns:repeat(var(--n),minmax(0,1fr));gap:10px}
.frame-card{margin:0;border:1px solid var(--hair-soft);background:rgba(255,255,255,.32);padding:7px}
.shot{height:200px;border-bottom:1px solid var(--hair-faint);display:flex;align-items:center;justify-content:center;overflow:hidden}
.shot svg{width:100%;height:100%;display:block}
.cap{padding-top:6px}
.cap-top{display:flex;align-items:baseline;gap:8px;font-size:10px;letter-spacing:.08em}
.fc-id{font-weight:700;font-size:11px}
.fc-role{color:var(--brick)}
.fc-role-2d{font-weight:700}
.fc-src{margin-left:auto;font-size:9px;opacity:.55;text-align:right}
.fc-corner{margin-top:4px;font-size:9.5px;line-height:1.55;color:var(--brick);min-height:29px}
.declare-card{border:1px dashed var(--brick);background:rgba(156,74,60,.05)}
.declare-shot{flex-direction:column;align-items:flex-start;justify-content:center;gap:8px;padding:10px 11px;border-bottom:1px solid var(--brick)}
.dc-mark{font-size:9px;letter-spacing:.18em;color:var(--brick);font-weight:700;line-height:1.5}
.dc-text{margin:0;font-size:9.2px;line-height:1.65;opacity:.85;overflow:hidden;display:-webkit-box;-webkit-line-clamp:7;-webkit-box-orient:vertical}
.align-panel{flex:0 0 232px;border-left:1px solid var(--hair-faint);padding-left:12px;font-size:9.5px;line-height:1.55}
.ap-title{font-size:9px;letter-spacing:.16em;opacity:.55;margin-bottom:6px}
.ap-entry{border-bottom:1px dotted var(--hair-soft);padding:3px 0 4px}
.ap-top{display:flex;align-items:baseline;gap:8px}
.ap-key{color:var(--teal);font-weight:700;font-size:9px;letter-spacing:.08em}
.ap-rmsd{margin-left:auto;font-size:10.5px;font-weight:700}
.ap-na{opacity:.45}
.ap-desc{font-size:9px;opacity:.6;margin-top:1px}
.ap-empty{font-size:9.5px;opacity:.55;line-height:1.7;margin:0}
.boundary-sep{margin:22px 0 0}
.bs-rule{height:3px;background:var(--brick)}
.bs-label{display:inline-block;position:relative;top:-9px;margin-left:16px;padding:0 10px;background:var(--paper);color:var(--brick);font-size:11px;font-weight:700;letter-spacing:.16em}
.bs-note{margin-top:0;font-size:9.5px;line-height:1.75;opacity:.62;max-width:1320px}
.bs-pair{color:var(--brick);font-weight:700;letter-spacing:.1em;margin-right:6px}
.sheet-foot{margin-top:28px;border-top:1px solid var(--hair-soft);padding-top:10px;font-size:9.5px;line-height:1.7;opacity:.55}
</style>
</head>
<body>
<div class="sheet">
  <header class="sheet-head">
    <div class="plate">PLATE SF-01 · 帧带连拍总图 · 第一版 · 2026</div>
    <h1>糖酵解 · 帧带连拍总图</h1>
    <div class="meta">数据源 src/data/structureFrames.ts + public/assets/structures/*/frame-*.json ｜ ${groups.length} 步 · ${frames.length} 帧 · ${boundaries.length} 个步间边界 · 3D 帧 ${svgByFrame.size} · 2D 结构式帧 ${twoDCount} · 声明帧 ${declareCount}</div>
    <div class="guide"><b>判读指引</b>　本图用于判断「跨步连贯性」：<b>横向</b>看每步内部帧序是否顺（同结构/同相机/配体位置是否连续）；<b>纵向</b>看步与步之间是否有断口（砖红线上的衔接方式）。</div>
    <div class="legend">
      <span><i class="lg-paper"></i>3D 预投影帧</span>
      <span><i class="lg-dash"></i>声明帧（assetUrl=null，有意留白）</span>
      <span><i class="lg-brick"></i>步间边界（砖红）</span>
      <span>帧内砖红 = 本帧化学差异</span>
    </div>
  </header>
${bandsHtml}
  <footer class="sheet-foot">生成：node tools/gen-contact-sheet.mjs ｜ 每帧 SVG 直接取自现有 /structures/glycolysis?frame= 页面的主舞台渲染结果，未重绘；角标与边界文案取自 structureFrames.ts 与各步 index.json。声明帧不画空框，卡片内为原文缺口说明。</footer>
</div>
</body>
</html>`;

mkdirSync(join(ROOT, "preview"), { recursive: true });
writeFileSync(OUT_HTML, html, "utf8");

// ===== 5) 打开生成页 → 程序化断言 → 全图截图 =====
const browser2 = await launch();
const sheet = await browser2.newPage({ viewport: { width: 1440, height: 960 } });
const sheetErrors = [];
sheet.on("pageerror", (e) => sheetErrors.push(String(e)));
sheet.on("console", (m) => m.type() === "error" && sheetErrors.push(m.text()));
await sheet.goto(pathToFileURL(OUT_HTML).href, { waitUntil: "load" });
await sheet.waitForTimeout(700);

const got = await sheet.evaluate(() => ({
  cards: document.querySelectorAll("[data-frame-card]").length,
  declares: document.querySelectorAll("[data-declare-card]").length,
  twoD: document.querySelectorAll('[data-frame-card][data-kind="2d"]').length,
  boundaries: document.querySelectorAll(".boundary-sep").length,
  bands: [...document.querySelectorAll(".step-band")].map((b) => ({
    id: b.dataset.stepId,
    n: b.querySelectorAll("[data-frame-card]").length,
    declared: b.dataset.frameCount,
  })),
  ids: [...document.querySelectorAll("[data-frame-card]")].map((e) => e.dataset.frameId),
  missingSvgs: [...document.querySelectorAll('[data-kind="3d"] .shot, [data-kind="2d"] .shot')].filter(
    (s) => !s.querySelector("svg")
  ).length,
  declareTexts: [...document.querySelectorAll("[data-declare-card] .dc-text")].map((e) =>
    e.textContent.trim()
  ),
  boundaryLabels: [...document.querySelectorAll(".boundary-sep .bs-label")].map((e) =>
    e.textContent.trim()
  ),
  external: document.querySelectorAll('link[href],script[src],img[src]').length,
}));

const expectedByStep = groups.map((g) => ({ id: g.stepId, n: g.frames.length }));
check(`帧总数 = 数据帧数 ${frames.length}`, got.cards === frames.length, `实际 ${got.cards}`);
check(`步条带 = ${groups.length} 且每步非空`, got.bands.length === groups.length && got.bands.every((b) => b.n > 0), JSON.stringify(got.bands));
check(
  "每步条带帧数 = 数据帧数",
  expectedByStep.every((e) => got.bands.find((b) => b.id === e.id)?.n === e.n),
  expectedByStep.map((e) => `${e.id}:${got.bands.find((b) => b.id === e.id)?.n}/${e.n}`).join(" ")
);
check(
  "帧顺序 = structureFrames 数组顺序（gk-1-f0 → gk-10-f3）",
  got.ids.join(",") === frames.map((f) => f.frameId).join(",")
);
check(`砖红分隔线 = 步数-1（${groups.length - 1}）`, got.boundaries === groups.length - 1, `实际 ${got.boundaries}`);
check(`声明卡片 = 数据中 assetUrl=null 的帧数（${declareCount}）`, got.declares === declareCount, `实际 ${got.declares}`);
if (declareCount !== 5) {
  console.log(
    `  ! 任务书预期「声明卡片=5」，但 structureFrames.ts 中 assetUrl=null 只有 ${declareCount} 帧；2D 结构式帧恰为 ${twoDCount}。按数据如实呈现，未伪造第 5 张声明卡。`
  );
}
check(`2D 结构式帧 = ${twoDCount}`, got.twoD === twoDCount, `实际 ${got.twoD}`);
check("非声明帧全部内嵌 SVG（无空框）", got.missingSvgs === 0, `缺 SVG ${got.missingSvgs}`);
check(
  "每张声明卡片都有实质性声明文字（>20 字）",
  got.declareTexts.length === declareCount && got.declareTexts.every((t) => t.length > 20)
);
check(
  "9 条边界文案均落在约定类型内",
  got.boundaryLabels.length === groups.length - 1 &&
    got.boundaryLabels.every((t) => ALLOWED_BOUNDARY.some((p) => t.startsWith(p))),
  got.boundaryLabels.join(" | ")
);
check("单文件（无外链 link/script/img）", got.external === 0, `外链元素 ${got.external}`);
check("生成页无脚本错误", sheetErrors.length === 0, sheetErrors.join(" | "));

await sheet.screenshot({ path: OUT_PNG, fullPage: true });
await browser2.close();

const size = existsSync(OUT_PNG) ? statSync(OUT_PNG).size : 0;
check(`截图 preview/contact-sheet.png 存在且 >200 KB`, size > 200 * 1024, `${(size / 1024).toFixed(0)} KB`);
check(`HTML preview/contact-sheet.html 存在`, existsSync(OUT_HTML));
console.log(`\n产物：${OUT_HTML}\n截图：${OUT_PNG}（${(size / 1024).toFixed(0)} KB）`);
console.log(failed ? "\n有失败项" : "\n全部断言通过");
process.exit(failed ? 1 : 0);
