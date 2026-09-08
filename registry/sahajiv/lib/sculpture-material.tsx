import type * as THREE from "three";

export type SculptureMaterial = "clay" | "glazed" | "grain" | "ripple" | "mixed";
/** Authored object-space textures. No downloaded bitmap or additional render pass.
 * The material keeps Three's lighting, colour management and shadow pipeline. */
export function sculptureMaterial(three: typeof THREE, color: string, kind: Exclude<SculptureMaterial, "mixed">, clock: { value: number }) {
  const material = new three.MeshPhysicalMaterial({ color, roughness: kind === "glazed" ? .22 : kind === "grain" ? .82 : .55, metalness: 0, clearcoat: kind === "glazed" ? .85 : .08, clearcoatRoughness: .3 });
  material.onBeforeCompile = shader => {
    shader.uniforms.uSahaTime = clock;
    shader.vertexShader = "varying vec3 vSahaPosition;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nvSahaPosition = position;");
    shader.fragmentShader = `varying vec3 vSahaPosition;
uniform float uSahaTime;
float sahaNoise(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
` + shader.fragmentShader;
    const texture = kind === "grain"
      ? "float speck = smoothstep(.87, .98, sahaNoise(floor(vSahaPosition * 125.0))); diffuseColor.rgb *= 1.0 - speck * .22;"
      : kind === "ripple"
        ? "float contour = sin(vSahaPosition.x * 21.0 + sin(vSahaPosition.y * 9.0 + uSahaTime * .35) * 2.4 + vSahaPosition.z * 7.0); float band = smoothstep(.45, .92, contour); diffuseColor.rgb *= .80 + band * .20;"
        : kind === "clay"
          ? "float clay = sahaNoise(floor(vSahaPosition * 180.0)); diffuseColor.rgb *= .94 + clay * .06;"
          : "float wash = .5 + .5 * sin(vSahaPosition.y * 5.0 + sin(vSahaPosition.x * 3.0)); diffuseColor.rgb *= .90 + wash * .10;";
    shader.fragmentShader = shader.fragmentShader.replace("#include <map_fragment>", "#include <map_fragment>\n" + texture);
  };
  material.customProgramCacheKey = () => `sahajiv-sculpture-${kind}-1`;
  return material;
}
