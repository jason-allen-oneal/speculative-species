import * as THREE from 'three';
import noiseGLSL from '@/shaders/noise.glsl';
import planetVert from '@/shaders/planet-vert.glsl';
import planetFrag from '@/shaders/planet-frag.glsl';

type PartialUniforms = Partial<Record<string, THREE.IUniform<unknown>>>;

export function createPlanetShaderMaterial(overrides: PartialUniforms = {}) {
  // Defaults mirror the reference repo's planetParams
  const defaults: Record<string, THREE.IUniform<unknown>> = {
    // seaLevel is the normalized threshold (0..1) used by the shader to determine water vs land
    seaLevel: { value: 0.5 },
    type: { value: 2 },
    radius: { value: 1.0 },
    amplitude: { value: 1.19 },
  // Local-space displacement control (applied in-vertex shader). This is a fraction of the unit radius.
  displacementScale: { value: 0.04 },
  displacementBias: { value: -0.02 },
    sharpness: { value: 2.6 },
    offset: { value: -0.016 },
    period: { value: 0.6 },
    persistence: { value: 0.484 },
    lacunarity: { value: 1.8 },
    octaves: { value: 10 },
    undulation: { value: 0.0 },
    ambientIntensity: { value: 0.02 },
    diffuseIntensity: { value: 1 },
    specularIntensity: { value: 2 },
    shininess: { value: 10 },
    lightDirection: { value: new THREE.Vector3(1, 1, 1) },
    lightColor: { value: new THREE.Color(0xffffff) },
    bumpStrength: { value: 1.0 },
    bumpOffset: { value: 0.001 },
    color1: { value: new THREE.Color(0.014, 0.117, 0.279) },
    color2: { value: new THREE.Color(0.080, 0.527, 0.351) },
    color3: { value: new THREE.Color(0.620, 0.516, 0.372) },
    color4: { value: new THREE.Color(0.149, 0.254, 0.084) },
    color5: { value: new THREE.Color(0.150, 0.150, 0.150) },
    transition2: { value: 0.071 },
    transition3: { value: 0.215 },
    transition4: { value: 0.372 },
    transition5: { value: 1.2 },
    blend12: { value: 0.152 },
    blend23: { value: 0.152 },
    blend34: { value: 0.104 },
    blend45: { value: 0.168 },
  };

  const uniforms = { ...defaults, ...overrides } as Record<string, THREE.IUniform<unknown>>;

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `${noiseGLSL}\n${planetVert}`,
    fragmentShader: `${noiseGLSL}\n${planetFrag}`,
  });

  material.side = THREE.FrontSide;
  material.transparent = false;
  return material;
}

export default createPlanetShaderMaterial;
