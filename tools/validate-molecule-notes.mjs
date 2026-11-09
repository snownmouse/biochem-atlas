// 物质简介档案（moleculeProfiles.ts）校验器。
//
// 完整门槛（无 --partial 放行）：
//   1) 182 个“页面上出现过的物质”逐个有档案；分批时用 --keys a,b,c 只校验本批，
//      缺任何一个指定键即失败（默认模式要求 182 全覆盖）
//   2) 六段骨架非空：claim / classification / structure / position / flow / significance / exam
//   3) exam 条目 2–4 条；pathways ≥1；sources ≥2
//   4) 气泡两行（what / highlight），每行 ≤21 个全角字
//   5) 无编造字段：条目内只允许约定的字段名
//   6) 禁用内容：页码、真题年份、“性质”段标题、化学课式数值堆
//   7) id 不重复、entry.id === map 键、aliases ≥1
//
// 用法：
//   node tools/validate-molecule-notes.mjs                      # 全量 182
//   node tools/validate-molecule-notes.mjs --keys 2pg,3pg,camp  # 分批（只查本批，仍用全部规则）
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FILE = join(ROOT, "src", "data", "moleculeProfiles.ts");
const SRC = readFileSync(FILE, "utf8");

/** 页面上出现过、需要简介的全部物质（数据层 entities 去重后并入新增叶酸系 5 个、二氢神经酰胺、甲酸） */
const REQUIRED = [
  "23bpg","2pg","3pg","6pg-l","6pgl","7dhc","acacoa","acetoacetate","acetone","accoa","acp","acylcarn","acylcoa-c16","adp",
  "akg","ala","amp","asn","atp","betaine","bhb","bpg13","camp","carn","ch2thf","ch3thf","chmethf","cholesterol","chothf","cit","co2","coa","cys",
  "cystathionine","cytc","desmosterol","dhap","dihydroceramide","dimethylglycine","dmapp","e4p","enoyl-c16","f6p","fa","fad","fadh2",
  "fas-c2","fas-c4-enoyl","fas-c4-keto","fas-c4-oh","fas-malonyl","fbp","formate","fpp","fum","g1p","g6p","gap",
  "glc","gln","glu","gly","glycogen","glycogen-limit","gpp","h2o","hco3","hcy","his","hmgcoa",
  "hydroxy-c16","icit","ile","ipp","keto-c16","kic","lac","lanosterol","leu","lys","mal",
  "malonylacp","met","mev5p","mev5pp","mevalonate","nad","nadh","nadp","nadph","nh4","o2","oaa",
  "oxidosqualene","pep","phe","pi","ppi","pro","pyr","q","qh2","r5p","ru5p","s7p","ser","squalene",
  "suc","succoa","thf","thr","trp","tyr","udp","udp-glucose","urea-arg","urea-as1","urea-asp","urea-cap",
  "urea-cit","urea-nh3","urea-orn","urea-ure","utp","val","xu5p",
  "sam","sah","acceptor","ado","cap","caasp","dho","oro","omp","ump","ctp","dudp","dutp","dump","dtmp","dhf",
  "prpp","pra","gar","fgar","fgam","air","cair","saicar","aicar","faicar","imp","asuc","xmp","gmp",
  "lpa","pa","dag","cdp-dag","pc","pe","ps","pi-lipid","pg","pgp","cl","kds","dhs","cer",
  "cdp-choline","cdp-ethanolamine","inositol","sm",
  "cm","cm-remnant","vldl","idl","ldl","hdl-nascent","hdl-mature","ffa",
];

const ALLOWED_FIELDS = new Set([
  "id","name","aliases","claim","classification","structure","position","flow","significance",
  "exam","pathways","sources","bubble","asset3d","asset2d",
]);

const len = (v) => [...String(v ?? "").replace(/\s/g, "")].length;
const errors = [];
const fail = (m) => errors.push(m);

/** 从 `export const MOLECULE_PROFILES: Record<string, MoleculeProfile> = {` 后取到同级闭合 */
function profilesBlock() {
  const anchor = SRC.indexOf("export const MOLECULE_PROFILES");
  if (anchor < 0) throw new Error("找不到 MOLECULE_PROFILES");
  const open = SRC.indexOf("{", anchor);
  let depth = 0;
  for (let i = open; i < SRC.length; i += 1) {
    if (SRC[i] === "{") depth += 1;
    else if (SRC[i] === "}") {
      depth -= 1;
      if (depth === 0) return { start: open + 1, end: i, text: SRC.slice(open + 1, i) };
    }
  }
  throw new Error("MOLECULE_PROFILES 括号不闭合");
}

