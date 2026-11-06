// 全站通路导航的唯一索引：挂图页 / 结构页 / 首页共用一份清单。
// 显示名与 PLATE 编号从既有数据推导（homeMap.ts 的 HOME_PATHWAYS + cori.json），
// 不在各页面里重复写数组；新增通路只改这里。
import { HOME_PATHWAYS, type HomePathwayId } from "./homeMap";
import coriJson from "./cori/cori.json";

export type PathwayNavId = HomePathwayId | "cori";
export type NavItemId = PathwayNavId | "home";

export interface PathwayNavEntry {
  /** 条目 id；home 单列，避免与通路 id 混淆 */
  id: NavItemId;
  /** 显示名（中文） */
  name: string;
  /** 挂图路由 */
  route: string;
  /** 结构对照路由；null 表示尚未接入 */
  structureRoute: string | null;
  /** 两位 PLATE 编号（挂图上的紧凑前缀） */
  plateNo: string;
}

/** "PLATE 07 / 12" → "07" */
function plateDigits(plateNo: string): string {
  return plateNo.match(/\d{2}/)?.[0] ?? plateNo;
}

const cori = coriJson as unknown as { name: string; plateNo: string };

const NAV_ENTRIES: PathwayNavEntry[] = [
  { id: "home", name: "首页", route: "/", structureRoute: null, plateNo: "00" },
  ...HOME_PATHWAYS.map((pathway) => ({
    id: pathway.id,
    name: pathway.name,
    route: pathway.route,
    structureRoute: pathway.structureRoute,
    plateNo: plateDigits(pathway.plateNo),
  })),
  {
    id: "cori",
    name: cori.name,
    route: "/pathway/cori",
    structureRoute: "/structures/cori",
    plateNo: plateDigits(cori.plateNo),
  },
];

/** 按 PLATE 编号排序，保证 Cori（07）与 FAS（08）不会因为加入顺序而倒挂 */
export const PATHWAY_NAV: PathwayNavEntry[] = NAV_ENTRIES.sort((a, b) => a.plateNo.localeCompare(b.plateNo));

export const PATHWAY_NAV_TOTAL = PATHWAY_NAV.length;
