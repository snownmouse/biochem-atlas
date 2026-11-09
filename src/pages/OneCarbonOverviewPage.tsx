import ChainOverviewPage from "./ChainOverviewPage";
import type { ChainData, ChainSkeleton } from "../data/chain/types";
import oneCarbonJson from "../data/one-carbon/one-carbon.json";
import oneCarbonSkeletonJson from "../data/one-carbon/skeleton.json";

const DATA = oneCarbonJson as ChainData;
const SKEL = oneCarbonSkeletonJson as ChainSkeleton;

export default function OneCarbonOverviewPage() {
  return (
    <ChainOverviewPage
      data={DATA}
      skel={SKEL}
      pathwayId="one-carbon"
      idleContext="装载 2 步 + 胞质 6 步 · 2D 口径"
    />
  );
}
