"use client";
import { Canvas } from "@react-three/fiber";
import { useMemo, useState } from "react";
import Planet from "./stellar/Planet";
import { getStarData, PHYSICAL_CONSTANTS } from "@/lib/constants";
import * as THREE from "three";

export default function PlanetCanvas(props: PlanetCanvasProps & { surfaceTempK?: number }) {
    const {
        gravity,
        ocean,
        axialTilt,
        pressure,
        surfaceTempK,
        orbitalDist,
        rotationPeriod,
        cloudCover,
        tectonic,
        planetSize,
        onPlanetClick,
        isPaused,
        starType,
    } = props;
    const [markerPosition, setMarkerPosition] = useState<[number, number, number] | undefined>(undefined);

    const star = useMemo(() => getStarData(starType), [starType]);
    const distanceFactor = Math.max(0.5, orbitalDist);
    const sunPosition = useMemo(
        () => [
            2 * distanceFactor,
            2 * distanceFactor,
            8 * distanceFactor,
        ] as [number, number, number],
        [distanceFactor]
    );
    const relativeLuminosity = star.luminosityWatts / PHYSICAL_CONSTANTS.SOLAR_LUMINOSITY_WATTS;
    const primaryIntensity = useMemo(
        () => 2.2 * relativeLuminosity / Math.pow(distanceFactor, 2),
        [relativeLuminosity, distanceFactor]
    );
    const starColor = useMemo(() => new THREE.Color(star.colorHex), [star.colorHex]);
    const ambientColor = useMemo(() => starColor.clone().multiplyScalar(0.4), [starColor]);
    const hemTop = useMemo(() => starColor.clone().offsetHSL(0, -0.1, 0.15), [starColor]);
    const hemBottom = "#080820";
    const handlePlanetClick = (info: PlanetClickResult) => {
        setMarkerPosition(info.localPosition);
        if (onPlanetClick) {
            onPlanetClick(info);
        }
    };

    return (
        <div className="w-full h-full bg-black flex items-center justify-center">
            <Canvas camera={{ position: [0, 0, 3] }} gl={{ antialias: true, alpha: false }}>
                <ambientLight intensity={0.12} color={ambientColor.getStyle()} />
                <hemisphereLight
                    args={[hemTop.getStyle(), hemBottom, 0.25]}
                />
                <pointLight
                    position={sunPosition}
                    intensity={primaryIntensity * 1.5}
                    distance={35}
                    color={starColor.getStyle()}
                />
                <directionalLight
                    position={sunPosition}
                    intensity={primaryIntensity}
                    color={starColor.getStyle()}
                    castShadow
                />

                <Planet
                    gravity={gravity}
                    ocean={ocean}
                    axialTilt={axialTilt}
                    pressure={pressure}
                    surfaceTempK={surfaceTempK}
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
