import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { preview } from 'vite';

const main = path.resolve(process.argv[2] || '../..');
const output = path.resolve(process.argv[3] || '.work/webkit-shape-trace');
const runner = path.resolve('.work/webkit-shape-trace-runner.mjs');
const suppress = process.argv.includes('--suppress-compat-mouse');
let source = fs.readFileSync(path.join(main, 'scripts/check-mobile-webkit.mjs'), 'utf8');
const instrumentation = `
      window.__sceneTrace = [];
      const note = (type, detail = {}) => window.__sceneTrace.push({ type, time: performance.now(), ...detail });
      window.__sceneNote = note;
      ${suppress ? `addEventListener('pointermove', event => { if (event.pointerType === 'mouse' && matchMedia('(pointer: coarse)').matches && event.target.closest?.('[data-slot="shape-scene"]')) { note('suppressedCompatibilityMouse', { x: event.clientX, y: event.clientY }); event.stopImmediatePropagation(); } }, true);` : ''}
      let activeFrame = null;
      const raf = requestAnimationFrame;
      window.requestAnimationFrame = callback => {
        const requested = performance.now();
        const stack = new Error().stack;
        return raf.call(window, time => { const previous = activeFrame; activeFrame = { requested, time, stack }; try { return callback(time); } finally { activeFrame = previous; } });
      };
      for (const name of ['ResizeObserver', 'IntersectionObserver']) {
        const Original = window[name];
        window[name] = class extends Original {
          constructor(callback, options) {
            super((entries, observer) => {
              const relevant = entries.filter(entry => entry.target.dataset.slot === 'shape-scene');
              if (relevant.length) note(name, { entries: relevant.map(entry => ({ rect: entry.target.getBoundingClientRect().toJSON(), intersection: entry.isIntersecting, contentRect: entry.contentRect?.toJSON() })) });
              callback(entries, observer);
            }, options);
          }
        };
      }
      for (const event of ['pointermove', 'pointerleave', 'pointerdown', 'pointerup', 'click', 'resize', 'scroll', 'visibilitychange']) addEventListener(event, e => {
        if (event === 'pointermove' && !e.target.closest?.('[data-slot="shape-scene"]')) return;
        note(event, { pointerType: e.pointerType, target: e.target.dataset?.slot, text: e.target.textContent?.slice(0, 50), x: e.clientX, y: e.clientY, hidden: document.hidden, scrollY });
      }, { capture: true, passive: true });
      if (typeof WebGL2RenderingContext !== 'undefined') for (const name of ['drawElements', 'drawArrays']) {
        const original = WebGL2RenderingContext.prototype[name];
        WebGL2RenderingContext.prototype[name] = function (...values) {
          if (this.canvas.dataset.slot === 'shape-scene-canvas') note('draw', { method: name, frame: activeFrame, canvas: { width: this.canvas.width, height: this.canvas.height } });
          return original.apply(this, values);
        };
      }
`;
source = source.replace('window.__webkitSceneDraws = 0;', 'window.__webkitSceneDraws = 0;' + instrumentation);
source = source.replace('await root.getByRole("button", { name: "Pause sculpture", exact: true }).tap();', 'await page.evaluate(() => window.__sceneNote("beforePauseTap")); await root.getByRole("button", { name: "Pause sculpture", exact: true }).tap(); await page.evaluate(() => window.__sceneNote("afterPauseTap"));');
source = source.replace('const draws = await page.evaluate(() => window.__webkitSceneDraws);', 'const draws = await page.evaluate(() => { window.__sceneNote("sample250", {draws: window.__webkitSceneDraws}); return window.__webkitSceneDraws; });');
source = source.replace('assert.equal(await page.evaluate(() => window.__webkitSceneDraws), draws, "Paused sculpture must stop WebGL draws");', 'assert.equal(await page.evaluate(() => { window.__sceneNote("sample550", {draws: window.__webkitSceneDraws}); return window.__webkitSceneDraws; }), draws, "Paused sculpture must stop WebGL draws");');
source = source.replace('record.input = await page.evaluate(() => window.__webkitInput)', 'record.trace = await page.evaluate(() => window.__sceneTrace).catch(() => []); record.input = await page.evaluate(() => window.__webkitInput)');
fs.writeFileSync(runner, source);
const server = await preview({ configFile: false, root: main, base: '/sahajiv-ui/', build: { outDir: path.join(main, 'out') }, preview: { host: '127.0.0.1', port: 0, strictPort: true } });
try {
  const status = await new Promise(resolve => {
    const child = spawn(process.execPath, [runner, '--ids=shape-scene', `--url=http://127.0.0.1:${server.httpServer.address().port}/sahajiv-ui`, `--output=${output}`, `--checkout=${main}`], { stdio: ['inherit', fs.openSync(path.join(path.dirname(runner), 'webkit-shape-trace.log'), 'w'), 'inherit'] });
    child.on('exit', resolve);
  });
  const results = JSON.parse(fs.readFileSync(path.join(output, 'results.json')));
  const row = results.cases[0];
  const start = row.trace.find(event => event.type === 'beforePauseTap')?.time ?? 0;
  const tail = row.trace.filter(event => event.time >= start);
  const frames = [...new Map(tail.filter(event => event.type === 'draw').map(event => [event.frame?.time, { time: event.time, requested: event.frame?.requested, frame: event.frame?.time, stack: event.frame?.stack?.split('\n').slice(0, 4) }])).values()];
  console.log(JSON.stringify({ status, verdict: row.status, error: row.error, events: tail.filter(event => event.type !== 'draw'), frames }, null, 2));
  process.exitCode = status;
} finally { await new Promise(resolve => server.httpServer.close(resolve)); }
