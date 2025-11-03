"use client";
import { useState } from "react";
import ControlPanel from "@/components/ControlPanel";
import PlanetCanvas from "@/components/PlanetCanvas";

export default function PlanetView({config}: PlanetViewProps) {
    const [gravity, setGravity] = useState(config.params.physical.gravity);
    const [planetSize, setPlanetSize] = useState(config.params.physical.radius_scale);
    const [orbitalDist, setOrbitalDist] = useState(config.params.stellar.orbital_distance);
    const [rotationPeriod, setRotationPeriod] = useState(config.params.stellar.rotation_period_hours);
    const [axialTilt, setAxialTilt] = useState(config.params.stellar.axial_tilt);
    const [pressure, setPressure] = useState(config.params.atmosphere.surface_pressure);
    const [cloudCover, setCloudCover] = useState(config.params.atmosphere.cloud_cover);
    const [tectonic, setTectonic] = useState(config.params.hydrology.tectonic_activity);
    const [ocean, setOcean] = useState(config.params.hydrology.ocean);

    // === Generated Planet Data ===
    const [selectedPoint, setSelectedPoint] = useState<PlanetClickResult | null>(null);
    const [isPaused, setIsPaused] = useState(false);

    // === API Call ===
    const handleGenerate = async () => {
        
    };

    // === Render ===
    return (
        <main className="w-screen h-screen bg-gradient-to-b from-black via-gray-900 to-black text-white overflow-hidden flex flex-col">
            {/* === Top Controls Bar === */}
            <ControlPanel
                gravity={gravity}
                ocean={ocean}
                axialTilt={axialTilt}
                pressure={pressure}
                orbitalDist={orbitalDist}
                rotationPeriod={rotationPeriod}
                cloudCover={cloudCover}
                tectonic={tectonic}
                planetSize={planetSize}
                setPlanetSize={setPlanetSize}
                setGravity={setGravity}
                setOcean={setOcean}
                setAxialTilt={setAxialTilt}
                setPressure={setPressure}
                setOrbitalDist={setOrbitalDist}
                setRotationPeriod={setRotationPeriod}
                setCloudCover={setCloudCover}
                setTectonic={setTectonic}
                onGenerate={handleGenerate}
            />

            {/* === Planet Canvas === */}
            <div className="flex-grow flex items-center justify-center relative">
                <PlanetCanvas
                    gravity={gravity}
                    ocean={ocean}
                    axialTilt={axialTilt}
                    pressure={pressure}
                    orbitalDist={orbitalDist}
                    rotationPeriod={rotationPeriod}
                    cloudCover={cloudCover}
                    tectonic={tectonic}
                    planetSize={planetSize}
                    onPlanetClick={(info) => {
                        setSelectedPoint(info);
                        setIsPaused(true);
                    }}
                    isPaused={isPaused}
                />
                {selectedPoint && (
                    <div className="absolute bottom-6 left-6 bg-gray-900/85 border border-gray-700 rounded-lg px-4 py-3 text-sm shadow-lg space-y-1">
                        <div className="text-gray-300 font-medium">Surface Sample</div>
                        <div className="text-gray-200">
                            Lat {selectedPoint.latitude.toFixed(2)}°, Lon {selectedPoint.longitude.toFixed(2)}°
                        </div>
                        <div className="text-gray-200">
                            {selectedPoint.isOcean ? "Depth" : "Elevation"}{" "}
                            {selectedPoint.isOcean 
                                ? Math.abs(selectedPoint.elevationKm).toFixed(2)
                                : (selectedPoint.elevationKm >= 0 ? "+" : "") + selectedPoint.elevationKm.toFixed(2)
                            } km
                        </div>
                        <div className="text-gray-400">
                            Normalized height {selectedPoint.elevationNormalized.toFixed(3)} · Relative&nbsp;
                            {selectedPoint.relativeToSeaLevel >= 0 ? "+" : ""}
                            {(selectedPoint.relativeToSeaLevel * 100).toFixed(1)}%
                        </div>
                        <div className="text-gray-500">
                            World ({selectedPoint.worldPosition.map((axis) => axis.toFixed(2)).join(", ")})
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
