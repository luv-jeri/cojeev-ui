"use client"

import * as React from "react"
import type * as THREE from "three"
import { cn } from "@/registry/cojeev/lib/utils"
import { shapeData } from "@/registry/cojeev/lib/shape-data"
import { signatureShapePaths, type SignatureShapeName } from "@/registry/cojeev/lib/signature-shapes"
import { sculptureMaterial, type SculptureMaterial } from "@/registry/cojeev/lib/sculpture-material"
import { Shape } from "@/registry/cojeev/ui/shape"
import { getServerSettingsSnapshot, getSettingsSnapshot, subscribeSettings } from "@/registry/cojeev/motion/settings"
import { useReducedMotion } from "@/registry/cojeev/motion/use-reduced-motion"

export type SceneShape = "star-4" | "blob-4" | "heart" | "crescent" | SignatureShapeName
export type { SculptureMaterial }
export type ShapeSceneProps = React.ComponentProps<"div"> & {
  palette?: "cojeev" | "warm" | "cool"
  shapes?: readonly SceneShape[]
  density?: "sparse" | "balanced" | "full"
  interactive?: boolean
  animate?: boolean
  /** Tactile procedural surfaces, including an animated ripple shader. */
  material?: SculptureMaterial
}

const defaults: readonly SceneShape[] = ["clover-soft", "pebble-soft", "cushion", "ribbon-soft", "petal-7", "heart"]
const supported: readonly string[] = ["star-4", "blob-4", "heart", "crescent", ...Object.keys(signatureShapePaths)]
const colors = { cojeev: ["#F5B8DB", "#9AAB63", "#B6CAEB", "#F5D867"], warm: ["#F5B8DB", "#F5D867", "#E1CDB2", "#9AAB63"], cool: ["#B6CAEB", "#9AAB63", "#F5B8DB", "#D5DFEC"] }
const placements = [
  { x: -1.1, y: .8, z: .18, size: 1.2, rx: .18, ry: -.28, rz: -.16 },
  { x: 1.04, y: .68, z: -.12, size: .94, rx: -.2, ry: .32, rz: .2 },
  { x: -.95, y: -1.14, z: .26, size: .9, rx: .2, ry: .3, rz: .18 },
  { x: 1.12, y: -1.13, z: .38, size: 1.05, rx: -.18, ry: -.28, rz: -.28 },
  { x: -.14, y: 1.72, z: -.8, size: .34, rx: .2, ry: .3, rz: .4 },
  { x: .08, y: -2.04, z: -.5, size: .3, rx: -.2, ry: .2, rz: -.1 },
]
type MotionOptions = { animate: boolean; interactive: boolean; quiet: boolean }
type SceneControl = { configure: (options: MotionOptions) => void }

