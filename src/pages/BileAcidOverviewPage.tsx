import ChainOverviewPage from "./ChainOverviewPage";
import type { ChainData, ChainSkeleton } from "../data/chain/types";
import bileAcidJson from "../data/bile-acid/bile-acid.json";
import bileAcidSkeletonJson from "../data/bile-acid/skeleton.json";

const DATA = bileAcidJson as ChainData;
const SKEL = bileAcidSkeletonJson as ChainSkeleton;

export default function BileAcidOverviewPage() {
  return (
    <ChainOverviewPage
      data={DATA}
      skel={SKEL}
      pathwayId="bile-acid"
      idleContext="6 步 + 1 段肠肝循环 · 内质网 / 线粒体 / 过氧化物酶体 · 2D 口径"
    />
  );
}
