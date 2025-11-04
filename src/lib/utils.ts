export function createNoise2D() {
    // Precompute random gradient vectors and a permutation table (P)
    const p = [];
    for (let i = 0; i < 256; i++) {
      // Using Math.random() for simplicity, a true seed would be better for consistency
      p[i] = Math.floor(Math.random() * 256);
    }
    const perm: number[] = [];
    for (let i = 0; i < 512; i++) {
      perm[i] = p[i & 255];
    }
  
    // Utility functions
    const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
    const lerp = (a: number, b: number, t: number) => (1 - t) * a + t * b;
  
    // Gradient function for 2D noise (simplified)
    const grad = (hash: number, x: number, y: number) => {
      const h = hash & 15;
      const u = h < 8 ? x : y;
      const v = h < 4 ? y : h === 12 || h === 14 ? x : 0;
      return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    };
  
    // The function returned to the component (the actual noise calculator)
    return (x: number, y: number) => {
      // Determine grid cell coordinates
      const X = Math.floor(x) & 255;
      const Y = Math.floor(y) & 255;
  
      // Relative coordinates of the point in the cell
      x -= Math.floor(x);
      y -= Math.floor(y);
  
      // Fade curves for interpolation
      const u = fade(x);
      const v = fade(y);
  
      // Hash coordinates of the 4 square corners
      const A = perm[X] + Y;
      const B = perm[X + 1] + Y;
  
      // Interpolate between the 4 corners
      const result = lerp(
        lerp(grad(perm[A], x, y), grad(perm[B], x - 1, y), u),
        lerp(grad(perm[A + 1], x, y - 1), grad(perm[B + 1], x - 1, y - 1), u),
        v
      );
      // Perlin noise typically returns values in [-0.707, 0.707], scaling for better contrast
      return result * 1.414;
    };
  }

/**
 * Generate domain-warped noise by using one noise function to offset 
 * the sampling coordinates of another noise function, with multiple octaves for fBm
 * 
 * @param nx X coordinate on unit sphere
 * @param ny Y coordinate on unit sphere
 * @param nz Z coordinate on unit sphere
 * @param warpStrength How much to warp the sampling coordinates (scales with tectonic activity)
 * @param octaves Number of noise octaves to combine (4-6 recommended)
 * @returns Noise value in range approximately [-1, 1]
 */
export function domainWarpedNoise(
  nx: number,
  ny: number,
  nz: number,
  warpStrength: number,
  octaves: number
): number {
  const noise2D = createNoise2D();
  const warpNoise1 = createNoise2D();
  const warpNoise2 = createNoise2D();

  // Use noise to warp the input coordinates
  const warpScale = 2.0;
  const offsetX = warpNoise1(nx * warpScale, ny * warpScale) * warpStrength;
  const offsetY = warpNoise2(nz * warpScale, ny * warpScale) * warpStrength;

  // Sample the main noise at warped coordinates with fBm
  let value = 0;
  let amplitude = 1.0;
  let frequency = 1.0;
  const persistence = 0.5;
  const lacunarity = 2.0;

  for (let i = 0; i < octaves; i++) {
    const sampleX = (nx + offsetX) * frequency;
    const sampleY = (ny + offsetY) * frequency;
    const sampleZ = (nz + offsetX * 0.5) * frequency;

    // Sample noise using two projections for 3D-like effect
    value += noise2D(sampleX, sampleY) * amplitude;
    value += noise2D(sampleZ, sampleY) * amplitude * 0.5;

    amplitude *= persistence;
    frequency *= lacunarity;
  }

  // Normalize to approximately [-1, 1]
  return value / (octaves * 0.75);
}

/**
 * Generate ridged noise where abs(noise) creates sharp ridges
 * Useful for mountain ranges and dramatic terrain features
 * 
 * @param nx X coordinate on unit sphere
 * @param ny Y coordinate on unit sphere
 * @param nz Z coordinate on unit sphere
 * @param octaves Number of noise octaves to combine
 * @returns Noise value in range approximately [0, 1] with sharp ridges
 */
export function ridgedNoise(
  nx: number,
  ny: number,
  nz: number,
  octaves: number
): number {
  const noise2D = createNoise2D();

  let value = 0;
  let amplitude = 1.0;
  let frequency = 1.0;
  const persistence = 0.5;
  const lacunarity = 2.0;

  for (let i = 0; i < octaves; i++) {
    // Sample noise using two projections
    let n = noise2D(nx * frequency * 2, ny * frequency * 2);
    n += noise2D(nz * frequency * 2, ny * frequency * 2) * 0.5;
    
    // Ridged: take absolute value and invert to create peaks
    n = 1.0 - Math.abs(n / 1.5);
    
    // Square to sharpen ridges
    n = n * n;

    value += n * amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }

  // Normalize to [0, 1]
  return Math.max(0, Math.min(1, value / (octaves * 0.5)));
}
