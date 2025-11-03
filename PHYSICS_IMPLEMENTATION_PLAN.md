# Comprehensive Physics Implementation Plan for Speculative Species

## Current State
The application currently allows independent control of planetary parameters without enforcing realistic physical relationships. The Earth configuration in `config.json` has accurate base values, but the system doesn't validate or derive dependent parameters.

## Priority-Ranked Implementation Plan

### PRIORITY 1: Core Physics Relationships (CRITICAL)
**Impact**: Makes the simulation scientifically accurate and prevents impossible planetary configurations.

#### 1.1 Gravity Calculation (HIGHEST PRIORITY)
**Status**: Partially implemented (mountain height scales with gravity)
**Remaining Work**: Make gravity a fully derived value from mass and radius

**Physics**: `g = GM/R²`
- G = 6.674×10⁻¹¹ m³/(kg·s²) (gravitational constant)
- M = planet mass (kg)
- R = planet radius (m)

**Implementation Location**: `src/lib/physics.ts` (new file)

**Changes Required**:
1. Create physics calculation module
2. Calculate gravity from mass and radius_scale
3. Make gravity read-only in UI (show calculated value)
4. Update config.json to remove gravity field (make it derived)

**Earth Validation**: 
- Mass: 5.972×10²⁴ kg
- Radius: 6.371×10⁶ m (radius_scale = 1.0)
- Expected g: 9.82 m/s² (1.0g) ✓

---

#### 1.2 Escape Velocity and Atmospheric Retention
**Status**: Not implemented
**Impact**: Determines if a planet can hold its atmosphere

**Physics**: `v_escape = √(2GM/R)`

**Implementation**:
1. Calculate escape velocity from mass and radius
2. Calculate thermal velocity for each gas: `v_thermal = √(3kT/m)`
   - k = Boltzmann constant (1.381×10⁻²³ J/K)
   - T = temperature
   - m = molecular mass
3. Validate atmospheric composition:
   - If v_thermal > v_escape/6: gas escapes over geological time
   - Warning system for unrealistic atmospheres

**Earth Validation**:
- v_escape ≈ 11,186 m/s ✓
- Can retain N₂, O₂, Ar ✓
- H₂ and He escape ✓

---

#### 1.3 Surface Temperature Calculation
**Status**: Not implemented
**Impact**: Determines habitability and climate

**Physics**:
1. **Stellar radiation at orbital distance**: `L_received = L_star / (4π × d²)`
2. **Equilibrium temperature**: `T_eq = T_star × √(R_star / (2 × d))`
3. **Greenhouse effect**: `T_surface = T_eq + ΔT_greenhouse`
   - ΔT depends on atmospheric pressure and composition

**Implementation**:
1. Calculate equilibrium temperature from orbital distance
2. Add greenhouse warming based on:
   - CO₂ concentration
   - H₂O vapor (from ocean coverage)
   - Atmospheric pressure
3. Display calculated temperature in UI

**Earth Validation**:
- Orbital distance: 1.0 AU
- T_eq ≈ 255K
- Greenhouse effect: +33K
- T_surface ≈ 288K ✓

---

### PRIORITY 2: Secondary Physics Relationships (HIGH)

#### 2.1 Atmospheric Pressure Scaling
**Status**: Not implemented
**Physics**: Surface pressure should relate to:
1. Atmospheric mass
2. Gravity: `P = ρgh` (column weight)
3. Temperature (gas law)

**Implementation**:
1. Calculate expected pressure from gravity and atmospheric mass
2. Add validation warnings for unrealistic combinations
3. Consider making pressure partially derived

**Earth Validation**: 1.013 bar at 1.0g ✓

---

#### 2.2 Orbital Period (Kepler's Third Law)
**Status**: Not implemented
**Physics**: `T² = (4π²/GM_star) × a³`
- T = orbital period
- a = semi-major axis (orbital distance)
- M_star = star mass

**Implementation**:
1. Calculate orbital period from distance and star type
2. Display as derived info (not critical for visuals)
3. Affects year length and seasonal variations

**Earth Validation**: 1.0 AU → 365.25 days ✓

