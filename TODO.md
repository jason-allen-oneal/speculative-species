# TODO - Speculative Species Project

> Comprehensive task list compiled from IMPLEMENTATION_SUMMARY.md and PHYSICS_IMPLEMENTATION_PLAN.md

## Quick Status Overview

### ✅ Completed
- Light source repositioning (star now illuminates visible planet face)
- Realistic mountain heights that scale with gravity
- Topographic variation derived from tectonic activity and gravity
- Basic terrain generation with displacement mapping
- Interactive planet with click detection and elevation data

### 🚧 In Progress
- Comprehensive test suite (current PR)
- Node 20 migration

### 📋 Planned
- Full physics system implementation
- Derived parameters (gravity, temperature, etc.)
- Atmospheric validation
- Enhanced visual features

---

## PRIORITY 1: Core Physics Relationships (CRITICAL)

These are fundamental physics relationships that make the simulation scientifically accurate.

### 1.1 Gravity Calculation ⚠️ HIGHEST PRIORITY
**Status**: Partially implemented (mountain height scales with gravity)  
**Remaining Work**: Make gravity a fully derived value from mass and radius

**Tasks**:
- [ ] Create `src/lib/physics.ts` module
- [ ] Implement gravity calculation: `g = GM/R²`
  - G = 6.674×10⁻¹¹ m³/(kg·s²)
  - M = planet mass (kg)
  - R = planet radius (m)
- [ ] Make gravity read-only in UI (show calculated value)
- [ ] Update config.json to remove gravity field (make it derived)
- [ ] Validate: Earth (5.972×10²⁴ kg, 6.371×10⁶ m) → 9.82 m/s²

**Files to modify**:
- `src/lib/physics.ts` (NEW)
- `src/components/ControlPanel.tsx` (UPDATE - make gravity read-only)
- `config.json` (UPDATE - remove gravity field)

---

### 1.2 Escape Velocity and Atmospheric Retention
**Status**: Not implemented  
**Impact**: Determines if a planet can hold its atmosphere

**Tasks**:
- [ ] Implement escape velocity calculation: `v_escape = √(2GM/R)`
- [ ] Calculate thermal velocity for each gas: `v_thermal = √(3kT/m)`
  - k = Boltzmann constant (1.381×10⁻²³ J/K)
  - T = temperature
  - m = molecular mass
- [ ] Create atmospheric retention validation:
  - [ ] Warning if v_thermal > v_escape/6 (gas escapes over geological time)
  - [ ] Validate atmospheric composition against escape velocity
- [ ] Validate: Earth v_escape ≈ 11,186 m/s
- [ ] Validate: Earth can retain N₂, O₂, Ar but not H₂, He

**Files to modify**:
- `src/lib/physics.ts` (UPDATE)
- `src/components/PhysicsInfo.tsx` (NEW - display warnings)

---

### 1.3 Surface Temperature Calculation
**Status**: Not implemented  
**Impact**: Determines habitability and climate

**Tasks**:
- [ ] Calculate stellar radiation at orbital distance: `L_received = L_star / (4π × d²)`
- [ ] Calculate equilibrium temperature: `T_eq = T_star × √(R_star / (2 × d))`
- [ ] Calculate greenhouse effect: `T_surface = T_eq + ΔT_greenhouse`
  - [ ] Factor in CO₂ concentration
  - [ ] Factor in H₂O vapor (from ocean coverage)
  - [ ] Factor in atmospheric pressure
- [ ] Display calculated temperature in UI
- [ ] Validate: Earth at 1.0 AU → T_surface ≈ 288K (T_eq ≈ 255K + 33K greenhouse)

**Files to modify**:
- `src/lib/physics.ts` (UPDATE)
- `src/lib/constants.ts` (NEW - star data)
- `src/components/ControlPanel.tsx` or `PhysicsInfo.tsx` (UPDATE - display temperature)

---

## PRIORITY 2: Secondary Physics Relationships (HIGH)

### 2.1 Atmospheric Pressure Scaling
**Status**: Not implemented

**Tasks**:
- [ ] Implement pressure-gravity relationship: `P = ρgh`
- [ ] Calculate expected pressure from gravity and atmospheric mass
- [ ] Add validation warnings for unrealistic pressure-gravity combinations
- [ ] Consider making pressure partially derived
- [ ] Validate: Earth → 1.013 bar at 1.0g

**Files to modify**:
- `src/lib/physics.ts` (UPDATE)
- Validation display component

---

### 2.2 Orbital Period (Kepler's Third Law)
**Status**: Not implemented

**Tasks**:
- [ ] Implement orbital period calculation: `T² = (4π²/GM_star) × a³`
  - T = orbital period
  - a = semi-major axis (orbital distance)
  - M_star = star mass
