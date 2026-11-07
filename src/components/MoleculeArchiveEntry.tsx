// ============================================================
// MoleculeArchiveEntry —— 挂图步骤详情面板的“本步分子档案 →”
//
// 只在该步确有分子档案时出现；目标复用结构页既有的 ?step= 深链，
// 不新增 mol= 参数，不带参数进入结构页时行为不变。
// ============================================================
import { Link } from "react-router-dom";
import { comparisonConfigFor } from "../data/comparisonConfig";
import { noteForMolecule } from "../data/moleculeNotes";
import { profileForMolecule } from "../data/moleculeProfiles";

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
  const parts = step ? [...step.substrate.parts, ...step.product.parts] : [];
  const hasNote = parts.some((p) => noteForMolecule(p.id));
  const profile = parts.map((p) => profileForMolecule(p.id)).find(Boolean);
  if (!hasNote && !profile) return null;
  return (
    <>
      {hasNote && (
        <Link
          className="frames-entry"
          data-testid={testId ?? "molecule-archive-entry"}
          data-cmp-step={stepId}
          to={`/structures/${pathwayId}?step=${encodeURIComponent(stepId)}`}
        >
          本步分子档案 →
        </Link>
      )}
      {profile && (
        <Link
          className="frames-entry"
          data-testid={`${testId ?? "molecule-archive-entry"}-profile`}
          data-cmp-step={stepId}
          style={{ marginLeft: 14 }}
          to={`/molecule/${profile.id}`}
        >
          本步物质简介 →
        </Link>
      )}
    </>
  );
}
