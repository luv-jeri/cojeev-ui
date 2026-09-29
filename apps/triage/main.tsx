import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { TriageDashboard, type Target } from "./dashboard";
import { apiSource } from "./api";
import { fixtureSource } from "./fixtures";
import "./styles.css";

declare const __TRIAGE_TARGET__: Exclude<Target, "fixtures">;

const fixtures = new URLSearchParams(location.search).has("fixtures");
document.documentElement.dataset.mode = localStorage.getItem("triage-mode") === "dark" ? "dark" : "light";
createRoot(document.getElementById("root")!).render(
  <StrictMode><TriageDashboard source={fixtures ? fixtureSource : apiSource} target={fixtures ? "fixtures" : __TRIAGE_TARGET__} /></StrictMode>,
);
