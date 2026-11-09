import ChainOverviewPage from "./ChainOverviewPage";
import type { ChainData, ChainSkeleton } from "../data/chain/types";
import pyrimidineJson from "../data/pyrimidine/pyrimidine.json";
import pyrimidineSkeletonJson from "../data/pyrimidine/skeleton.json";

const DATA = pyrimidineJson as ChainData;
const SKEL = pyrimidineSkeletonJson as ChainSkeleton;

export default function PyrimidineOverviewPage() {
  return (
    <ChainOverviewPage
      data={DATA}
      skel={SKEL}
      pathwayId="pyrimidine"
      idleContext="胞质 11 步 + 线粒体内膜 1 步 · 2D 口径"
    />
  );
}
