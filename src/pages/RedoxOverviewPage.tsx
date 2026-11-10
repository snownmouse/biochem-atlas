import ChainOverviewPage from "./ChainOverviewPage";
import type { ChainData, ChainSkeleton } from "../data/chain/types";
import redoxJson from "../data/redox/redox.json";
import redoxSkeletonJson from "../data/redox/skeleton.json";

const DATA = redoxJson as ChainData;
const SKEL = redoxSkeletonJson as ChainSkeleton;

export default function RedoxOverviewPage() {
  return (
    <ChainOverviewPage
      data={DATA}
      skel={SKEL}
      pathwayId="redox"
      idleContext="6 步 · 线粒体 / 胞质 · 防御网络 · 2D 口径"
    />
  );
}
