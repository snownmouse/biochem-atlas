// ============================================================
// gen-2d-frames.mjs —— 2D 结构式帧资产（纸白底 + 线描结构式 + 立体化学标注）
//
// 用途：当某一步的产物/中间体在 PDB 配体字典中不存在（甘油醛-3-磷酸 GAP、
// 1,3-BPG 已确认无条目），对应帧用 2D 结构式呈现，帧带标"2D 结构式 · 无实验三维坐标"。
// 坐标为人工排布的**图示坐标**（2D 结构式本来就是画出来的），不声称任何三维构象。
//
// 输出：public/assets/structures/2d/{demo-gap,gap,bpg13,pyruvate}.json
//   demo-gap.json  DEMO 占位帧（不进正式序列，冒烟断言用）
//   gap.json       甘油醛-3-磷酸（gk-5-f2 产物帧 + gk-6-f0 底物帧共用）
//   bpg13.json     1,3-二磷酸甘油酸（gk-6-f3 产物帧 + gk-7-f1 底物帧共用）
//   pyruvate.json  丙酮酸（gk-10-f3 产物帧；6NN4 无产物坐标、ADP 未建模）
//
// schema：{ frameId, kind:"2d", view:{w,h},
//           atoms:[{id,el,x,y,label,charge?}],       C 原子为隐式顶点（el=C 不渲染圈/标签）
//           bonds:[{a,b,order:1|2}],                 order=2 画双线
//           wedge:[{a,b}],                           实楔（朝向观察者），立体化学
//           annotations:[{x,y,text}] }               9.5px 注记
// ============================================================
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "assets", "structures", "2d");
mkdirSync(OUT, { recursive: true });

const V = 860; // 画布宽
const H = 540; // 画布高

// ---------- 甘油醛-3-磷酸（D-GAP）：CHO–CH(OH)–CH2–O–PO3²⁻ ----------
// C2 手性（R）：O2 用实楔表示朝向观察者
const gapAtoms = [
  { id: 1, el: "C", x: 240, y: 300, label: "C1" }, // 醛基碳（隐式顶点，label 供调试不渲染）
  { id: 2, el: "O", x: 240, y: 210, label: "O" }, // C1=O
  { id: 3, el: "C", x: 340, y: 360, label: "C2" }, // 手性碳
  { id: 4, el: "O", x: 340, y: 455, label: "O" }, // C2–OH（实楔）
  { id: 5, el: "C", x: 440, y: 300, label: "C3" },
  { id: 6, el: "O", x: 540, y: 360, label: "O" }, // C3–O–P 酯氧
  { id: 7, el: "P", x: 640, y: 300, label: "P" },
  { id: 8, el: "O", x: 640, y: 200, label: "O" }, // P=O
  { id: 9, el: "O", x: 740, y: 355, label: "O", charge: "−" },
  { id: 10, el: "O", x: 740, y: 245, label: "O", charge: "−" },
];
const gapBonds = [
  { a: 1, b: 2, order: 2 }, // C1=O（醛基）
  { a: 1, b: 3 },
  { a: 3, b: 5 },
  { a: 3, b: 4 }, // 楔键
  { a: 5, b: 6 },
  { a: 6, b: 7 },
  { a: 7, b: 8, order: 2 }, // P=O
  { a: 7, b: 9 },
  { a: 7, b: 10 },
];
const gapWedge = [{ a: 3, b: 4 }];
const gapAnnotations = [
  { x: 140, y: 165, text: "C1 醛基：TPI 中 1,2-氢迁移的起点（C1–H 经烯二醇中间体转移到 C2）" },
  { x: 355, y: 500, text: "C2 手性中心（D-GAP 为 R 构型；实楔 = 朝向观察者）" },
  { x: 560, y: 430, text: "C6 位磷酸基（来自第 1 步己糖激酶，全通路保持）" },
];

