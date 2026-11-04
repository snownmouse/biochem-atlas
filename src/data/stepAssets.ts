// 单步 3D 资产注册表：步骤 id → 资产目录。
// 事实源优先级：public/assets/steps/manifest.json（资产管线产出，异步加载）> 本地 step-assets.json（兜底，保证 gk-6 可用）。
// manifest 未生成 / 加载失败时按缺失降级，页面显示"资产筹备中"，不阻塞主链路。
import reg from "./step-assets.json";

export interface StepAssetCfg {
  /** public/assets/steps/ 下的目录名 */
  assetDir: string;
  /** 视图模式：two-state = 游离态/结合态切换；single-state = 仅一种 */
  mode: "two-state" | "single-state";
  /** URL 别名（如 gly-06），可选 */
  urlAlias?: string;
}

/** 本地兜底注册表（由 build-step-assets.mjs 的产出对应，手工同步） */
export const stepAssets = reg as Record<string, StepAssetCfg>;

/** 容错解析 manifest：支持 { steps: {...} } 或平铺 map；只认带 assetDir 的条目 */
function normalizeManifest(raw: unknown): Record<string, StepAssetCfg> {
  if (!raw || typeof raw !== "object") return {};
  const obj = raw as Record<string, unknown>;
  const entries =
    obj.steps && typeof obj.steps === "object" ? (obj.steps as Record<string, unknown>) : obj;
  const out: Record<string, StepAssetCfg> = {};
  for (const [k, v] of Object.entries(entries)) {
    if (!v || typeof v !== "object") continue;
    const c = v as Record<string, unknown>;
    if (typeof c.assetDir !== "string") continue;
    out[k] = {
      assetDir: c.assetDir,
      // 管线 v2 用 "static" 表示仅结合态；归一为 single-state
      mode: c.mode === "two-state" ? "two-state" : "single-state",
      urlAlias: typeof c.urlAlias === "string" ? c.urlAlias : undefined,
    };
  }
  return out;
}

let manifestPromise: Promise<Record<string, StepAssetCfg>> | null = null;

/** 拉取 manifest.json 并合并进注册表；失败时静默回退本地注册表（结果可安全为空 map） */
export function loadStepManifest(): Promise<Record<string, StepAssetCfg>> {
  manifestPromise ??= fetch("/assets/steps/manifest.json")
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`manifest ${r.status}`))))
    .then((raw) => normalizeManifest(raw))
    .catch(() => ({}));
  return manifestPromise;
}

/**
 * 按 URL 参数解析步骤资产配置；支持正式 id（gk-6）与别名（gly-06）。
 * reg 参数允许传入 manifest 合并后的注册表；缺省用本地兜底表。
 */
export function resolveStepAsset(
  stepId: string,
  reg: Record<string, StepAssetCfg> = stepAssets
): { stepKey: string; cfg: StepAssetCfg } | null {
  if (reg[stepId]) return { stepKey: stepId, cfg: reg[stepId] };
  const m = stepId.match(/^gly-(\d+)$/);
  const key = m ? `gk-${parseInt(m[1], 10)}` : null;
  if (key && reg[key]) return { stepKey: key, cfg: reg[key] };
  for (const [k, cfg] of Object.entries(reg)) {
    if (cfg.urlAlias === stepId) return { stepKey: k, cfg };
  }
  return null;
}
