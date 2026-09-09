import { sculptureFromPixels, sculptureGeometry, SCULPTURE_LIMITS, type SculptureGeometry } from "./sculpture-geometry";

type GLB = {
  asset?: { version?: string }; extensionsRequired?: string[]; images?: { uri?: string }[];
  buffers?: { uri?: string; byteLength: number }[];
  bufferViews?: { buffer: number; byteOffset?: number; byteLength: number; byteStride?: number; extensions?: unknown }[];
  accessors?: { bufferView?: number; byteOffset?: number; componentType: number; count: number; type: string; normalized?: boolean; sparse?: unknown }[];
  meshes?: { primitives: { attributes: { POSITION?: number }; indices?: number; mode?: number; targets?: unknown[]; extensions?: unknown }[] }[];
  nodes?: { mesh?: number; skin?: number; children?: number[]; matrix?: number[]; translation?: number[]; rotation?: number[]; scale?: number[] }[];
  scenes?: { nodes?: number[] }[]; scene?: number;
};
const identity = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const finiteArray = (value: number[] | undefined, fallback: number[], size: number) => {
  const result = value ?? fallback;
  if (!Array.isArray(result) || result.length !== size || !result.every(Number.isFinite)) throw new Error("A model transform is invalid.");
  return result;
};
function matrixFor(node: NonNullable<GLB["nodes"]>[number]) {
  if (node.matrix) return finiteArray(node.matrix, [], 16);
  const [tx, ty, tz] = finiteArray(node.translation, [0, 0, 0], 3), [sx, sy, sz] = finiteArray(node.scale, [1, 1, 1], 3);
  let [x, y, z, w] = finiteArray(node.rotation, [0, 0, 0, 1], 4);
  const length = Math.hypot(x, y, z, w);
  if (length < 1e-8) throw new Error("A model rotation has no orientation.");
  x /= length; y /= length; z /= length; w /= length;
  return [(1 - 2 * (y * y + z * z)) * sx, 2 * (x * y + z * w) * sx, 2 * (x * z - y * w) * sx, 0, 2 * (x * y - z * w) * sy, (1 - 2 * (x * x + z * z)) * sy, 2 * (y * z + x * w) * sy, 0, 2 * (x * z + y * w) * sz, 2 * (y * z - x * w) * sz, (1 - 2 * (x * x + y * y)) * sz, 0, tx, ty, tz, 1];
}
function multiply(a: number[], b: number[]) {
  const out = new Array<number>(16).fill(0);
  for (let column = 0; column < 4; column++) for (let row = 0; row < 4; row++) for (let k = 0; k < 4; k++) out[column * 4 + row] += a[k * 4 + row] * b[column * 4 + k];
  return out;
}
const integer = (value: number, max: number) => Number.isInteger(value) && value >= 0 && value <= max;

