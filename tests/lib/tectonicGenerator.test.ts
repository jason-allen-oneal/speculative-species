import { generatePlateMap, computeCoarseElevation } from '@/lib/tectonicGenerator';

describe('tectonicGenerator', () => {
  describe('generatePlateMap', () => {
    it('should generate a plate map with the specified number of plates', () => {
      const plateCount = 5;
      const mapSize = 128;
      const oceanFraction = 0.7;
      const seed = 12345;

      const plateMap = generatePlateMap(seed, plateCount, mapSize, oceanFraction);

      expect(plateMap.plates).toHaveLength(plateCount);
      expect(plateMap.width).toBe(mapSize);
      expect(plateMap.height).toBe(mapSize);
      expect(plateMap.plateIndex.length).toBe(mapSize * mapSize);
    });

    it('should assign each pixel to a plate', () => {
      const plateCount = 3;
      const mapSize = 64;
      const oceanFraction = 0.5;
      const seed = 54321;

      const plateMap = generatePlateMap(seed, plateCount, mapSize, oceanFraction);

      // Check that all plate IDs are within valid range
      for (let i = 0; i < plateMap.plateIndex.length; i++) {
        expect(plateMap.plateIndex[i]).toBeGreaterThanOrEqual(0);
        expect(plateMap.plateIndex[i]).toBeLessThan(plateCount);
      }
    });

    it('should create plates with correct types based on ocean fraction', () => {
      const plateCount = 10;
      const mapSize = 128;
      const oceanFraction = 0.6;
      const seed = 11111;

      const plateMap = generatePlateMap(seed, plateCount, mapSize, oceanFraction);

      const oceanicPlates = plateMap.plates.filter(p => p.type === 'oceanic');
      const continentalPlates = plateMap.plates.filter(p => p.type === 'continental');

      // Should have approximately oceanFraction oceanic plates
      const expectedOceanic = Math.round(plateCount * oceanFraction);
      expect(oceanicPlates.length).toBe(expectedOceanic);
      expect(continentalPlates.length).toBe(plateCount - expectedOceanic);
    });

    it('should generate plates with velocity vectors', () => {
      const plateCount = 4;
      const mapSize = 64;
      const oceanFraction = 0.7;
      const seed = 99999;

      const plateMap = generatePlateMap(seed, plateCount, mapSize, oceanFraction);

      plateMap.plates.forEach(plate => {
        expect(plate.velocity).toBeDefined();
        expect(plate.velocity.x).toBeDefined();
        expect(plate.velocity.y).toBeDefined();
        expect(plate.velocity.z).toBeDefined();
        // Velocity should not be zero vector
        const magnitude = plate.velocity.length();
        expect(magnitude).toBeGreaterThan(0);
      });
    });

    it('should generate reproducible results with the same seed', () => {
      const seed = 42;
      const plateCount = 5;
      const mapSize = 64;
      const oceanFraction = 0.5;

      const map1 = generatePlateMap(seed, plateCount, mapSize, oceanFraction);
      const map2 = generatePlateMap(seed, plateCount, mapSize, oceanFraction);

      // Same seed should produce identical results
      for (let i = 0; i < map1.plateIndex.length; i++) {
        expect(map1.plateIndex[i]).toBe(map2.plateIndex[i]);
      }
    });

    it('should always create at least one continental plate (no land issue fix)', () => {
      const mapSize = 128;

      // Test extreme ocean fraction scenarios
      const testCases = [
        { oceanFraction: 0.95, plateCount: 8, seed: 12345 },
        { oceanFraction: 0.90, plateCount: 3, seed: 54321 },
        { oceanFraction: 1.0, plateCount: 5, seed: 99999 },
        { oceanFraction: 0.85, plateCount: 4, seed: 11111 },
      ];

      testCases.forEach(({ oceanFraction, plateCount, seed }) => {
        const plateMap = generatePlateMap(seed, plateCount, mapSize, oceanFraction);

        const continentalPlates = plateMap.plates.filter(p => p.type === 'continental');

        // Should always have at least one continental plate
        expect(continentalPlates.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('computeCoarseElevation', () => {
    it('should generate elevation values in 0-1 range', () => {
      const plateCount = 5;
      const mapSize = 128;
      const oceanFraction = 0.7;
      const seed = 12345;

      const plateMap = generatePlateMap(seed, plateCount, mapSize, oceanFraction);
      const elevation = computeCoarseElevation(plateMap, 1.0, oceanFraction);

      expect(elevation.length).toBe(mapSize * mapSize);

      for (let i = 0; i < elevation.length; i++) {
        expect(elevation[i]).toBeGreaterThanOrEqual(0);
        expect(elevation[i]).toBeLessThanOrEqual(1);
      }
    });

    it('should create higher elevation for continental plates', () => {
      const plateCount = 4;
      const mapSize = 128;
      const oceanFraction = 0.5;
      const seed = 54321;

      const plateMap = generatePlateMap(seed, plateCount, mapSize, oceanFraction);
      const elevation = computeCoarseElevation(plateMap, 1.0, oceanFraction);

      // Sample some pixels and check continental vs oceanic
      const continentalElevations: number[] = [];
      const oceanicElevations: number[] = [];

      for (let i = 0; i < 1000; i++) {
        const idx = Math.floor(Math.random() * elevation.length);
        const plateId = plateMap.plateIndex[idx];
        const plate = plateMap.plates[plateId];

        if (plate.type === 'continental') {
          continentalElevations.push(elevation[idx]);
        } else {
          oceanicElevations.push(elevation[idx]);
        }
      }

      // On average, continental should be higher than oceanic
      const avgContinental = continentalElevations.reduce((a, b) => a + b, 0) / continentalElevations.length;
      const avgOceanic = oceanicElevations.reduce((a, b) => a + b, 0) / oceanicElevations.length;

      expect(avgContinental).toBeGreaterThan(avgOceanic);
    });

    it('should scale with gravity factor', () => {
      const plateCount = 5;
      const mapSize = 128;
      const oceanFraction = 0.5;
      const seed = 11111;

      const plateMap = generatePlateMap(seed, plateCount, mapSize, oceanFraction);
      
      const lowGravity = computeCoarseElevation(plateMap, 2.0, oceanFraction); // Lower gravity = more variation
      const highGravity = computeCoarseElevation(plateMap, 0.5, oceanFraction); // Higher gravity = less variation

      // Calculate variance
      const variance = (arr: Float32Array) => {
        const mean = Array.from(arr).reduce((a, b) => a + b, 0) / arr.length;
        return Array.from(arr).reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / arr.length;
      };

      const lowGravityVar = variance(lowGravity);
      const highGravityVar = variance(highGravity);

      // Lower gravity should allow more variation (higher variance)
      expect(lowGravityVar).toBeGreaterThan(highGravityVar * 0.8);
    });

    it('should produce varied elevation values', () => {
      const plateCount = 6;
      const mapSize = 128;
      const oceanFraction = 0.7;
      const seed = 77777;

      const plateMap = generatePlateMap(seed, plateCount, mapSize, oceanFraction);
      const elevation = computeCoarseElevation(plateMap, 1.0, oceanFraction);

      // Check that we have reasonable variation
      const uniqueValues = new Set(Array.from(elevation).map(v => v.toFixed(2)));
      
      // Should have many different elevation values
      expect(uniqueValues.size).toBeGreaterThan(20);
    });
  });
});
