import { useRef, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

export default function Star({ orbitalDistance }: { orbitalDistance: number }) {
    const starCoreRef = useRef(null);
    const coronaRef = useRef(null);
    const glowRef = useRef(null);
    const distanceFactor = Math.max(0.5, Math.min(orbitalDistance, 5));
    
    // Create core texture with more vibrant center
    const coreTexture = useMemo(() => {
      const size = 512;
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error('Could not get 2D context');
      
      const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
      gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
      gradient.addColorStop(0.1, "rgba(255, 245, 200, 1)");
      gradient.addColorStop(0.25, "rgba(255, 230, 150, 0.9)");
      gradient.addColorStop(0.5, "rgba(255, 200, 100, 0.6)");
      gradient.addColorStop(0.75, "rgba(255, 180, 80, 0.3)");
      gradient.addColorStop(1, "rgba(255, 160, 60, 0)");
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);
      
      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      return texture;
    }, []);

    // Create corona texture with soft outer glow
    const coronaTexture = useMemo(() => {
      const size = 512;
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error('Could not get 2D context');
      
      const gradient = ctx.createRadialGradient(size/2, size/2, size/8, size/2, size/2, size/2);
      gradient.addColorStop(0, "rgba(255, 220, 150, 0.4)");
      gradient.addColorStop(0.3, "rgba(255, 200, 120, 0.25)");
      gradient.addColorStop(0.6, "rgba(255, 180, 100, 0.1)");
      gradient.addColorStop(1, "rgba(255, 160, 80, 0)");
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);
      
      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      return texture;
    }, []);

    // Create outer glow texture
    const outerGlowTexture = useMemo(() => {
      const size = 512;
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error('Could not get 2D context');
      
      const gradient = ctx.createRadialGradient(size/2, size/2, size/4, size/2, size/2, size/2);
      gradient.addColorStop(0, "rgba(255, 235, 180, 0.15)");
      gradient.addColorStop(0.5, "rgba(255, 220, 150, 0.08)");
      gradient.addColorStop(1, "rgba(255, 200, 100, 0)");
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);
      
      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      return texture;
    }, []);
    
    // Intensity decreases with square of distance
    const intensity = 3.0 / Math.pow(distanceFactor, 2);
    // Scale decreases with distance to simulate apparent size
    const baseScale = 3.0 / distanceFactor;
  
    useFrame(({ camera, clock }) => {
      // Billboard effect - always face camera
      if (starCoreRef.current) {
          // @ts-expect-error - starCoreRef.current is a Mesh but typed as null
          starCoreRef.current.quaternion.copy(camera.quaternion);
      }
      if (coronaRef.current) {
          // @ts-expect-error - coronaRef.current is a Mesh but typed as null
          coronaRef.current.quaternion.copy(camera.quaternion);
      }
      if (glowRef.current) {
          // @ts-expect-error - glowRef.current is a Mesh but typed as null
          glowRef.current.quaternion.copy(camera.quaternion);
      }
      
      // Subtle pulsing effect
      const pulse = 1 + Math.sin(clock.getElapsedTime() * 0.5) * 0.08;
      if (starCoreRef.current) {
          // @ts-expect-error - starCoreRef.current is a Mesh but typed as null
          starCoreRef.current.scale.set(baseScale * pulse, baseScale * pulse, 1);
      }
      if (coronaRef.current) {
          // @ts-expect-error - coronaRef.current is a Mesh but typed as null
          coronaRef.current.scale.set(baseScale * 1.8 * pulse, baseScale * 1.8 * pulse, 1);
      }
    });
  
    return (
      <group position={[4 * distanceFactor, 3 * distanceFactor, -5 * distanceFactor]}>
        {/* Enhanced lighting */}
        <pointLight intensity={intensity * 3.5} distance={25} color={"#fff5c0"} /> 
        <pointLight intensity={intensity * 1.5} distance={15} color={"#ffd080"} />
        
        {/* Outer glow layer */}
        <mesh ref={glowRef} scale={[baseScale * 3.5, baseScale * 3.5, 1]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            map={outerGlowTexture}
            color={"#ffe5b0"}
            transparent
            opacity={0.6}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
        
        {/* Corona layer */}
        <mesh ref={coronaRef} scale={[baseScale * 1.8, baseScale * 1.8, 1]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            map={coronaTexture}
            color={"#ffdc90"}
            transparent
            opacity={0.85}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
        
        {/* Core star */}
        <mesh ref={starCoreRef} scale={[baseScale, baseScale, 1]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            map={coreTexture}
            color={"#fff8e0"}
            transparent
            opacity={1}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      </group>
    );
  }