- [ ] Calculate orbital period from distance and star type
- [ ] Display as derived info
- [ ] Consider impact on seasonal variations
- [ ] Validate: Earth at 1.0 AU → 365.25 days

**Files to modify**:
- `src/lib/physics.ts` (UPDATE)
- `src/lib/constants.ts` (UPDATE - add star masses)
- Display component

---

### 2.3 Hill Sphere and Moon Stability
**Status**: Not implemented (future feature)

**Tasks**:
- [ ] Implement Hill sphere calculation: `r_Hill = a × ∛(M_planet/(3×M_star))`
- [ ] Use for future moon/ring system features
- [ ] Lower priority for current scope

---

## PRIORITY 3: Geological Physics (MEDIUM)

### 3.1 Tectonic Activity Scaling
**Status**: Partially implemented (affects terrain generation)

**Tasks**:
- [ ] Scale tectonic activity suggestion based on planet size
- [ ] Add validation for very small planets (should be tectonically dead)
- [ ] Implement: Larger planets → more tectonic activity potential
- [ ] Consider: Internal heat (radioactive decay + formation heat)
- [ ] Consider: Age factor (older = less activity)

**Files to modify**:
- `src/lib/physics.ts` (UPDATE)
- Validation/suggestion system

---

### 3.2 Maximum Mountain Height from Gravity
**Status**: ✅ IMPLEMENTED

**Current Implementation**:
- Earth (1g): 9 km ✓
- Mars (0.38g): ~23.7 km ✓
- Formula: `h_max ∝ (rock_strength / (ρ × g))` ✓

---

### 3.3 Ocean Depth Scaling
**Status**: Basic implementation

**Tasks**:
- [ ] Scale max ocean depth with gravity
- [ ] Consider pressure-temperature phase diagrams for water
- [ ] Account for exotic ice formation at extreme depths
- [ ] Lower priority refinement

**Files to modify**:
- `src/components/stellar/Planet.tsx` (UPDATE)

---

## PRIORITY 4: Atmospheric Dynamics (LOWER)

### 4.1 Cloud Cover Implementation
**Status**: Not implemented (clouds currently disabled)

**Tasks**:
- [ ] Derive cloud cover from ocean coverage and temperature
  - [ ] More ocean → more evaporation → more clouds
  - [ ] Temperature affects saturation
- [ ] Re-enable cloud rendering with physically-based values
- [ ] Update cloud visual system

**Files to modify**:
- `src/lib/physics.ts` (UPDATE)
- `src/components/stellar/Planet.tsx` (UPDATE)
- `src/components/ControlPanel.tsx` (UPDATE - re-enable cloud slider)

---

### 4.2 Wind Patterns and Coriolis Effect
**Status**: Not implemented

**Tasks**:
- [ ] Calculate Coriolis force from rotation period
- [ ] Use for future weather pattern visualization
- [ ] Low priority for current scope

---

## PRIORITY 5: Visual Enhancements (OPTIONAL)

### 5.1 Accurate Star Color Temperature
**Status**: Basic implementation