/** Reads geometry only from uncompressed, self-contained GLB 2.0. Never loads textures, URLs, scripts, or decoders. */
export function sculptureFromGLB(buffer: ArrayBuffer): SculptureGeometry {
  if (buffer.byteLength < 28 || buffer.byteLength > SCULPTURE_LIMITS.fileBytes) throw new Error("Use a self-contained GLB file under 8 MiB.");
  const view = new DataView(buffer);
  if (view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2 || view.getUint32(8, true) !== buffer.byteLength) throw new Error("Use a valid GLB 2.0 file.");
  let json: GLB | undefined, binary: DataView | undefined;
  for (let offset = 12; offset < buffer.byteLength;) {
    if (offset + 8 > buffer.byteLength) throw new Error("The GLB chunk header is incomplete.");
    const size = view.getUint32(offset, true), kind = view.getUint32(offset + 4, true); offset += 8;
    if (size % 4 || offset + size > buffer.byteLength) throw new Error("The GLB chunk length is invalid.");
    if (kind === 0x4e4f534a) {
      if (json || size > 1024 * 1024) throw new Error("The model metadata is too large or duplicated.");
      try { json = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, offset, size))) as GLB; } catch { throw new Error("The model metadata could not be read."); }
    } else if (kind === 0x004e4942) { if (binary) throw new Error("Use one embedded GLB buffer."); binary = new DataView(buffer, offset, size); }
    offset += size;
  }
  if (!json || json.asset?.version !== "2.0" || !binary) throw new Error("The GLB must contain its own geometry buffer.");
  if (json.extensionsRequired?.length) throw new Error("Export an uncompressed GLB without required extensions. Draco and mesh compression are not supported.");
  if (json.buffers?.length !== 1 || json.buffers[0].uri || !integer(json.buffers[0].byteLength, binary.byteLength)) throw new Error("Export a self-contained GLB without external buffers.");
  if (!Array.isArray(json.meshes) || json.meshes.length > 32 || !Array.isArray(json.nodes) || json.nodes.length > 128 || (json.accessors?.length ?? 0) > 512 || (json.bufferViews?.length ?? 0) > 512) throw new Error("Use a model with at most 32 meshes and 128 nodes.");
  if (json.images?.some(image => image.uri)) throw new Error("Embed image assets in the GLB or remove them before exporting.");
  const model = json, bin = binary, nodes = json.nodes;
  function accessor(index: number | undefined, vector: boolean) {
    if (index === undefined || !integer(index, 511)) throw new Error("A model accessor is missing.");
    const a = model.accessors?.[index], b = a?.bufferView === undefined ? undefined : model.bufferViews?.[a.bufferView];
    if (!a || !b || b.buffer !== 0 || b.extensions || a.sparse || a.normalized || a.type !== (vector ? "VEC3" : "SCALAR")) throw new Error("Use ordinary, uncompressed vertex and index buffers.");
    if (vector ? a.componentType !== 5126 : ![5121, 5123, 5125].includes(a.componentType)) throw new Error("Use float positions and unsigned integer triangle indices.");
    const bytes = a.componentType === 5121 ? 1 : a.componentType === 5123 ? 2 : 4, components = vector ? 3 : 1;
    const stride = b.byteStride ?? bytes * components, base = (b.byteOffset ?? 0) + (a.byteOffset ?? 0);
    if (!integer(a.count, vector ? SCULPTURE_LIMITS.vertices : SCULPTURE_LIMITS.triangles * 3) || !a.count || !integer(stride, 252) || stride < bytes * components || stride % bytes || !integer(base, bin.byteLength) || !integer(b.byteLength, bin.byteLength) || !integer(b.byteOffset ?? 0, bin.byteLength) || (b.byteOffset ?? 0) + b.byteLength > bin.byteLength || (a.byteOffset ?? 0) + (a.count - 1) * stride + bytes * components > b.byteLength) throw new Error("A model buffer is invalid or exceeds the geometry budget.");
    const values = new Array<number>(a.count * components);
    for (let i = 0; i < a.count; i++) for (let k = 0; k < components; k++) {
      const at = base + i * stride + k * bytes;
      values[i * components + k] = vector ? bin.getFloat32(at, true) : bytes === 1 ? bin.getUint8(at) : bytes === 2 ? bin.getUint16(at, true) : bin.getUint32(at, true);
    }
    return values;
  }
  const positions: number[] = [], triangles: number[] = [], visiting = new Set<number>();
  let visits = 0;
  function visit(index: number, parent: number[]) {
    if (!integer(index, 127) || !model.nodes?.[index] || visiting.has(index) || ++visits > 128) throw new Error("The model hierarchy is cyclic or too large.");
    visiting.add(index);
    const node = model.nodes[index];
    if (node.skin !== undefined) throw new Error("Export a static mesh without skinning.");
    const matrix = multiply(parent, matrixFor(node));
    if (node.mesh !== undefined) {
      const mesh = model.meshes?.[node.mesh];
      if (!mesh || !Array.isArray(mesh.primitives) || mesh.primitives.length > 64) throw new Error("A model mesh is missing or too complex.");
      for (const primitive of mesh.primitives) {
        if ((primitive.mode ?? 4) !== 4 || primitive.targets?.length || primitive.extensions) throw new Error("Export static triangle geometry without compression or morph targets.");
        const source = accessor(primitive.attributes?.POSITION, true), count = source.length / 3, offset = positions.length / 3;
        const indices = primitive.indices === undefined ? Array.from({ length: count }, (_, i) => i) : accessor(primitive.indices, false);
        if (positions.length + source.length > SCULPTURE_LIMITS.vertices * 3 || triangles.length + indices.length > SCULPTURE_LIMITS.triangles * 3) throw new Error("Reduce the model to 16,000 vertices and 20,000 triangles.");
        if (indices.length % 3 || indices.some(value => !integer(value, count - 1))) throw new Error("A model triangle refers to a missing vertex.");
        for (let i = 0; i < source.length; i += 3) { const x = source[i], y = source[i + 1], z = source[i + 2]; positions.push(matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12], matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13], matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14]); }
        for (const index of indices) triangles.push(index + offset);
      }
    }
    for (const child of node.children ?? []) visit(child, matrix);
    visiting.delete(index);
  }
  const scene = model.scenes?.[model.scene ?? 0];
  const children = new Set(nodes.flatMap(node => node.children ?? []));
  const roots = scene?.nodes ?? nodes.map((_, index) => index).filter(index => !children.has(index));
  for (const root of roots) visit(root, identity());
  return sculptureGeometry({ positions, triangles });
}

