// ============================================================
// MoleculeArchiveEntry —— 挂图步骤详情面板的“本步分子档案 →”
//
// 只在该步确有分子档案时出现；目标复用结构页既有的 ?step= 深链，
// 不新增 mol= 参数，不带参数进入结构页时行为不变。
// ============================================================
import { Link } from "react-router-dom";
import { comparisonConfigFor } from "../data/comparisonConfig";
import { noteForMolecule } from "../data/moleculeNotes";

export default function MoleculeArchiveEntry({
  pathwayId,
  stepId,
  testId,
}: {
  pathwayId: string;
  stepId: string;
  testId?: string;
}) {
  const cfg = comparisonConfigFor(pathwayId);
  const step = cfg?.steps.find((s) => s.stepId === stepId);
  const hasNote =
    !!step && [...step.substrate.parts, ...step.product.parts].some((p) => noteForMolecule(p.id));
  if (!hasNote) return null;
  return (
    <Link
      className="frames-entry"
      data-testid={testId ?? "molecule-archive-entry"}
      data-cmp-step={stepId}
      to={`/structures/${pathwayId}?step=${encodeURIComponent(stepId)}`}
    >
      本步分子档案 →
    </Link>
  );
}
