import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { chromium } from "playwright";
import { brandPath } from "../lib/brand";

export const alt =
  "000h by Cojeev. Good things come together. Expressive React components.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
async function generate() {
  const [displayFont, textFont] = await Promise.all([
    readFile(
      new URL(
        "../reference/cojeev-handoff-v4/fonts/BricolageGrotesque-VF.ttf",
        import.meta.url,
      ),
    ),
    readFile(
      new URL(
        "../reference/cojeev-handoff-v4/fonts/DMSans-VF.ttf",
        import.meta.url,
      ),
    ),
  ]);
  const artwork = renderToStaticMarkup(
    <div
      style={{
        display: "flex",
        width: 1200,
        height: 630,
        boxSizing: "border-box",
        background: "#f8f6f1",
        color: "#27292d",
        padding: 64,
        flexDirection: "column",
        justifyContent: "space-between",
        fontFamily: "DM Sans",
      }}
    >
      <div
        data-brand-wordmark=""
        style={{ display: "flex", alignItems: "center", gap: 0 }}
      >
        <svg
          width="50"
          height="50"
          viewBox="0 0 96 96"
          style={{ marginRight: -2 }}
        >
          <path d={brandPath} fill="#27292d" fillRule="evenodd" />
        </svg>
        <span
          style={{
            fontFamily: "Bricolage Grotesque",
            fontSize: 54,
            letterSpacing: -5,
          }}
        >
          00h
        </span>
        <span style={{ fontSize: 24, marginLeft: 18 }}>by Cojeev</span>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontFamily: "Bricolage Grotesque",
            fontSize: 86,
            lineHeight: 1.08,
            letterSpacing: -4,
          }}
        >
          <span>Good things</span>
          <span>come together.</span>
        </div>
        <svg width="300" height="300" viewBox="0 0 96 96">
          <path d={brandPath} fill="#9AAB63" fillRule="evenodd" />
        </svg>
      </div>
      <div
        style={{
          display: "flex",
          borderTop: "1px solid #d8d3c8",
          paddingTop: 24,
          justifyContent: "space-between",
          fontSize: 24,
        }}
      >
        <span>Expressive React components</span>
        <span>Open source · Yours to make</span>
      </div>
    </div>,
  );
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: size,
      deviceScaleFactor: 1,
    });
    await page.setContent(`<html><head><style>
      @font-face{font-family:'Bricolage Grotesque';src:url(data:font/ttf;base64,${displayFont.toString("base64")});font-weight:100 900}
      @font-face{font-family:'DM Sans';src:url(data:font/ttf;base64,${textFont.toString("base64")});font-weight:100 1000}
      body{margin:0} svg{flex:none}
    </style></head><body>${artwork}</body></html>`);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      path: fileURLToPath(
        new URL("../app/opengraph-image.png", import.meta.url),
      ),
    });
    // A portable lockup alongside the compact vector symbol.
    const lockup = await page
      .locator("[data-brand-wordmark]")
      .evaluate((element) => element.outerHTML);
    await page.setContent(`<html><head><style>
      @font-face{font-family:'Bricolage Grotesque';src:url(data:font/ttf;base64,${displayFont.toString("base64")});font-weight:100 900}
      @font-face{font-family:'DM Sans';src:url(data:font/ttf;base64,${textFont.toString("base64")});font-weight:100 1000}
      body{margin:0;background:transparent;color:#27292d;font-family:'DM Sans'}
      [data-brand-wordmark]{width:max-content;padding:24px}svg{flex:none}
    </style></head><body>${lockup}</body></html>`);
    await page.evaluate(() => document.fonts.ready);
    await page
      .locator("[data-brand-wordmark]")
      .screenshot({
        path: fileURLToPath(
          new URL("../public/brand/000h-wordmark.png", import.meta.url),
        ),
        omitBackground: true,
      });
  } finally {
    await browser.close();
  }
}
void generate();
