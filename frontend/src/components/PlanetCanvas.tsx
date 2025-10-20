"use client";
import { Canvas, useFrame, useThree, useLoader } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useRef, useMemo, useEffect, useState } from "react";
import { createNoise2D } from "simplex-noise";
import { TextureLoader } from "three";

interface Props {
  planetData: any;
}

/* === STAR === */
function Star({ orbitalDistance }: { orbitalDistance: number }) {
  const starRef = useRef<THREE.Mesh>(null);
  const distanceFactor = Math.max(0.3, Math.min(orbitalDistance, 3));
  const glowTexture = useLoader(
    TextureLoader,
    "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/lensflare/lensflare0.png"
  );
  const intensity = 2.5 / Math.pow(distanceFactor * orbitalDistance, 1.5);
  const scale = 2.5 / distanceFactor;

  useFrame(({ camera }) => {
    if (starRef.current) starRef.current.quaternion.copy(camera.quaternion);
  });

  return (
    <group position={[3.5 * orbitalDistance, 2.5 * orbitalDistance, -4 * orbitalDistance]}>
      <pointLight intensity={intensity * 2.5} distance={15} color={"#fff5c0"} />
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

/* === PLANET === */
function RotatingPlanet({ planetData }: Props) {
  const planetRef = useRef<THREE.Mesh>(null);
  const tiltGroupRef = useRef<THREE.Group>(null);
  const axisRef = useRef<THREE.Line>(null);
  const { camera } = useThree();
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [rotationSpeed, setRotationSpeed] = useState(0.0015);

  // === Parameters ===
  const temp = planetData?.generated?.climate?.mean_surface_temp_k || 288;
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
    const ctx = canvas.getContext("2d")!;
    const img = ctx.createImageData(size, size);
    const data = img.data;

    const seaLevel = oceanFraction;
    const baseOctaves = 5;
    const persistence = 0.55;
    const lacunarity = 1.9;
    const blendEdge = 32;

    // Generate map
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const nx = (x / size) * 2 - 1;
        const ny = (y / size) * 2 - 1;

        // seamless mirrored noise
        let elevA = 0, elevB = 0;
        let amp = 1, freq = 1;
        for (let o = 0; o < baseOctaves; o++) {
          elevA += noise2D(nx * freq * 2, ny * freq * 2) * amp;
          elevB += noise2D((nx - 2) * freq * 2, ny * freq * 2) * amp;
          amp *= persistence;
          freq *= lacunarity;
        }

        elevA = (elevA + 1) / 2;
        elevB = (elevB + 1) / 2;

        // crossfade horizontally
        let t = 1;
        if (x < blendEdge) t = x / blendEdge;
        else if (x > size - blendEdge) t = (size - x) / blendEdge;
        const elev = THREE.MathUtils.lerp(elevB, elevA, t);

        // smooth height distribution
        const e = Math.pow(elev, 1.25);
        const diff = e - seaLevel;
        const blend = 1 / (1 + Math.exp(-diff / 0.018));

        // latitude tint
        const latitude = 1 - Math.abs(y / size - 0.5) * 2;
        const polar = Math.max(0, 1 - latitude * 1.8);

        let color = new THREE.Color();
        if (e > seaLevel) {
          const h = (e - seaLevel) / (1 - seaLevel);
          const tropic = new THREE.Color("#4f8b3a");
          const arid = new THREE.Color("#c2b27f");
          const high = new THREE.Color("#a89a8a");
          const snow = new THREE.Color("#ffffff");

          if (latitude > 0.6) color.lerpColors(tropic, arid, (latitude - 0.6) / 0.4);
          else color.copy(tropic);

          if (h > 0.4 && h < 0.7)
            color.lerpColors(color, high, (h - 0.4) / 0.3);
          else if (h >= 0.7)
            color.lerpColors(high, snow, Math.min((h - 0.7) / 0.3 + polar * 0.5, 1));
        } else {
          const deep = new THREE.Color("#0b234a");
          const mid = new THREE.Color("#124b91");
          const shallow = new THREE.Color("#1d74b9");
          const depth = Math.min(seaLevel - e, seaLevel);
          if (depth < 0.15)
            color.lerpColors(shallow, mid, depth / 0.15);
          else color.lerpColors(mid, deep, Math.min((depth - 0.15) / 0.5, 1));
        }

        // fix black land: clamp, gamma correct, brighten slightly
        const blended = new THREE.Color().lerpColors(new THREE.Color("#1a3c8a"), color, blend);
        blended.offsetHSL(0, 0.05, 0.05);
        blended.r = Math.max(0.02, Math.min(1.0, blended.r));
        blended.g = Math.max(0.02, Math.min(1.0, blended.g));
        blended.b = Math.max(0.02, Math.min(1.0, blended.b));

        const i = (y * size + x) * 4;
        data[i] = Math.pow(blended.r, 1 / 2.2) * 255;
        data[i + 1] = Math.pow(blended.g, 1 / 2.2) * 255;
        data[i + 2] = Math.pow(blended.b, 1 / 2.2) * 255;
        data[i + 3] = 255;
      }
    }

    // duplicate first column to last BEFORE draw
    for (let y = 0; y < size; y++) {
      const i0 = (y * size + 0) * 4;
      const i1 = (y * size + (size - 1)) * 4;
      for (let k = 0; k < 4; k++) data[i1 + k] = data[i0 + k];
    }

    ctx.putImageData(img, 0, 0);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.x = 1.0001;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.needsUpdate = true;
    setTexture(tex);
  }, [oceanFraction, tectonicLevel]);

  /* === AXIS LINE === */
  useEffect(() => {
    if (axisRef.current) return;
    const pts = [new THREE.Vector3(0, -1.6, 0), new THREE.Vector3(0, 1.6, 0)];
    const geometry = new THREE.BufferGeometry().setFromPoints(pts);
    const material = new THREE.ShaderMaterial({
      transparent: true,
      uniforms: { uColor: { value: new THREE.Color(0xffffff) } },
      vertexShader: `
        varying float vY;
        void main(){vY=position.y;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vY;
        void main(){
          float alpha=1.0-abs(vY)/1.6;
          gl_FragColor=vec4(uColor,alpha*0.5);
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
  const visualScale = 0.8 + Math.pow(planetScale, 0.5) * 0.5;
  useEffect(() => {
    camera.position.z = 3 + (planetScale - 1) * 0.5;
  }, [planetScale, camera]);

  const sphereGeom = useMemo(() => new THREE.SphereGeometry(1, 128, 128), []);

  return (
    <group ref={tiltGroupRef}>
      <mesh ref={planetRef} geometry={sphereGeom} scale={[visualScale, visualScale, visualScale]}>
        {texture && (
          <meshStandardMaterial
            map={texture}
            roughness={0.85}
            metalness={0.05}
            normalScale={new THREE.Vector2(0.5, 0.5)}
          />
        )}
      </mesh>
    </group>
  );
}

/* === MAIN CANVAS === */
export default function PlanetCanvas({ planetData }: Props) {
  return (
    <div className="w-full h-full bg-black flex items-center justify-center">
      <Canvas camera={{ position: [0, 0, 3] }}>
        <Star
          orbitalDistance={
            planetData?.generated?.parameters?.stellar?.orbital_distance_au ??
            planetData?.parameters?.stellar?.orbital_distance_au ??
            1
          }
        />
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1.2} />
        <RotatingPlanet planetData={planetData} />
        <OrbitControls enableZoom />
      </Canvas>
    </div>
  );
}
