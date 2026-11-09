import ChainOverviewPage from "./ChainOverviewPage";
import type { ChainData, ChainSkeleton } from "../data/chain/types";
import purineJson from "../data/purine/purine.json";
import purineSkeletonJson from "../data/purine/skeleton.json";

const DATA = purineJson as ChainData;
const SKEL = purineSkeletonJson as ChainSkeleton;

export default function PurineOverviewPage() {
  return (
    <ChainOverviewPage
      data={DATA}
      skel={SKEL}
      pathwayId="purine"
      idleContext="胞质从头合成 15 步 · 2D 口径"
    />
  );
}