---

#### 2.3 Hill Sphere and Moon Stability
**Status**: Not implemented
**Physics**: Maximum stable satellite distance
`r_Hill = a × ∛(M_planet/(3×M_star))`

**Implementation**:
1. Calculate Hill sphere radius
2. Use for future moon/ring system features
3. Lower priority for current scope

---

### PRIORITY 3: Geological Physics (MEDIUM)

#### 3.1 Tectonic Activity Scaling
**Status**: Partially implemented (affects terrain generation)
**Physics**: Tectonic activity depends on:
1. Internal heat (radioactive decay + formation heat)
2. Planet size (larger = more heat retention)
3. Age (older = less activity)

**Implementation**:
1. Scale tectonic activity suggestion based on planet size
2. Add validation for very small planets (should be tectonically dead)
3. Larger planets → more tectonic activity potential

---

#### 3.2 Maximum Mountain Height from Gravity
**Status**: ✅ IMPLEMENTED
**Physics**: `h_max ∝ (rock_strength / (ρ × g))`

**Current Implementation**:
- Earth (1g): 9 km
- Mars (0.38g): ~23.7 km
- Works correctly ✓

---

#### 3.3 Ocean Depth Scaling
**Status**: Basic implementation
**Physics**: Maximum ocean depth limited by pressure at which water becomes exotic ice

**Enhancement**:
1. Scale max ocean depth with gravity
2. Consider pressure-temperature phase diagrams
3. Lower priority refinement

---

### PRIORITY 4: Atmospheric Dynamics (LOWER)

#### 4.1 Cloud Cover from Ocean and Temperature
**Status**: Not implemented (clouds disabled)
**Physics**: 
- More ocean → more evaporation → more clouds
- Temperature affects saturation

**Implementation**:
1. Derive cloud cover from ocean coverage and temperature
2. Re-enable cloud rendering with physically-based values

---

#### 4.2 Wind Patterns and Coriolis Effect
**Status**: Not implemented
**Physics**: Rotation period affects atmospheric circulation

**Implementation**:
1. Calculate Coriolis force from rotation period
2. Use for future weather pattern visualization
3. Low priority for current scope

---

### PRIORITY 5: Visual Enhancements (OPTIONAL)

