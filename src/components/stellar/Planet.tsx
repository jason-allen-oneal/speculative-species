import { useState, useRef, useEffect, useMemo, useCallback, startTransition } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { domainWarpedNoise, ridgedNoise } from "@/lib/utils";
import createPlanetShaderMaterial from "@/components/PlanetShaderMaterial";
import noiseGLSL from '@/shaders/noise.glsl';
import planetFrag from '@/shaders/planet-frag.glsl';
import { generatePlateMap, computeCoarseElevation } from "@/lib/tectonicGenerator";

const TEXTURE_SIZE = 1024; // Balanced resolution for performance vs fidelity
const SPHERE_DETAIL = 192; // High detail geometry (needs enough vertices for displacement)
// Maximum land elevation scales inversely with gravity (stronger gravity = lower max mountains)
// Earth (1g) has max ~9km, Mars (0.38g) could have ~23.7km mountains
const getMaxLandElevation = (gravity: number) => 9 / Math.max(0.1, gravity);
const BASE_MAX_OCEAN_DEPTH_KM = 11; // Earth's deepest trenches ~11 km
const getMaxOceanDepth = (gravity: number) =>
  BASE_MAX_OCEAN_DEPTH_KM / Math.sqrt(Math.max(0.1, gravity));
const VISUAL_DAY_SECONDS = 60; // Seconds it takes for a 24h planet to complete a turn in view

// Tectonic plate generation constants
const MIN_PLATE_COUNT = 3; // Minimum number of tectonic plates
const MAX_PLATE_COUNT = 15; // Maximum number of tectonic plates
const BASE_PLATE_COUNT = 2; // Base offset for plate count calculation
const TECTONIC_PLATE_MULTIPLIER = 1.2; // Scales tectonic slider to plate count

