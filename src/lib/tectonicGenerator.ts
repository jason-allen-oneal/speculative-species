import * as THREE from "three";

/**
 * Represents a tectonic plate with its properties
 */
export interface Plate {
  id: number;
  type: "continental" | "oceanic";
  velocity: THREE.Vector3; // direction and speed
  age: number; // 0..1, optional aging parameter
}

/**
 * Map of plate IDs across the sphere surface
 */
export interface PlateMap {
  plateIndex: Uint16Array; // length = mapSize * mapSize, holds plate id for each pixel
  plates: Plate[];
  width: number;
  height: number;
}

/**
 * Simple seedable random number generator for consistent plate generation
 */
class SeededRandom {
  private seed: number;

  // Linear congruential generator constants (Park and Miller)
  private static readonly MULTIPLIER = 9301;
  private static readonly INCREMENT = 49297;
  private static readonly MODULUS = 233280;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * SeededRandom.MULTIPLIER + SeededRandom.INCREMENT) % SeededRandom.MODULUS;
    return this.seed / SeededRandom.MODULUS;
  }
}

/**
 * Generate a plate map by distributing seed points on a sphere and flood-filling
 * 
 * @param seed Random seed for reproducible generation
 * @param plateCount Number of tectonic plates to create
 * @param mapSize Size of the equirectangular map (width and height)
 * @param oceanFraction Fraction of plates that should be oceanic (0-1)
 * @returns PlateMap with plate assignments for each pixel
 */
export function generatePlateMap(
  seed: number,
  plateCount: number,
  mapSize: number,
  oceanFraction: number
): PlateMap {
  const rng = new SeededRandom(seed);
  const plateIndex = new Uint16Array(mapSize * mapSize);
  const plates: Plate[] = [];

  // Step 1: Generate seed points on the sphere
  const seedPoints: Array<{ u: number; v: number; id: number }> = [];
  
  for (let i = 0; i < plateCount; i++) {
    // Use Fibonacci sphere distribution for even spacing
    const goldenRatio = (1 + Math.sqrt(5)) / 2;
    const theta = 2 * Math.PI * i / goldenRatio;
    const phi = Math.acos(1 - 2 * (i + 0.5) / plateCount);
    
    // Add some randomness to prevent perfect regular patterns
    const noise = 0.3;
    const u = ((theta / (2 * Math.PI)) + (rng.next() - 0.5) * noise) % 1;
    const v = (phi / Math.PI + (rng.next() - 0.5) * noise * 0.5);
    
    seedPoints.push({
      u: (u + 1) % 1, // Ensure wrapping
      v: Math.max(0, Math.min(1, v)), // Clamp to valid range
      id: i,
    });
  }

  // Step 2: Flood-fill using Voronoi-like assignment
  // For each pixel, assign it to the nearest seed point
  for (let y = 0; y < mapSize; y++) {
    for (let x = 0; x < mapSize; x++) {
      const u = x / mapSize;
      const v = y / mapSize;

      // Convert to spherical coordinates
      const theta = u * Math.PI * 2;
      const phi = v * Math.PI;
      const px = Math.sin(phi) * Math.cos(theta);
      const py = Math.cos(phi);
      const pz = Math.sin(phi) * Math.sin(theta);

      let minDist = Infinity;
      let closestPlate = 0;

      // Find closest seed point by Euclidean distance (faster than spherical distance)
      // Since we only need relative distances for Voronoi assignment, squared distance is sufficient
      for (const seed of seedPoints) {
        const sTheta = seed.u * Math.PI * 2;
        const sPhi = seed.v * Math.PI;
        const sx = Math.sin(sPhi) * Math.cos(sTheta);
        const sy = Math.cos(sPhi);
        const sz = Math.sin(sPhi) * Math.sin(sTheta);

        // Squared Euclidean distance (avoids expensive acos)
        const dx = px - sx;
        const dy = py - sy;
        const dz = pz - sz;
        const distSq = dx * dx + dy * dy + dz * dz;

        if (distSq < minDist) {
          minDist = distSq;
          closestPlate = seed.id;
        }
      }

      plateIndex[y * mapSize + x] = closestPlate;
    }
  }

  // Step 3: Create plate objects with types and velocities
  // Ensure at least one continental plate exists to prevent "no land" issue
  // Even highly oceanic planets should have some land mass
  const numOceanic = Math.min(plateCount - 1, Math.round(plateCount * oceanFraction));
  
  for (let i = 0; i < plateCount; i++) {
    // First numOceanic plates are oceanic, rest are continental
    const isOceanic = i < numOceanic;
    
    // Generate random velocity vector
    const velocityMagnitude = 0.2 + rng.next() * 0.8; // Speed variation
    const azimuth = rng.next() * Math.PI * 2;
    const elevation = (rng.next() - 0.5) * Math.PI * 0.5; // Bias toward horizontal
    
    const velocity = new THREE.Vector3(
      Math.cos(elevation) * Math.cos(azimuth) * velocityMagnitude,
      Math.sin(elevation) * velocityMagnitude,
      Math.cos(elevation) * Math.sin(azimuth) * velocityMagnitude
    );

    plates.push({
      id: i,
      type: isOceanic ? "oceanic" : "continental",
      velocity,
      age: rng.next(), // Random age for variation
    });
  }

  return {
    plateIndex,
    plates,
    width: mapSize,
    height: mapSize,
  };
}

