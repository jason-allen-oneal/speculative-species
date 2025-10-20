"use client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useRef, useMemo, useEffect, useState } from "react";
import { createNoise2D } from "simplex-noise";

interface PlanetData {
  generated?: {
    climate?: {
      mean_surface_temp_k?: number;
      cloud_cover_fraction?: number;
    };
    hydrology?: {
      ocean_fraction?: number;
    };
    parameters?: {
      stellar?: {
        rotation_period_hours?: number;
        axial_tilt_deg?: number;
        orbital_distance_au?: number;
      };
    };
  };
  parameters?: {
    hydrology?: {
      ocean_fraction?: number;
    };
    stellar?: {
      rotation_period_hours?: number;
      axial_tilt_deg?: number;
      orbital_distance_au?: number;
    };
    physical?: {
      radius_scale?: number;
    };
    geology?: {
      tectonic_activity_level?: number;
    };
    atmosphere?: {
      cloud_cover_fraction?: number;
    };
  };
}

interface Props {
  planetData: PlanetData | null;
}

/* === STAR === */
function Star({ orbitalDistance }: { orbitalDistance: number }) {
  const starRef = useRef<THREE.Mesh>(null);
  const distanceFactor = Math.max(0.5, Math.min(orbitalDistance, 5));
  
  // Create glow texture procedurally
  const glowTexture = useMemo(() => {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error('Could not get 2D context');
    
    const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
    gradient.addColorStop(0.2, "rgba(255, 250, 220, 0.8)");
    gradient.addColorStop(0.4, "rgba(255, 245, 180, 0.4)");
    gradient.addColorStop(0.7, "rgba(255, 240, 140, 0.1)");
    gradient.addColorStop(1, "rgba(255, 235, 100, 0)");
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);
  
  // Intensity decreases with square of distance
  const intensity = 3.0 / Math.pow(distanceFactor, 2);
  // Scale decreases with distance to simulate apparent size
  const scale = 3.0 / distanceFactor;

  useFrame(({ camera }) => {
    if (starRef.current) starRef.current.quaternion.copy(camera.quaternion);
  });

  return (
    <group position={[4 * distanceFactor, 3 * distanceFactor, -5 * distanceFactor]}>
      <pointLight intensity={intensity * 3} distance={20} color={"#fff5c0"} />
      <mesh ref={starRef} scale={[scale, scale, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={glowTexture}
          color={"#fff9d1"}
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/* === ATMOSPHERE GLOW === */
function AtmosphereGlow({ scale }: { scale: number }) {
  const atmosphereRef = useRef<THREE.Mesh>(null);
  
  useFrame(({ camera }) => {
    if (atmosphereRef.current) {
      atmosphereRef.current.quaternion.copy(camera.quaternion);
    }
  });

  return (
    <mesh ref={atmosphereRef} scale={[scale * 1.15, scale * 1.15, scale * 1.15]}>
      <sphereGeometry args={[1, 64, 64]} />
      <shaderMaterial
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.BackSide}
        uniforms={{
          uColor: { value: new THREE.Color(0.5, 0.7, 1.0) }
        }}
        vertexShader={`
          varying vec3 vNormal;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform vec3 uColor;
          varying vec3 vNormal;
          void main() {
            float intensity = pow(0.6 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
            gl_FragColor = vec4(uColor, 1.0) * intensity;
          }
        `}
      />
    </mesh>
  );
}

/* === CLOUDS === */
function CloudLayer({ cloudCover, rotationSpeed, scale }: { cloudCover: number; rotationSpeed: number; scale: number }) {
  const cloudRef = useRef<THREE.Mesh>(null);
  const [cloudTexture, setCloudTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    const noise2D = createNoise2D();
    const size = 512;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error('Could not get 2D context');
    const img = ctx.createImageData(size, size);
    const data = img.data;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const nx = (x / size) * 2 - 1;
        const ny = (y / size) * 2 - 1;

        let cloud = 0;
        let amp = 1, freq = 1;
        for (let o = 0; o < 4; o++) {
          cloud += noise2D(nx * freq * 3, ny * freq * 3) * amp;
          amp *= 0.5;
          freq *= 2;
        }
        cloud = (cloud + 1) / 2;

        // Cloud density based on coverage parameter
        const density = Math.pow(cloud, 2.5 - cloudCover * 1.5);
        const alpha = Math.min(1, Math.max(0, density * cloudCover * 1.2));

        const i = (y * size + x) * 4;
        data[i] = 255;
        data[i + 1] = 255;
        data[i + 2] = 255;
        data[i + 3] = alpha * 180;
      }
    }

    ctx.putImageData(img, 0, 0);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    setCloudTexture(tex);
  }, [cloudCover]);

  useFrame((_, delta) => {
    if (cloudRef.current) {
      cloudRef.current.rotation.y += rotationSpeed * delta * 1.15;
    }
  });

  if (cloudCover < 0.05) return null;

  return (
    <mesh ref={cloudRef} scale={[scale * 1.01, scale * 1.01, scale * 1.01]}>
      <sphereGeometry args={[1, 64, 64]} />
      {cloudTexture && (
        <meshStandardMaterial
          map={cloudTexture}
          transparent
          opacity={0.6}
          depthWrite={false}
        />
      )}
    </mesh>
  );
}

/* === PLANET === */
function RotatingPlanet({ planetData }: Props) {
  const planetRef = useRef<THREE.Mesh>(null);
  const tiltGroupRef = useRef<THREE.Group>(null);
  const axisRef = useRef<THREE.Line>(null);
  const { camera } = useThree();
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [rotationSpeed, setRotationSpeed] = useState(0.0015);

  // === Parameters ===
  const rawOceanFraction =
    planetData?.generated?.hydrology?.ocean_fraction ??
    planetData?.parameters?.hydrology?.ocean_fraction ??
    0.68;
  const rotationPeriod =
    planetData?.generated?.parameters?.stellar?.rotation_period_hours ??
    planetData?.parameters?.stellar?.rotation_period_hours ??
    24;
  const axialTiltDeg =
    planetData?.generated?.parameters?.stellar?.axial_tilt_deg ??
    planetData?.parameters?.stellar?.axial_tilt_deg ??
    23.5;
  const planetScale =
    planetData?.parameters?.physical?.radius_scale ?? 1.0;
  const tectonicLevel =
    planetData?.parameters?.geology?.tectonic_activity_level ?? 3.0;
  const cloudCover =
    planetData?.generated?.climate?.cloud_cover_fraction ??
    planetData?.parameters?.atmosphere?.cloud_cover_fraction ?? 0.4;

  // === Rotation speed update ===
  useEffect(() => {
    const baseVisualDay = 10;
    const newSpeed = (2 * Math.PI / baseVisualDay) * (24 / rotationPeriod);
    setRotationSpeed(newSpeed);
  }, [rotationPeriod]);

  const axialTiltRad = THREE.MathUtils.degToRad(axialTiltDeg);

  // === Color palette baseline ===
  const { oceanFraction } = useMemo(() => {
    const frac = THREE.MathUtils.clamp(rawOceanFraction, 0.05, 0.95);
    return { oceanFraction: frac };
  }, [rawOceanFraction]);

  /* === TEXTURE GENERATION === */
  useEffect(() => {
    const noise2D = createNoise2D();
    const size = 1024;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error('Could not get 2D context');
    const img = ctx.createImageData(size, size);
    const data = img.data;

    const seaLevel = oceanFraction;
    // Tectonic activity affects terrain complexity
    const baseOctaves = Math.max(3, Math.min(8, Math.floor(3 + tectonicLevel * 0.5)));
    const persistence = 0.5 + tectonicLevel * 0.015;
    const lacunarity = 1.8 + tectonicLevel * 0.02;

    // Generate map with seamless wrapping
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        // Use spherical coordinates for seamless wrapping
        const u = x / size;
        const v = y / size;
        const theta = u * Math.PI * 2; // longitude
        const phi = v * Math.PI; // latitude
        
        // Convert to 3D coordinates on unit sphere
        const nx = Math.sin(phi) * Math.cos(theta);
        const ny = Math.cos(phi);
        const nz = Math.sin(phi) * Math.sin(theta);

        // Generate seamless noise using spherical coordinates
        let elev = 0;
        let amp = 1, freq = 1;
        for (let o = 0; o < baseOctaves; o++) {
          elev += noise2D(nx * freq * 2, ny * freq * 2) * amp;
          elev += noise2D(nz * freq * 2, ny * freq * 2) * amp * 0.5;
          amp *= persistence;
          freq *= lacunarity;
        }
        elev = (elev + 1) / 2;

        // smooth height distribution
        const e = Math.pow(elev, 1.25);
        const diff = e - seaLevel;
        const blend = 1 / (1 + Math.exp(-diff / 0.018));

        // latitude tint
        const latitude = 1 - Math.abs(y / size - 0.5) * 2;
        const polar = Math.max(0, 1 - latitude * 1.8);

        const color = new THREE.Color();
        if (e > seaLevel) {
          const h = (e - seaLevel) / (1 - seaLevel);
          const tropic = new THREE.Color("#5a9f45");
          const arid = new THREE.Color("#d4c590");
          const high = new THREE.Color("#b8aa9a");
          const snow = new THREE.Color("#ffffff");

          if (latitude > 0.6) color.lerpColors(tropic, arid, (latitude - 0.6) / 0.4);
          else color.copy(tropic);

          if (h > 0.4 && h < 0.7)
            color.lerpColors(color, high, (h - 0.4) / 0.3);
          else if (h >= 0.7)
            color.lerpColors(high, snow, Math.min((h - 0.7) / 0.3 + polar * 0.5, 1));
        } else {
          const deep = new THREE.Color("#0d2a5a");
          const mid = new THREE.Color("#1a5aa1");
          const shallow = new THREE.Color("#2884c9");
          const depth = Math.min(seaLevel - e, seaLevel);
          if (depth < 0.15)
            color.lerpColors(shallow, mid, depth / 0.15);
          else color.lerpColors(mid, deep, Math.min((depth - 0.15) / 0.5, 1));
        }

        // Enhanced color blending with better brightness
        const blended = new THREE.Color().lerpColors(new THREE.Color("#2a5aa5"), color, blend);
        blended.offsetHSL(0, 0.08, 0.12);
        blended.r = Math.max(0.05, Math.min(1.0, blended.r));
        blended.g = Math.max(0.05, Math.min(1.0, blended.g));
        blended.b = Math.max(0.05, Math.min(1.0, blended.b));

        const i = (y * size + x) * 4;
        data[i] = Math.pow(blended.r, 1 / 2.2) * 255;
        data[i + 1] = Math.pow(blended.g, 1 / 2.2) * 255;
        data[i + 2] = Math.pow(blended.b, 1 / 2.2) * 255;
        data[i + 3] = 255;
      }
    }

    ctx.putImageData(img, 0, 0);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.needsUpdate = true;
    setTexture(tex);
  }, [oceanFraction, tectonicLevel]);

  /* === AXIS LINE === */
  useEffect(() => {
    if (axisRef.current) return;
    
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
          // Fade starts at planet edge (1.0) and goes to 0 at full length
          float fade = smoothstep(uLength, 1.0, absY);
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
    tiltGroupRef.current?.add(axisRef.current);
  }, []);

  // === Rotation & tilt ===
  useFrame((_, delta) => {
    if (!planetRef.current || !tiltGroupRef.current) return;
    tiltGroupRef.current.rotation.z = axialTiltRad;
    planetRef.current.rotation.y += rotationSpeed * delta;
  });

  // === Camera adjustment ===
  const visualScale = planetScale;
  useEffect(() => {
    camera.position.z = 3 * planetScale;
  }, [planetScale, camera]);

  const sphereGeom = useMemo(() => new THREE.SphereGeometry(1, 128, 128), []);

  return (
    <group ref={tiltGroupRef}>
      <mesh ref={planetRef} geometry={sphereGeom} scale={[visualScale, visualScale, visualScale]}>
        {texture && (
          <meshStandardMaterial
            map={texture}
            roughness={0.7}
            metalness={0.1}
            normalScale={new THREE.Vector2(0.8, 0.8)}
            envMapIntensity={0.5}
          />
        )}
      </mesh>
      <AtmosphereGlow scale={visualScale} />
      <CloudLayer cloudCover={cloudCover} rotationSpeed={rotationSpeed} scale={visualScale} />
    </group>
  );
}

/* === MAIN CANVAS === */
export default function PlanetCanvas({ planetData }: Props) {
  const orbitalDistance = planetData?.generated?.parameters?.stellar?.orbital_distance_au ??
    planetData?.parameters?.stellar?.orbital_distance_au ?? 1;
  
  return (
    <div className="w-full h-full bg-black flex items-center justify-center">
      <Canvas camera={{ position: [0, 0, 3] }} gl={{ antialias: true, alpha: false }}>
        <Star orbitalDistance={orbitalDistance} />
        {/* Improved lighting setup for realism */}
        <ambientLight intensity={0.15} />
        <hemisphereLight 
          args={["#ffffff", "#080820", 0.3]} 
        />
        <directionalLight 
          position={[4 * Math.max(0.5, orbitalDistance), 3 * Math.max(0.5, orbitalDistance), -5 * Math.max(0.5, orbitalDistance)]} 
          intensity={1.5} 
          color="#fff5c0"
          castShadow
        />
        <RotatingPlanet planetData={planetData} />
        <OrbitControls enableZoom enablePan={false} />
      </Canvas>
    </div>
  );
}
