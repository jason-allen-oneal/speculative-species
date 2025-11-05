import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { domainWarpedNoise } from "@/lib/utils";

const CLOUD_TEXTURE_SIZE = 512;

interface CloudLayerProps {
  cloudCover: number;
  planetSize: number;
  rotationSpeed: number;
  isPaused?: boolean;
}

export default function CloudLayer({
  cloudCover,
  planetSize,
  rotationSpeed,
  isPaused = false,
}: CloudLayerProps) {
  const cloudRef = useRef<THREE.Mesh | null>(null);
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);

  const cloudGeometry = useMemo(
    () => new THREE.SphereGeometry(1.01, 128, 128),
    []
  );

  useEffect(() => {
    const size = CLOUD_TEXTURE_SIZE;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const image = ctx.createImageData(size, size);
    const data = image.data;

    const coverage = THREE.MathUtils.clamp(cloudCover, 0, 1);
    const threshold = THREE.MathUtils.lerp(0.8, 0.2, coverage);
    const softness = THREE.MathUtils.lerp(0.25, 0.05, coverage);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = x / size;
        const v = y / size;
        const theta = u * Math.PI * 2;
        const phi = v * Math.PI;

        const nx = Math.sin(phi) * Math.cos(theta);
        const ny = Math.cos(phi);
        const nz = Math.sin(phi) * Math.sin(theta);

        const baseNoise = (domainWarpedNoise(nx, ny, nz, 0.45, 3) + 1) * 0.5;
        const detailNoise = (domainWarpedNoise(nx * 2.1, ny * 2.1, nz * 2.1, 0.35, 2) + 1) * 0.5;
        const noise = THREE.MathUtils.clamp(0.6 * baseNoise + 0.4 * detailNoise, 0, 1);

        const alpha = THREE.MathUtils.smoothstep(noise, threshold - softness, threshold + softness);
        const brightness = 0.82 + noise * 0.18;

        const idx = (y * size + x) * 4;
        data[idx] = brightness * 255;
        data[idx + 1] = brightness * 255;
        data[idx + 2] = brightness * 255;
        data[idx + 3] = THREE.MathUtils.clamp(alpha * 255, 0, 255);
      }
    }

    ctx.putImageData(image, 0, 0);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.needsUpdate = true;
    startTransition(() => {
      setTexture(tex);
    });
  }, [cloudCover]);

  useFrame((_, delta) => {
    if (!cloudRef.current || isPaused) return;
    // Clouds shear a little faster than the surface
    cloudRef.current.rotation.y += rotationSpeed * delta * 0.45;
  });

  useEffect(() => {
    if (!cloudRef.current) return;
    cloudRef.current.raycast = () => null;
    cloudRef.current.renderOrder = 2;
  }, [texture]);

  if (!texture) return null;

  return (
    <mesh ref={cloudRef} geometry={cloudGeometry} scale={[planetSize * 1.01, planetSize * 1.01, planetSize * 1.01]}>
      <meshStandardMaterial
        map={texture}
        alphaMap={texture}
        transparent
        opacity={1}
        roughness={0.4}
        metalness={0}
        depthWrite={false}
        blending={THREE.CustomBlending}
        blendEquation={THREE.AddEquation}
        blendSrc={THREE.SrcAlphaFactor}
        blendDst={THREE.OneMinusSrcAlphaFactor}
        side={THREE.FrontSide}
      />
    </mesh>
  );
}
