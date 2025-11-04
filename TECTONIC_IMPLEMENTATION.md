# Tectonic Plate Generation System

## Overview

This implementation replaces the previous noise-only terrain generation with a hybrid system that combines:

1. **Plate Tectonics Simulation**: Creates discrete plates with types (continental/oceanic) and motion vectors
2. **Domain-Warped Noise**: Adds fine detail by warping noise sampling coordinates
3. **Ridged Noise**: Creates mountain ridges and dramatic terrain features

## New Files

### `src/lib/tectonicGenerator.ts`

Contains the core plate generation logic:

- **`generatePlateMap(seed, plateCount, mapSize, oceanFraction)`**: Creates a map of tectonic plates using Fibonacci sphere distribution and Voronoi-like flood-fill. Returns a `PlateMap` with plate assignments for each pixel.

- **`computeCoarseElevation(plateMap, gravityFactor, oceanFraction)`**: Computes base elevation from plate interactions. Convergent boundaries create mountains/trenches, divergent boundaries create ridges, and transform boundaries create modest faults. Elevation scales inversely with gravity.

### Enhanced `src/lib/utils.ts`

Added two new noise functions:

- **`domainWarpedNoise(nx, ny, nz, warpStrength, octaves)`**: Uses one noise function to warp the coordinates of another, creating twisted, realistic terrain patterns. Warp strength scales with tectonic activity.

- **`ridgedNoise(nx, ny, nz, octaves)`**: Creates sharp ridges by taking the absolute value of noise and inverting it. Perfect for mountain ranges.

## Integration in Planet.tsx

The hybrid terrain system combines the three approaches:

```typescript
// Generate coarse tectonic elevation
const coarseMap = useMemo(() => {
  const plateCount = Math.max(3, Math.min(15, Math.floor(2 + tectonic * 1.2)));
  const seed = Math.floor((tectonic * 1000 + oceanFraction * 10000) % 100000);
  const plateMap = generatePlateMap(seed, plateCount, mapSize, oceanFraction);
  return computeCoarseElevation(plateMap, gravityFactor, oceanFraction);
}, [tectonic, oceanFraction, gravityFactor]);

// For each pixel:
const coarse = coarseMap[idx];
const domainNoise = (domainWarpedNoise(nx, ny, nz, warpStrength, 4) + 1) / 2;
const ridges = ridgedNoise(nx, ny, nz, 3);

// Combine: 60% tectonic, 30% domain-warped, 10% ridged
let elev = 0.6 * coarse + 0.3 * domainNoise + 0.1 * ridges;
```

## Configuration

The system respects all existing parameters:

- **`tectonic` slider (0-10)**: 
  - Controls plate count (low = few large plates, high = many small plates)
  - Influences warp strength (more tectonic = more twisted terrain)
  - Affects terrain variation through gravity factor

- **`ocean` parameter (0-1)**: 
  - Determines fraction of plates that are oceanic
  - Used to calibrate sea level in elevation normalization

- **`gravity` (derived from mass/radius)**:
  - Suppresses mountain height (higher gravity = lower peaks)
  - Scales elevation amplitude at plate boundaries

## Physics Compatibility

All existing physics calculations in `src/lib/physics.ts` remain unchanged:

- Mountain height still scales inversely with gravity via `DISPLACEMENT_SCALE`
- Ocean depth calculations use the same formulas
- All surface gravity, escape velocity, and atmospheric calculations are preserved

## Testing

Comprehensive test suites added for:

- `tests/lib/tectonicGenerator.test.ts`: Tests plate generation, elevation computation, gravity scaling, and ocean fraction calibration
- `tests/lib/utils.test.ts`: Extended with tests for domain-warped and ridged noise functions

All tests pass successfully.

## Earth Configuration

With Earth-like settings:
- `tectonic_activity = 5` → ~8 plates (similar to Earth's 7-8 major plates)
- `ocean = 0.71` → ~71% oceanic plates
- `mass = 5.972e24 kg`, `radius_scale = 1.0` → gravity factor = 1.0

The system produces recognizable continents, mountain ranges at convergent boundaries, mid-ocean ridges at divergent boundaries, and realistic coastlines.

## Performance Considerations

- Plate generation happens at full `TEXTURE_SIZE` (2048x2048) but is memoized
- Only regenerates when `tectonic`, `oceanFraction`, or `gravityFactor` changes
- Noise functions are called per-pixel but are lightweight
- Total generation time is comparable to the previous noise-only approach
