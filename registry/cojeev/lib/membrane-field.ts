/** Membrane field: a bounded smooth-union renderer for living organic bodies.
 *
 * The scene is a small list of rounded cells and tapered strands in CSS pixel
 * space. A fragment shader joins them with a smooth minimum, so nearby bodies
 * grow necks, merge and pinch apart the way a soft membrane would. Colour is a
 * distance-weighted blend of each body's Cojeev tone, with a deeper rim line
 * and faint inner contours. Without WebGL the same scene paints as separate
 * rounded shapes on a 2D canvas: readable, but without the liquid joins.
 *
 * The renderer owns nothing but the canvas; callers own the clock and scene.
 */

export type MembraneTone = 0 | 1 | 2 | 3;

export type MembraneCell = {
  /** Centre in CSS pixels of the canvas. */
  x: number; y: number;
  /** Half extents; equal values with r = hw give a circle. */
  hw: number; hh: number;
  /** Corner radius, clamped to the smaller half extent. */
  r: number;
  /** 0 pink, 1 olive, 2 blue, 3 yellow; fractional values blend neighbours. */
  tone: number;
  /** Rotation in radians. */
  rot?: number;
  /** Colour weight multiplier; small bodies inside a larger one need > 1 to tint it. */
  w?: number;
};

export type MembraneStrand = {
  ax: number; ay: number; bx: number; by: number;
  /** Radius at the a end. */
  r: number;
  tone: number;
  /** 0 keeps a uniform radius; 1 tapers to a point at the b end. */
  taper?: number;
  w?: number;
};

export type MembraneScene = {
  cells: readonly MembraneCell[];
  strands: readonly MembraneStrand[];
  /** Smooth-union radius in pixels. */
  blend?: number;
  /** Edge wobble amplitude in pixels. */
  wobble?: number;
  /** Inner contour line strength, 0 to 1. */
  contour?: number;
  /** Seconds, drives the wobble. */
  time?: number;
};

export type MembranePalette = {
  tones: readonly [string, string, string, string];
  deep: readonly [string, string, string, string];
  paper: string;
};

export type MembraneStatus = "webgl" | "fallback";

export const MEMBRANE_LIMITS = { cells: 16, strands: 8 } as const;

const vertexSource = `
attribute vec2 aPosition;
void main() { gl_Position = vec4(aPosition, 0.0, 1.0); }
`;