**Tasks**:
- [ ] Calculate accurate star color from spectral class (Wien's law)
- [ ] Adjust planet illumination color based on star type
- [ ] Update Star component with realistic colors
- [ ] Visual polish, not physics-critical

**Files to modify**:
- `src/components/stellar/Star.tsx` (UPDATE)
- `src/lib/constants.ts` (UPDATE - star color data)

---

### 5.2 Atmospheric Scattering
**Status**: Not implemented

**Tasks**:
- [ ] Implement Rayleigh scattering (blue sky effect)
- [ ] Calculate sky color from atmospheric composition
- [ ] Thicker atmospheres → more scattering
- [ ] Visual enhancement only

---

## Testing Tasks (Current PR)

### Test Infrastructure
- [x] Install Jest and React Testing Library
- [ ] Create Jest configuration file
- [ ] Create test setup file
- [ ] Update tsconfig.json for Jest
- [ ] Add test scripts to package.json

### Unit Tests
- [ ] `src/lib/utils.ts`
  - [ ] Test createNoise2D function
  - [ ] Test noise generation output
  - [ ] Test fade, lerp, grad functions
- [ ] `src/lib/config.server.ts`
  - [ ] Test loadConfig function
  - [ ] Test JSON parsing
  - [ ] Test file reading errors

### Component Tests
- [ ] `src/components/Tooltip.tsx`
  - [ ] Test tooltip rendering
  - [ ] Test hover behavior
  - [ ] Test click/toggle behavior
  - [ ] Test mobile interactions
- [ ] `src/components/ControlPanel.tsx`
  - [ ] Test slider rendering
  - [ ] Test value changes
  - [ ] Test generate button
  - [ ] Test local state management

### Integration Tests
- [ ] `src/components/PlanetView.tsx`
  - [ ] Test initial state from config
  - [ ] Test state updates
  - [ ] Test planet click handling
  - [ ] Test pause functionality

### Documentation
- [ ] Create TESTING.md or update README with testing info
- [ ] Document test coverage requirements
- [ ] Document how to run tests

---

## Infrastructure & Configuration

### Node 20 Migration
- [x] Update `.github/workflows/copilot-setup-steps.yml` to use Node 20
- [ ] Update documentation to reflect Node 20 requirement
- [ ] Test build with Node 20

### Project Setup
- [ ] Add .gitignore entries for test coverage
- [ ] Configure test coverage thresholds
- [ ] Set up CI/CD for automated testing

---

## Code Quality & Maintenance

### Code Organization
- [ ] Create `src/lib/constants.ts` for physical constants
  - [ ] Gravitational constant (G)
  - [ ] Boltzmann constant (k)
  - [ ] Earth reference values (mass, radius, etc.)
  - [ ] Star type data (mass, temperature, luminosity)
- [ ] Create `src/lib/physics.ts` for calculations
- [ ] Create `src/components/PhysicsInfo.tsx` for derived value display

### TypeScript Types
- [ ] Add physics calculation types to `src/types/index.d.ts`
- [ ] Add PhysicsCalculations interface
- [ ] Add validation warning types
- [ ] Ensure all physics functions are strongly typed

### Documentation
- [ ] Add comments explaining physics formulas in code
- [ ] Document all physics calculations with references
- [ ] Create user guide for physical parameters
- [ ] Document validation warnings

---

## Validation & Testing (Physics)

### Earth Baseline Validation
- [ ] Gravity: 5.972×10²⁴ kg @ 6,371 km → 9.82 m/s²
- [ ] Escape velocity: → 11.2 km/s
- [ ] Surface temperature: 1.0 AU → ~288K
- [ ] Orbital period: 1.0 AU → 365.25 days
- [ ] Atmospheric retention: Can hold N₂, O₂, Ar; loses H₂, He

### Extreme Case Testing
- [ ] Test very low gravity planets
- [ ] Test very high gravity planets
- [ ] Test various orbital distances
- [ ] Test edge cases (division by zero, negative values)

### Warning System
- [ ] Test warnings for impossible configurations
- [ ] Test atmospheric escape warnings
- [ ] Test unrealistic pressure-gravity combinations

---

## Future Features (Not Prioritized)

### Moons and Ring Systems
- [ ] Implement moon orbital mechanics
- [ ] Calculate Roche limit for rings
- [ ] Visual representation of moons

### Advanced Climate
- [ ] Detailed weather patterns
- [ ] Climate zones based on latitude
- [ ] Precipitation modeling

### Biosphere Simulation
- [ ] Habitability zones
- [ ] Life presence indicators
- [ ] Ecosystem complexity modeling

---

## Implementation Strategy

### Recommended Approach
1. **Phase 1**: Create physics module and constants (no UI changes)
2. **Phase 2**: Calculate derived values, display as info only
3. **Phase 3**: Make gravity read-only, show derived temperature
4. **Phase 4**: Add validation warnings
5. **Phase 5**: Optionally make more parameters derived (pressure, etc.)

### Validation Strategy
- All calculations must match Earth's values from config.json
- Test against known planetary data (Mars, Venus, Jupiter)
- Ensure no breaking changes to existing functionality
- Incremental implementation with testing at each phase

---

## Notes

- **Current Earth Config** in `config.json` serves as the validation baseline
- **Existing Features**: Must preserve all current terrain generation and visual features
- **Minimal Changes**: Keep modifications surgical and focused
- **Testing**: Validate against real-world data at each step
- **Documentation**: Every physics formula should have comments and references

---

## Quick Reference: File Structure

```
src/
├── lib/
│   ├── physics.ts          # Core physics calculations (TO CREATE)
│   ├── constants.ts        # Physical constants (TO CREATE)
│   ├── utils.ts            # Existing utilities
│   └── config.server.ts    # Existing config loader
├── components/
│   ├── PhysicsInfo.tsx     # Display derived values (TO CREATE)
│   ├── ControlPanel.tsx    # Update for read-only gravity
│   ├── stellar/
│   │   ├── Star.tsx        # Existing star component
│   │   └── Planet.tsx      # Existing planet component
│   └── ...existing components
└── types/
    └── index.d.ts          # Add physics types
```

---

Last Updated: 2025-11-03