/** Filled SVG shapes are extruded into original geometry; active/external SVG features are rejected. */
export async function sculptureFromSVG(source: string, depth = .14, { signal }: { signal?: AbortSignal } = {}): Promise<SculptureGeometry> {
  checkAbort(signal);
  if (source.length > SCULPTURE_LIMITS.svgBytes || /<!DOCTYPE|<!ENTITY/i.test(source)) throw new Error("Use a simple filled SVG under 128 KB without external definitions.");
  if (typeof DOMParser === "undefined") throw new Error("SVG import needs a browser.");
  const document = new DOMParser().parseFromString(source, "image/svg+xml");
  if (document.querySelector("parsererror") || document.documentElement.localName !== "svg") throw new Error("The SVG could not be read.");
  const allowed = new Set(["svg", "g", "path", "circle", "ellipse", "rect", "polygon", "polyline", "title", "desc"]), elements = [...document.querySelectorAll("*")];
  if (elements.length > 64 || (source.match(/[a-zA-Z]/g)?.length ?? 0) > 6000) throw new Error("Simplify the SVG to at most 64 elements and 6,000 path commands.");
  for (const element of elements) {
    if (!allowed.has(element.localName)) throw new Error("Use filled SVG shapes only. Text, images, masks, scripts and references are not supported.");
    for (const attribute of [...element.attributes]) if (/^on|href|src/i.test(attribute.name) || /url\s*\(|@import|javascript:/i.test(attribute.value)) throw new Error("Remove external references and active content from the SVG.");
  }
  const [{ SVGLoader }, { ExtrudeGeometry }] = await Promise.all([import("three/addons/loaders/SVGLoader.js"), import("three")]);
  checkAbort(signal);
  const paths = new SVGLoader().parse(new XMLSerializer().serializeToString(document));
  const shapes = paths.paths.filter(path => (path.userData?.style as { fill?: string } | undefined)?.fill !== "none").flatMap(path => SVGLoader.createShapes(path));
  if (!shapes.length || shapes.length > 64) throw new Error("Use an SVG with 1–64 closed, filled shapes.");
  const sampled = shapes.map(shape => shape.extractPoints(6));
  const contourCount = sampled.reduce((sum, contour) => sum + contour.shape.length + contour.holes.reduce((total, hole) => total + hole.length, 0), 0);
  const holeCount = sampled.reduce((sum, contour) => sum + contour.holes.length, 0);
  // Both caps and sidewalls use at most twelve vertices per contour point; holes
  // can add two triangles to each cap, so budget them before triangulation too.
  if ((contourCount + holeCount) * 12 > SCULPTURE_LIMITS.vertices) throw new Error("Simplify the SVG to roughly 1,300 sampled contour points before importing.");
  const bounds = sampled.flatMap(contour => contour.shape);
  let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
  for (const point of bounds) { left = Math.min(left, point.x); right = Math.max(right, point.x); top = Math.min(top, point.y); bottom = Math.max(bottom, point.y); }
  const longest = Math.max(right - left, bottom - top), thickness = Number.isFinite(depth) ? Math.max(.01, Math.min(.5, depth)) : .14;
  checkAbort(signal);
  const geometry = new ExtrudeGeometry(shapes, { depth: longest * thickness, bevelEnabled: false, steps: 1, curveSegments: 6 });
  try {
    geometry.scale(1, -1, 1);
    return sculptureGeometry({ positions: geometry.getAttribute("position").array, triangles: geometry.index?.array });
  } finally { geometry.dispose(); }
}

function imageDimensions(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length >= 24 && view.getUint32(0) === 0x89504e47 && view.getUint32(4) === 0x0d0a1a0a) return { width: view.getUint32(16), height: view.getUint32(20), type: "image/png" };
  if (bytes[0] === 255 && bytes[1] === 216) {
    for (let i = 2; i + 9 < bytes.length;) {
      if (bytes[i] !== 255) break;
      const marker = bytes[i + 1]; i += 2;
      if (marker === 255) { i--; continue; }
      if (marker === 217 || marker === 218) break;
      const size = view.getUint16(i);
      if (size < 2 || i + size > bytes.length) break;
      if ([192, 193, 194].includes(marker)) return { height: view.getUint16(i + 3), width: view.getUint16(i + 5), type: "image/jpeg" };
      i += size;
    }
  }
  return null;
}
const checkAbort = (signal?: AbortSignal) => { if (signal?.aborted) throw new DOMException("Import cancelled.", "AbortError"); };

