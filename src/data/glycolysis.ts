// 数据入口：JSON 为唯一事实源（前端与 SVG 生成脚本共用），此文件只做类型包装。
import glycolysisJson from "./glycolysis.json";
import skeletonJson from "./skeleton.json";
import type { Entity, Pathway, PathwaySkeleton, Step } from "./types";

// JSON 导入的字面量类型会被放宽为 string，这里用断言收口到领域类型。
const data = glycolysisJson as unknown as Omit<Pathway, "skeleton"> & {
  entities: Entity[];
};

export const skeleton: PathwaySkeleton = skeletonJson as PathwaySkeleton;

export const entities: Entity[] = data.entities;

export const steps: Step[] = data.steps;

/** 支路步骤（如红细胞 Rapoport–Luebering 支路） */
export const sideBranchSteps: Step[] = data.sideBranchSteps ?? [];

export const pathway: Pathway = {
  id: data.id,
  name: data.name,
  summary: data.summary,
  organs: data.organs,
  steps,
  sideBranchSteps,
  skeleton,
};

/** 本切片刻意留待下一轮或需人工复核的点 */
export const TODO_NOTES: string[] = [
  "第 4/5 步：主页面上是两个独立节点（醛缩酶裂解、TPI 异构），DHAP 支路默认折叠。",
  "PFK 红细胞 L/M 杂合体：按档案 gk-03 §10 以保守措辞表述（“一般认为是……组成细节见档案”）。",
  "PK 同工酶（PK-L / PK-M / PK-R）的调控细节（如 PK-R 是否受磷酸化调控）本图不展开。",
  "BindingProfile 不进入本页视图。",
  "别构调控网络（抑制/激活线）本切片未绘制，页面不展示调控线。",
];