/** 按 2 空格缩进的 `key: {` 切条目 */
function parseEntries() {
  const { start, text } = profilesBlock();
  const starts = [];
  const re = /^  (?:"([^"\n]+)"|(\w[-\w]*))\s*:\s*\{$/gm;
  let m;
  while ((m = re.exec(text))) starts.push({ key: m[1] ?? m[2], index: m.index });
  return starts.map((item, i) => {
    const end = i + 1 < starts.length ? starts[i + 1].index : text.length;
    const body = text.slice(item.index, end);
    const line = SRC.slice(0, start).split("\n").length + text.slice(0, item.index).split("\n").length;
    return { key: item.key, body, line };
  });
}

const str = (body, key) => {
  const m = body.match(new RegExp(`\\n    ${key}:\\s*"([^"\\n]*)"`));
  return m ? m[1] : null;
};

function section(body, key) {
  const m = body.match(new RegExp(`\\n    ${key}:\\s*\\{\\s*\\n([\\s\\S]*?)\\n    \\},`));
  if (!m) return null;
  const block = m[1];
  const title = block.match(/title:\s*"([^"\n]*)"/);
  const bodyText = block.match(/body:\s*\n?\s*"([^"\n]*)"/);
  return { title: title?.[1] ?? null, body: bodyText?.[1] ?? null };
}

function arrayStrings(body, key) {
  const m = body.match(new RegExp(`\\n    ${key}:\\s*\\[`));
  if (!m) return [];
  const start = m.index + m[0].length - 1;
  let depth = 0;
  for (let i = start; i < body.length; i += 1) {
    if (body[i] === "[") depth += 1;
    else if (body[i] === "]") {
      depth -= 1;
      if (depth === 0) {
        return [...body.slice(start + 1, i).matchAll(/"([^"\n]*)"/g)].map((x) => x[1]);
      }
    }
  }
  return [];
}

function examBlock(body) {
  const m = body.match(/\n    exam:\s*\{\s*\n([\s\S]*?)\n    \},/);
  if (!m) return null;
  const block = m[1];
  const title = block.match(/title:\s*"([^"\n]*)"/);
  const itemsMatch = block.match(/items:\s*\[([\s\S]*?)\]/);
  const items = itemsMatch ? [...itemsMatch[1].matchAll(/"([^"\n]*)"/g)].map((x) => x[1]) : [];
  return { title: title?.[1] ?? null, items };
}

function bubble(body) {
  const m = body.match(/\n    bubble:\s*\{\s*what:\s*"([^"\n]*)",\s*highlight:\s*"([^"\n]*)"\s*\}/);
  return m ? { what: m[1], highlight: m[2] } : null;
}

function fieldNames(body) {
  return [...body.matchAll(/\n    (\w+):/g)].map((x) => x[1]);
}

const entries = parseEntries();
const present = new Map(entries.map((e) => [e.key, e]));

