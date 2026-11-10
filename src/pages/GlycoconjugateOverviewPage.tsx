import ChainOverviewPage from "./ChainOverviewPage";
import type { ChainData, ChainSkeleton } from "../data/chain/types";
import glycoconjugateJson from "../data/glycoconjugate/glycoconjugate.json";
import glycoconjugateSkeletonJson from "../data/glycoconjugate/skeleton.json";

const DATA = glycoconjugateJson as ChainData;
const SKEL = glycoconjugateSkeletonJson as ChainSkeleton;

export default function GlycoconjugateOverviewPage() {
  return (
    <ChainOverviewPage
      data={DATA}
      skel={SKEL}
      pathwayId="glycoconjugate"
      idleContext="13 步 · 胞质 / 内质网 / 高尔基体 · 供体—转移酶—受体 · 2D 口径"
    />
  );
}