const fragmentSource = `
precision highp float;
uniform vec2 uSize;
uniform float uDpr;
uniform float uTime;
uniform int uCellCount;
uniform vec4 uCellA[${MEMBRANE_LIMITS.cells}];
uniform vec4 uCellB[${MEMBRANE_LIMITS.cells}];
uniform int uStrandCount;
uniform vec4 uStrandA[${MEMBRANE_LIMITS.strands}];
uniform vec4 uStrandB[${MEMBRANE_LIMITS.strands}];
uniform vec3 uTone[4];
uniform vec3 uDeep[4];
uniform vec3 uPaper;
uniform float uBlend;
uniform float uWobble;
uniform float uContour;

vec3 toneAt(int t) { if (t <= 0) return uTone[0]; if (t == 1) return uTone[1]; if (t == 2) return uTone[2]; return uTone[3]; }
vec3 deepAt(int t) { if (t <= 0) return uDeep[0]; if (t == 1) return uDeep[1]; if (t == 2) return uDeep[2]; return uDeep[3]; }
vec3 toneMix(float t) { t = clamp(t, 0.0, 3.0); int a = int(floor(t)); return mix(toneAt(a), toneAt(a + 1), fract(t)); }
vec3 deepMix(float t) { t = clamp(t, 0.0, 3.0); int a = int(floor(t)); return mix(deepAt(a), deepAt(a + 1), fract(t)); }

float sdCell(vec2 p, vec4 a, vec4 b) {
  vec2 q = p - a.xy;
  float c = cos(b.w), s = sin(b.w);
  q = vec2(c * q.x + s * q.y, -s * q.x + c * q.y);
  float r = min(b.x, min(a.z, a.w));
  vec2 e = max(a.zw - vec2(r), 0.0);
  vec2 d = abs(q) - e;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r;
}
float sdStrand(vec2 p, vec4 a, vec4 b) {
  vec2 pa = p - a.xy, ba = a.zw - a.xy;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-4), 0.0, 1.0);
  return length(pa - ba * h) - b.x * (1.0 - b.w * h);
}
float smin(float a, float b, float k) {
  float h = max(k - abs(a - b), 0.0) / k;
  return min(a, b) - h * h * k * 0.25;
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, uSize.y * uDpr - gl_FragCoord.y) / uDpr;
  float k = max(uBlend, 1.0);
  float d = 1e5, wsum = 0.0;
  vec3 tone = vec3(0.0), deep = vec3(0.0);
  for (int i = 0; i < ${MEMBRANE_LIMITS.cells}; i++) {
    if (i >= uCellCount) break;
    vec4 a = uCellA[i], b = uCellB[i];
    if (a.z <= 0.05 || a.w <= 0.05) continue;
    float di = sdCell(p, a, b);
    d = smin(d, di, k);
    float w = exp(-clamp(di, -80.0, 200.0) / (k * 1.5)) * b.z;
    tone += w * toneMix(b.y); deep += w * deepMix(b.y); wsum += w;
  }
  for (int i = 0; i < ${MEMBRANE_LIMITS.strands}; i++) {
    if (i >= uStrandCount) break;
    vec4 a = uStrandA[i], b = uStrandB[i];
    if (b.x <= 0.05) continue;
    float di = sdStrand(p, a, b);
    d = smin(d, di, k);
    float w = exp(-clamp(di, -80.0, 200.0) / (k * 1.5)) * b.z;
    tone += w * toneMix(b.y); deep += w * deepMix(b.y); wsum += w;
  }
  tone /= max(wsum, 1e-5); deep /= max(wsum, 1e-5);
  d += (sin(p.x * 0.021 + uTime * 0.9) * sin(p.y * 0.027 - uTime * 0.7) * 0.6 + sin((p.x - p.y) * 0.017 + uTime * 1.3) * 0.4) * uWobble;
  float cover = 1.0 - smoothstep(-0.9, 0.9, d);
  if (cover <= 0.003) discard;
  float depth = clamp(-d / 56.0, 0.0, 1.0);
  vec3 body = mix(mix(tone, uPaper, 0.12), deep, depth * 0.26);
  float rim = 1.0 - smoothstep(0.0, 1.9, abs(d + 1.1));
  body = mix(body, deep, rim * 0.6);
  float ring = abs(fract(-d / 14.0) - 0.5);
  float lines = (1.0 - smoothstep(0.06, 0.16, ring)) * smoothstep(0.0, -7.0, d) * exp(d / 90.0) * uContour;
  body = mix(body, deep, lines * 0.34);
  gl_FragColor = vec4(body * cover, cover);
}
`;

type Rgb = [number, number, number];
type Program = {
  gl: WebGLRenderingContext; program: WebGLProgram; buffer: WebGLBuffer;
  shaders: WebGLShader[]; locations: Record<string, WebGLUniformLocation | null>;
};

export type MembraneRenderer = {
  readonly status: MembraneStatus;
  resize(width: number, height: number, dpr: number): void;
  setPalette(palette: MembranePalette): void;
  draw(scene: MembraneScene): void;
  dispose(): void;
};

const uniformNames = ["uSize", "uDpr", "uTime", "uCellCount", "uCellA", "uCellB", "uStrandCount", "uStrandA", "uStrandB", "uTone", "uDeep", "uPaper", "uBlend", "uWobble", "uContour"];

