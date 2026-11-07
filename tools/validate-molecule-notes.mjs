// 分子档案（moleculeNotes.ts）校验器。
// 复核项：
//   1) 79 个规范分子（结构对照页 part 归并）是否都写了；辅因子 atp / nadh 单独一组
//   2) brief ≤21 个全角字（气泡第 2 行硬上限，超了会被省略号吃掉）
//   3) 四段非空：role ≤25 / position ≤35 / flows ≤45 / whyHere ≤45
//   4) sources 非空，且每条都是非空字符串
//   5) 文件内 id 不重复、entry.id 必须等于键、键必须能在 registry 里找到
//   6) 四段合计 120–150 字（口径：去空白后的字符数）
//   7) 负例自检：改动内存中的副本，确认上面每条规则真的会报错
//
// 用法：
//   node tools/validate-molecule-notes.mjs --partial   # 分批推进时用：缺的分子只报「待补」
//   node tools/validate-molecule-notes.mjs              # 完整门槛：缺任何一个分子即失败
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FILE = join(ROOT, "src", "data", "moleculeNotes.ts");
const SRC = readFileSync(FILE, "utf8");
const PARTIAL = process.argv.includes("--partial");

const len = (value) => [...String(value ?? "").replace(/\s/g, "")].length;

/** 从源码里取一个对象 / 数组字面量块：`export const NAME: ... = {` 或 `= [` → 匹配到同级的闭合 */
function objectBlock(name) {
  const start = SRC.indexOf(`export const ${name}`);
  if (start < 0) throw new Error(`找不到 ${name}`);
  const open = SRC.slice(start).search(/[{[][\s]*\n/) + start;
  const opener = SRC[open];
  const closer = opener === "{" ? "}" : "]";
  let depth = 0;
  for (let i = open; i < SRC.length; i += 1) {
    if (SRC[i] === opener) depth += 1;
    else if (SRC[i] === closer) {
      depth -= 1;
      if (depth === 0) return SRC.slice(open + 1, i);
    }
  }
  throw new Error(`${name} 括号不闭合`);
}

/** 单行字符串字段：`key: "value",`。多行字符串一律报错，避免正则漏读。 */
function stringField(block, key) {
  const m = block.match(new RegExp(`${key}:\\s*"([^"\\n]*)"`));
  return m ? m[1] : null;
}

function parseNotes(name) {
  const block = objectBlock(name);
  const entries = [];
  const re = /^ {2}(?:"([^"\n]+)"|([\w-]+))\s*:\s*\{/gm;
  const starts = [];
  let m;
  while ((m = re.exec(block))) starts.push({ key: m[1] ?? m[2], index: m.index });
  starts.forEach((item, i) => {
    const end = i + 1 < starts.length ? starts[i + 1].index : block.length;
    const body = block.slice(item.index, end);
    const sourcesBlock = body.match(/sources:\s*\[([\s\S]*?)\n\s{4}\],/);
    const sources = sourcesBlock
      ? [...sourcesBlock[1].matchAll(/"([^"\n]*)"/g)].map((x) => x[1])
      : [];
    entries.push({
      key: item.key,
      id: stringField(body, "id"),
      role: stringField(body, "role"),
      brief: stringField(body, "brief"),
      position: stringField(body, "position"),
      flows: stringField(body, "flows"),
      whyHere: stringField(body, "whyHere"),
      sources,
      line: SRC.slice(0, SRC.indexOf(block)).split("\n").length + block.slice(0, item.index).split("\n").length - 1,
    });
  });
  return entries;
}

/** registry：`{ key: "x", name: "...", aliases: ["a", "b"] }` */
function parseRegistry() {
  const block = objectBlock("MOLECULE_REGISTRY");
  return [...block.matchAll(/\{\s*key:\s*"([^"]+)",\s*name:\s*"([^"]+)",\s*aliases:\s*\[([^\]]*)\]\s*\}/g)].map(
    (m) => ({ key: m[1], name: m[2], aliases: [...m[3].matchAll(/"([^"]+)"/g)].map((x) => x[1]) })
  );
}

const registry = parseRegistry();
const notes = [...parseNotes("MOLECULE_NOTES"), ...parseNotes("COFACTOR_NOTES")];
const COFACTORS = ["atp", "nadh"];
const required = [...registry.map((r) => r.key), ...COFACTORS];

const errors = [];
const notes_ = [];
const fail = (message) => errors.push(message);

// 1) 覆盖率
const present = new Set(notes.map((n) => n.key));
for (const id of required) {
  if (!present.has(id)) {
    if (PARTIAL) notes_.push(`待补 ${id}`);
    else fail(`缺分子：${id}`);
  }
}
for (const n of notes) if (!required.includes(n.key)) fail(`多出的分子键：${n.key}（registry / 辅因子里没有）`);

// 2/3/4/5/6) 逐条
const seen = new Set();
for (const n of notes) {
  if (seen.has(n.key)) fail(`重复 id：${n.key}`);
  seen.add(n.key);
  if (n.id !== n.key) fail(`${n.key}: entry.id 必须是 "${n.key}"，实际是 "${n.id}"`);
  if (!n.role) fail(`${n.key}: role 为空`);
  if (!n.brief) fail(`${n.key}: brief 为空`);
  if (!n.position) fail(`${n.key}: position 为空`);
  if (!n.flows) fail(`${n.key}: flows 为空`);
  if (!n.whyHere) fail(`${n.key}: whyHere 为空`);
  if (len(n.brief) > 21) fail(`${n.key}: brief ${len(n.brief)} 字 > 21`);
  if (len(n.role) > 25) fail(`${n.key}: role ${len(n.role)} 字 > 25`);
  if (len(n.position) > 35) fail(`${n.key}: position ${len(n.position)} 字 > 35`);
  if (len(n.flows) > 45) fail(`${n.key}: flows ${len(n.flows)} 字 > 45`);
  if (len(n.whyHere) > 45) fail(`${n.key}: whyHere ${len(n.whyHere)} 字 > 45`);
  const total = len(n.role) + len(n.position) + len(n.flows) + len(n.whyHere);
  if (total < 120 || total > 150) fail(`${n.key}: 四段合计 ${total} 字，应在 120–150`);
  if (!n.sources.length) fail(`${n.key}: sources 为空`);
  if (n.sources.some((s) => !s.trim())) fail(`${n.key}: sources 里有空字符串`);
}

// registry 自身
const keys = new Set();
for (const r of registry) {
  if (keys.has(r.key)) fail(`registry 重复键：${r.key}`);
  keys.add(r.key);
  for (const a of r.aliases) if (!a) fail(`registry ${r.key} 有空 alias`);
}

// 7) 负例自检：每条规则必须真的报错
function expectFail(label, mutate, ruleText) {
  const copy = notes.map((n) => ({ ...n, sources: [...n.sources] }));
  mutate(copy);
  const hits = [];
  for (const n of copy) {
    if (len(n.brief) > 21) hits.push("brief");
    if (len(n.position) > 35) hits.push("position");
    if (len(n.flows) > 45) hits.push("flows");
    if (!n.sources.length) hits.push("sources");
  }
  const dup = copy.filter((n, i) => copy.findIndex((x) => x.key === n.key) !== i);
  const ok = ruleText === "dup" ? dup.length > 0 : hits.includes(ruleText);
  console.log(`${ok ? "✔" : "✘"} 负例 ${label} → ${ruleText}`);
  if (!ok) errors.push(`负例自检失败：${label}`);
}
if (notes.length) {
  expectFail("brief 22 字", (c) => { c[0].brief = "一二三四五六七八九十一二三四五六七八九十一二"; }, "brief");
  expectFail("position 36 字", (c) => { c[0].position = "一二三四五六七八九十一二三四五六七八九十一二三四五六七八九十一二三四五六"; }, "position");
  expectFail("flows 46 字", (c) => { c[0].flows = "一二三四五六七八九十一二三四五六七八九十一二三四五六七八九十一二三四五六七八九十一二三四五六"; }, "flows");
  expectFail("sources 清空", (c) => { c[0].sources = []; }, "sources");
  expectFail("重复 id", (c) => { c.push({ ...c[0] }); }, "dup");
}

console.log(`registry ${registry.length} 个规范分子 + 辅因子 ${COFACTORS.length} 个 = 目标 ${required.length}`);
console.log(`已写 ${notes.length} 个（${notes.map((n) => n.key).join(", ")}）`);
for (const n of notes) {
  console.log(`  ${n.key.padEnd(14)} brief ${len(n.brief)}/21 · role ${len(n.role)}/25 · position ${len(n.position)}/35 · flows ${len(n.flows)}/45 · why ${len(n.whyHere)}/45 · 合计 ${len(n.role) + len(n.position) + len(n.flows) + len(n.whyHere)}/120–150 · sources ${n.sources.length}`);
}
for (const message of notes_) console.log(`待补：${message}`);

if (errors.length) {
  console.error(`\n${errors.length} 项不合格：`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`\nOK：${notes.length}/${required.length} 个分子档案通过校验${PARTIAL ? "（partial 模式，缺的只报待补）" : ""}`);
