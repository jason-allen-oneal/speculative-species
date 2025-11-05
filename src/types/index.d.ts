interface ControlPanelProps {
    ocean: number;
    axialTilt: number;
    orbitalDist: number;
    rotationPeriod: number;
    cloudCover: number;
    tectonic: number;
    planetSize: number;
    setOcean: (n: number) => void;
    setAxialTilt: (n: number) => void;
    setOrbitalDist: (n: number) => void;
    setRotationPeriod: (n: number) => void;
    setCloudCover: (n: number) => void;
    setTectonic: (n: number) => void;
    setPlanetSize: (n: number) => void;
    onGenerate: (vals: Record<string, number>) => void;
}

interface PhysicsInfoProps {
    surfaceGravity: {
        metersPerSecondSquared: number;
        relativeToEarthG: number;
    };
    escapeVelocity: {
        metersPerSecond: number;
        kilometersPerSecond: number;
    };
    retention: {
        escapeVelocity: number;
        escapeVelocityKm: number;
        thresholdVelocity: number;
        gases: Array<{
            gas: string;
            thermalVelocity: number;
            thresholdVelocity: number;
            status: "retained" | "escaping";
        }>;
        warnings: string[];
    };
    temperature: TemperatureModel;
    pressure: AtmosphericPressureResult;
    orbital: OrbitalPeriodResult;
    hillSphere: HillSphereResult;
    tectonic: TectonicActivityResult;
    cloudSuggestion: CloudCoverResult;
    wind: WindCoriolisResult;
}

interface MetricCardProps {
    label: string;
    value: string;
    detail?: string;
}

interface StarData {
    type: string;
    name: string;
    classification: string;
    temperatureKelvin: number;
    radiusMeters: number;
    luminosityWatts: number;
    massKg: number;
}

interface PlanetConfig {
    params: {
        physical: {
            radius_scale: number;
            mass: number;
        };
        stellar: {
            orbital_distance: number;
            rotation_period_hours: number;
            axial_tilt: number;
            star_type: string;
        };
        atmosphere: {
            surface_pressure?: number;
            cloud_cover: number;
            greenhouse_index?: number;
            composition: Record<string, number>;
        };
        hydrology: {
            tectonic_activity: number;
            ocean: number;
            topographic_variation?: number; // Optional: computed from tectonic_activity and gravity if not provided
        };
        climate?: {
            mean_surface_temp_k?: number;
        };
    };
}

interface PlanetViewProps {
    config: PlanetConfig;
}

interface PlanetClickResult {
    latitude: number;
    longitude: number;
    elevationKm: number;
    elevationMeters: number;
    elevationNormalized: number;
    relativeToSeaLevel: number;
    isOcean: boolean;
    uv: [number, number];
    worldPosition: [number, number, number];
    localPosition: [number, number, number];
}

interface PlanetCanvasProps {
    gravity: number;
    ocean: number;
    axialTilt: number;
    pressure: number;
    surfaceTempK?: number;
    orbitalDist: number;
    rotationPeriod: number;
    cloudCover: number;
    tectonic: number;
    planetSize: number;
    onPlanetClick?: (info: PlanetClickResult) => void;
    isPaused?: boolean;
    starType: string;
}

interface PlanetProps {
    gravity: number;
    ocean: number;
    axialTilt: number;
    pressure: number;
    surfaceTempK?: number;
    orbitalDist: number;
    rotationPeriod: number;
    cloudCover: number;
    tectonic: number;
    planetSize: number;
    onPlanetClick?: (info: PlanetClickResult) => void;
    isPaused?: boolean;
    markerPosition?: [number, number, number];
    useShader?: boolean;
}

interface SurfaceGravityParams {
    massKg: number;
    radiusScale: number;
}

interface SurfaceGravityResult {
    metersPerSecondSquared: number;
    relativeToEarthG: number;
}

interface EscapeVelocityParams {
    massKg: number;
    radiusScale: number;
}

interface EscapeVelocityResult {
    metersPerSecond: number;
    kilometersPerSecond: number;
}

