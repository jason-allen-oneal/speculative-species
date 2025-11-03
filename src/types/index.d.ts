interface ControlPanelProps {
    gravity: number;
    ocean: number;
    axialTilt: number;
    pressure: number;
    orbitalDist: number;
    rotationPeriod: number;
    cloudCover: number;
    tectonic: number;
    planetSize: number;
    topographicVariation: number;
    setGravity: (n: number) => void;
    setOcean: (n: number) => void;
    setAxialTilt: (n: number) => void;
    setPressure: (n: number) => void;
    setOrbitalDist: (n: number) => void;
    setRotationPeriod: (n: number) => void;
    setCloudCover: (n: number) => void;
    setTectonic: (n: number) => void;
    setPlanetSize: (n: number) => void;
    setTopographicVariation: (n: number) => void;
    onGenerate: (vals: Record<string, number>) => void;
}

interface PlanetConfig {
    params: {
        physical: {
            gravity: number;
            radius_scale: number;
        };
        stellar: {
            orbital_distance: number;
            rotation_period_hours: number;
            axial_tilt: number;
        };
        atmosphere: {
            surface_pressure: number;
            cloud_cover: number;
        };
        hydrology: {
            tectonic_activity: number;
            ocean: number;
            topographic_variation: number;
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
}

interface PlanetCanvasProps {
    gravity: number;
    ocean: number;
    axialTilt: number;
    pressure: number;
    orbitalDist: number;
    rotationPeriod: number;
    cloudCover: number;
    tectonic: number;
    planetSize: number;
    topographicVariation: number;
    onPlanetClick?: (info: PlanetClickResult) => void;
    isPaused?: boolean;
}

interface PlanetProps {
    gravity: number;
    ocean: number;
    axialTilt: number;
    pressure: number;
    orbitalDist: number;
    rotationPeriod: number;
    cloudCover: number;
    tectonic: number;
    planetSize: number;
    topographicVariation: number;
    onPlanetClick?: (info: PlanetClickResult) => void;
    isPaused?: boolean;
    markerPosition?: [number, number, number];
}
