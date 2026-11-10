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
import KetoneOverviewPage from "./pages/KetoneOverviewPage";
import OneCarbonOverviewPage from "./pages/OneCarbonOverviewPage";
import PyrimidineOverviewPage from "./pages/PyrimidineOverviewPage";
import PurineOverviewPage from "./pages/PurineOverviewPage";
import GlycerophospholipidOverviewPage from "./pages/GlycerophospholipidOverviewPage";
import LipoproteinOverviewPage from "./pages/LipoproteinOverviewPage";
import HemeOverviewPage from "./pages/HemeOverviewPage";
import BileAcidOverviewPage from "./pages/BileAcidOverviewPage";
import GlycoconjugateOverviewPage from "./pages/GlycoconjugateOverviewPage";
import RedoxOverviewPage from "./pages/RedoxOverviewPage";
import OxphosStructurePage from "./pages/OxphosStructurePage";
import StepViewPage from "./pages/StepViewPage";
import StructureFramesPage from "./pages/StructureFramesPage";
import MoleculeProfilePage from "./pages/MoleculeProfilePage";
import MoleculesIndexPage from "./pages/MoleculesIndexPage";
import SubstancesIndexPage from "./pages/SubstancesIndexPage";
import SubstanceProfilePage from "./pages/SubstanceProfilePage";
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
  ) : pathwayId === "fatty-acid-oxidation" || pathwayId === "fao" ? (
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
  ) : pathwayId === "ketone" ? (
    <KetoneOverviewPage />
  ) : pathwayId === "one-carbon" ? (
    <OneCarbonOverviewPage />
  ) : pathwayId === "pyrimidine" ? (
    <PyrimidineOverviewPage />
  ) : pathwayId === "purine" ? (
    <PurineOverviewPage />
  ) : pathwayId === "glycerophospholipid" ? (
    <GlycerophospholipidOverviewPage />
  ) : pathwayId === "lipoprotein" ? (
    <LipoproteinOverviewPage />
  ) : pathwayId === "heme" ? (
    <HemeOverviewPage />
  ) : pathwayId === "bile-acid" ? (
    <BileAcidOverviewPage />
  ) : pathwayId === "glycoconjugate" ? (
    <GlycoconjugateOverviewPage />
  ) : pathwayId === "redox" ? (
    <RedoxOverviewPage />
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
  { path: "/molecule/:id", element: <MoleculeProfilePage /> },
  { path: "/molecules", element: <MoleculesIndexPage /> },
  { path: "/substances", element: <SubstancesIndexPage /> },
  { path: "/substance/:id", element: <SubstanceProfilePage /> },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
