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
**Status**: ✅ Completed (gravity now derived from mass and radius)

**Tasks**:
- [x] Create `src/lib/physics.ts` module
- [x] Implement gravity calculation: `g = GM/R²`
  - G = 6.674×10⁻¹¹ m³/(kg·s²)
  - M = planet mass (kg)
  - R = planet radius (m)
- [x] Make gravity read-only in UI (show calculated value)
- [x] Update config.json to remove gravity field (make it derived)
- [x] Validate: Earth (5.972×10²⁴ kg, 6.371×10⁶ m) → 9.82 m/s²

**Files to modify**:
- `src/lib/physics.ts` (NEW)
- `src/components/ControlPanel.tsx` (UPDATE - make gravity read-only)
- `config.json` (UPDATE - remove gravity field)

---

### 1.2 Escape Velocity and Atmospheric Retention
**Status**: ✅ Completed (escape velocity + atmospheric retention UI in place)  
**Impact**: Determines if a planet can hold its atmosphere

**Tasks**:
- [x] Implement escape velocity calculation: `v_escape = √(2GM/R)`
- [x] Calculate thermal velocity for each gas: `v_thermal = √(3kT/m)`
  - k = Boltzmann constant (1.381×10⁻²³ J/K)
  - T = temperature
  - m = molecular mass
- [x] Create atmospheric retention validation:
  - [x] Warning if v_thermal > v_escape/6 (gas escapes over geological time)
  - [x] Validate atmospheric composition against escape velocity
- [x] Validate: Earth v_escape ≈ 11,186 m/s
- [x] Validate: Earth can retain N₂, O₂, Ar but not H₂; flags H₂ loss with warnings

**Files to modify**:
- `src/lib/physics.ts` (UPDATE)
- `src/components/PhysicsInfo.tsx` (NEW - display warnings)

---

### 1.3 Surface Temperature Calculation
**Status**: ✅ Completed (temperature model + UI)  
**Impact**: Determines habitability and climate

**Tasks**:
- [x] Calculate stellar radiation at orbital distance: `L_received = L_star / (4π × d²)`
- [x] Calculate equilibrium temperature: `T_eq = T_star × √(R_star / (2 × d))`
- [x] Calculate greenhouse effect: `T_surface = T_eq + ΔT_greenhouse`
  - [x] Factor in CO₂ concentration
  - [x] Factor in H₂O vapor (from ocean coverage)
  - [x] Factor in atmospheric pressure
- [x] Display calculated temperature in UI
- [x] Validate: Earth at 1.0 AU → T_surface ≈ 288K (T_eq ≈ 255K + 33K greenhouse)

**Files modified**:
- `src/lib/constants.ts` (NEW - star data & physical constants)
- `src/lib/physics.ts` (UPDATE - temperature model)
- `src/components/PhysicsInfo.tsx` (UPDATE - display temperatures & factors)
- `src/components/PlanetView.tsx` (UPDATE - wire temperature model)

---

## PRIORITY 2: Secondary Physics Relationships (HIGH)

### 2.1 Atmospheric Pressure Scaling
**Status**: ✅ Completed (pressure model & warnings)

**Tasks**:
- [x] Implement pressure-gravity relationship: `P = ρgh`
- [x] Calculate expected pressure from gravity and atmospheric mass
- [x] Add validation warnings for unrealistic pressure-gravity combinations
- [x] Make surface pressure derived from gravity (manual control removed)
- [x] Validate: Earth → 1.013 bar at 1.0g

**Files modified**:
- `src/lib/physics.ts`
- Validation display component (`src/components/PhysicsInfo.tsx`)
- `src/components/PlanetView.tsx`
- `src/components/ControlPanel.tsx`
- `tests/lib/physics.test.ts`
- `tests/components/PlanetView.test.tsx`

---

### 2.2 Orbital Period (Kepler's Third Law)
**Status**: ✅ Completed (derived orbital period)

**Tasks**:
- [x] Implement orbital period calculation: `T² = (4π²/GM_star) × a³`
  - T = orbital period
  - a = semi-major axis (orbital distance)
  - M_star = star mass
