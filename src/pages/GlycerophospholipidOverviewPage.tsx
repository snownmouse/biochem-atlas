import ChainOverviewPage from "./ChainOverviewPage";
import type { ChainData, ChainSkeleton } from "../data/chain/types";
import glycerophospholipidJson from "../data/glycerophospholipid/glycerophospholipid.json";
import glycerophospholipidSkeletonJson from "../data/glycerophospholipid/skeleton.json";

const DATA = glycerophospholipidJson as ChainData;
const SKEL = glycerophospholipidSkeletonJson as ChainSkeleton;

export default function GlycerophospholipidOverviewPage() {
  return (
    <ChainOverviewPage
      data={DATA}
      skel={SKEL}
      pathwayId="glycerophospholipid"
      idleContext="内质网 14 步 + 高尔基体 1 步 · 2D 口径"
    />
  );
}