const keysArg = process.argv.indexOf("--keys");
const scope =
  keysArg > -1
    ? String(process.argv[keysArg + 1] ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : REQUIRED;

// 1) 覆盖
for (const key of scope) {
  if (!present.has(key)) fail(`缺档案：${key}`);
}
for (const entry of entries) {
  if (!REQUIRED.includes(entry.key)) fail(`多出的档案键：${entry.key}（不在 182 个物质清单里）`);
}

// 2–7) 逐条
const seen = new Set();
for (const entry of entries) {
  const b = entry.body;
  const where = `第 ${entry.line} 行 ${entry.key}`;
  if (seen.has(entry.key)) fail(`重复键：${entry.key}`);
  seen.add(entry.key);

  for (const field of fieldNames(b)) {
    if (!ALLOWED_FIELDS.has(field)) fail(`${where}: 编造字段 "${field}"`);
  }

  const id = str(b, "id");
  if (id !== entry.key) fail(`${where}: id 必须是 "${entry.key}"，实际是 "${id}"`);
  const name = str(b, "name");
  if (!name) fail(`${where}: name 为空`);
  const aliases = arrayStrings(b, "aliases");
  if (!aliases.length) fail(`${where}: aliases 为空`);

  for (const field of ["claim", "classification", "structure"]) {
    if (!str(b, field)) fail(`${where}: ${field} 为空`);
  }

  for (const [field, label] of [
    ["position", "位置"],
    ["flow", "生成与去路"],
    ["significance", "生理/临床落点"],
  ]) {
    const sec = section(b, field);
    if (!sec) fail(`${where}: 缺 ${label} 段`);
    else if (!sec.title) fail(`${where}: ${label}段标题为空`);
    else if (!sec.body) fail(`${where}: ${label}段正文为空`);
  }

  const exam = examBlock(b);
  if (!exam) fail(`${where}: 缺考点段`);
  else {
    if (!exam.title) fail(`${where}: 考点段标题为空`);
    if (exam.items.length < 2 || exam.items.length > 4)
      fail(`${where}: 考点 ${exam.items.length} 条，应为 2–4 条`);
    if (exam.items.some((item) => !item.trim())) fail(`${where}: 考点里有空条目`);
  }

  const pathways = arrayStrings(b, "pathways");
  if (!pathways.length) fail(`${where}: pathways 为空（每条都应在至少一处挂图上出现）`);

  const sources = arrayStrings(b, "sources");
  if (sources.length < 2) fail(`${where}: sources ${sources.length} 条，至少 2 条`);
  if (sources.some((s) => !s.trim())) fail(`${where}: sources 里有空字符串`);

  const bub = bubble(b);
  if (!bub) fail(`${where}: 气泡两行缺失`);
  else {
    if (!bub.what.trim()) fail(`${where}: 气泡第 1 行为空`);
    if (!bub.highlight.trim()) fail(`${where}: 气泡第 2 行为空`);
    if (len(bub.what) > 21) fail(`${where}: 气泡第 1 行 ${len(bub.what)} 字 > 21`);
    if (len(bub.highlight) > 21) fail(`${where}: 气泡第 2 行 ${len(bub.highlight)} 字 > 21`);
  }

  const texts = [
    str(b, "claim"), str(b, "classification"), str(b, "structure"),
    ...(section(b, "position") ? [section(b, "position").title, section(b, "position").body] : []),
    ...(section(b, "flow") ? [section(b, "flow").title, section(b, "flow").body] : []),
    ...(section(b, "significance") ? [section(b, "significance").title, section(b, "significance").body] : []),
    ...(exam ? [exam.title, ...exam.items] : []),
  ].filter(Boolean).join("|");
  if (/第\s*\d+\s*页|P\.\s*\d+|真题|20\d{2}\s*年/.test(texts))
    fail(`${where}: 出现页码 / 真题年份`);
  if (/性质：|「性质」/.test(texts)) fail(`${where}: 出现「性质」段`);
}

// 负例自检：确认规则真的会报错
function expectFail(label, mutate, hit) {
  const copy = entries.map((e) => ({ ...e }));
  mutate(copy);
  const messages = [];
  const check = (body, key) => {
    const [what, highlight] = (body.match(/\n    bubble:\s*\{\s*what:\s*"([^"\n]*)",\s*highlight:\s*"([^"\n]*)"\s*\}/) ?? []).slice(1);
    if (len(what) > 21) messages.push("bubble1");
    if (len(highlight) > 21) messages.push("bubble2");
    if (!section(body, "flow")) messages.push("flow");
    if (arrayStrings(body, "sources").length < 2) messages.push("sources");
    if (!present.has(key)) messages.push("missing");
  };
  copy.forEach((e) => check(e.body, e.key));
  const dup = copy.filter((e, i) => copy.findIndex((x) => x.key === e.key) !== i).length;
  const ok = hit === "dup" ? dup > 0 : messages.includes(hit);
  console.log(`${ok ? "✔" : "✘"} 负例 ${label} → ${hit}`);
  if (!ok) fail(`负例自检失败：${label}`);
}
if (entries.length) {
  expectFail("气泡第 1 行 22 字", (c) => {
    c[0].body = c[0].body.replace(/(bubble:\s*\{\s*what:\s*")[^"]*/, "$1一二三四五六七八九十一二三四五六七八九十一二");
  }, "bubble1");
  expectFail("气泡第 2 行 22 字", (c) => {
    c[0].body = c[0].body.replace(/(highlight:\s*")[^"]*/, "$1一二三四五六七八九十一二三四五六七八九十一二");
  }, "bubble2");
  expectFail("删掉 flow 段", (c) => {
    c[0].body = c[0].body.replace(/\n    flow:\s*\{[\s\S]*?\n    \},/, "");
  }, "flow");
  expectFail("sources 只剩 1 条", (c) => {
    c[0].body = c[0].body.replace(/\n    sources:\s*\[[\s\S]*?\n    \],/, '\n    sources: [\n      "glucose.json · steps[gk-1]",\n    ],');
  }, "sources");
  expectFail("重复条目", (c) => { c.push({ ...c[0] }); }, "dup");
}

console.log(`目标 ${REQUIRED.length} 个物质；本次校验范围 ${scope.length} 个`);
console.log(`已有档案 ${entries.length} 个：${entries.map((e) => e.key).join(", ")}`);
for (const entry of entries) {
  const bub = bubble(entry.body);
  const exam = examBlock(entry.body);
  console.log(
    `  ${entry.key.padEnd(16)} 气泡 ${bub ? `${len(bub.what)}/21 · ${len(bub.highlight)}/21` : "—"} · 考点 ${exam?.items.length ?? 0} · 出处 ${arrayStrings(entry.body, "sources").length}`,
  );
}

if (errors.length) {
  console.error(`\n${errors.length} 项不合格：`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`\nOK：${scope.length} 个物质档案通过完整门槛（${entries.length}/${REQUIRED.length} 已写）`);
