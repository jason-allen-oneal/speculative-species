import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import noiseGLSL from "@/shaders/noise.glsl";

type AtmosphereParams = {
  particles?: number;
  minParticleSize?: number;
  maxParticleSize?: number;
  radius?: number;
  thickness?: number;
  density?: number;
  opacity?: number;
  scale?: number;
  color?: THREE.Color;
  speed?: number;
  lightDirection?: THREE.Vector3;
};

export default function Atmosphere({
  particles = 4000,
  minParticleSize = 50,
  maxParticleSize = 100,
  radius = 1.1,
  thickness = 1.5,
  density = 0,
  opacity = 0.35,
  scale = 8,
  color = new THREE.Color(0xffffff),
  speed = 0.03,
  lightDirection = new THREE.Vector3(1, 1, 1),
}: AtmosphereParams) {
  const pointsRef = useRef<THREE.Points | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);

  // Generate a simple circular point texture
  const pointTexture = useMemo(() => {
    const size = 64;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const grd = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grd.addColorStop(0, "rgba(255,255,255,1)");
    grd.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, []);

  // Build geometry
  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    const verts: number[] = [];
    const sizes: number[] = [];
    for (let i = 0; i < particles; i++) {
      const r = Math.random() * thickness + radius;
      const p = new THREE.Vector3(2 * Math.random() - 1, 2 * Math.random() - 1, 2 * Math.random() - 1);
      p.normalize().multiplyScalar(r);
      verts.push(p.x, p.y, p.z);
      const sizeVal = Math.random() * (maxParticleSize - minParticleSize) + minParticleSize;
      sizes.push(sizeVal);
    }
    geom.setAttribute("position", new THREE.BufferAttribute(new Float32Array(verts), 3));
    geom.setAttribute("size", new THREE.BufferAttribute(new Float32Array(sizes), 1));
    return geom;
  }, [particles, minParticleSize, maxParticleSize, radius, thickness]);

  // Shader material
  const material = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        speed: { value: speed },
        opacity: { value: opacity },
        density: { value: density },
        scale: { value: scale },
        lightDirection: { value: lightDirection },
        color: { value: color },
        pointTexture: { value: null },
      },
      vertexShader: `attribute float size; varying vec3 fragPosition; void main() { gl_PointSize = size; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); fragPosition = (modelMatrix * vec4(position,1.0)).xyz; }`,
      fragmentShader: `${noiseGLSL} uniform float time; uniform float speed; uniform float opacity; uniform float density; uniform float scale; uniform vec3 lightDirection; uniform vec3 color; uniform sampler2D pointTexture; varying vec3 fragPosition; vec2 rotateUV(vec2 uv, float rotation) { float mid = 0.5; return vec2(cos(rotation) * (uv.x - mid) + sin(rotation) * (uv.y - mid) + mid, cos(rotation) * (uv.y - mid) - sin(rotation) * (uv.x - mid) + mid); } void main() { vec3 R = normalize(fragPosition); vec3 L = normalize(lightDirection); float light = max(0.05, dot(R, L)); float n = simpleNoise((time * speed) + fragPosition / scale); float a = opacity * clamp(n + density, 0.0, 1.0); vec2 rotCoords = rotateUV(gl_PointCoord, n); gl_FragColor = vec4(light * color, a) * texture2D(pointTexture, gl_PointCoord); }`,
      blending: THREE.NormalBlending,
      depthWrite: false,
      transparent: true,
    });
    return mat;
  }, [speed, opacity, density, scale, color, lightDirection]);

  useEffect(() => {
    if (material && pointTexture) {
      (material as THREE.ShaderMaterial).uniforms.pointTexture.value = pointTexture;
    }
  }, [material, pointTexture]);

  useEffect(() => {
    materialRef.current = material as THREE.ShaderMaterial;
    return () => {
      if (materialRef.current) materialRef.current.dispose();
    };
  }, [material]);

  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  useFrame((state, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value += delta;
    }
    if (pointsRef.current) {
      pointsRef.current.rotation.y += 0.0002;
    }
  });

  return <points ref={pointsRef} geometry={geometry} material={material} />;
}
