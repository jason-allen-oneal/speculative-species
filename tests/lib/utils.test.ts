import { createNoise2D } from '@/lib/utils';

describe('createNoise2D', () => {
  describe('Basic Functionality', () => {
    it('should return a function', () => {
      const noise2D = createNoise2D();
      expect(typeof noise2D).toBe('function');
    });

    it('should return a number when called with coordinates', () => {
      const noise2D = createNoise2D();
      const result = noise2D(0, 0);
      expect(typeof result).toBe('number');
    });

    it('should return finite numbers', () => {
      const noise2D = createNoise2D();
      const result = noise2D(5.5, 3.2);
      expect(Number.isFinite(result)).toBe(true);
    });
  });

  describe('Output Range', () => {
    it('should return values roughly in expected range', () => {
      const noise2D = createNoise2D();
      const samples: number[] = [];
      
      // Sample the noise function at various points
      for (let x = 0; x < 10; x += 0.5) {
        for (let y = 0; y < 10; y += 0.5) {
          samples.push(noise2D(x, y));
        }
      }
      
      // Perlin noise scaled by 1.414 should be roughly in range [-1.414, 1.414]
      // but with some tolerance for statistical variation
      const min = Math.min(...samples);
      const max = Math.max(...samples);
      
      expect(min).toBeGreaterThan(-2.5);
      expect(max).toBeLessThan(2.5);
    });

    it('should produce varied values across different coordinates', () => {
      const noise2D = createNoise2D();
      const values = [];
      
      // Sample at widely separated points to ensure variation
      for (let i = 0; i < 50; i++) {
        values.push(noise2D(i * 3.7, i * 2.3)); // Use non-integer steps
      }
      
      // Check that we have at least some different values
      const uniqueValues = new Set(values.map(v => v.toFixed(3)));
      
      // With 50 samples at different coordinates, we should have variation
      expect(uniqueValues.size).toBeGreaterThan(5);
    });
  });

  describe('Smoothness and Continuity', () => {
    it('should produce smoothly varying values for nearby coordinates', () => {
      const noise2D = createNoise2D();
      const v1 = noise2D(5.0, 5.0);
      const v2 = noise2D(5.01, 5.01);
      
      // Values at very close coordinates should be similar
      // (though exact difference depends on gradient)
      const difference = Math.abs(v1 - v2);
      expect(difference).toBeLessThan(0.5);
    });

    it('should handle negative coordinates', () => {
      const noise2D = createNoise2D();
      const result1 = noise2D(-5, -3);
      const result2 = noise2D(-10.5, -7.2);
      
      expect(Number.isFinite(result1)).toBe(true);
      expect(Number.isFinite(result2)).toBe(true);
    });

    it('should handle large coordinates', () => {
      const noise2D = createNoise2D();
      const result = noise2D(1000, 1000);
      
      expect(Number.isFinite(result)).toBe(true);
    });
  });

  describe('Deterministic Behavior', () => {
    it('should produce different results for different noise generators', () => {
      // Create multiple generators and check they produce different permutations
      const generators = [createNoise2D(), createNoise2D(), createNoise2D()];
      
      // Test at a specific coordinate
      const testCoord = { x: 7.3, y: 4.2 };
      const results = generators.map(gen => gen(testCoord.x, testCoord.y));
      
      // Since each createNoise2D() uses Math.random() for permutation,
      // it's statistically very unlikely all three would produce exactly the same result
      // Check if at least two are different
      const allSame = results.every(r => Math.abs(r - results[0]) < 0.00001);
      expect(allSame).toBe(false);
    });

    it('should return consistent values for the same coordinates with same generator', () => {
      const noise2D = createNoise2D();
      const x = 7.3;
      const y = 4.2;
      
      const result1 = noise2D(x, y);
      const result2 = noise2D(x, y);
      
      expect(result1).toBe(result2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero coordinates', () => {
      const noise2D = createNoise2D();
      const result = noise2D(0, 0);
      
      expect(Number.isFinite(result)).toBe(true);
    });

    it('should handle fractional coordinates', () => {
      const noise2D = createNoise2D();
      const result = noise2D(0.123456, 0.789012);
      
      expect(Number.isFinite(result)).toBe(true);
    });

    it('should handle boundary wrapping for grid cells', () => {
      const noise2D = createNoise2D();
      
      // Test coordinates that should wrap around the 256 grid
      const result1 = noise2D(255.9, 100);
      const result2 = noise2D(256.1, 100);
      
      expect(Number.isFinite(result1)).toBe(true);
      expect(Number.isFinite(result2)).toBe(true);
    });
  });

  describe('Statistical Properties', () => {
    it('should have reasonable distribution of values', () => {
      const noise2D = createNoise2D();
      const samples: number[] = [];
      
      // Collect many samples
      for (let x = 0; x < 20; x++) {
        for (let y = 0; y < 20; y++) {
          samples.push(noise2D(x * 0.5, y * 0.5));
        }
      }
      
      // Calculate mean (should be roughly around 0)
      const mean = samples.reduce((sum, v) => sum + v, 0) / samples.length;
      
      // Mean should be relatively close to 0 (not perfectly 0 due to randomness)
      expect(Math.abs(mean)).toBeLessThan(0.5);
      
      // Should have both positive and negative values
      const hasPositive = samples.some(v => v > 0);
      const hasNegative = samples.some(v => v < 0);
      
      expect(hasPositive).toBe(true);
      expect(hasNegative).toBe(true);
    });
  });
});
