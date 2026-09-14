import { chromium } from "playwright";
import { readFile, writeFile, mkdir } from "node:fs/promises";
const base = process.env.POLISH_URL ?? "http://127.0.0.1:4321/cojeev-ui";
const intake = await readFile(
  "docs/quality/2026-09-10-library-overhaul-intake.md",
  "utf8",
);
const ids = [
  ...new Set(
    process.argv.includes("--all")
      ? JSON.parse(await readFile("registry.json", "utf8"))
          .items.filter((item) => item.type === "registry:ui")
          .map((item) => item.name)
      : [
          ...[...intake.matchAll(/^\| `([^`]+)` \|/gm)].map((m) => m[1]),
          "spinner",
          "icon",
          "animated-icon",
          "shape",
          "shape-artwork",
          "bento-grid",
          "bento-builder",
          "hero-button",
        ],
  ),
].filter((x) => !x.includes("/") && !x.includes(" "));
const browser = await chromium.launch();
const result = [];
try {
  const page = await browser.newPage({
    viewport: { width: 390, height: 900 },
    reducedMotion: "reduce",
  });
  for (const id of ids) {
    await page.goto(`${base}/docs/${id}/`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      () => document.querySelector(".report-launcher")?.disabled === false,
    );
    const preview = page.locator("[data-slot=preview]").first();
    if (await preview.count()) await preview.scrollIntoViewIfNeeded();
    const ports = await page.locator(".docs-article").evaluate((root) =>
      [...root.querySelectorAll("*")]
        .filter((e) => {
          const s = getComputedStyle(e);
          return (
            e.getBoundingClientRect().width > 0 &&
            ((/(auto|scroll)/.test(s.overflowY) &&
              e.scrollHeight > e.clientHeight + 2) ||
              (/(auto|scroll)/.test(s.overflowX) &&
                e.scrollWidth > e.clientWidth + 2))
          );
        })
        .map((e) => ({
          tag: e.tagName,
          slot: e.getAttribute("data-slot"),
          class: e.className,
          radix: e.hasAttribute("data-radix-scroll-area-viewport"),
          managed: e.getAttribute("data-element-scrollbar"),
          x: e.scrollWidth > e.clientWidth + 2,
          y: e.scrollHeight > e.clientHeight + 2,
        })),
    );
    result.push({ id, ports });
    console.log(
      id,
      ports.filter((x) => !x.radix && x.managed !== "mounted"),
    );
  }
  await mkdir("artifacts", { recursive: true });
  await writeFile(
    `artifacts/owned-scrollports-${process.argv.includes("--all") ? "all" : "recovery"}.json`,
    JSON.stringify(result, null, 2),
  );
} finally {
  await browser.close();
}