/**
 * Compute coarse elevation based on plate boundaries and interactions
 * 
 * @param plateMap The plate map generated by generatePlateMap
 * @param gravityFactor Factor to scale mountain height (higher gravity = lower mountains)
 * @param oceanFraction Overall ocean coverage for sea level calibration
 * @returns Float32Array of elevation values (0 = deep ocean, 1 = highest mountain)
 */
export function computeCoarseElevation(
  plateMap: PlateMap,
  gravityFactor: number,
  oceanFraction: number
): Float32Array {
  const { plateIndex, plates, width, height } = plateMap;
  const elevation = new Float32Array(width * height);

  // Set base elevations for continental vs oceanic plates
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const plateId = plateIndex[idx];
      const plate = plates[plateId];

      // Continental plates start higher than oceanic
      elevation[idx] = plate.type === "continental" ? 0.55 : 0.35;
    }
  }

  // Add elevation based on plate boundaries
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const plateId = plateIndex[idx];
      const plate = plates[plateId];

      // Check neighboring pixels for plate boundaries
      const neighbors = [
        { dx: 1, dy: 0 },
        { dx: -1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: 0, dy: -1 },
      ];

      let boundaryStrength = 0;
      let boundaryType = 0; // -1 = divergent, 0 = transform, 1 = convergent

      for (const { dx, dy } of neighbors) {
        const nx = (x + dx + width) % width; // Wrap horizontally
        const ny = Math.max(0, Math.min(height - 1, y + dy)); // Clamp vertically
        const nIdx = ny * width + nx;
        const nPlateId = plateIndex[nIdx];

        if (nPlateId !== plateId) {
          // We're at a plate boundary
          const nPlate = plates[nPlateId];

          // Calculate relative velocity at boundary
          const relativeVel = plate.velocity.clone().sub(nPlate.velocity);
          const velocityMagnitude = relativeVel.length();

          // Determine boundary type by checking if plates are moving toward/away
          // Simplified: use dot product of velocity difference with boundary normal
          const boundaryNormal = new THREE.Vector3(dx, dy, 0).normalize();
          const dot = relativeVel.dot(boundaryNormal);

          if (Math.abs(dot) > 0.3) {
            if (dot > 0) {
              // Convergent boundary - creates mountains/trenches
              boundaryType = 1;
              boundaryStrength += velocityMagnitude * 0.3;
            } else {
              // Divergent boundary - creates ridges
              boundaryType = -1;
              boundaryStrength += velocityMagnitude * 0.15;
            }
          } else {
            // Transform boundary - modest faults
            boundaryStrength += velocityMagnitude * 0.05;
          }
        }
      }

      // Apply boundary effects
      if (boundaryStrength > 0) {
        // Scale by gravity - higher gravity suppresses mountains
        const gravityScale = 1.0 / Math.max(0.5, gravityFactor);
        
        if (boundaryType > 0) {
          // Convergent: Create mountains or trenches
          if (plate.type === "continental") {
            // Continental collision = high mountains
            elevation[idx] += boundaryStrength * 0.4 * gravityScale;
          } else {
            // Oceanic subduction = trenches
            elevation[idx] -= boundaryStrength * 0.2;
          }
        } else if (boundaryType < 0) {
          // Divergent: Create mid-ocean ridges or rifts
          elevation[idx] += boundaryStrength * 0.15 * gravityScale;
        } else {
          // Transform: Modest elevation change
          elevation[idx] += boundaryStrength * 0.1 * gravityScale;
        }
      }
    }
  }

  // Normalize elevation to 0-1 range
  let minElev = Infinity;
  let maxElev = -Infinity;
  
  for (let i = 0; i < elevation.length; i++) {
    minElev = Math.min(minElev, elevation[i]);
    maxElev = Math.max(maxElev, elevation[i]);
  }

  const range = maxElev - minElev;
  if (range > 0) {
    for (let i = 0; i < elevation.length; i++) {
      elevation[i] = (elevation[i] - minElev) / range;
    }
  }

  // Adjust to match desired ocean fraction
  // Find the elevation threshold that gives us the right ocean coverage
  const sorted = Array.from(elevation).sort((a, b) => a - b);
  const oceanThresholdIndex = Math.floor(sorted.length * oceanFraction);
  const oceanThreshold = sorted[oceanThresholdIndex];

  // Remap so that oceanThreshold becomes approximately 0.4 (sea level in the noise)
  for (let i = 0; i < elevation.length; i++) {
    if (elevation[i] < oceanThreshold) {
      elevation[i] = elevation[i] / oceanThreshold * 0.4;
    } else {
      elevation[i] = 0.4 + (elevation[i] - oceanThreshold) / (1 - oceanThreshold) * 0.6;
    }
  }

  return elevation;
}
