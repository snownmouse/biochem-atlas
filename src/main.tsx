import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider, useParams } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import PathwayOverviewPage from "./pages/PathwayOverviewPage";
import TcaOverviewPage from "./pages/TcaOverviewPage";
import GluconeogenesisOverviewPage from "./pages/GluconeogenesisOverviewPage";
import PppOverviewPage from "./pages/PppOverviewPage";
import FaoOverviewPage from "./pages/FaoOverviewPage";
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
  ) : (
    <PathwayOverviewPage />
  );
}

const router = createBrowserRouter([
  { path: "/", element: <HomePage /> },
  { path: "/pathway/:pathwayId", element: <PathwayRoute /> },
  { path: "/step/:stepId", element: <StepViewPage /> },
  { path: "/structures/:pathwayId", element: <StructureFramesPage /> },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
