import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { TriageDashboard } from "./dashboard";
import { apiSource } from "./api";
import { fixtureSource } from "./fixtures";
import "./styles.css";

const source = new URLSearchParams(location.search).has("fixtures") ? fixtureSource : apiSource;
createRoot(document.getElementById("root")!).render(
  <StrictMode><TriageDashboard source={source} /></StrictMode>,
);
