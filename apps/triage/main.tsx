import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { TriageDashboard } from "./dashboard";
import { fixtureSource } from "./fixtures";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode><TriageDashboard source={fixtureSource} /></StrictMode>,
);
