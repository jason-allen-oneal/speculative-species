"use client";
import { Canvas } from "@react-three/fiber";
import Star from "./stellar/Star";
import Planet from "./stellar/Planet";

export default function PlanetCanvas({
    gravity,
    ocean,
    axialTilt,
    pressure,
    orbitalDist,
    rotationPeriod,
    cloudCover,
    tectonic,
    planetSize,
    onPlanetClick,
}: PlanetCanvasProps) {
    const sunPosition = [
        4 * Math.max(0.5, orbitalDist), 
        3 * Math.max(0.5, orbitalDist), 
        -5 * Math.max(0.5, orbitalDist)
    ] as [number, number, number];

    return (
        <div className="w-full h-full bg-black flex items-center justify-center">
            <Canvas camera={{ position: [0, 0, 3] }} gl={{ antialias: true, alpha: false }}>
                {/* Star acts as the PointLight source */}
                <Star orbitalDistance={orbitalDist} />

                {/* Secondary lighting for ambient illumination and soft shadows */}
                <ambientLight intensity={0.15} />
                <hemisphereLight
                    args={["#ffffff", "#080820", 0.3]}
                />

                {/* Directional light positioned parallel to the Star component's light */}
                <directionalLight
                    position={sunPosition}
                    intensity={1.5}
                    color="#fff5c0"
                    castShadow
                />

                <Planet
                    gravity={gravity}
                    ocean={ocean}
                    axialTilt={axialTilt}
                    pressure={pressure}
                    orbitalDist={orbitalDist}
                    rotationPeriod={rotationPeriod}
                    cloudCover={cloudCover}
                    tectonic={tectonic}
                    planetSize={planetSize}
                    onPlanetClick={onPlanetClick}
                />
            </Canvas>
        </div>
    );
}
