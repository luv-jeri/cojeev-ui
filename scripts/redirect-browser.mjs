import { readFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { chromium } from "playwright";
import { load } from "cheerio";
import { startAssetRouter } from "./asset-router-harness.mjs";

const hosts = {
  production: { legacy: "https://000h.cojeev.com", canonical: "https://cojeev.com", api: "https://feedback.cojeev.com" },
  beta: { legacy: "https://beta.000h.cojeev.com", canonical: "https://beta.000h.cojeev.com", api: "https://feedback-beta.cojeev.com" },
};
const productionCheck = "tracking_fragment_survives_legacy_redirect";
const betaCheck = "beta_queued_admin_query_and_component_links_survive_cutover";
const rows = {
  production: [
    [productionCheck, "/track/#gate-0000"],
    [productionCheck, "/docs/button/?a=1&a=2"],
    ["encoded_path_lands_beneath_ui", "/docs/%62utton/", "encoded-button"],
  ],
  beta: [
    ["beta_tracking_fragment_survives_same_host_redirect_in_browser", "/track/#gate-0000"],
    [betaCheck, "/feedback-admin/?report=gate-0000"],
    [betaCheck, "/docs/button/", "button"],
    [betaCheck, "/work-with-me/"],
    [betaCheck, "/docs/__gate_unknown__/", "404"],
  ],
};

let browser, router, failed = false;
function result(check, passed, url) {
  console.log(passed ? `PASS ${check}` : `FAIL ${check} ${new URL(url).pathname}`);
  if (!passed) failed = true;
}

try {
  const args = process.argv.slice(2);
  if (args.length !== 1 || !/^--(?:packaged|live)=.+$/.test(args[0])) throw new Error("Invalid mode");
  const packaged = args[0].startsWith("--packaged=");
  const value = args[0].slice(args[0].indexOf("=") + 1);
  let environment = value, notFoundHeading;
  if (packaged) {
    const directory = resolve(value);
    const manifest = JSON.parse(await readFile(join(directory, "manifest.json"), "utf8"));
    environment = manifest.environment;
    if (!hosts[environment] || manifest.side !== "website" || manifest.phase !== "redirect") throw new Error("Not a website-redirect variant");
    notFoundHeading = load(await readFile(join(directory, "site/404.html"), "utf8"))("h1").first().text();
    router = await startAssetRouter({ worker: { kind: "packaged", directory }, homepage: join(directory, "site") });
  }
  if (!hosts[environment]) throw new Error("Invalid environment");
  const { legacy, canonical, api } = hosts[environment];
  browser = await chromium.launch();
  const context = await browser.newContext({ reducedMotion: "reduce", serviceWorkers: "block" });
  const packagedChain = [];
  let servePackaged;
  if (packaged) {
    servePackaged = async (request, fulfill, abort) => {
      const url = new URL(request.url);
      if ([legacy, canonical].includes(url.origin)) {
        // Keep redirects manual: the browser, including its fragment handling,
        // must consume the variant's own Location header.
        const response = await router.fetch(request.url, { method: request.method, headers: request.headers, redirect: "manual" });
        packagedChain.push({ url: request.url, status: response.status, location: response.headers.get("location") });
        const headers = Object.fromEntries(response.headers);
        delete headers["content-length"];
        delete headers["content-encoding"];
        await fulfill({ status: response.status, headers, body: Buffer.from(await response.arrayBuffer()) });
      } else if (url.origin === api) {
        const body = url.pathname === "/v1/config" ? { local: true, emailEnabled: false, turnstileSiteKey: "" }
          : { requests: [], reports: [], total: 0, status: "received" };
        await fulfill({ status: 200, headers: { "content-type": "application/json", "access-control-allow-origin": canonical }, body: Buffer.from(JSON.stringify(body)) });
      } else await abort();
    };
    await context.route("**/*", async route => {
      const request = route.request();
      await servePackaged({ url: request.url(), method: request.method(), headers: request.headers() }, value => route.fulfill(value), () => route.abort());
    });
  } else {
    await context.route(`${api}/**`, route => route.request().method() === "POST" ? route.abort() : route.continue());
  }
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const urls = [];
  if (packaged) {
    // Playwright routes only the first request of a redirect chain. A second
    // CDP interceptor handles redirected hops so none can escape to the network.
    // Ordinary requests continue to the context.route handler above.
    const cdp = await context.newCDPSession(page);
    cdp.on("Fetch.requestPaused", async event => {
      try {
        if (!event.redirectedRequestId) return await cdp.send("Fetch.continueRequest", { requestId: event.requestId });
        urls.push(event.request.url);
        await servePackaged(event.request, response => cdp.send("Fetch.fulfillRequest", {
          requestId: event.requestId,
          responseCode: response.status,
          responseHeaders: Object.entries(response.headers).map(([name, value]) => ({ name, value })),
          body: response.body.toString("base64"),
        }), () => cdp.send("Fetch.failRequest", { requestId: event.requestId, errorReason: "BlockedByClient" }));
      } catch {
        result("packaged_request", false, event.request.url);
        await cdp.send("Fetch.failRequest", { requestId: event.requestId, errorReason: "Failed" }).catch(() => {});
      }
    });
    await cdp.send("Fetch.enable", { patterns: [{ urlPattern: "*", requestStage: "Request" }] });
  }
  context.on("request", request => urls.push(request.url()));
  page.on("framenavigated", frame => urls.push(frame.url()));
  const contentIsCorrect = async (response, content) => {
    if (content === "button") return response?.status() === 200 && await page.getByRole("heading", { name: "Button", exact: true }).first().isVisible();
    if (content === "404") {
      const heading = await page.locator("h1").first().innerText();
      return response?.status() === 404 && (packaged ? !!notFoundHeading && heading === notFoundHeading : /404|not found/i.test(heading));
    }
    return true;
  };
  for (const [check, path, content] of rows[environment]) {
    const expected = `${canonical}/ui${path}`;
    const encoded = content === "encoded-button";
    const beneathUi = () => {
      const url = new URL(page.url());
      return url.origin === canonical && url.pathname.startsWith("/ui/") && !url.pathname.includes("/ui/ui/");
    };
    packagedChain.length = 0;
    let passed = false;
    let response;
    try {
      response = await page.goto(`${legacy}${path}`, { waitUntil: "networkidle" });
      passed = encoded ? beneathUi() && await contentIsCorrect(response, "button")
        : page.url() === expected && await contentIsCorrect(response, content);
    } catch { /* Only the check and a path are printed, never query/fragment data. */ }
    if (encoded) {
      let firstHop;
      try {
        if (packaged) firstHop = packagedChain.find(hop => hop.url === `${legacy}${path}`);
        else {
          let request = response?.request();
          while (request?.redirectedFrom()) request = request.redirectedFrom();
          const firstResponse = await request?.response();
          if (firstResponse) firstHop = { status: firstResponse.status(), location: await firstResponse.headerValue("location") };
        }
      } catch { /* A missing first navigation response fails the first-hop gate. */ }
      result("legacy_encoded_path_301_keeps_encoding", firstHop?.status === 301 && firstHop.location === expected, `${legacy}${path}`);
    } else result(check, passed, page.url().startsWith("http") ? page.url() : expected);
    const landed = page.url();
    let reloaded = false;
    try {
      const response = await page.reload({ waitUntil: "networkidle" });
      reloaded = encoded ? page.url() === landed && beneathUi() && await contentIsCorrect(response, "button")
        : page.url() === expected && await contentIsCorrect(response, content);
    } catch { /* A failed reload is a failed gate. */ }
    const doublePrefix = urls.find(url => new URL(url).pathname.includes("/ui/ui/"));
    if (encoded) result(check, passed && reloaded && !doublePrefix, page.url().startsWith("http") ? page.url() : expected);
    result("no_second_ui_prefix", reloaded && !doublePrefix, doublePrefix ?? expected);
  }
} catch {
  result("redirect_browser_setup", false, "https://cojeev.com/ui/");
} finally {
  await browser?.close();
  await router?.dispose();
}
if (failed) process.exitCode = 1;