/** Local files only: self-contained GLB, filled SVG, PNG or JPEG. PNG/JPEG become luminance reliefs. */
export async function loadSculptureFile(file: Blob, { signal }: { signal?: AbortSignal } = {}): Promise<SculptureGeometry> {
  if (!file.size || file.size > SCULPTURE_LIMITS.fileBytes) throw new Error("Choose a GLB, SVG, PNG or JPEG under 8 MiB.");
  checkAbort(signal);
  const buffer = await file.arrayBuffer(), bytes = new Uint8Array(buffer);
  checkAbort(signal);
  if (bytes.length >= 4 && new DataView(buffer).getUint32(0, true) === 0x46546c67) return sculptureFromGLB(buffer);
  const head = new TextDecoder().decode(bytes.subarray(0, 1024)).trimStart();
  if (head.startsWith("<svg") || head.startsWith("<?xml")) { const mesh = await sculptureFromSVG(new TextDecoder().decode(bytes), .14, { signal }); checkAbort(signal); return mesh; }
  const image = imageDimensions(bytes);
  if (!image) throw new Error("Choose a self-contained GLB, a filled SVG, PNG or JPEG. Other image formats and .gltf sidecar files are not supported.");
  if (image.width < 2 || image.height < 2 || image.width * image.height > SCULPTURE_LIMITS.imagePixels) throw new Error("Resize the image to 4 million pixels or fewer before importing.");
  if (typeof createImageBitmap !== "function") throw new Error("This browser cannot import images. Use a GLB or SVG instead.");
  let bitmap: ImageBitmap | undefined, canvas: HTMLCanvasElement | undefined;
  try {
    bitmap = await createImageBitmap(new Blob([buffer], { type: image.type })); checkAbort(signal);
    canvas = document.createElement("canvas");
    canvas.width = Math.min(144, bitmap.width); canvas.height = Math.min(144, bitmap.height);
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Image import is unavailable. Use a GLB or SVG instead.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    // Keep the original aspect ratio even though sampling uses a bounded square grid.
    const mesh = sculptureFromPixels(pixels), aspect = (bitmap.width / bitmap.height) / (canvas.width / canvas.height);
    for (let i = 0; i < mesh.positions.length; i += 3) { mesh.positions[i] *= Math.min(1, aspect); mesh.positions[i + 1] /= Math.max(1, aspect); }
    canvas.width = 1; canvas.height = 1;
    return sculptureGeometry({ positions: mesh.positions, triangles: mesh.triangles });
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error("The image could not be decoded. Try another PNG or JPEG.");
  } finally { bitmap?.close(); if (canvas) { canvas.width = 1; canvas.height = 1; } }
}
