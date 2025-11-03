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
    setGravity: (n: number) => void;
    setOcean: (n: number) => void;
    setAxialTilt: (n: number) => void;
    setPressure: (n: number) => void;
    setOrbitalDist: (n: number) => void;
    setRotationPeriod: (n: number) => void;
    setCloudCover: (n: number) => void;
    setTectonic: (n: number) => void;
    setPlanetSize: (n: number) => void;
    onGenerate: (vals: Record<string, number>) => void;
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
    onPlanetClick?: (info: PlanetClickResult) => void;
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
    onPlanetClick?: (info: PlanetClickResult) => void;
}