/** An optional, lazily loaded WebGL sculpture with an authored static fallback. */
export function ShapeScene({ palette = "cojeev", shapes = defaults, density = "balanced", interactive = true, animate = true, material = "mixed", className, ref, children, ...props }: ShapeSceneProps) {
  const host = React.useRef<HTMLDivElement>(null)
  const surface = React.useRef<HTMLDivElement>(null)
  const control = React.useRef<SceneControl | null>(null)
  const reduced = useReducedMotion()
  const settings = React.useSyncExternalStore(subscribeSettings, getSettingsSnapshot, getServerSettingsSnapshot)
  const quiet = reduced || settings.motion.mode === "off"
  const shapeKey = (shapes.length ? shapes : defaults).filter(name => supported.includes(name)).join(",") || defaults.join(",")
  const names = shapeKey.split(",") as SceneShape[]
  const count = density === "full" ? 6 : density === "sparse" ? 3 : 4
  const sceneKey = `${palette}:${count}:${shapeKey}:${material}`
  const [rendered, setRendered] = React.useState<{ key: string; kind: "webgl" | "fallback" } | null>(null)
  const rendererState = rendered?.key === sceneKey ? rendered.kind : "pending"
  // Options are updated separately so a preference change never rebuilds a WebGL context.
  const options = React.useRef<MotionOptions>({ animate, interactive, quiet })
  React.useEffect(() => {
    options.current = { animate, interactive, quiet }
    control.current?.configure(options.current)
  }, [animate, interactive, quiet])

  React.useEffect(() => {
    const element = host.current, mount = surface.current
    if (!element || !mount) return
    let disposed = false, started = false, visible = false, painted = false, frame = 0, previousTime = 0, elapsed = 0
    let renderer: THREE.WebGLRenderer | undefined
    let scene: THREE.Scene | undefined
    let camera: THREE.OrthographicCamera | undefined
    let group: THREE.Group | undefined
    let currentOptions = options.current
    const hoverPointer = window.matchMedia("(any-hover: hover) and (any-pointer: fine)")
    let targetX = 0, targetY = 0
    let width = 0, height = 0
    const geometries = new Set<THREE.BufferGeometry>()
    const materials = new Set<THREE.Material>()
    const lights: THREE.DirectionalLight[] = []
    const pieces: THREE.Mesh[] = []
    const clock = { value: 0 }
    const sceneColors = () => palette === "cojeev" ? ["pink", "olive", "blue", "yellow"].map(tone => getComputedStyle(element!).getPropertyValue(`--v-${tone}`).trim() || colors.cojeev[0]) : colors[palette]
    const repaint = () => { const next = sceneColors(); pieces.forEach((piece, i) => (piece.material as THREE.MeshStandardMaterial).color.set(next[i % 4])); requestRender() }
    const cleanups: (() => void)[] = []
    const selected = shapeKey.split(",") as SceneShape[]
    function cancel() { if (frame) cancelAnimationFrame(frame); frame = 0; previousTime = 0 }
    function canRender() { return !disposed && visible && !document.hidden && !!renderer }
    function requestRender() { if (canRender() && !frame) frame = requestAnimationFrame(draw) }
    function draw(time: number) {
      frame = 0
      if (!canRender() || !renderer || !scene || !camera || !group) return
      const delta = previousTime ? Math.min((time - previousTime) / 1000, .05) : 0
      previousTime = time
      const moving = currentOptions.animate && !currentOptions.quiet
      if (moving) elapsed += delta
      clock.value = currentOptions.quiet ? 0 : elapsed
      const allowPointer = currentOptions.interactive && !currentOptions.quiet
      const x = allowPointer ? targetX : 0, y = allowPointer ? targetY : 0
      const damping = 1 - Math.exp(-Math.max(delta, 1 / 60) * 18)
      group.rotation.x += (x - group.rotation.x) * damping
      group.rotation.y += (y - group.rotation.y) * damping
      pieces.forEach((piece, index) => {
        const placement = placements[index]
        piece.position.y = placement.y + (moving ? Math.sin(elapsed * .65 + index * 1.8) * .07 : 0)
        piece.rotation.z = placement.rz + (moving ? Math.sin(elapsed * .4 + index) * .035 : 0)
      })
      renderer.render(scene, camera)
      if (!painted) { painted = true; setRendered({ key: sceneKey, kind: "webgl" }) }
      if (moving || Math.abs(group.rotation.x - x) + Math.abs(group.rotation.y - y) > .0005) requestRender()
      else previousTime = 0
    }
    function resize() {
      if (!renderer || !camera) return
      const rect = element!.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return
      width = rect.width; height = rect.height
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
      renderer.setSize(width, height, false)
      const aspect = width / height
      const halfHeight = Math.max(3.05, 3.05 / aspect)
      camera.left = -halfHeight * aspect; camera.right = halfHeight * aspect
      camera.top = halfHeight; camera.bottom = -halfHeight
      camera.updateProjectionMatrix()
      requestRender()
    }
    function release() {
      cancel()
      cleanups.splice(0).forEach(cleanup => cleanup())
      geometries.forEach(geometry => geometry.dispose()); geometries.clear()
      materials.forEach(material => material.dispose()); materials.clear()
      lights.forEach(light => light.shadow.map?.dispose())
      if (renderer) { renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); renderer = undefined }
    }
    function fallback() {
      if (disposed) return
      release()
      setRendered({ key: sceneKey, kind: "fallback" })
    }
    async function initialize() {
      if (started || disposed) return
      started = true
      try {
        const [three, { SVGLoader }, { toCreasedNormals }] = await Promise.all([import("three"), import("three/addons/loaders/SVGLoader.js"), import("three/addons/utils/BufferGeometryUtils.js")])
        if (disposed) return
        renderer = new three.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" })
        renderer.setClearColor(0x000000, 0)
        renderer.outputColorSpace = three.SRGBColorSpace
        renderer.toneMapping = three.ACESFilmicToneMapping
        renderer.toneMappingExposure = 1.05
        renderer.shadowMap.enabled = true
        renderer.shadowMap.type = three.PCFShadowMap
        renderer.domElement.setAttribute("aria-hidden", "true")
        renderer.domElement.dataset.slot = "shape-scene-canvas"
        mount!.append(renderer.domElement)
        scene = new three.Scene()
        camera = new three.OrthographicCamera(-4, 4, 3, -3, .1, 50)
        camera.position.set(0, 0, 12)
        group = new three.Group(); scene.add(group)
        scene.add(new three.HemisphereLight(0xffffff, 0x9f8a7a, 1.8))
        const key = new three.DirectionalLight(0xfff6e8, 3)
        key.position.set(-3, 5, 8); key.castShadow = true
        key.shadow.mapSize.set(1024, 1024)
        key.shadow.camera.left = -5; key.shadow.camera.right = 5
        key.shadow.camera.top = 5; key.shadow.camera.bottom = -5
        key.shadow.normalBias = .03; key.shadow.bias = -.0005
        key.shadow.radius = 4
        lights.push(key); scene.add(key)
        const fill = new three.DirectionalLight(0xc9daff, 1)
        fill.position.set(4, -2, 5); scene.add(fill)
        const loader = new SVGLoader()
        for (let index = 0; index < count; index++) {
          const name = selected[index % selected.length]
          const data = shapeData[name]
          const svg = decodeURIComponent(data.slice(data.indexOf(",") + 1, data.lastIndexOf('"')))
          const paths = loader.parse(svg).paths.flatMap(path => path.toShapes())
          const extruded = new three.ExtrudeGeometry(paths, { depth: 18, bevelEnabled: true, bevelSegments: 5, steps: 1, bevelSize: 2.4, bevelThickness: 6, curveSegments: 8 })
          const geometry = toCreasedNormals(extruded, Math.PI / 3)
          if (geometry !== extruded) extruded.dispose()
          geometry.center(); geometry.rotateX(Math.PI); geometry.scale(.018, .018, .018)
          geometries.add(geometry)
          const kind = material === "mixed" ? (["grain", "glazed", "ripple", "clay"] as const)[index % 4] : material
          const face = sculptureMaterial(three, sceneColors()[index % 4], kind, clock)
          materials.add(face)
          const piece = new three.Mesh(geometry, face)
          const placement = placements[index]
          piece.position.set(placement.x, placement.y, placement.z)
          piece.rotation.set(placement.rx, placement.ry, placement.rz)
          piece.scale.setScalar(placement.size)
          piece.castShadow = true; piece.receiveShadow = true
          pieces.push(piece); group.add(piece)
        }
        const backGeometry = new three.PlaneGeometry(24, 24)
        const backMaterial = new three.ShadowMaterial({ color: 0x4b3a43, opacity: .12 })
        geometries.add(backGeometry); materials.add(backMaterial)
        const back = new three.Mesh(backGeometry, backMaterial)
        back.position.z = -1.35; back.receiveShadow = true; scene.add(back)
        const onLost = (event: Event) => { event.preventDefault(); fallback() }
        renderer.domElement.addEventListener("webglcontextlost", onLost)
        const canvas = renderer.domElement
        cleanups.push(() => canvas.removeEventListener("webglcontextlost", onLost))
        resize()
        // The fallback stays visible until an onscreen frame has completed.
        requestRender()
      } catch { fallback() }
    }
    const sceneControl: SceneControl = { configure(next) {
      currentOptions = next
      if (next.quiet || !next.interactive) {
        targetX = 0; targetY = 0
        if (group) group.rotation.set(0, 0, 0)
      }
      cancel(); requestRender()
    } }
    control.current = sceneControl
    const onPointer = (event: PointerEvent) => {
      // Touch browsers can emit compatibility mouse events after a tap.
      // Only a real hover-capable input should tilt the sculpture.
      if (!hoverPointer.matches || !currentOptions.interactive || currentOptions.quiet || event.pointerType === "touch") return
      const rect = element.getBoundingClientRect()
      targetY = Math.max(-1, Math.min(1, (event.clientX - rect.left) / rect.width * 2 - 1)) * .16
      targetX = Math.max(-1, Math.min(1, (event.clientY - rect.top) / rect.height * 2 - 1)) * .1
      requestRender()
    }
    const onLeave = (event: PointerEvent) => { if (!hoverPointer.matches || event.pointerType === "touch") return; targetX = 0; targetY = 0; if (currentOptions.interactive && !currentOptions.quiet) requestRender() }
    const onHoverCapability = () => { if (!hoverPointer.matches) { targetX = 0; targetY = 0; if (group) group.rotation.set(0, 0, 0); requestRender() } }
    const onVisibility = () => { if (document.hidden) cancel(); else requestRender() }
    element.addEventListener("pointermove", onPointer)
    element.addEventListener("pointerleave", onLeave)
    hoverPointer.addEventListener("change", onHoverCapability)
    document.addEventListener("visibilitychange", onVisibility)
    window.addEventListener("cojeev:appearancechange", repaint)
    const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(element)
    const intersection = new IntersectionObserver(entries => {
      visible = entries[0]?.isIntersecting ?? false
      if (visible) { void initialize(); requestRender() } else cancel()
    })
    intersection.observe(element)
    return () => {
      disposed = true
      if (control.current === sceneControl) control.current = null
      intersection.disconnect(); resizeObserver.disconnect()
      element.removeEventListener("pointermove", onPointer); element.removeEventListener("pointerleave", onLeave)
      hoverPointer.removeEventListener("change", onHoverCapability)
      document.removeEventListener("visibilitychange", onVisibility)
      window.removeEventListener("cojeev:appearancechange", repaint)
      release()
    }
  }, [shapeKey, palette, count, sceneKey, material])

  return (
    <div ref={React.useCallback((node: HTMLDivElement | null) => { host.current = node; if (typeof ref === "function") return ref(node); if (ref) ref.current = node }, [ref])} data-slot="shape-scene" data-renderer={rendererState} data-palette={palette} data-material={material} className={cn("v-shape-scene", className)} aria-description={rendererState === "fallback" ? "3D is unavailable. Showing the static composition." : undefined} role="img" aria-label="A tactile composition of softly sculpted Cojeev shapes" {...props}>
      <div data-slot="shape-scene-fallback" aria-hidden="true">
        {Array.from({ length: count }, (_, index) => <span key={index} style={{ "--scene-color": (palette === "cojeev" ? `var(--v-${["pink", "olive", "blue", "yellow"][index % 4]})` : colors[palette][index % 4]) } as React.CSSProperties}><Shape name={names[index % names.length]} /></span>)}
      </div>
      <div data-slot="shape-scene-surface" ref={surface} aria-hidden="true" />
      {rendererState === "fallback" && <span data-slot="shape-scene-status" role="status">3D is unavailable. Showing the static composition.</span>}
      {children}
    </div>
  )
}