interface GasRetentionDetail {
    gas: string;
    thermalVelocity: number;
    thresholdVelocity: number;
    status: "retained" | "escaping";
}

interface AtmosphericRetentionParams {
    massKg: number;
    radiusScale: number;
    temperatureKelvin: number;
    composition: Record<string, number>;
    molecularMassOverrides?: Record<string, number>;
    escapeVelocityMetersPerSecond?: number;
}

interface AtmosphericRetentionResult {
    escapeVelocity: number;
    escapeVelocityKm: number;
    thresholdVelocity: number;
    gases: GasRetentionDetail[];
    warnings: string[];
}

interface AlbedoParams {
    cloudCoverFraction: number;
    oceanCoverageFraction: number;
}

interface EquilibriumTemperatureParams {
    starType: string;
    orbitalDistanceAu: number;
    albedo?: number;
}

interface EquilibriumTemperatureResult {
    star: StarData;
    orbitalDistanceAu: number;
    albedo: number;
    stellarFlux: number;
    equilibriumTemperature: number;
}

interface GreenhouseParams {
    surfacePressureAtm: number;
    oceanCoverageFraction: number;
    co2Fraction: number;
    greenhouseIndex?: number;
}

interface GreenhouseFactors {
    pressureFactor: number;
    oceanFactor: number;
    co2Factor: number;
    greenhouseIndex: number;
}

interface TemperatureModelParams {
    starType: string;
    orbitalDistanceAu: number;
    cloudCoverFraction: number;
    oceanCoverageFraction: number;
    surfacePressureAtm: number;
    composition: Record<string, number>;
    greenhouseIndex?: number;
}

interface TemperatureModel {
    star: StarData;
    albedo: number;
    orbitalDistanceAu: number;
    stellarFlux: number;
    equilibriumTemperature: number;
    greenhouseDelta: number;
    surfaceTemperature: number;
    greenhouseFactors: GreenhouseFactors;
}

interface AtmosphericPressureParams {
    surfacePressureAtm?: number;
    gravityMps2: number;
    surfaceTemperatureKelvin: number;
    composition: Record<string, number>;
}

interface AtmosphericPressureResult {
    pressureAtm: number;
    expectedPressureAtm: number;
    columnMassKgPerM2: number;
    meanMolecularMassKg: number;
    scaleHeightKm: number;
    earthNormalizedPressure: number;
    differenceRatio: number;
    status: "low" | "high" | "nominal";
    warnings: string[];
}

interface OrbitalPeriodParams {
    starType: string;
    orbitalDistanceAu: number;
}

interface OrbitalPeriodResult {
    star: StarData;
    orbitalDistanceAu: number;
    periodSeconds: number;
    periodDays: number;
    periodYears: number;
}

interface HillSphereParams {
    starType: string;
    planetMassKg: number;
    orbitalDistanceAu: number;
}

interface HillSphereResult {
    star: StarData;
    orbitalDistanceAu: number;
    radiusMeters: number;
    radiusKilometers: number;
    radiusAu: number;
}

interface TectonicActivityParams {
    radiusScale: number;
    gravityMps2: number;
    tectonicValue: number;
}

interface TectonicActivityResult {
    actual: number;
    recommended: number;
    range: { min: number; max: number };
    status: "too_low" | "optimal" | "high";
    warnings: string[];
}

interface CloudCoverParams {
    surfaceTemperatureKelvin: number;
    oceanCoverageFraction: number;
    greenhouseIndex?: number;
}

interface CloudCoverResult {
    suggestedFraction: number;
    status: "dry" | "balanced" | "saturated";
    warnings: string[];
}

interface WindCoriolisParams {
    rotationPeriodHours: number;
    radiusScale: number;
}

interface WindCoriolisResult {
    coriolisParameter: number;
    equatorialVelocity: number;
    qualitative: "weak" | "moderate" | "strong";
}

// Tectonic plate generation types
interface Plate {
    id: number;
    type: "continental" | "oceanic";
    velocity: THREE.Vector3;
    age: number;
}

interface PlateMap {
    plateIndex: Uint16Array;
    plates: Plate[];
    width: number;
    height: number;
}
