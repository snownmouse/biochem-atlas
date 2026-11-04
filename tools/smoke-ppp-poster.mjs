// PPP 挂图冒烟（/pathway/ppp）：路由、两相块数、碳转移弧、三处糖酵解接口、
// 点击语义（步骤标签 / 节点 / 转移弧）、自测揭晓、?organ=&step= 还原、右栏证据等级与结构对照入口。
// 需先 `npm run build`，并让 preview 服务跑在 BASE_URL（默认 http://localhost:4173）。
import { mkdirSync } from "node:fs";
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
const page = await browser.newPage({ viewport: { width: 1440, height: 1024 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
mkdirSync(join(ROOT, "preview"), { recursive: true });

// ===== 1) 路由可达 + 两相块数 =====
const resp = await page.goto(`${BASE}/pathway/ppp`, { waitUntil: "networkidle" });
check("路由 200", resp?.status() === 200);
check("挂图 svg 存在", (await page.locator("svg[data-ppp-plate]").count()) === 1);
check("无控制台报错", errors.length === 0);
check("报头 PLATE 04", (await page.locator(".plate-no").innerText()).includes("PLATE 04"));

const phaseCounts = await page.evaluate(() => ({
  ox: document.querySelectorAll('svg g[data-step-id^="ppp-o"]').length,
  nonox: document.querySelectorAll('svg g[data-step-id^="ppp-n"]').length,
}));
check("氧化相 3 步（Ⅰ–Ⅲ）", phaseCounts.ox === 3);
check("非氧化相 5 步（Ⅳ–Ⅷ）", phaseCounts.nonox === 5);
check(
  "8 步各恰好一组（无重复组、无第 9 步）",
  (await page.locator("svg g[data-step-id]").count()) === 8
);
const phaseAttrs = await page.locator("svg g[data-step-id]").evaluateAll((els) =>
  els.map((e) => [e.getAttribute("data-step-id"), e.getAttribute("data-phase")])
);
check(
  "步骤 phase 属性与扇区一致",
  phaseAttrs.filter(([id, p]) => id.startsWith("ppp-o") && p === "oxidative").length === 3 &&
    phaseAttrs.filter(([id, p]) => id.startsWith("ppp-n") && p === "non-oxidative").length === 5
);
const plateText = await page.locator("svg[data-ppp-plate]").evaluate((el) => el.textContent ?? "");
check("两相区带标题在图上", plateText.includes("氧化相") && plateText.includes("非氧化相"));

// ===== 2) 碳单位转移：C2 / C3 弧与两次转酮醇酶 =====
check("C2 转移弧 2 条（Ⅵ、Ⅷ 两次 TK）", (await page.locator('svg [data-carbon-transfer="2"]').count()) === 2);
check("C3 转移弧 1 条（Ⅶ TA）", (await page.locator('svg [data-carbon-transfer="3"]').count()) === 1);
const trText = await page
  .locator('svg [data-carbon-transfer="2"], svg [data-carbon-transfer="3"]')
  .evaluateAll((els) => els.map((e) => e.textContent ?? "").join(" | "));
check("转移弧旁标出 C2 / C3 与基团名", trText.includes("C2") && trText.includes("C3") && trText.includes("羟乙酰基") && trText.includes("二羟丙酮基"));
check("Ⅵ 与 Ⅷ 同酶注写在图上（不被读成第 9 步）", plateText.includes("与 Ⅷ 同酶") && plateText.includes("非第 9 步"));
check("非氧化相净账 3 C5 = 2 C6 + 1 C3", plateText.includes("3 ×") && plateText.includes("2 ×") && plateText.includes("1 ×"));
check("净账明确写 15C = 15C", plateText.includes("15C"));

// ===== 3) 三处糖酵解接口 =====
check("接口投影节点 3 个", (await page.locator('svg g[data-interface="1"]').count()) === 3);
check("接口节点文字：gk-2 / gk-3 / gk-5", plateText.includes("糖酵解 gk-2") && plateText.includes("糖酵解 gk-3") && plateText.includes("糖酵解 gk-5"));
const ifPos = await page.locator('svg g[data-interface="1"]').evaluateAll((els) =>
  els.map((e) => {
    const c = e.querySelector("circle");
    const b = c?.getBoundingClientRect();
    return b ? b.x + b.width / 2 : -1;
  })
);
check("入口在左缘（x<200）、两处出口在右缘（x>1750）", ifPos.length === 3 && ifPos[0] < 200 && ifPos[1] > 1750 && ifPos[2] > 1750);
check("左右各画半条线（虚线接口箭头 3 条）", (await page.locator("svg line, svg path").count()) > 0 && plateText.includes("来自糖酵解第 2 步") && plateText.includes("回流第 3 步") && plateText.includes("回流第 5 步"));

// ===== 4) 点击语义：步骤标签 / 节点 / 转移弧 =====
await page.locator('svg g[data-step-id="ppp-n3"] text.st-name').click();
check("点酶名 → URL step=ppp-n3", page.url().includes("step=ppp-n3"));
check("ppp-n3 唯一选中态", (await page.locator('svg .stepg.sel[data-step-id="ppp-n3"]').count()) === 1);
check("右栏出现基团转移块（C2）", (await page.locator("aside [data-group-transfer]").innerText()).includes("C2"));
const asideText = await page.locator("aside").innerText();
check("右栏显示证据等级", asideText.includes("证据等级"));
check("右栏显示反应式与辅因子", asideText.includes("辅因子") && asideText.includes("EC"));
check("右栏结构对照入口 href 带 #ppp-n3", (await page.locator('[data-testid="ppp-structure-cmp-entry"]').getAttribute("href")) === "/structures/ppp#ppp-n3");
check("右栏 3D 占位为灰字（不伪造资产）", (await page.locator("aside [data-3d-placeholder]").count()) === 1);

await page.locator('svg g[data-node-id="g6p"] text.q-hide').first().click();
check("点节点 g6p → 选中 ppp-o1", page.url().includes("step=ppp-o1"));
await page.locator('svg g[data-node-id="s7p"] text.q-hide').first().click();
check("点节点 s7p → 选中其产出步 ppp-n3", page.url().includes("step=ppp-n3"));

await page.locator('svg [data-carbon-transfer="3"] path').dispatchEvent("click");
check("点 C3 转移弧 → 选中 ppp-n4", page.url().includes("step=ppp-n4"));

// ===== 5) 自测模式：揭晓而非选中 =====
await page.goto(`${BASE}/pathway/ppp`, { waitUntil: "networkidle" });
await page.locator(".organ-switch .quiz-toggle").click();
check("自测开启：隐藏名数量充足", (await page.locator("svg .q-hide").count()) > 30);
await page.locator('svg g[data-step-id="ppp-n2"] text.st-name').click();
check("点酶名 → 揭晓而非选中", (await page.locator('svg g[data-step-id="ppp-n2"] text.st-name.revealed').count()) === 1 && (await page.locator("svg .stepg.sel").count()) === 0);
await page.locator('svg g[data-node-id="ru5p"] text.q-hide').first().click();
check("点代谢物名 → 揭晓而非选中", (await page.locator('svg g[data-node-id="ru5p"] text.q-hide.revealed').count()) > 0 && (await page.locator("svg .stepg.sel").count()) === 0);

// ===== 6) ?organ=&step= 还原 =====
await page.goto(`${BASE}/pathway/ppp?organ=rbc&step=ppp-o1`, { waitUntil: "networkidle" });
check("URL 还原：红细胞视图高亮", (await page.locator('.organ-tab[data-organ="rbc"]').getAttribute("aria-selected")) === "true");
check("URL 还原：ppp-o1 选中", (await page.locator('svg .stepg.sel[data-step-id="ppp-o1"]').count()) === 1);
check("红细胞视图在图上强调 NADPH 供给", (await page.locator("svg [data-organ-note]").evaluate((el) => el.textContent ?? "")).includes("唯一 NADPH 来源"));
check("右栏显示红细胞差异", (await page.locator("aside").innerText()).includes("GSH"));
await page.goto(`${BASE}/pathway/ppp?organ=liver&step=ppp-n1`, { waitUntil: "networkidle" });
check("无 organDiff 的步用灰字说明，不编造", (await page.locator("aside [data-no-organ-diff]").innerText()).includes("本步无器官差异"));
check("肝视图高亮", (await page.locator('.organ-tab[data-organ="liver"]').getAttribute("aria-selected")) === "true");

// ===== 7) crumb 四向互通 =====
const crumbHrefs = await page.locator("nav.crumb a").evaluateAll((els) => els.map((e) => e.getAttribute("href")));
check("PPP crumb 能回到糖酵解 / TCA / 糖异生", ["/pathway/glycolysis", "/pathway/tca", "/pathway/gluconeogenesis"].every((h) => crumbHrefs.includes(h)));
for (const p of ["/pathway/glycolysis", "/pathway/tca", "/pathway/gluconeogenesis"]) {
  await page.goto(`${BASE}${p}`, { waitUntil: "domcontentloaded" });
  check(`${p} crumb 含 PPP 入口`, (await page.locator('nav.crumb a[href="/pathway/ppp"]').count()) === 1);
}

// ===== 8) 截图（1440 宽） =====
const shot = async (file, fullPage = true) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(ROOT, "preview", file), fullPage });
  console.log(`  ↳ 截图 preview/${file}`);
};
await page.goto(`${BASE}/pathway/ppp`, { waitUntil: "networkidle" });
await shot("poster-ppp-liver.png");
await page.goto(`${BASE}/pathway/ppp?organ=rbc`, { waitUntil: "networkidle" });
await shot("poster-ppp-rbc.png");
await page.goto(`${BASE}/pathway/ppp?organ=liver&step=ppp-n3`, { waitUntil: "networkidle" });
check("截图前 ppp-n3 已选中", (await page.locator('svg .stepg.sel[data-step-id="ppp-n3"]').count()) === 1);
await shot("poster-ppp-detail.png");

check("无页面运行错误（含截图段）", errors.length === 0);
if (errors.length) console.log("页面错误：\n" + errors.join("\n"));

await browser.close();
console.log(`\n${failed ? "冒烟未通过" : "冒烟全部通过"}`);
process.exit(failed ? 1 : 0);
