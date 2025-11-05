"use client";
import { useMemo, useState, useCallback } from "react";
import ControlPanel from "@/components/ControlPanel";
import PlanetCanvas from "@/components/PlanetCanvas";
import PhysicsInfo from "@/components/PhysicsInfo";
import GasPanel from "@/components/GasPanel";
import {
    calculateEscapeVelocity,
    calculateSurfaceGravity,
    calculateTemperatureModel,
    evaluateAtmosphericRetention,
    evaluateAtmosphericPressure,
    calculateOrbitalPeriod,
    calculateHillSphere,
    evaluateTectonicActivity,
    estimateCloudCover,
    evaluateWindCoriolis,
    deriveSurfacePressure,
} from "@/lib/physics";

export default function PlanetView({config}: PlanetViewProps) {
    const [planetSize, setPlanetSize] = useState(config.params.physical.radius_scale);
    const [orbitalDist, setOrbitalDist] = useState(config.params.stellar.orbital_distance);
    const [rotationPeriod, setRotationPeriod] = useState(config.params.stellar.rotation_period_hours);
    const [axialTilt, setAxialTilt] = useState(config.params.stellar.axial_tilt);
    const [cloudCover, setCloudCover] = useState(config.params.atmosphere.cloud_cover);
    const [tectonic, setTectonic] = useState(config.params.hydrology.tectonic_activity);
    const [ocean, setOcean] = useState(config.params.hydrology.ocean);
    const massKg = config.params.physical.mass;
    const rawComposition = config.params.atmosphere?.composition;
    const composition = useMemo(() => rawComposition ?? {}, [rawComposition]);
    const starType = config.params.stellar.star_type;
    const greenhouseIndex = config.params.atmosphere?.greenhouse_index ?? 1;

    const surfaceGravity = useMemo(
        () => calculateSurfaceGravity({ massKg, radiusScale: planetSize }),
        [massKg, planetSize]
    );
    const escapeVelocity = useMemo(
        () => calculateEscapeVelocity({ massKg, radiusScale: planetSize }),
        [massKg, planetSize]
    );
    const derivedPressureAtm = useMemo(
        () => deriveSurfacePressure(surfaceGravity.metersPerSecondSquared),
        [surfaceGravity.metersPerSecondSquared]
    );

    const temperatureModel = useMemo(
        () =>
            calculateTemperatureModel({
                starType,
                orbitalDistanceAu: orbitalDist,
                cloudCoverFraction: cloudCover,
                oceanCoverageFraction: ocean,
                surfacePressureAtm: derivedPressureAtm,
                composition,
                greenhouseIndex,
            }),
        [starType, orbitalDist, cloudCover, ocean, derivedPressureAtm, composition, greenhouseIndex]
    );
    const orbitalPeriod = useMemo(
        () =>
            calculateOrbitalPeriod({
                starType,
                orbitalDistanceAu: orbitalDist,
            }),
        [starType, orbitalDist]
    );
    const pressureAssessment = useMemo(
        () =>
            evaluateAtmosphericPressure({
                surfacePressureAtm: derivedPressureAtm,
                gravityMps2: surfaceGravity.metersPerSecondSquared,
                surfaceTemperatureKelvin: temperatureModel.surfaceTemperature,
                composition,
            }),
        [
            derivedPressureAtm,
            surfaceGravity.metersPerSecondSquared,
            temperatureModel.surfaceTemperature,
            composition,
        ]
    );
    const hillSphere = useMemo(
        () =>
            calculateHillSphere({
                starType,
                planetMassKg: massKg,
                orbitalDistanceAu: orbitalDist,
            }),
        [starType, massKg, orbitalDist]
    );
    const tectonicAssessment = useMemo(
        () =>
            evaluateTectonicActivity({
                radiusScale: planetSize,
                gravityMps2: surfaceGravity.metersPerSecondSquared,
                tectonicValue: tectonic,
            }),
        [planetSize, surfaceGravity.metersPerSecondSquared, tectonic]
    );
    const cloudSuggestion = useMemo(
        () =>
            estimateCloudCover({
                surfaceTemperatureKelvin: temperatureModel.surfaceTemperature,
                oceanCoverageFraction: ocean,
                greenhouseIndex,
            }),
        [temperatureModel.surfaceTemperature, ocean, greenhouseIndex]
    );
    const windAssessment = useMemo(
        () =>
            evaluateWindCoriolis({
                rotationPeriodHours: rotationPeriod,
                radiusScale: planetSize,
            }),
        [rotationPeriod, planetSize]
    );
    const atmosphericRetention = useMemo(
        () =>
            evaluateAtmosphericRetention({
                massKg,
                radiusScale: planetSize,
                temperatureKelvin: temperatureModel.surfaceTemperature,
                composition,
                escapeVelocityMetersPerSecond: escapeVelocity.metersPerSecond,
            }),
        [massKg, planetSize, temperatureModel.surfaceTemperature, composition, escapeVelocity.metersPerSecond]
    );

    // === Generated Planet Data ===
    const [selectedPoint, setSelectedPoint] = useState<PlanetClickResult | null>(null);
    const [isPaused, setIsPaused] = useState(false);

    const handlePlanetClick = useCallback((info: PlanetClickResult) => {
        setSelectedPoint(info);
        setIsPaused(true);
    }, []);

    const resumeRotation = useCallback(() => {
        setIsPaused(false);
        setSelectedPoint(null);
    }, []);

    // === API Call ===
    const handleGenerate = async () => {
        setIsPaused(false);
        setSelectedPoint(null);
    };

    // === Render ===
    return (
        <main className="w-screen h-screen bg-gradient-to-b from-black via-gray-900 to-black text-white overflow-hidden flex flex-col">
            {/* === Top Controls Bar === */}
            <ControlPanel
                ocean={ocean}
                axialTilt={axialTilt}
                orbitalDist={orbitalDist}
                rotationPeriod={rotationPeriod}
                cloudCover={cloudCover}
                tectonic={tectonic}
                planetSize={planetSize}
                setPlanetSize={setPlanetSize}
                setOcean={setOcean}
                setAxialTilt={setAxialTilt}
                setOrbitalDist={setOrbitalDist}
                setRotationPeriod={setRotationPeriod}
                setCloudCover={setCloudCover}
                setTectonic={setTectonic}
                onGenerate={handleGenerate}
            />

            {/* === Panels & Planet === */}
            <div className="flex-grow w-full px-4 pb-6">
                <div className="h-full flex flex-col gap-4 xl:flex-row xl:items-stretch">
                    <aside className="order-1 w-full xl:w-72 2xl:w-80">
                        <GasPanel retention={atmosphericRetention} />
                    </aside>
                    <div className="order-2 flex-1 relative flex items-center justify-center min-h-[320px]">
                        <PlanetCanvas
                            starType={starType}
                            gravity={surfaceGravity.relativeToEarthG}
                            ocean={ocean}
                            axialTilt={axialTilt}
                            pressure={derivedPressureAtm}
                            surfaceTempK={temperatureModel.surfaceTemperature}
                            orbitalDist={orbitalDist}
                            rotationPeriod={rotationPeriod}
                            cloudCover={cloudCover}
                            tectonic={tectonic}
                            planetSize={planetSize}
                            onPlanetClick={handlePlanetClick}
                            isPaused={isPaused}
                        />
                        {selectedPoint && (
                            <div className="absolute bottom-6 left-6 bg-gray-900/90 border border-gray-700 rounded-lg px-4 py-3 text-xs shadow-lg space-y-1 max-w-[260px]">
                                <div className="text-gray-300 font-semibold text-sm">Surface Sample</div>
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
                                    Normalized {selectedPoint.elevationNormalized.toFixed(3)} · Relative&nbsp;
                                    {selectedPoint.relativeToSeaLevel >= 0 ? "+" : ""}
                                    {(selectedPoint.relativeToSeaLevel * 100).toFixed(1)}%
                                </div>
                                <div className="text-gray-500">
                                    World ({selectedPoint.worldPosition.map((axis) => axis.toFixed(2)).join(", ")})
                                </div>
                                <button
                                    onClick={resumeRotation}
                                    className="mt-2 w-full rounded-md bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                >
                                    Resume Rotation
                                </button>
                            </div>
                        )}
                    </div>
                    <aside className="order-3 w-full xl:w-80 2xl:w-96">
                        <PhysicsInfo
                            surfaceGravity={surfaceGravity}
                            escapeVelocity={escapeVelocity}
                            retention={atmosphericRetention}
                            temperature={temperatureModel}
                            pressure={pressureAssessment}
                            orbital={orbitalPeriod}
                            hillSphere={hillSphere}
                            tectonic={tectonicAssessment}
                            cloudSuggestion={cloudSuggestion}
                            wind={windAssessment}
                        />
                    </aside>
                </div>
            </div>
        </main>
    );
}
