import ChainOverviewPage from "./ChainOverviewPage";
import type { ChainData, ChainSkeleton } from "../data/chain/types";
import hemeJson from "../data/heme/heme.json";
import hemeSkeletonJson from "../data/heme/skeleton.json";

const DATA = hemeJson as ChainData;
const SKEL = hemeSkeletonJson as ChainSkeleton;

export default function HemeOverviewPage() {
  return (
    <ChainOverviewPage
      data={DATA}
      skel={SKEL}
      pathwayId="heme"
      idleContext="合成 8 步 + 降解 2 步 · 线粒体 / 胞质 / 内质网 · 2D 口径"
    />
  );
}