/** Parses any CSS colour the browser understands into unit RGB. */
function colorParser() {
  const probe = typeof document === "undefined" ? null : document.createElement("canvas");
  if (probe) { probe.width = probe.height = 1; }
  const context = probe?.getContext("2d", { willReadFrequently: true }) ?? null;
  return (value: string, fallback: Rgb): Rgb => {
    if (!context) return fallback;
    context.clearRect(0, 0, 1, 1);
    context.fillStyle = "#000";
    context.fillStyle = value;
    context.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data;
    return a === 0 ? fallback : [r / 255, g / 255, b / 255];
  };
}

const defaultPalette: MembranePalette = {
  tones: ["#F5B8DB", "#9AAB63", "#B6CAEB", "#F5D867"],
  deep: ["#E09CC1", "#808F53", "#8BA2C8", "#E8C84D"],
  paper: "#FBF4E6",
};

export function createMembraneRenderer(canvas: HTMLCanvasElement): MembraneRenderer {
  const parse = colorParser();
  let width = 1, height = 1, dpr = 1;
  let tones: Rgb[] = [], deep: Rgb[] = [], paper: Rgb = [1, 1, 1];
  let cssTones: string[] = [], cssDeep: string[] = [];
  const cellA = new Float32Array(MEMBRANE_LIMITS.cells * 4), cellB = new Float32Array(MEMBRANE_LIMITS.cells * 4);
  const strandA = new Float32Array(MEMBRANE_LIMITS.strands * 4), strandB = new Float32Array(MEMBRANE_LIMITS.strands * 4);
  const toneFlat = new Float32Array(12), deepFlat = new Float32Array(12);
  let program: Program | null = null;
  let fallback: CanvasRenderingContext2D | null = null;
  let disposed = false;

  function applyPalette(palette: MembranePalette) {
    tones = palette.tones.map((c, i) => parse(c, parse(defaultPalette.tones[i], [1, 1, 1])));
    deep = palette.deep.map((c, i) => parse(c, parse(defaultPalette.deep[i], [.5, .5, .5])));
    paper = parse(palette.paper, parse(defaultPalette.paper, [1, 1, 1]));
    cssTones = [...palette.tones]; cssDeep = [...palette.deep];
    for (let i = 0; i < 4; i++) { toneFlat.set(tones[i], i * 3); deepFlat.set(deep[i], i * 3); }
  }
  applyPalette(defaultPalette);

  function compile(gl: WebGLRenderingContext, type: number, source: string, shaders: WebGLShader[]) {
    const shader = gl.createShader(type);
    if (!shader) throw new Error("Shader allocation failed");
    shaders.push(shader);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? "Shader compilation failed");
    return shader;
  }

  function setupWebGL(): Program | null {
    let gl: WebGLRenderingContext | null = null;
    try {
      gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: "low-power" }) as WebGLRenderingContext | null;
    } catch { gl = null; }
    if (!gl) return null;
    const shaders: WebGLShader[] = [];
    try {
      const glProgram = gl.createProgram();
      if (!glProgram) throw new Error("Program allocation failed");
      gl.attachShader(glProgram, compile(gl, gl.VERTEX_SHADER, vertexSource, shaders));
      gl.attachShader(glProgram, compile(gl, gl.FRAGMENT_SHADER, fragmentSource, shaders));
      gl.linkProgram(glProgram);
      if (!gl.getProgramParameter(glProgram, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(glProgram) ?? "Program link failed");
      const buffer = gl.createBuffer();
      if (!buffer) throw new Error("Buffer allocation failed");
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.useProgram(glProgram);
      const position = gl.getAttribLocation(glProgram, "aPosition");
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      const locations: Record<string, WebGLUniformLocation | null> = {};
      for (const name of uniformNames) locations[name] = gl.getUniformLocation(glProgram, name);
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.BLEND);
      gl.clearColor(0, 0, 0, 0);
      return { gl, program: glProgram, buffer, shaders, locations };
    } catch (error) {
      console.warn("Membrane field: WebGL unavailable, painting a flat fallback.", error);
      for (const shader of shaders) gl.deleteShader(shader);
      return null;
    }
  }

  program = setupWebGL();
  if (!program) fallback = canvas.getContext("2d");

  function drawFallback(scene: MembraneScene) {
    const ctx = fallback;
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.lineCap = "round";
    for (const strand of scene.strands) {
      if (strand.r <= 0.05) continue;
      ctx.strokeStyle = cssTones[Math.round(Math.min(3, Math.max(0, strand.tone)))];
      ctx.lineWidth = strand.r * 2 * (1 - (strand.taper ?? 0) * .5);
      ctx.beginPath(); ctx.moveTo(strand.ax, strand.ay); ctx.lineTo(strand.bx, strand.by); ctx.stroke();
    }
    for (const cell of scene.cells) {
      if (cell.hw <= 0.05 || cell.hh <= 0.05) continue;
      const tone = Math.round(Math.min(3, Math.max(0, cell.tone)));
      ctx.save();
      ctx.translate(cell.x, cell.y); ctx.rotate(cell.rot ?? 0);
      ctx.fillStyle = cssTones[tone]; ctx.strokeStyle = cssDeep[tone]; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(-cell.hw, -cell.hh, cell.hw * 2, cell.hh * 2, Math.min(cell.r, cell.hw, cell.hh));
      ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  }

  function drawWebGL(scene: MembraneScene) {
    const { gl, locations } = program!;
    if (gl.isContextLost()) return;
    const cells = scene.cells.slice(0, MEMBRANE_LIMITS.cells), strands = scene.strands.slice(0, MEMBRANE_LIMITS.strands);
    cellA.fill(0); cellB.fill(0); strandA.fill(0); strandB.fill(0);
    cells.forEach((c, i) => { cellA.set([c.x, c.y, c.hw, c.hh], i * 4); cellB.set([c.r, c.tone, c.w ?? 1, c.rot ?? 0], i * 4); });
    strands.forEach((s, i) => { strandA.set([s.ax, s.ay, s.bx, s.by], i * 4); strandB.set([s.r, s.tone, s.w ?? 1, s.taper ?? 0], i * 4); });
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(locations.uSize, width, height);
    gl.uniform1f(locations.uDpr, dpr);
    gl.uniform1f(locations.uTime, scene.time ?? 0);
    gl.uniform1i(locations.uCellCount, cells.length);
    gl.uniform4fv(locations.uCellA, cellA);
    gl.uniform4fv(locations.uCellB, cellB);
    gl.uniform1i(locations.uStrandCount, strands.length);
    gl.uniform4fv(locations.uStrandA, strandA);
    gl.uniform4fv(locations.uStrandB, strandB);
    gl.uniform3fv(locations.uTone, toneFlat);
    gl.uniform3fv(locations.uDeep, deepFlat);
    gl.uniform3f(locations.uPaper, paper[0], paper[1], paper[2]);
    gl.uniform1f(locations.uBlend, scene.blend ?? 26);
    gl.uniform1f(locations.uWobble, scene.wobble ?? 0);
    gl.uniform1f(locations.uContour, scene.contour ?? 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  return {
    get status() { return program ? "webgl" : "fallback"; },
    resize(nextWidth, nextHeight, nextDpr) {
      width = Math.max(1, nextWidth); height = Math.max(1, nextHeight);
      const ratio = Math.min(Math.max(nextDpr, 1), 2, Math.sqrt(1_400_000 / (width * height)));
      dpr = Math.max(0.5, ratio);
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
    },
    setPalette(palette) { applyPalette(palette); },
    draw(scene) {
      if (disposed) return;
      if (program) drawWebGL(scene); else drawFallback(scene);
    },
    dispose() {
      disposed = true;
      if (program) {
        const { gl, buffer, program: glProgram, shaders } = program;
        if (!gl.isContextLost()) { gl.deleteBuffer(buffer); gl.deleteProgram(glProgram); for (const shader of shaders) gl.deleteShader(shader); }
        program = null;
      }
      fallback = null;
    },
  };
}
