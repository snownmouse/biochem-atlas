import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider, useParams } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import PathwayOverviewPage from "./pages/PathwayOverviewPage";
import TcaOverviewPage from "./pages/TcaOverviewPage";
import GluconeogenesisOverviewPage from "./pages/GluconeogenesisOverviewPage";
import PppOverviewPage from "./pages/PppOverviewPage";
import FaoOverviewPage from "./pages/FaoOverviewPage";
import FasOverviewPage from "./pages/FasOverviewPage";
import OxphosOverviewPage from "./pages/OxphosOverviewPage";
import CoriOverviewPage from "./pages/CoriOverviewPage";
import UreaCycleOverviewPage from "./pages/UreaCycleOverviewPage";
import GlycogenOverviewPage from "./pages/GlycogenOverviewPage";
import AminoAcidOverviewPage from "./pages/AminoAcidOverviewPage";
import CholesterolOverviewPage from "./pages/CholesterolOverviewPage";
import OxphosStructurePage from "./pages/OxphosStructurePage";
import StepViewPage from "./pages/StepViewPage";
import StructureFramesPage from "./pages/StructureFramesPage";
import "./styles.css";

/** 通路路由分发：pathwayId 驱动，糖酵解渲染路径保持原样 */
function PathwayRoute() {
  const { pathwayId } = useParams();
  return pathwayId === "tca" ? (
    <TcaOverviewPage />
  ) : pathwayId === "gluconeogenesis" ? (
    <GluconeogenesisOverviewPage />
  ) : pathwayId === "ppp" ? (
    <PppOverviewPage />
  ) : pathwayId === "fatty-acid-oxidation" ? (
    <FaoOverviewPage />
  ) : pathwayId === "fatty-acid-synthesis" || pathwayId === "fas" ? (
    <FasOverviewPage />
  ) : pathwayId === "oxphos" ? (
    <OxphosOverviewPage />
  ) : pathwayId === "cori" ? (
    <CoriOverviewPage />
  ) : pathwayId === "urea-cycle" || pathwayId === "urea" ? (
    <UreaCycleOverviewPage />
  ) : pathwayId === "glycogen" || pathwayId === "glycogen-metabolism" ? (
    <GlycogenOverviewPage />
  ) : pathwayId === "amino-acids" || pathwayId === "amino-acid-metabolism" ? (
    <AminoAcidOverviewPage />
  ) : pathwayId === "cholesterol" || pathwayId === "cholesterol-synthesis" ? (
    <CholesterolOverviewPage />
  ) : (
    <PathwayOverviewPage />
  );
}

/** 结构路由分发：氧化磷酸化是模块页，不套用逐步分子对照器 */
function StructureRoute() {
  const { pathwayId } = useParams();
  return pathwayId === "oxphos" ? <OxphosStructurePage /> : <StructureFramesPage />;
}

const router = createBrowserRouter([
  { path: "/", element: <HomePage /> },
  { path: "/pathway/:pathwayId", element: <PathwayRoute /> },
  { path: "/step/:stepId", element: <StepViewPage /> },
  { path: "/structures/:pathwayId", element: <StructureRoute /> },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
