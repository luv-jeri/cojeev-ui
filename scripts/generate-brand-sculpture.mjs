/** Build the decorative render from the actual vector; no browser 3D runtime is shipped. */
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import sharp from "sharp";

const root = new URL("../", import.meta.url);
const svg = await readFile(new URL("public/brand/000h-mark.svg", root), "utf8");
const modules = new Map([
  ["/three.module.js", "node_modules/three/build/three.module.js"],
  ["/three.core.js", "node_modules/three/build/three.core.js"],
  ["/SVGLoader.js", "node_modules/three/examples/jsm/loaders/SVGLoader.js"],
  [
    "/BufferGeometryUtils.js",
    "node_modules/three/examples/jsm/utils/BufferGeometryUtils.js",
  ],
]);
const browser = await chromium.launch({
  args: ["--enable-unsafe-swiftshader"],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1024, height: 1024 },
    deviceScaleFactor: 1,
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("http://brand-render.local/**", async (route) => {
    const file = modules.get(new URL(route.request().url()).pathname);
    if (file)
      return route.fulfill({
        contentType: "text/javascript",
        body: await readFile(new URL(file, root), "utf8"),
      });
    await route.fulfill({
      contentType: "text/html",
      body: `<html><head><style>html,body{margin:0;background:transparent}canvas{display:block}</style><script type="importmap">{"imports":{"three":"/three.module.js"}}</script></head><body><script type="module">
      import * as THREE from 'three';
      import {SVGLoader} from '/SVGLoader.js';
      import {mergeVertices} from '/BufferGeometryUtils.js';
      const renderer = new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});
      renderer.setSize(1024,1024);renderer.setClearColor(0x000000,0);
      renderer.outputColorSpace=THREE.SRGBColorSpace;
      renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
      document.body.appendChild(renderer.domElement);
      const scene=new THREE.Scene();
      const camera=new THREE.OrthographicCamera(-50,50,50,-50,.1,500);camera.position.set(0,0,200);
      scene.add(new THREE.HemisphereLight(0xfffaf0,0x44482b,1.3));
      const key=new THREE.DirectionalLight(0xfffaf1,2.4);key.position.set(-70,90,130);scene.add(key);
      const fill=new THREE.DirectionalLight(0xffffff,.65);fill.position.set(80,-20,70);scene.add(fill);
      const shapes=new SVGLoader().parse(${JSON.stringify(svg)}).paths.flatMap(path=>SVGLoader.createShapes(path));
      const extrusion=new THREE.ExtrudeGeometry(shapes,{depth:9,bevelEnabled:true,bevelThickness:4.5,bevelSize:4.5,bevelSegments:24,steps:1,curveSegments:96});
      extrusion.deleteAttribute('normal');extrusion.deleteAttribute('uv');
      const geometry=mergeVertices(extrusion);geometry.computeVertexNormals();
      geometry.center();
      const material=new THREE.MeshStandardMaterial({color:0x9aab63,roughness:.46,metalness:.04});
      const mesh=new THREE.Mesh(geometry,material);mesh.scale.y=-1;mesh.rotation.set(.16,-.32,.02);scene.add(mesh);
      renderer.render(scene,camera);
      window.brandRenderReady=true;
    </script></body></html>`,
    });
  });
  await page.goto("http://brand-render.local/", {
    waitUntil: "domcontentloaded",
  });
  await page.waitForFunction(() => window.brandRenderReady === true);
  if (errors.length) throw new Error(errors.join("\n"));
  await page.screenshot({
    path: fileURLToPath(new URL("public/brand/000h-sculpture.png", root)),
    omitBackground: true,
  });
} finally {
  await browser.close();
}
await sharp(fileURLToPath(new URL("public/brand/000h-sculpture.png", root)))
  .resize(640, 640)
  .webp({ quality: 90, alphaQuality: 100 })
  .toFile(fileURLToPath(new URL("public/brand/000h-sculpture.webp", root)));
console.log(
  "Seed sculpture rendered from the shared vector, with transparent alpha.",
);