#### 5.1 Accurate Color Temperature
**Status**: Basic implementation
**Physics**: Star color from temperature (Wien's law)

**Enhancement**:
1. Calculate accurate star color from spectral class
2. Adjust planet illumination color
3. Visual polish, not physics-critical

---

#### 5.2 Atmospheric Scattering
**Status**: Not implemented
**Physics**: Rayleigh scattering (blue sky effect)

**Implementation**:
1. Calculate sky color from atmospheric composition
2. Thicker atmospheres → more scattering
3. Visual enhancement only

---

## Recommended Implementation Prompt

Use this prompt to implement the full physics system:

```
I need to implement a comprehensive physics calculation system for the speculative-species 
planetary simulation. Currently, planetary parameters are independent, but they need to 
follow real-world physics relationships.

REQUIREMENTS:
1. Create a new physics module (src/lib/physics.ts) that calculates derived planetary parameters
2. Implement these core physics relationships in order of priority:
   
   PRIORITY 1 (Must Have):
   - Calculate surface gravity from mass and radius: g = GM/R²
   - Calculate escape velocity: v_esc = √(2GM/R)
   - Calculate surface temperature from orbital distance, including greenhouse effect
   - Validate atmospheric retention based on escape velocity vs thermal velocity
   
   PRIORITY 2 (Should Have):
   - Scale atmospheric pressure with gravity
   - Calculate orbital period from Kepler's third law
   - Validate parameter combinations and show warnings for unrealistic values
   
   PRIORITY 3 (Nice to Have):
   - Scale tectonic activity suggestions with planet size
   - Derive cloud cover from ocean coverage and temperature
   - Calculate accurate star colors from spectral class

3. Update the UI:
   - Make gravity read-only (derived from mass and radius)
   - Display calculated temperature
   - Show warnings for physically impossible configurations
   - Add an info panel showing derived values

4. Validate against Earth:
   - All calculations should produce correct values for Earth's config
   - Mass: 5.972×10²⁴ kg, Radius: 6,371 km → g: 9.82 m/s²
   - Orbital distance: 1 AU → Temperature: ~288K (with greenhouse)
   - Should retain N₂, O₂, Ar but not H₂, He

5. Keep existing functionality:
   - Don't break the current terrain generation
   - Maintain all existing visual features
   - Preserve the control panel UX (just add derived value displays)

The Earth configuration in config.json should serve as the validation baseline. 
All physics calculations must produce realistic values matching Earth when using Earth's parameters.

CONSTRAINTS:
- Minimize changes to existing components
- Create a clean, testable physics module
- Add TypeScript types for all physics calculations
- Include comments explaining the physics formulas
- Maintain the existing file structure
```

---

## Implementation Files Structure

```
src/
├── lib/
│   ├── physics.ts          # NEW: Core physics calculations
│   │   ├── calculateGravity(mass, radius): number
│   │   ├── calculateEscapeVelocity(mass, radius): number
│   │   ├── calculateEquilibriumTemp(orbitalDist, starType): number
│   │   ├── calculateGreenhouseEffect(pressure, composition): number
│   │   ├── calculateSurfaceTemp(...): number
│   │   ├── validateAtmosphere(escapeVel, temp, composition): warnings[]
│   │   └── calculateOrbitalPeriod(distance, starMass): number
│   │
│   ├── constants.ts        # NEW: Physical constants
│   │   ├── G (gravitational constant)
│   │   ├── k (Boltzmann constant)
│   │   ├── EARTH_MASS, EARTH_RADIUS
│   │   └── Star type data (mass, temperature, luminosity)
│   │
│   └── utils.ts            # EXISTING
│
├── components/
│   ├── PhysicsInfo.tsx     # NEW: Display derived values
│   ├── ControlPanel.tsx    # UPDATE: Make gravity read-only
│   └── ...existing components
│
└── types/
    └── index.d.ts          # UPDATE: Add physics types
```

---

## Testing Strategy

1. **Earth Baseline Test**: All calculations must match Earth values
2. **Extreme Cases**: Test with very low/high gravity, various orbital distances
3. **Edge Cases**: Handle division by zero, negative values gracefully
4. **Validation**: Ensure warnings appear for impossible configurations

---

## Example Physics Module Skeleton

```typescript
// src/lib/physics.ts
import { PHYSICAL_CONSTANTS, STAR_DATA } from './constants';

export interface PhysicsCalculations {
  gravity: number;              // m/s²
  escapeVelocity: number;       // m/s
  equilibriumTemp: number;      // K
  surfaceTemp: number;          // K
  orbitalPeriod: number;        // days
  maxMountainHeight: number;    // km
  warnings: string[];
}

export function calculatePlanetaryPhysics(params: {
  mass: number;                 // kg
  radiusScale: number;          // Earth radii
  orbitalDistance: number;      // AU
  surfacePressure: number;      // atm
  composition: Record<string, number>;
  oceanCoverage: number;
  starType: string;
}): PhysicsCalculations {
  // Implementation here
}
```

---

## Validation Checklist

- [ ] Earth config produces g = 9.82 m/s²
- [ ] Earth config produces T_surface ≈ 288K
- [ ] Earth config produces v_escape ≈ 11.2 km/s
- [ ] Low-gravity planets allow taller mountains
- [ ] High-gravity planets compress atmospheres
- [ ] Close orbital distances increase temperature
- [ ] Warnings for escaped atmospheres (e.g., small planet, light gases)
- [ ] All existing visual features still work
- [ ] No breaking changes to component interfaces

---

## Migration Path

1. **Phase 1**: Create physics module and constants (no UI changes)
2. **Phase 2**: Calculate derived values, display as info only
3. **Phase 3**: Make gravity read-only, show derived temperature
4. **Phase 4**: Add validation warnings
5. **Phase 5**: Optionally make more parameters derived (pressure, etc.)

This allows incremental implementation and testing without breaking existing functionality.
