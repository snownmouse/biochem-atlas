import ChainOverviewPage from "./ChainOverviewPage";
import type { ChainData, ChainSkeleton } from "../data/chain/types";
import ketoneJson from "../data/ketone/ketone.json";
import ketoneSkeletonJson from "../data/ketone/skeleton.json";

const DATA = ketoneJson as ChainData;
const SKEL = ketoneSkeletonJson as ChainSkeleton;

export default function KetoneOverviewPage() {
  return (
    <ChainOverviewPage
      data={DATA}
      skel={SKEL}
      pathwayId="ketone"
      idleContext="生酮 5 步 + 利用 1 段"
    />
  );
}