export default function Planet({
    gravity: _gravity,
    ocean,
    axialTilt,
    pressure: _pressure,
  surfaceTempK,
    orbitalDist: _orbitalDist,
    rotationPeriod,
    cloudCover: _cloudCover,
    tectonic,
    planetSize,
  // When true, use the GPU procedural shader material instead of the canvas texture pipeline
  useShader: _useShader = false,
    onPlanetClick,
    isPaused,
    markerPosition,
}: PlanetProps) {
    const planetRef = useRef<THREE.Mesh | null>(null);
    const tiltGroupRef = useRef<THREE.Group | null>(null);
    const axisRef = useRef<THREE.Line | null>(null);
  const shaderMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const { camera, gl } = useThree(); 
  const [_texture, setTexture] = useState<THREE.CanvasTexture | null>(null); 
  const [_normalMap, setNormalMap] = useState<THREE.CanvasTexture | null>(null); 
  const [_displacementMap, setDisplacementMap] = useState<THREE.CanvasTexture | null>(null); 
    const heightFieldRef = useRef<Float32Array | null>(null);
  const rawHeightFieldRef = useRef<Float32Array | null>(null);
    const displacementFieldRef = useRef<Float32Array | null>(null);
    const landMaskRef = useRef<Uint8Array | null>(null);
    const sampleMetaRef = useRef({ seaLevel: 0, size: TEXTURE_SIZE, oceanFraction: ocean });
  
  // GPU heightpass resources (created if capabilities allow)
  const heightTargetRef = useRef<THREE.WebGLRenderTarget | null>(null);
  const heightSceneRef = useRef<THREE.Scene | null>(null);
  const heightMeshRef = useRef<THREE.Mesh | null>(null);
  const heightOrthoCamRef = useRef<THREE.OrthographicCamera | null>(null);
  
    // Physics: Maximum mountain height is inversely proportional to gravity
    const gravity = Math.max(0.1, _gravity); // Clamp to prevent division by zero
  const MAX_LAND_ELEVATION_KM = getMaxLandElevation(gravity);
  const MAX_OCEAN_DEPTH_KM = getMaxOceanDepth(gravity);
    
    // Derive topographic variation from tectonic activity and gravity
    // Higher tectonic activity = more variation, higher gravity = less variation (mountains can't be as tall)
    // Base value normalized to Earth (tectonic=5, gravity=1.0 => ~0.3)
    // Normalization: Earth's tectonic value of 5 divided by 16.67 yields 0.3 baseline variation
    const TECTONIC_NORMALIZATION_FACTOR = 16.67;
    const baseTopographicVariation = useMemo(() => THREE.MathUtils.clamp(tectonic / TECTONIC_NORMALIZATION_FACTOR, 0, 1), [tectonic]);
    const gravityFactor = useMemo(() => Math.min(2.0, 1.0 / gravity), [gravity]); // Lower gravity allows more variation
    const topographicVariation = useMemo(() => THREE.MathUtils.clamp(baseTopographicVariation * gravityFactor, 0, 1), [baseTopographicVariation, gravityFactor]);
    
    // === Constants for 3D Relief ===
    // Topographic variation controls terrain roughness (0-1 scale, where 0.3 is Earth-like)
    // Higher values mean more dramatic height variations
    const terrainRoughness = topographicVariation;
    
  // Max displacement scale relative to the unit radius (1.0). Controls mountain height.
  // NOTE: this is local-space (unit sphere) scale; the mesh is later scaled by `planetSize`.
  // Keep this independent of `planetSize` so shader displacement remains stable.
  const DISPLACEMENT_SCALE = useMemo(() => 0.04 * (0.5 + terrainRoughness), [terrainRoughness]);
    // Terrain detail multiplier applied to the height map before displacement.
    const TERRAIN_CONTRAST = useMemo(() => 0.5 + terrainRoughness * 1.5, [terrainRoughness]); 
    // Bias is half of the scale, used to center the displacement around the sphere's radius.
  const DISPLACEMENT_BIAS = useMemo(() => -DISPLACEMENT_SCALE * 0.5, [DISPLACEMENT_SCALE]);
  
    // === Rotation speed calculation ===
    const rotationSpeed = useMemo(
      () => (2 * Math.PI / VISUAL_DAY_SECONDS) * (24 / rotationPeriod),
      [rotationPeriod]
    );
  
    const axialTiltRad = THREE.MathUtils.degToRad(axialTilt);
  
    // === Color palette baseline ===
    const { oceanFraction } = useMemo(() => {
      // Clamp to ensure visual stability and realism
      const frac = THREE.MathUtils.clamp(ocean, 0.2, 0.95);
      return { oceanFraction: frac };
    }, [ocean]);
  
    // === COARSE TECTONIC ELEVATION MAP ===
    const coarseMap = useMemo(() => {
      const mapSize = TEXTURE_SIZE;
      // Derive plate count from tectonic slider: low activity → few plates, high activity → many plates
      // Earth has ~7-8 major plates, tectonic=5 should give ~6-8 plates
      const plateCount = Math.max(MIN_PLATE_COUNT, Math.min(MAX_PLATE_COUNT, Math.floor(BASE_PLATE_COUNT + tectonic * TECTONIC_PLATE_MULTIPLIER)));
      
      // Use a seed based on tectonic and ocean values for reproducibility
      const seed = Math.floor((tectonic * 1000 + oceanFraction * 10000) % 100000);
      
      const plateMap = generatePlateMap(seed, plateCount, mapSize, oceanFraction);
      return computeCoarseElevation(plateMap, gravityFactor, oceanFraction);
    }, [tectonic, oceanFraction, gravityFactor]);

    // === TEXTURE, NORMAL, & DISPLACEMENT MAP GENERATION ===
    useEffect(() => {
      const size = TEXTURE_SIZE;
      
      // Validate coarseMap before proceeding
      if (!coarseMap || coarseMap.length !== size * size) {
        console.warn('Invalid coarseMap, skipping texture generation');
        return;
      }
      
      // Canvases
      const colorCanvas = document.createElement("canvas");
      colorCanvas.width = colorCanvas.height = size;
      const ctx = colorCanvas.getContext("2d");
      if (!ctx) return;
      const colorImg = ctx.createImageData(size, size);
      const colorData = colorImg.data;
  
      const normalCanvas = document.createElement("canvas");
      normalCanvas.width = normalCanvas.height = size;
      const nCtx = normalCanvas.getContext("2d");
      if (!nCtx) return;
      const normalImg = nCtx.createImageData(size, size);
      const normalData = normalImg.data;
      
      const dispCanvas = document.createElement("canvas"); 
      dispCanvas.width = dispCanvas.height = size;
      const dCtx = dispCanvas.getContext("2d");
      if (!dCtx) return;
      const dispImg = dCtx.createImageData(size, size);
      const dispData = dispImg.data;
      
      // Height map for normal and displacement generation
      const heightMap = new Float32Array(size * size);
      const displacementField = new Float32Array(size * size);
      const landMask = new Uint8Array(size * size);

      // Noise parameters scale with tectonic activity
      const warpStrength = 0.3 + tectonic * 0.1; // More tectonic = more warping
      const domainOctaves = 4;
      const ridgedOctaves = 3;

      // First pass: build the raw height map from tectonics + noise
      const rawHeight = new Float32Array(size * size);
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          // Spherical coordinates for seamless wrapping
          const u = x / size;
          const v = y / size;
          const theta = u * Math.PI * 2; // longitude
          const phi = v * Math.PI; // latitude
          
          // Convert to 3D coordinates on unit sphere
          const nx = Math.sin(phi) * Math.cos(theta);
          const ny = Math.cos(phi);
          const nz = Math.sin(phi) * Math.sin(theta);
  
          // Hybrid terrain generation:
          // 1. Get coarse elevation from tectonic plates
          const idx = y * size + x;
          let coarse = coarseMap[idx];
          
          // Guard against invalid values - use fallback
          if (!Number.isFinite(coarse)) {
            console.warn(`Invalid coarse value at ${idx}: ${coarse}, using fallback`);
            coarse = 0.5; // Default to mid-level
          }
          
          // 2. Sample domain-warped noise for fine detail
          let domainNoiseDetail = (domainWarpedNoise(nx, ny, nz, warpStrength, domainOctaves) + 1) / 2;
          let domainNoiseMid = (domainWarpedNoise(nx * 0.7, ny * 0.7, nz * 0.7, warpStrength * 0.75, 3) + 1) / 2;
          let domainNoiseLarge = (domainWarpedNoise(nx * 0.35, ny * 0.35, nz * 0.35, warpStrength * 0.5, 3) + 1) / 2;
          let offsetNoise = (domainWarpedNoise((nx + nz) * 0.2, (ny + nx) * 0.2, (nz + ny) * 0.2, warpStrength * 0.3, 2) + 1) / 2;
          
          // 3. Sample ridged noise for mountain ridges
          let ridges = ridgedNoise(nx, ny, nz, ridgedOctaves);
          
          // Guard against NaN from noise functions - use fallback
          if (!Number.isFinite(domainNoiseDetail)) {
            console.warn(`Invalid domainNoiseDetail at ${idx}: ${domainNoiseDetail}, using fallback`);
            domainNoiseDetail = 0.5;
          }
          if (!Number.isFinite(domainNoiseMid)) {
            console.warn(`Invalid domainNoiseMid at ${idx}: ${domainNoiseMid}, using fallback`);
            domainNoiseMid = 0.5;
          }
          if (!Number.isFinite(domainNoiseLarge)) {
            console.warn(`Invalid domainNoiseLarge at ${idx}: ${domainNoiseLarge}, using fallback`);
            domainNoiseLarge = 0.5;
          }
          if (!Number.isFinite(offsetNoise)) {
            console.warn(`Invalid offsetNoise at ${idx}: ${offsetNoise}, using fallback`);
            offsetNoise = 0.5;
          }
          if (!Number.isFinite(ridges)) {
            console.warn(`Invalid ridges at ${idx}: ${ridges}, using fallback`);
            ridges = 0;
          }
          
          // 4. Combine: coarse provides base, domain-warped adds variation, ridged adds mountains
          const offsetCoarse = THREE.MathUtils.lerp(coarse, domainNoiseLarge, 0.4);
          const blendedCoarse = 0.7 * offsetCoarse + 0.3 * offsetNoise;
          let elev = 0.25 * blendedCoarse + 0.25 * domainNoiseMid + 0.2 * domainNoiseDetail + 0.3 * ridges;
          elev = THREE.MathUtils.clamp(elev, 0, 1);

          // Smooth height distribution and store
          const e = Math.pow(elev, 1.1);
          rawHeight[idx] = e; // preserve the raw terrainHeight-derived value (0..1)
          heightMap[idx] = e;
        }
      }

      // Derive a sea level that matches the requested ocean coverage using a histogram quantile
      const totalPixels = size * size;
      const BIN_COUNT = 1024;
      const histogram = new Uint32Array(BIN_COUNT);
      for (let i = 0; i < heightMap.length; i++) {
        const value = THREE.MathUtils.clamp(heightMap[i], 0, 0.999999);
        const bin = Math.min(BIN_COUNT - 1, Math.floor(value * BIN_COUNT));
        histogram[bin]++;
      }
      const targetOceanCount = oceanFraction * totalPixels;
      let cumulative = 0;
      let seaLevelBin = BIN_COUNT - 1;
      for (let b = 0; b < BIN_COUNT; b++) {
        cumulative += histogram[b];
        if (cumulative >= targetOceanCount) {
          seaLevelBin = b;
          break;
        }
      }
      const prevCumulative = cumulative - histogram[seaLevelBin];
      const binStart = seaLevelBin / BIN_COUNT;
      const binWidth = 1 / BIN_COUNT;
      const withinBin = histogram[seaLevelBin];
      const fractionWithinBin =
        withinBin > 0 ? THREE.MathUtils.clamp((targetOceanCount - prevCumulative) / withinBin, 0, 1) : 0;
      let seaLevel = binStart + fractionWithinBin * binWidth;
      seaLevel = THREE.MathUtils.clamp(seaLevel, 0.02, 0.9);

      const landDenominator = Math.max(1e-4, 1 - seaLevel);
      const oceanDenominator = Math.max(1e-4, seaLevel);

      // Re-shape the raw heights so land rises above sea level and shelves have variety
      const minLandLift = 0.14;
      const minOceanDepth = 0.12;
      const epsilon = 1e-4;
      let oceanPixels = 0;
      for (let i = 0; i < heightMap.length; i++) {
        const raw = THREE.MathUtils.clamp(heightMap[i], 0, 1);
        let adjusted: number;
        if (raw >= seaLevel) {
          const landNorm = THREE.MathUtils.clamp((raw - seaLevel) / landDenominator, 0, 1);
          const curved = Math.pow(landNorm, 0.8);
          const lifted = minLandLift + (1 - minLandLift) * curved;
          adjusted = seaLevel + lifted * landDenominator;
          if (adjusted <= seaLevel) adjusted = seaLevel + epsilon;
        } else {
          const oceanNorm = THREE.MathUtils.clamp((seaLevel - raw) / oceanDenominator, 0, 1);
          const curved = Math.pow(oceanNorm, 1.15);
          const depth = minOceanDepth + (1 - minOceanDepth) * curved;
          adjusted = seaLevel - depth * oceanDenominator;
          if (adjusted >= seaLevel) adjusted = seaLevel - epsilon;
        }
        adjusted = THREE.MathUtils.clamp(adjusted, 0, 1);
        heightMap[i] = adjusted;
        if (adjusted <= seaLevel) oceanPixels++;
      }
      const actualOceanFraction = oceanPixels / totalPixels;
      const effectiveOceanFraction = THREE.MathUtils.clamp(actualOceanFraction, 0.02, 0.98);

      // Second pass: color, displacement and texture data using the resolved sea level
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const idx = y * size + x;
          const e = heightMap[idx];

          const diff = e - seaLevel;
          const shorelineBlend = THREE.MathUtils.clamp((diff + 0.03) / 0.06, 0, 1);
  
          // latitude tint for polar ice/tundra
          const latitude = 1 - Math.abs(y / size - 0.5) * 2;
          const polar = Math.max(0, 1 - latitude * 2.2);
  
          const color = new THREE.Color();
          if (e > seaLevel) {
            const landRatio = THREE.MathUtils.clamp((e - seaLevel) / landDenominator, 0, 1);
            const landNorm = THREE.MathUtils.clamp((landRatio - minLandLift) / (1 - minLandLift), 0, 1);
            const tempFactor = THREE.MathUtils.clamp(1 - Math.abs(latitude - 0.5) * 2, 0, 1);
            const dryness = THREE.MathUtils.clamp(
              0.35 +
                terrainRoughness * 0.35 -
                tempFactor * 0.25 +
                (1 - effectiveOceanFraction) * 0.25 -
                landNorm * 0.1,
              0,
              1
            );
  
            const baseHue = THREE.MathUtils.lerp(0.08, 0.32, 1 - dryness);
            const saturation = THREE.MathUtils.clamp(0.35 + tempFactor * 0.3 - landNorm * 0.2, 0.25, 0.8);
            const lightness = THREE.MathUtils.clamp(0.22 + tempFactor * 0.25 + landNorm * 0.3, 0.18, 0.75);
            color.setHSL(baseHue, saturation, lightness);
  
            if (landNorm > 0.55) {
              const rockBlend = THREE.MathUtils.clamp((landNorm - 0.55) / 0.25, 0, 1);
              color.lerp(new THREE.Color("#8b8d8f"), rockBlend);
            }
            if (landNorm > 0.8) {
              const snowBlend = Math.min((landNorm - 0.8) / 0.2 + polar * 0.5, 1);
              color.lerp(new THREE.Color("#f7f7f9"), snowBlend);
            }
          } else {
            const depthRatio = THREE.MathUtils.clamp((seaLevel - e) / oceanDenominator, 0, 1);
            const depthNorm = THREE.MathUtils.clamp((depthRatio - minOceanDepth) / (1 - minOceanDepth), 0, 1);
            const hue = 0.58;
            const saturation = THREE.MathUtils.clamp(0.55 - depthNorm * 0.1, 0.4, 0.65);
            const lightness = THREE.MathUtils.clamp(0.18 + (1 - depthNorm) * 0.2, 0.15, 0.45);
            color.setHSL(hue, saturation, lightness);

            if (depthNorm < 0.3) {
              const shallowBlend = THREE.MathUtils.clamp((0.3 - depthNorm) / 0.3, 0, 1);
              color.lerp(new THREE.Color("#2a84c9"), shallowBlend);
            }
          }

          const shorelineColor = new THREE.Color("#2a5aa5");
          const finalColor = new THREE.Color().lerpColors(shorelineColor, color, shorelineBlend);
          
          // Final Color Map Assignment
          const i = (y * size + x) * 4;
          colorData[i] = Math.pow(finalColor.r, 1 / 2.2) * 255;
          colorData[i + 1] = Math.pow(finalColor.g, 1 / 2.2) * 255;
          colorData[i + 2] = Math.pow(finalColor.b, 1 / 2.2) * 255;
          colorData[i + 3] = 255;
          
          // --- Displacement Map Assignment (Refined Logic) ---
          const displacementBase = 0.5;
          let displacementValue = displacementBase; 
  
          const isLand = e > seaLevel;
          if (isLand) {
              // Land: Push outwards from the 0.5 base
              const landRatio = THREE.MathUtils.clamp((e - seaLevel) / landDenominator, 0, 1);
              const h_land = THREE.MathUtils.clamp((landRatio - minLandLift) / (1 - minLandLift), 0, 1); // 0 to 1 for land
              // Max height is +50% of the possible range above base (0.5 to 1.0)
              displacementValue = displacementBase + h_land * 0.5 * TERRAIN_CONTRAST; 
          } else {
              // Ocean: Sink slightly inwards
              const depthRatio = THREE.MathUtils.clamp((seaLevel - e) / oceanDenominator, 0, 1);
              const d_ocean = THREE.MathUtils.clamp((depthRatio - minOceanDepth) / (1 - minOceanDepth), 0, 1); // 0 to 1 for ocean depth
              // Max depth is -10% of the possible range below base (0.5 to 0.4)
              displacementValue = displacementBase - d_ocean * 0.1; 
          }
  
          // Clamp to ensure valid displacement values [0, 1]
          displacementValue = THREE.MathUtils.clamp(displacementValue, 0, 1);
          const dispVal255 = displacementValue * 255;
          dispData[i] = dispVal255;
          dispData[i + 1] = dispVal255;
          dispData[i + 2] = dispVal255;
          dispData[i + 3] = 255;
          displacementField[idx] = displacementValue;
          landMask[idx] = isLand ? 1 : 0;
          // --------------------------------------------------
        }
      }
  
      // Third pass: generate normal map from the finalized height map
      const strength = 0.005; // Normal map strength
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          // Get surrounding heights
          const h0 = heightMap[y * size + x];
          const hX_plus = heightMap[y * size + ((x + 1) % size)];
          const hY_plus = heightMap[((y + 1) % size) * size + x];
  
          // Calculate slopes
          const dx = (h0 - hX_plus) * strength;
          const dy = (h0 - hY_plus) * strength;
          const dz = 1.0; // Z component (normal) is mostly facing out
  
          // Normalize vector
          const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
          const normX = dx / len;
          const normY = dy / len;
          const normZ = dz / len;
  
          // Convert vector components (-1 to 1) to color components (0 to 255)
          const i = (y * size + x) * 4;
          normalData[i] = (normX * 0.5 + 0.5) * 255;
          normalData[i + 1] = (normY * 0.5 + 0.5) * 255;
          normalData[i + 2] = (normZ * 0.5 + 0.5) * 255;
          normalData[i + 3] = 255;
        }
      }
  
      // Update Textures
      ctx.putImageData(colorImg, 0, 0);
      const colorTex = new THREE.CanvasTexture(colorCanvas);
      colorTex.wrapS = colorTex.wrapT = THREE.RepeatWrapping;
      colorTex.magFilter = THREE.LinearFilter;
      colorTex.minFilter = THREE.LinearMipmapLinearFilter;
      colorTex.needsUpdate = true;
  
      nCtx.putImageData(normalImg, 0, 0);
      const normalTex = new THREE.CanvasTexture(normalCanvas);
      normalTex.wrapS = normalTex.wrapT = THREE.RepeatWrapping;
      normalTex.needsUpdate = true;
      
      // Update Displacement Texture
      dCtx.putImageData(dispImg, 0, 0);
      const dispTex = new THREE.CanvasTexture(dispCanvas);
      dispTex.wrapS = dispTex.wrapT = THREE.RepeatWrapping;
      dispTex.needsUpdate = true;

      startTransition(() => {
        setTexture(colorTex);
        setNormalMap(normalTex);
        setDisplacementMap(dispTex);
      });
  // Store both the raw (pre-reshaped) heights and the final reshaped height map
  rawHeightFieldRef.current = rawHeight;
  heightFieldRef.current = heightMap;
      displacementFieldRef.current = displacementField;
      landMaskRef.current = landMask;
      sampleMetaRef.current = { seaLevel, size, oceanFraction: actualOceanFraction };

    }, [oceanFraction, tectonic, gravity, DISPLACEMENT_SCALE, TERRAIN_CONTRAST, terrainRoughness, coarseMap]); 
  
  
    // === AXIS LINE === (Keeping existing code)
    useEffect(() => {
      // Only run once to set up the line geometry/material
      if (axisRef.current || !tiltGroupRef.current) return;
      
      // Extended axis line that goes far into space
      const axisLength = 3.5;
      const pts = [
        new THREE.Vector3(0, -axisLength, 0), 
        new THREE.Vector3(0, axisLength, 0)
      ];
      const geometry = new THREE.BufferGeometry().setFromPoints(pts);
      
      const material = new THREE.ShaderMaterial({
        transparent: true,
        uniforms: { 
          uColor: { value: new THREE.Color(0xffffff) },
          uLength: { value: axisLength }
        },
        vertexShader: `
          varying float vY;
          void main() {
            vY = position.y;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 uColor;
          uniform float uLength;
          varying float vY;
          void main() {
            float absY = abs(vY);
            // Fade from full opacity at planet edge (1.0) to transparent at full length (uLength)
            float fade = 1.0 - smoothstep(1.0, uLength, absY);
            // Inner glow near planet
            float glow = 1.0 - smoothstep(0.8, 1.2, absY);
            float alpha = mix(fade * 0.7, 1.0, glow * 0.8);
            gl_FragColor = vec4(uColor, alpha);
          }
        `,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      
      axisRef.current = new THREE.Line(geometry, material);
      tiltGroupRef.current.add(axisRef.current);
    }, []);
  
    // === Rotation & tilt ===
    // Temporary vector reused each frame to avoid allocations
    const tmpCamDir = useRef(new THREE.Vector3());
    useFrame((_, delta) => {
      if (!planetRef.current || !tiltGroupRef.current) return;
      tiltGroupRef.current.rotation.z = axialTiltRad;
      // Only rotate if not paused
      if (!isPaused) {
        planetRef.current.rotation.y += rotationSpeed * delta;
      }

    // Update shader light direction to always match camera angle.
      // We use camera.getWorldDirection which returns a unit vector pointing from the camera
      // toward the scene; the shader expects `lightDirection` such that L = normalize(-lightDirection),
      // so we store the negated camera forward vector so lighting comes from the camera direction.
      try {
        camera.getWorldDirection(tmpCamDir.current);
        const mat = shaderMaterialRef.current;
        if (mat && mat.uniforms && mat.uniforms.lightDirection) {
          const ld = mat.uniforms.lightDirection.value as THREE.Vector3;
          ld.copy(tmpCamDir.current).negate();
        }
      } catch (_e) {
        // Defensive: if camera or material isn't ready yet, skip this frame
      }
    });
  
    // === Camera adjustment ===
    const visualScale = planetSize;
    useEffect(() => {
      camera.position.set(camera.position.x, camera.position.y, 3 * planetSize);
    }, [planetSize, camera]);
  
    // Ensure high detail sphere geometry is used for displacement
    const sphereGeom = useMemo(() => new THREE.SphereGeometry(1, SPHERE_DETAIL, SPHERE_DETAIL), []); 

    // Shader material (always used)
    const shaderMaterial = useMemo(() => {
      const mat = createPlanetShaderMaterial({
        // Pass local-space displacement values so mountain heights are controlled
        displacementScale: { value: DISPLACEMENT_SCALE },
        displacementBias: { value: DISPLACEMENT_BIAS },
        // default output mode: color (0)
        outputMode: { value: 0 },
      });
      mat.uniforms.radius.value = 1.0;
      mat.uniforms.bumpOffset.value = 0.001;
      return mat;
    }, [DISPLACEMENT_SCALE, DISPLACEMENT_BIAS]);

  // Create an orthographic UV-based height pass that computes normalized height per-texel.
  // This renders a fullscreen quad where the fragment shader builds a unit-sphere position
  // from UV and runs the exact same terrain math so the GPU heightmap matches the visible render.
  useEffect(() => {
    // Ensure shaderMaterial exists and renderer supports float render targets
    try {
      const renderer = gl as THREE.WebGLRenderer;
      const caps = (renderer as unknown as { capabilities?: { isWebGL2?: boolean } }).capabilities;
      const supportsFloat = !!(caps?.isWebGL2 || renderer.getContext().getExtension('EXT_color_buffer_float'));
      if (!supportsFloat) return;

      const rt = new THREE.WebGLRenderTarget(TEXTURE_SIZE, TEXTURE_SIZE, {
        type: THREE.FloatType,
        format: THREE.RGBAFormat,
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        depthBuffer: false,
      });
      heightTargetRef.current = rt;

  const heightScene = new THREE.Scene();
  const orthoCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  heightOrthoCamRef.current = orthoCam;

      const heightVert = `
        varying vec2 vUv;
        varying vec3 fragPosition;
        const float PI = 3.141592653589793;
        void main() {
          vUv = uv;
          float v = 1.0 - vUv.y; // match CPU mapping where v=0 at north/top
          float theta = vUv.x * 2.0 * PI;
          float phi = v * PI;
          fragPosition = vec3(sin(phi) * cos(theta), cos(phi), sin(phi) * sin(theta));
          gl_Position = vec4(position, 1.0);
        }
      `;

      // Clone the visible material's uniforms so we can switch outputMode without
      // affecting the on-screen shader. Three.js provides UniformsUtils.clone for this.
      const heightUniforms = THREE.UniformsUtils.clone(
        shaderMaterial.uniforms as unknown as Record<string, THREE.IUniform<unknown>>
      ) as Record<string, THREE.IUniform<unknown>>;
      // Ensure outputMode is set to 1 (height) on the cloned uniforms
      if (heightUniforms && 'outputMode' in heightUniforms) {
        (heightUniforms.outputMode as THREE.IUniform<number>).value = 1;
      } else {
        heightUniforms.outputMode = { value: 1 } as THREE.IUniform<number>;
      }

      const heightMat = new THREE.ShaderMaterial({
        uniforms: heightUniforms,
        vertexShader: heightVert,
        fragmentShader: `${noiseGLSL}\n${planetFrag}`,
      });

      const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), heightMat);
      heightScene.add(quad);
      heightSceneRef.current = heightScene;
      heightMeshRef.current = quad;

      return () => {
        rt.dispose();
        heightScene.clear();
        heightTargetRef.current = null;
        heightSceneRef.current = null;
        heightMeshRef.current = null;
      };
    } catch (_err) {
      // If float render targets aren't supported or any error occurs, keep the CPU fallback.
    }
  }, [gl, shaderMaterial]);

    // Keep shader uniforms in sync with dynamic app state and UI-derived values.
    /* eslint-disable react-hooks/immutability */
    useEffect(() => {
      const mat = shaderMaterial as THREE.ShaderMaterial | null;
      if (!mat || !mat.uniforms) return;
      // More tectonic activity → more octaves and slightly higher lacunarity/persistence
      const computedOct = Math.max(1, Math.min(12, Math.floor(4 + tectonic * 0.6)));
      mat.uniforms.octaves.value = computedOct;
      mat.uniforms.persistence.value = 0.45 + Math.min(0.2, tectonic * 0.01);
      mat.uniforms.lacunarity.value = 1.6 + Math.min(0.8, tectonic * 0.03);
      mat.uniforms.period.value = 0.45 + (1.0 - terrainRoughness) * 0.5;
      mat.uniforms.sharpness.value = THREE.MathUtils.clamp(1.5 + terrainRoughness * 2.0, 0.5, 6.0);

      // Bump mapping and displacement
      mat.uniforms.bumpStrength.value = THREE.MathUtils.clamp(0.6 + terrainRoughness * 0.8, 0.1, 2.0);
      mat.uniforms.displacementScale.value = DISPLACEMENT_SCALE;
      mat.uniforms.displacementBias.value = DISPLACEMENT_BIAS;

      // Lighting — derive a directional light from axial tilt so shading matches planet orientation
      if (mat.uniforms.lightDirection && mat.uniforms.lightDirection.value) {
        const ld: THREE.Vector3 = mat.uniforms.lightDirection.value as THREE.Vector3;
        // Place light slightly above equatorial plane rotated by axial tilt
        ld.set(Math.cos(axialTiltRad), Math.sin(axialTiltRad) * 0.6, 0.8).normalize();
      }

  // Simple lighting intensities based on orbital distance (closer → brighter)
  const lightScale = THREE.MathUtils.clamp(1 / Math.max(0.05, _orbitalDist), 0.4, 6.0);
  // Also factor in atmospheric pressure and surface temperature so physics affects perceived lighting
  const pressureFactor = THREE.MathUtils.clamp(_pressure ?? 1, 0.2, 3.0);
  const tempFactor = surfaceTempK ? THREE.MathUtils.clamp((surfaceTempK - 200) / 200, 0.6, 2.0) : 1.0;
  // Boost ambient and diffuse to make the planet brighter by default
  mat.uniforms.ambientIntensity.value = 0.06 * lightScale * (1 / pressureFactor) * tempFactor;
  mat.uniforms.diffuseIntensity.value = THREE.MathUtils.clamp(1.6 * lightScale * (1 / pressureFactor) * tempFactor, 0.4, 6.0);
  mat.uniforms.specularIntensity.value = THREE.MathUtils.clamp(1.8 * tempFactor, 0.3, 4.0);

      // Update radius (unit sphere) — kept 1.0 but ensure it stays in sync
      mat.uniforms.radius.value = 1.0;

      // Colors: shift color palette by ocean fraction and surface temperature
      if (mat.uniforms.color2 && mat.uniforms.color2.value instanceof THREE.Color) {
        const c2: THREE.Color = mat.uniforms.color2.value as THREE.Color;
        // target more saturated/warmer tones for higher temperatures, bluer for more ocean
        const oceanTint = new THREE.Color(0.05, 0.4 + oceanFraction * 0.4, 0.25 + oceanFraction * 0.2);
        const tempTint = surfaceTempK ? new THREE.Color(THREE.MathUtils.clamp((surfaceTempK - 250) / 700, 0.0, 1.0), 0.35, 0.25) : oceanTint;
        c2.lerp(oceanTint, 0.12);
        c2.lerp(tempTint, 0.06);
      }

      // Ensure shader consumes updated uniform values immediately
      // (no need to set mat.needsUpdate for uniform value changes)
    }, [
        tectonic,
        terrainRoughness,
        DISPLACEMENT_SCALE,
        DISPLACEMENT_BIAS,
        axialTiltRad,
        _orbitalDist,
        oceanFraction,
        _pressure,
        surfaceTempK,
        shaderMaterial,
      ]);
    /* eslint-enable react-hooks/immutability */

    const handlePointerDown = useCallback(
      (event: ThreeEvent<PointerEvent>) => {
  if (!onPlanetClick) return;
  event.stopPropagation();

  const mesh = planetRef.current;
  if (!mesh) return;
        
        // Derive spherical UV coordinates from the actual intersection point (world-space).
        // Using the intersection point and converting to local normalized direction is robust
        // against displacement and avoids UV atlas inconsistencies.
  
        const worldPoint = event.point.clone();
        const localPoint = worldPoint.clone();
        mesh.updateMatrixWorld();
        mesh.worldToLocal(localPoint);
        // Direction from center to the intersection point on the unit sphere
        const dir = localPoint.clone().normalize();
        const phi = Math.acos(THREE.MathUtils.clamp(dir.y, -1, 1));
        let theta = Math.atan2(dir.z, dir.x);
        if (theta < 0) theta += Math.PI * 2;
  const v = THREE.MathUtils.clamp(phi / Math.PI, 0, 1);
  const u = THREE.MathUtils.clamp(theta / (Math.PI * 2), 0, 1);

  const { seaLevel: cpuSeaLevel } = sampleMetaRef.current;

        // Try to read an authoritative normalized height from the GPU heightpass render target.
        // Fall back to the geometric displacement recovery if the GPU pass isn't available.
        let effectiveHeight = 0.5; // default to mid (sea) if we fail to recover
        let gpuReadSucceeded = false;
        try {
          const rt = heightTargetRef.current;
          const hScene = heightSceneRef.current;
          const ortho = heightOrthoCamRef.current;
          const renderer = gl as unknown as THREE.WebGLRenderer;
          if (rt && hScene && ortho && renderer) {
            // Render the height pass into the float render target
            const prevRT = renderer.getRenderTarget();
            renderer.setRenderTarget(rt);
            renderer.render(hScene, ortho);
            // Read pixel at UV -> texture coords. Flip v for render target origin.
            const px = Math.min(TEXTURE_SIZE - 1, Math.max(0, Math.floor(u * TEXTURE_SIZE)));
            const py = Math.min(TEXTURE_SIZE - 1, Math.max(0, Math.floor((1 - v) * TEXTURE_SIZE)));
            const buf = new Float32Array(4);
            try {
              renderer.readRenderTargetPixels(rt, px, py, 1, 1, buf);
              renderer.setRenderTarget(prevRT);
              if (Number.isFinite(buf[0])) {
                effectiveHeight = THREE.MathUtils.clamp(buf[0], 0, 1);
                gpuReadSucceeded = true;
              }
            } catch (_err) {
              // reading failed; restore render target and fall back
              renderer.setRenderTarget(prevRT);
            }
          }
        } catch (_e) {
          // GPU read not available; fall back to geometric method below
        }

        // If GPU read didn't succeed, attempt geometric recovery from displaced mesh
        if (!gpuReadSucceeded) {
          try {
            const mat = shaderMaterialRef.current;
            if (mat && mat.uniforms && typeof mat.uniforms.displacementScale !== "undefined" && typeof mat.uniforms.displacementBias !== "undefined") {
              const ds = Number((mat.uniforms.displacementScale.value as number) ?? 0);
              const db = Number((mat.uniforms.displacementBias.value as number) ?? 0);
              const radiusUniform = Number((mat.uniforms.radius && mat.uniforms.radius.value) ?? 1.0);
              const localRadius = localPoint.length();
              const h_s = localRadius - radiusUniform; // measured displaced offset
              if (Math.abs(ds) > 1e-12) {
                const recovered = (h_s - db) / ds;
                if (Number.isFinite(recovered)) effectiveHeight = THREE.MathUtils.clamp(recovered, 0, 1);
              } else {
                // displacementScale is effectively zero; attempt a bias-only recovery
                const recovered = h_s - db;
                if (Number.isFinite(recovered)) effectiveHeight = THREE.MathUtils.clamp(recovered, 0, 1);
              }
            }
          } catch (_e) {
            // If anything goes wrong, keep effectiveHeight at default (sea-level)
          }
        }
        let elevationKm: number;
        let relativeToSeaLevel: number;

        // Prefer the shader's sea level (if provided) so classification matches GPU rendering.
        // Fall back to the CPU-computed sea level when shader uniform isn't available.
        let shaderSeaLevel = cpuSeaLevel ?? 0.5;
        try {
          const mat = shaderMaterialRef.current;
          if (mat && mat.uniforms && typeof mat.uniforms.seaLevel !== "undefined") {
            const v = mat.uniforms.seaLevel.value;
            if (typeof v === "number") shaderSeaLevel = v;
            else if (v && typeof v.value === "number") shaderSeaLevel = v.value as number;
          }
        } catch (_e) {
          // ignore and use CPU sea level
        }

        const delta = effectiveHeight - shaderSeaLevel;
        const adjustedDelta = Math.abs(delta) < 1e-4 ? 0 : delta;
        const isOcean = adjustedDelta < 0;

        if (isOcean) {
          // Ocean: calculate depth below sea level
          const depthNormalized = shaderSeaLevel > 0 ? Math.max(0, -adjustedDelta / shaderSeaLevel) : 0;
          relativeToSeaLevel = -depthNormalized;
          elevationKm = -depthNormalized * MAX_OCEAN_DEPTH_KM * planetSize;
        } else {
          // Land: calculate elevation above sea level
          const landDen = Math.max(1e-4, 1 - shaderSeaLevel);
          const elevNormalized = Math.max(0, adjustedDelta / landDen);
          relativeToSeaLevel = elevNormalized;
          elevationKm = elevNormalized * MAX_LAND_ELEVATION_KM * planetSize;
        }

        if (Math.abs(relativeToSeaLevel) < 1e-3) relativeToSeaLevel = 0;
        
  const elevationNormalized = effectiveHeight;

        const worldPosition = event.point.clone();
        const localPosition = worldPosition.clone();
        mesh.updateMatrixWorld();
        mesh.worldToLocal(localPosition);

        onPlanetClick({
          latitude: 90 - v * 180,
          longitude: u * 360 - 180,
          elevationKm,
          elevationMeters: elevationKm * 1000,
          elevationNormalized,
          relativeToSeaLevel,
          isOcean,
          uv: [u, v],
          worldPosition: [worldPosition.x, worldPosition.y, worldPosition.z],
          localPosition: [localPosition.x, localPosition.y, localPosition.z],
        });
      },
      [onPlanetClick, planetSize, MAX_LAND_ELEVATION_KM, MAX_OCEAN_DEPTH_KM, gl]
    );
  
    return (
      <group ref={tiltGroupRef}>
        <mesh
          ref={planetRef}
          geometry={sphereGeom}
          scale={[visualScale, visualScale, visualScale]}
          onPointerDown={handlePointerDown}
        >
          {/* Always use the shader material for rendering */}
          <primitive object={shaderMaterial} />
          {/* Marker at clicked position */}
          {markerPosition && (
            <group position={markerPosition}>
              {/* Outer ring for contrast */}
              <mesh>
                <sphereGeometry args={[0.025, 16, 16]} />
                <meshBasicMaterial 
                  color="#000000"
                  transparent={true}
                  opacity={0.8}
                  depthTest={false}
                />
              </mesh>
              {/* Inner marker */}
              <mesh>
                <sphereGeometry args={[0.018, 16, 16]} />
                <meshBasicMaterial 
                  color="#ff0000"
                  depthTest={false}
                />
              </mesh>
            </group>
          )}
        </mesh>
      </group>
    );
  }
