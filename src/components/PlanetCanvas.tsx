"use client";
import { Canvas } from "@react-three/fiber";
import { useState } from "react";
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
    isPaused,
}: PlanetCanvasProps) {
    const [markerPosition, setMarkerPosition] = useState<[number, number, number] | undefined>(undefined);

    const sunPosition = [
        2 * Math.max(0.5, orbitalDist), 
        2 * Math.max(0.5, orbitalDist), 
        8 * Math.max(0.5, orbitalDist)
    ] as [number, number, number];

    const handlePlanetClick = (info: PlanetClickResult) => {
        setMarkerPosition(info.worldPosition);
        if (onPlanetClick) {
            onPlanetClick(info);
        }
    };

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
                    onPlanetClick={handlePlanetClick}
                    isPaused={isPaused}
                    markerPosition={markerPosition}
                />
            </Canvas>
        </div>
    );
}