// ---------- 1,3-二磷酸甘油酸（1,3-BPG）：C1 酰基磷酸 + C3 磷酸酯 ----------
const bpgAtoms = [
  { id: 1, el: "P", x: 120, y: 300, label: "P" }, // C1 酰基磷酸
  { id: 2, el: "O", x: 120, y: 200, label: "O" }, // P=O
  { id: 3, el: "O", x: 40, y: 355, label: "O", charge: "−" },
  { id: 4, el: "O", x: 40, y: 245, label: "O", charge: "−" },
  { id: 5, el: "O", x: 220, y: 360, label: "O" }, // 酰基磷酸桥氧 P–O–C1
  { id: 6, el: "C", x: 310, y: 300, label: "C1" }, // 酰基碳
  { id: 7, el: "O", x: 310, y: 200, label: "O" }, // C1=O（酮羰基）
  { id: 8, el: "C", x: 410, y: 360, label: "C2" }, // 手性碳
  { id: 9, el: "O", x: 410, y: 455, label: "O" }, // C2–OH（实楔）
  { id: 10, el: "C", x: 510, y: 300, label: "C3" },
  { id: 11, el: "O", x: 610, y: 360, label: "O" }, // C3–O–P 酯氧
  { id: 12, el: "P", x: 710, y: 300, label: "P" }, // C3 磷酸酯
  { id: 13, el: "O", x: 710, y: 200, label: "O" }, // P=O
  { id: 14, el: "O", x: 810, y: 355, label: "O", charge: "−" },
  { id: 15, el: "O", x: 810, y: 245, label: "O", charge: "−" },
];
const bpgBonds = [
  { a: 1, b: 2, order: 2 },
  { a: 1, b: 3 },
  { a: 1, b: 4 },
  { a: 1, b: 5 },
  { a: 5, b: 6 }, // 高能酰基磷酸键
  { a: 6, b: 7, order: 2 },
  { a: 6, b: 8 },
  { a: 8, b: 10 },
  { a: 8, b: 9 }, // 楔键
  { a: 10, b: 11 },
  { a: 11, b: 12 },
  { a: 12, b: 13, order: 2 },
  { a: 12, b: 14 },
  { a: 12, b: 15 },
];
const bpgWedge = [{ a: 8, b: 9 }];
const bpgAnnotations = [
  { x: 60, y: 165, text: "C1 酰基磷酸（高能键）：GAPDH 氧化醛基的产物 / PGK 的磷酰基供体" },
  { x: 425, y: 500, text: "C2 手性中心（R 构型；实楔 = 朝向观察者）" },
  { x: 640, y: 430, text: "C3 磷酸酯（继承自第 1 步 C6 位磷酰基，碳链缩短后编号改变）" },
];

// ---------- 丙酮酸（CH3–C(=O)–COO⁻）：第 10 步 PK 产物 ----------
// 6NN4 无丙酮酸坐标、ADP 未建模 → 2D 结构式帧（gk-10-f3）
const pyrAtoms = [
  { id: 1, el: "O", x: 240, y: 210, label: "O" }, // C1=O（羧酸根共轭）
  { id: 2, el: "C", x: 240, y: 300, label: "C1" }, // 羧酸根碳（隐式顶点）
  { id: 3, el: "O", x: 140, y: 360, label: "O", charge: "−" },
  { id: 4, el: "C", x: 340, y: 360, label: "C2" }, // 酮羰基碳
  { id: 5, el: "O", x: 340, y: 455, label: "O" }, // C2=O
  { id: 6, el: "C", x: 440, y: 300, label: "C3" }, // 甲基（隐式顶点）
];
const pyrBonds = [
  { a: 2, b: 1, order: 2 },
  { a: 2, b: 3 },
  { a: 2, b: 4 },
  { a: 4, b: 5, order: 2 },
  { a: 4, b: 6 },
];
const pyrAnnotations = [
  { x: 80, y: 165, text: "C1 羧酸根：2PG/PEP 一路保住的碳骨架端基（第 5–9 步 C1–C3 骨架未断）" },
  { x: 250, y: 520, text: "C2 酮羰基：PK 直接产物为烯醇式丙酮酸，自发互变异构为酮式（图示酮式终态）" },
  { x: 430, y: 245, text: "C3 甲基：来自 PEP 的 CH₂——C2=C3 双键在磷酰基转移与异构化后饱和" },
];

const mk = (frameId, atoms, bonds, wedge, annotations) => ({
  frameId,
  kind: "2d",
  view: { w: V, h: H },
  atoms,
  bonds,
  wedge,
  annotations,
});

for (const [name, obj] of [
  ["gap", mk("gap-2d", gapAtoms, gapBonds, gapWedge, gapAnnotations)],
  ["bpg13", mk("bpg13-2d", bpgAtoms, bpgBonds, bpgWedge, bpgAnnotations)],
  ["pyruvate", mk("pyruvate-2d", pyrAtoms, pyrBonds, [], pyrAnnotations)],
  ["demo-gap", mk("demo-gap-2d", gapAtoms, gapBonds, gapWedge, [
    ...gapAnnotations,
    { x: 60, y: 90, text: "DEMO 占位：验证 2D 渲染路径，不进正式帧序列" },
  ])],
]) {
  const p = join(OUT, `${name}.json`);
  writeFileSync(p, JSON.stringify(obj));
  console.log(`写出 ${p}（${(Buffer.byteLength(JSON.stringify(obj)) / 1024).toFixed(1)} KB）`);
}
console.log("2D 结构式帧资产完成。");
