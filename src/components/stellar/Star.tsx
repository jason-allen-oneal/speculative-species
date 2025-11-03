import { useRef, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

export default function Star({ orbitalDistance }: { orbitalDistance: number }) {
    const starRef = useRef(null);
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
      if (starRef.current) {
          // @ts-ignore
          starRef.current.quaternion.copy(camera.quaternion);
      }
    });
  
    return (
      <group position={[4 * distanceFactor, 3 * distanceFactor, -5 * distanceFactor]}>
        {/* Primary white light source */}
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