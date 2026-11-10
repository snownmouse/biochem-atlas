// 数据入口：JSON 为唯一事实源（前端与 SVG 生成脚本共用），此文件只做类型包装。
// 与 glycolysis.ts 同款结构；额外导出回补反应与通路级说明。
import tcaJson from "./tca.json";
import skeletonTcaJson from "./skeleton-tca.json";
import type { Entity, Pathway, PathwaySkeleton, Step, AnaplerosisEntry } from "./types";

const data = tcaJson as unknown as Omit<Pathway, "skeleton"> & {
  entities: Entity[];
  anaplerosis: AnaplerosisEntry[];
  organNote?: string;
};

export const skeletonTca: PathwaySkeleton = skeletonTcaJson as PathwaySkeleton;

export const entitiesTca: Entity[] = data.entities;

export const stepsTca: Step[] = data.steps;

/** 接驳步（PDH）：单独条目，不计入环上 8 步 */
export const sideBranchStepsTca: Step[] = data.sideBranchSteps ?? [];

export const anaplerosis: AnaplerosisEntry[] = data.anaplerosis ?? [];

export const organNoteTca: string = data.organNote ?? "";

export const pathwayTca: Pathway = {
  id: data.id,
  name: data.name,
  summary: data.summary,
  organs: data.organs,
  steps: stepsTca,
  sideBranchSteps: sideBranchStepsTca,
  anaplerosis,
  anaplerosisNote: data.anaplerosisNote,
  organNote: data.organNote,
  skeleton: skeletonTca,
};

/** 本切片刻意留待下一轮或需人工复核的点 */
export const TODO_NOTES_TCA: string[] = [
  "ΔG 只保留定性判断，不展示数值，不可作定量判读。",
  "第 2 步的 ΔG 判断在教材间差异大。",
  "3D 结合视图整轮未做：1CTS / 7ACN / 1ZOY 等仅为候选条目。",
  "α-KGDH 无 PDH 式共价调控开关；PDK 同工型组织分布本图不展开。",
  "回补反应的酶学细节按教材标准表述（含 GDH 方向、丙酰-CoA 途径）。"
];
