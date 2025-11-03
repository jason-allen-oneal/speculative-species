import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { createNoise2D } from "@/lib/utils";

const TEXTURE_SIZE = 2048; // Higher resolution for hyper-realism
const SPHERE_DETAIL = 256; // High detail geometry (needs enough vertices for displacement)
const MAX_LAND_ELEVATION_KM = 10; // Approximate extreme elevation for Earth-like worlds
const MAX_OCEAN_DEPTH_KM = 11; // Approximate extreme depth for Earth-like worlds
const VISUAL_DAY_SECONDS = 60; // Seconds it takes for a 24h planet to complete a turn in view

export default function Planet({
    gravity: _gravity,
    ocean,
    axialTilt,
    pressure: _pressure,
    orbitalDist: _orbitalDist,
    rotationPeriod,
    cloudCover: _cloudCover,
    tectonic,
    planetSize,
    onPlanetClick,
    isPaused,
    markerPosition,
}: PlanetProps) {
    const planetRef = useRef<THREE.Mesh | null>(null);
    const tiltGroupRef = useRef<THREE.Group | null>(null);
    const axisRef = useRef<THREE.Line | null>(null);
    const { camera } = useThree(); 
    const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null); 
    const [normalMap, setNormalMap] = useState<THREE.CanvasTexture | null>(null); 
    const [displacementMap, setDisplacementMap] = useState<THREE.CanvasTexture | null>(null); 
    const heightFieldRef = useRef<Float32Array | null>(null);
    const displacementFieldRef = useRef<Float32Array | null>(null);
    const sampleMetaRef = useRef({ seaLevel: 0, size: TEXTURE_SIZE });
  
    // === Constants for 3D Relief ===
    // Max displacement scale relative to the radius (1.0). Controls mountain height.
    const DISPLACEMENT_SCALE = 0.04 * planetSize; 
    // Terrain detail multiplier applied to the height map before displacement.
    const TERRAIN_CONTRAST = 1.0; 
    // Bias is half of the scale, used to center the displacement around the sphere's radius.
    const DISPLACEMENT_BIAS = -DISPLACEMENT_SCALE * 0.5;
  
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
  
    // === TEXTURE, NORMAL, & DISPLACEMENT MAP GENERATION ===
    useEffect(() => {
      const noise2D = createNoise2D(); 
      const size = TEXTURE_SIZE;
      
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
  
  
      // Bias ocean fraction downward so coastlines sit lower and avoid carving artifacts
      const seaLevel = THREE.MathUtils.clamp(oceanFraction - 0.25, 0.02, 0.85);
      const baseOctaves = Math.max(3, Math.min(8, Math.floor(3 + tectonic * 0.5)));
      const persistence = 0.5 + tectonic * 0.015;
      const lacunarity = 1.8 + tectonic * 0.02;
  
      // First Pass: Generate height map (and store heights)
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
  
          // Generate seamless noise
          let elev = 0;
          let amp = 1, freq = 1;
          for (let o = 0; o < baseOctaves; o++) {
            elev += noise2D(nx * freq * 2, ny * freq * 2) * amp;
            elev += noise2D(nz * freq * 2, ny * freq * 2) * amp * 0.5;
            amp *= persistence;
            freq *= lacunarity;
          }
          elev = THREE.MathUtils.clamp((elev + 1) / 2, 0, 1);

          // smooth height distribution and store
          const e = Math.pow(elev, 1.25);
          const heightIndex = y * size + x;
          heightMap[heightIndex] = e;
  
          const diff = e - seaLevel;
          const blend = 1 / (1 + Math.exp(-diff / 0.018)); // Soft blending near shoreline
  
          // latitude tint for polar ice/tundra
          const latitude = 1 - Math.abs(y / size - 0.5) * 2;
          const polar = Math.max(0, 1 - latitude * 2.2);
  
          const color = new THREE.Color();
          if (e > seaLevel) {
            // LAND
            const h = (e - seaLevel) / (1 - seaLevel);
            const tropicGreen = new THREE.Color("#4b832a"); // Darker, richer green
            const desertSand = new THREE.Color("#d4c590");
            const highMountain = new THREE.Color("#999999");
            const snow = new THREE.Color("#f0f0f0");
  
            color.copy(tropicGreen);
            
            if (latitude < 0.8) color.lerpColors(tropicGreen, desertSand, Math.min((1 - latitude) * 0.8, 1));
            
            // Altitude based blending
            if (h > 0.3) color.lerpColors(color, highMountain, (h - 0.3) / 0.4);
            if (h > 0.6) color.lerpColors(color, snow, Math.min((h - 0.6) / 0.4 + polar * 0.5, 1));
  
          } else {
            // OCEAN
            const deepBlue = new THREE.Color("#0d2a5a"); // Deepest ocean
            const midBlue = new THREE.Color("#1a5aa1");
            const shallowCyan = new THREE.Color("#2884c9");
            
            const depth = Math.min(seaLevel - e, seaLevel);
            
            if (depth < 0.1) color.lerpColors(shallowCyan, midBlue, depth / 0.1);
            else color.lerpColors(midBlue, deepBlue, Math.min((depth - 0.1) / 0.5, 1));
          }
  
          // Apply shoreline blend
          const finalColor = new THREE.Color().lerpColors(new THREE.Color("#2a5aa5"), color, blend);
          
          // Final Color Map Assignment
          const i = (y * size + x) * 4;
          colorData[i] = Math.pow(finalColor.r, 1 / 2.2) * 255;
          colorData[i + 1] = Math.pow(finalColor.g, 1 / 2.2) * 255;
          colorData[i + 2] = Math.pow(finalColor.b, 1 / 2.2) * 255;
          colorData[i + 3] = 255;
          
          // --- Displacement Map Assignment (Refined Logic) ---
          const displacementBase = 0.5;
          let displacementValue = displacementBase; 
  
          if (e > seaLevel) {
              // Land: Push outwards from the 0.5 base
              const h_land = (e - seaLevel) / (1 - seaLevel); // 0 to 1 for land
              // Max height is +50% of the possible range above base (0.5 to 1.0)
              displacementValue = displacementBase + h_land * 0.5 * TERRAIN_CONTRAST; 
          } else {
              // Ocean: Sink slightly inwards
              const d_ocean = (seaLevel - e) / seaLevel; // 0 to 1 for ocean depth
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
          displacementField[heightIndex] = displacementValue;
          // --------------------------------------------------
        }
      }
  
      // Second Pass: Generate Normal Map from height map
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
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Texture generation requires synchronizing external Three.js state
      setTexture(colorTex);
  
      nCtx.putImageData(normalImg, 0, 0);
      const normalTex = new THREE.CanvasTexture(normalCanvas);
      normalTex.wrapS = normalTex.wrapT = THREE.RepeatWrapping;
      normalTex.needsUpdate = true;
      setNormalMap(normalTex);
      
      // Update Displacement Texture
      dCtx.putImageData(dispImg, 0, 0);
      const dispTex = new THREE.CanvasTexture(dispCanvas);
      dispTex.wrapS = dispTex.wrapT = THREE.RepeatWrapping;
      dispTex.needsUpdate = true;
      setDisplacementMap(dispTex);
      heightFieldRef.current = heightMap;
      displacementFieldRef.current = displacementField;
      sampleMetaRef.current = { seaLevel, size };

    }, [oceanFraction, tectonic, DISPLACEMENT_SCALE]); 
  
  
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
      
      // @ts-expect-error - Line type doesn't match Group.add expected type
      axisRef.current = new THREE.Line(geometry, material);
      // @ts-expect-error - tiltGroupRef.current is a Group but typed as Group | null
      tiltGroupRef.current.add(axisRef.current);
    }, []);
  
    // === Rotation & tilt ===
    useFrame((_, delta) => {
      if (!planetRef.current || !tiltGroupRef.current) return;
      // @ts-expect-error - tiltGroupRef.current is a Group but typed as Group | null
      tiltGroupRef.current.rotation.z = axialTiltRad;
      // Only rotate if not paused
      if (!isPaused) {
        // @ts-expect-error - planetRef.current is a Mesh but typed as Mesh | null
        planetRef.current.rotation.y += rotationSpeed * delta;
      }
    });
  
    // === Camera adjustment ===
    const visualScale = planetSize;
    useEffect(() => {
      camera.position.set(camera.position.x, camera.position.y, 3 * planetSize);
    }, [planetSize, camera]);
  
    // Ensure high detail sphere geometry is used for displacement
    const sphereGeom = useMemo(() => new THREE.SphereGeometry(1, SPHERE_DETAIL, SPHERE_DETAIL), []); 

    const handlePointerDown = useCallback(
      (event: ThreeEvent<PointerEvent>) => {
        if (!onPlanetClick) return;
        const field = heightFieldRef.current;
        const { seaLevel, size } = sampleMetaRef.current;
        if (!field) return;
        event.stopPropagation();

        const mesh = planetRef.current;
        if (!mesh) return;
        
        // Use UV coordinates from the intersection if available (more accurate for displaced geometry)
        let u: number, v: number;
        if (event.uv) {
          // UV coordinates are directly available from raycaster
          u = event.uv.x;
          v = event.uv.y;
        } else {
          // Fallback: calculate from the face normal instead of the intersection point
          // This avoids issues with displacement mapping causing incorrect projections
          const face = event.face;
          if (!face) return;
          
          // Transform the face normal from world space to local space using the normal matrix
          const worldNormal = face.normal.clone().normalize();
          const normalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
          const localNormal = worldNormal.applyMatrix3(normalMatrix).normalize();
          
          const phi = Math.acos(THREE.MathUtils.clamp(localNormal.y, -1, 1));
          let theta = Math.atan2(localNormal.z, localNormal.x);
          if (theta < 0) theta += Math.PI * 2;
          v = THREE.MathUtils.clamp(phi / Math.PI, 0, 1);
          u = THREE.MathUtils.clamp(theta / (Math.PI * 2), 0, 1);
        }

        const maxIndex = size - 1;
        const xFloat = u * maxIndex;
        const yFloat = v * maxIndex;
        const x0 = Math.floor(xFloat) % size;
        const y0 = Math.floor(yFloat);
        const x1 = (x0 + 1) % size;
        const y1 = Math.min(maxIndex, y0 + 1);
        const tx = xFloat - x0;
        const ty = yFloat - y0;

        const sampleField = (buffer: Float32Array) => {
          const idx00 = y0 * size + x0;
          const idx10 = y0 * size + x1;
          const idx01 = y1 * size + x0;
          const idx11 = y1 * size + x1;
          const top = THREE.MathUtils.lerp(buffer[idx00], buffer[idx10], tx);
          const bottom = THREE.MathUtils.lerp(buffer[idx01], buffer[idx11], tx);
          return THREE.MathUtils.lerp(top, bottom, ty);
        };

        // Use the actual height field to determine ocean vs land
        const heightValue = sampleField(field);
        if (!Number.isFinite(heightValue)) return;

        // Determine if this is ocean or land based on the height relative to sea level
        const isOcean = heightValue <= seaLevel;
        
        let elevationKm: number;
        let relativeToSeaLevel: number;
        
        if (isOcean) {
          // Ocean: calculate depth below sea level
          const depthNormalized = (seaLevel - heightValue) / seaLevel;
          relativeToSeaLevel = -depthNormalized;
          elevationKm = -depthNormalized * MAX_OCEAN_DEPTH_KM * planetSize;
        } else {
          // Land: calculate elevation above sea level
          const elevNormalized = (heightValue - seaLevel) / (1 - seaLevel);
          relativeToSeaLevel = elevNormalized;
          elevationKm = elevNormalized * MAX_LAND_ELEVATION_KM * planetSize;
        }

        if (Math.abs(relativeToSeaLevel) < 1e-3) relativeToSeaLevel = 0;
        
        const elevationNormalized = heightValue;

        const world = event.point.clone();

        onPlanetClick({
          latitude: 90 - v * 180,
          longitude: u * 360 - 180,
          elevationKm,
          elevationMeters: elevationKm * 1000,
          elevationNormalized,
          relativeToSeaLevel,
          isOcean,
          uv: [u, v],
          worldPosition: [world.x, world.y, world.z],
        });
      },
      [onPlanetClick, planetSize]
    );
  
    return (
      <group ref={tiltGroupRef}>
        <mesh
          ref={planetRef}
          geometry={sphereGeom}
          scale={[visualScale, visualScale, visualScale]}
          onPointerDown={handlePointerDown}
        >
          {texture && normalMap && displacementMap && (
            <meshStandardMaterial
              map={texture}
              normalMap={normalMap} 
              displacementMap={displacementMap} 
              displacementScale={DISPLACEMENT_SCALE} 
              displacementBias={DISPLACEMENT_BIAS} // NEW: Correctly centers the displacement
              roughness={0.8}
              metalness={0.1}
              normalScale={new THREE.Vector2(1.2, 1.2)} 
              envMapIntensity={0.5} 
            />
          )}
        </mesh>
        {/* Marker at clicked position */}
        {markerPosition && (
          <group position={markerPosition}>
            {/* Outer ring for contrast */}
            <mesh>
              <sphereGeometry args={[0.025 * planetSize, 16, 16]} />
              <meshBasicMaterial 
                color="#000000"
                transparent={true}
                opacity={0.8}
                depthTest={false}
              />
            </mesh>
            {/* Inner marker */}
            <mesh>
              <sphereGeometry args={[0.018 * planetSize, 16, 16]} />
              <meshBasicMaterial 
                color="#ff0000"
                depthTest={false}
              />
            </mesh>
          </group>
        )}
      </group>
    );
  }