- [x] Calculate orbital period from distance and star type
- [x] Display as derived info
- [ ] Consider impact on seasonal variations
- [x] Validate: Earth at 1.0 AU → 365.25 days

**Files modified**:
- `src/lib/physics.ts`
- `src/lib/constants.ts`
- Display component (`src/components/PhysicsInfo.tsx`)
- `src/components/PlanetView.tsx`
- `tests/lib/physics.test.ts`
- `tests/components/PlanetView.test.tsx`

---

### 2.3 Hill Sphere and Moon Stability
**Status**: ✅ Completed (hill sphere radius derived)

**Tasks**:
- [x] Implement Hill sphere calculation: `r_Hill = a × ∛(M_planet/(3×M_star))`
- [x] Display derived radius and validation info for moon stability
- [ ] Use for future moon/ring system features *(future enhancement)*

**Files modified**:
- `src/lib/physics.ts`
- `src/components/PlanetView.tsx`
- `src/components/PhysicsInfo.tsx`
- `tests/lib/physics.test.ts`
- `tests/components/PlanetView.test.tsx`

---

## PRIORITY 3: Geological Physics (MEDIUM)

### 3.1 Tectonic Activity Scaling
**Status**: ✅ Completed (derived guidance & warnings)

**Tasks**:
- [x] Scale tectonic activity suggestion based on planet size and gravity
- [x] Add validation messaging for small/large worlds
- [x] Highlight large-planet tectonic expectations
- [ ] Consider: Internal heat (radioactive decay + formation heat)
- [ ] Consider: Age factor (older = less activity)

**Files modified**:
- `src/lib/physics.ts`
- Validation display (`src/components/PhysicsInfo.tsx`)
- `src/components/PlanetView.tsx`
- `tests/lib/physics.test.ts`
- `tests/components/PlanetView.test.tsx`

---

### 3.2 Maximum Mountain Height from Gravity
**Status**: ✅ IMPLEMENTED (reviewed)

**Current Implementation**:
- Earth (1g): 9 km ✓
- Mars (0.38g): ~23.7 km ✓
- Formula: `h_max ∝ (rock_strength / (ρ × g))` ✓
- Review: `getMaxLandElevation` tied to gravity; no changes required.

---

## PRIORITY 4: Atmospheric Dynamics (LOWER)

### 4.1 Cloud Cover Implementation
**Status**: ✅ Derived suggestion (slider still disabled)

**Tasks**:
- [x] Derive cloud cover from ocean coverage, temperature, greenhouse index
  - [x] More ocean/heat → higher suggested cloud fraction
  - [ ] Re-enable slider/rendering (future)
- [ ] Update cloud visual system *(future)*

**Files modified**:
- `src/lib/physics.ts`
- `src/components/PlanetView.tsx`
- `src/components/PhysicsInfo.tsx`
- `tests/lib/physics.test.ts`
- `tests/components/PlanetView.test.tsx`

---

### 4.2 Wind Patterns and Coriolis Effect
**Status**: ✅ Derived metrics (visualization pending)

**Tasks**:
- [x] Calculate Coriolis parameter & equatorial velocity from rotation
- [x] Provide qualitative wind strength guidance
- [ ] Visualize weather patterns *(future)*

---

## PRIORITY 5: Visual Enhancements (OPTIONAL)

### 5.1 Accurate Star Color Temperature
**Status**: ✅ Completed (light-only star with spectral color)

**Tasks**:
- [x] Calculate star colors from temperature (Wien's law approximation)
- [x] Drive scene lighting color/intensity from star type
- [x] Remove visual Star mesh in favor of physically-coloured lights
- [ ] Additional visual polish (optional)

**Files modified**:
- `src/lib/constants.ts`
- `src/components/PlanetCanvas.tsx`
- `src/components/PhysicsInfo.tsx`
- `src/components/PlanetView.tsx`
- `tests/lib/physics.test.ts`
- `tests/components/PlanetView.test.tsx`

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
