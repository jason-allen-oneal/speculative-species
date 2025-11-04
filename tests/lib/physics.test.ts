import {
  calculateEscapeVelocity,
  calculateSurfaceGravity,
  calculateTemperatureModel,
  estimatePlanetaryAlbedo,
  evaluateAtmosphericRetention,
  evaluateAtmosphericPressure,
  calculateOrbitalPeriod,
  calculateHillSphere,
  evaluateTectonicActivity,
  estimateCloudCover,
  evaluateWindCoriolis,
} from "@/lib/physics";

describe("physics calculations", () => {
  const EARTH_MASS = 5.972e24;
  const EARTH_RADIUS_SCALE = 1.0;
  const EARTH_TEMPERATURE = 288;
  const EARTH_ORBIT_AU = 1.0;
  const EARTH_PRESSURE = 1.0;
  const EARTH_OCEAN = 0.71;
  const EARTH_CLOUD_COVER = 0.67;
  const EARTH_COMPOSITION = {
    N2: 0.78084,
    O2: 0.20946,
    Ar: 0.00934,
    CO2: 0.00042,
  };

  it("computes Earth-like surface gravity and escape velocity", () => {
    const gravity = calculateSurfaceGravity({
      massKg: EARTH_MASS,
      radiusScale: EARTH_RADIUS_SCALE,
    });
    const escapeVelocity = calculateEscapeVelocity({
      massKg: EARTH_MASS,
      radiusScale: EARTH_RADIUS_SCALE,
    });

    expect(gravity.metersPerSecondSquared).toBeCloseTo(9.82, 2);
    expect(gravity.relativeToEarthG).toBeCloseTo(1.0, 2);
    expect(escapeVelocity.metersPerSecond).toBeCloseTo(11186, -1);
    expect(escapeVelocity.kilometersPerSecond).toBeCloseTo(11.19, 2);
  });

  it("flags light gases as escaping while retaining heavier gases", () => {
    const composition = { ...EARTH_COMPOSITION, H2: 0.005, He: 0.005 };

    const result = evaluateAtmosphericRetention({
      massKg: EARTH_MASS,
      radiusScale: EARTH_RADIUS_SCALE,
      temperatureKelvin: EARTH_TEMPERATURE,
      composition,
    });

    const statusByGas = Object.fromEntries(
      result.gases.map((gas) => [gas.gas, gas.status])
    );

    expect(statusByGas.N2).toBe("retained");
    expect(statusByGas.O2).toBe("retained");
    expect(statusByGas.Ar).toBe("retained");
    expect(statusByGas.H2).toBe("escaping");
    expect(statusByGas.He).toBe("retained");
    expect(result.warnings.some((warning) => warning.includes("H2"))).toBe(true);
    expect(result.warnings.some((warning) => warning.includes("He"))).toBe(false);
  });

  it("balances surface pressure against gravity using column mass", () => {
    const result = evaluateAtmosphericPressure({
      surfacePressureAtm: EARTH_PRESSURE,
      gravityMps2: 9.80665,
      surfaceTemperatureKelvin: EARTH_TEMPERATURE,
      composition: EARTH_COMPOSITION,
    });

    expect(result.expectedPressureAtm).toBeCloseTo(1.0, 2);
    expect(result.status).toBe("nominal");
    expect(result.warnings.length).toBe(0);
    expect(result.scaleHeightKm).toBeGreaterThan(5);
    expect(result.scaleHeightKm).toBeLessThan(12);
  });

  it("estimates albedo within expected Earth range", () => {
    const albedo = estimatePlanetaryAlbedo({
      cloudCoverFraction: EARTH_CLOUD_COVER,
      oceanCoverageFraction: EARTH_OCEAN,
    });

    expect(albedo).toBeGreaterThan(0.25);
    expect(albedo).toBeLessThan(0.35);
  });

  it("produces Earth-like equilibrium and surface temperatures", () => {
    const model = calculateTemperatureModel({
      starType: "G2V",
      orbitalDistanceAu: EARTH_ORBIT_AU,
      cloudCoverFraction: EARTH_CLOUD_COVER,
      oceanCoverageFraction: EARTH_OCEAN,
      surfacePressureAtm: EARTH_PRESSURE,
      composition: EARTH_COMPOSITION,
      greenhouseIndex: 1,
    });

    expect(model.equilibriumTemperature).toBeCloseTo(255, 0);
    expect(model.greenhouseDelta).toBeCloseTo(33, 0);
    expect(model.surfaceTemperature).toBeCloseTo(288, 0);
  });

  it("calculates orbital period from star mass and distance", () => {
    const orbital = calculateOrbitalPeriod({
      starType: "G2V",
      orbitalDistanceAu: EARTH_ORBIT_AU,
    });

    expect(orbital.periodDays).toBeCloseTo(365.25, 1);
    expect(orbital.periodYears).toBeCloseTo(1.0, 2);
  });

  it("computes hill sphere radius for Earth", () => {
    const hill = calculateHillSphere({
      starType: "G2V",
      planetMassKg: EARTH_MASS,
      orbitalDistanceAu: EARTH_ORBIT_AU,
    });

    expect(hill.radiusKilometers).toBeGreaterThan(1_300_000);
    expect(hill.radiusKilometers).toBeLessThan(1_600_000);
    expect(hill.radiusAu).toBeCloseTo(0.0100, 3);
  });

  it("evaluates tectonic activity recommendations", () => {
    const earth = evaluateTectonicActivity({
      radiusScale: EARTH_RADIUS_SCALE,
      gravityMps2: 9.80665,
      tectonicValue: 5,
    });

    expect(earth.status).toBe("optimal");
    expect(earth.warnings.length).toBe(0);
    expect(earth.range.min).toBeLessThanOrEqual(earth.actual);
    expect(earth.range.max).toBeGreaterThanOrEqual(earth.actual);

    const superEarth = evaluateTectonicActivity({
      radiusScale: 2.0,
      gravityMps2: 4.5,
      tectonicValue: 3,
    });

    expect(superEarth.status).toBe("too_low");
    expect(superEarth.warnings.some((warning) => warning.toLowerCase().includes("vigorous"))).toBe(true);
  });

  it("suggests cloud cover based on climate inputs", () => {
    const clouds = estimateCloudCover({
      surfaceTemperatureKelvin: EARTH_TEMPERATURE,
      oceanCoverageFraction: EARTH_OCEAN,
      greenhouseIndex: 1,
    });

    expect(clouds.suggestedFraction).toBeGreaterThan(0.3);
    expect(clouds.status).toBe("balanced");
  });

  it("evaluates wind coriolis regime", () => {
    const winds = evaluateWindCoriolis({
      rotationPeriodHours: 23.934,
      radiusScale: EARTH_RADIUS_SCALE,
    });

    expect(winds.qualitative).toBe("moderate");
    expect(winds.equatorialVelocity).toBeGreaterThan(300);
  });
});
