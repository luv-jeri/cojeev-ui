import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Mockup } from "./mockup";
import "./styles.css";

const params = new URLSearchParams(location.search);
document.documentElement.dataset.mode = params.get("mode") === "dark" ? "dark" : "light";
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Mockup state={params.get("state") ?? "request-edit"} />
  </StrictMode>,
);
