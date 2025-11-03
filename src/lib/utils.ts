export function createNoise2D() {
    // Precompute random gradient vectors and a permutation table (P)
    const p = [];
    for (let i = 0; i < 256; i++) {
      // Using Math.random() for simplicity, a true seed would be better for consistency
      p[i] = Math.floor(Math.random() * 256);
    }
    const perm: any[] = [];
    for (let i = 0; i < 512; i++) {
      perm[i] = p[i & 255];
    }
  
    // Utility functions
    const fade = (t: any) => t * t * t * (t * (t * 6 - 15) + 10);
    const lerp = (a: any, b: any, t: any) => (1 - t) * a + t * b;
  
    // Gradient function for 2D noise (simplified)
    const grad = (hash: any, x: any, y: any) => {
      const h = hash & 15;
      const u = h < 8 ? x : y;
      const v = h < 4 ? y : h === 12 || h === 14 ? x : 0;
      return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    };
  
    // The function returned to the component (the actual noise calculator)
    return (x: any, y: any) => {
      // Determine grid cell coordinates
      let X = Math.floor(x) & 255;
      let Y = Math.floor(y) & 255;
  
      // Relative coordinates of the point in the cell
      x -= Math.floor(x);
      y -= Math.floor(y);
  
      // Fade curves for interpolation
      const u = fade(x);
      const v = fade(y);
  
      // Hash coordinates of the 4 square corners
      let A = perm[X] + Y;
      let B = perm[X + 1] + Y;
  
      // Interpolate between the 4 corners
      const result = lerp(
        lerp(grad(perm[A], x, y), grad(perm[B], x - 1, y), u),
        lerp(grad(perm[A + 1], x, y - 1), grad(perm[B + 1], x - 1, y - 1), u),
        v
      );
      // Perlin noise typically returns values in [-0.707, 0.707], scaling for better contrast
      return result * 1.414;
    };
  };
