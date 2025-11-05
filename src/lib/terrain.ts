// TypeScript mirror of the GLSL terrainHeight / fbm used by the shaders.
// This is a pragmatic, deterministic CPU implementation intended to match
// the lightweight GLSL fbm/simpleNoise in `src/shaders/noise.glsl.ts`.

type Vec3 = { x: number; y: number; z: number };

function fract(v: number) {
  return v - Math.floor(v);
}

function mix(a: number, b: number, t: number) {
  return a * (1 - t) + b * t;
}

function hash13(p: Vec3) {
  // Simple, fast pseudo-random based on dot and sin
  const h = Math.sin(p.x * 127.1 + p.y * 311.7 + p.z * 74.7) * 43758.5453;
  return fract(h);
}

function simpleNoise(p: Vec3) {
  const i = { x: Math.floor(p.x), y: Math.floor(p.y), z: Math.floor(p.z) };
  const f = { x: fract(p.x), y: fract(p.y), z: fract(p.z) };
  // Smoothstep cubic
  const u = { x: f.x * f.x * (3 - 2 * f.x), y: f.y * f.y * (3 - 2 * f.y), z: f.z * f.z * (3 - 2 * f.z) };

  const n000 = hash13({ x: i.x + 0, y: i.y + 0, z: i.z + 0 });
  const n100 = hash13({ x: i.x + 1, y: i.y + 0, z: i.z + 0 });
  const n010 = hash13({ x: i.x + 0, y: i.y + 1, z: i.z + 0 });
  const n110 = hash13({ x: i.x + 1, y: i.y + 1, z: i.z + 0 });
  const n001 = hash13({ x: i.x + 0, y: i.y + 0, z: i.z + 1 });
  const n101 = hash13({ x: i.x + 1, y: i.y + 0, z: i.z + 1 });
  const n011 = hash13({ x: i.x + 0, y: i.y + 1, z: i.z + 1 });
  const n111 = hash13({ x: i.x + 1, y: i.y + 1, z: i.z + 1 });

  const nx00 = mix(n000, n100, u.x);
  const nx10 = mix(n010, n110, u.x);
  const nx01 = mix(n001, n101, u.x);
  const nx11 = mix(n011, n111, u.x);
  const nxy0 = mix(nx00, nx10, u.y);
  const nxy1 = mix(nx01, nx11, u.y);
  return mix(nxy0, nxy1, u.z) * 2 - 1;
}

export function fbm3(
  p: Vec3,
  persistence: number,
  lacunarity: number,
  octaves: number
): number {
  let amp = 1.0;
  let freq = 1.0;
  let sum = 0.0;
  let maxAmp = 0.0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * simpleNoise({ x: p.x * freq, y: p.y * freq, z: p.z * freq });
    maxAmp += amp;
    amp *= persistence;
    freq *= lacunarity;
  }
  return sum / Math.max(1e-9, maxAmp);
}

export function terrainHeight(
  type: number,
  v: Vec3,
  amplitude: number,
  sharpness: number,
  offset: number,
  period: number,
  persistence: number,
  lacunarity: number,
  octaves: number
): number {
  let h = 0;
  if (type === 1) {
    h = amplitude * simpleNoise({ x: v.x / period, y: v.y / period, z: v.z / period });
  } else {
    const n = fbm3({ x: v.x / period, y: v.y / period, z: v.z / period }, persistence, lacunarity, octaves);
    if (type === 2) {
      h = amplitude * Math.pow(Math.max(0, (n + 1) * 0.5), sharpness);
    } else {
      h = amplitude * Math.pow(Math.max(0, 1 - Math.abs(n)), sharpness);
    }
  }
  return Math.max(0, h + offset);
}

export default terrainHeight;
