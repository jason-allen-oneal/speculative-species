import { getStarData, PHYSICAL_CONSTANTS, StarData } from "./constants";

const GRAVITATIONAL_CONSTANT = 6.674e-11; // m^3 kg^-1 s^-2
const BOLTZMANN_CONSTANT = 1.380649e-23; // J K^-1
const EARTH_RADIUS_METERS = 6.371e6; // Mean Earth radius in meters
const EARTH_SURFACE_GRAVITY = 9.80665; // m/s^2

const ATOMIC_MASS_UNIT = 1.66053906660e-27; // kg
const DEFAULT_MOLECULAR_MASSES: Record<string, number> = {
  N2: 28.0134 * ATOMIC_MASS_UNIT,
  O2: 31.9988 * ATOMIC_MASS_UNIT,
  Ar: 39.948 * ATOMIC_MASS_UNIT,
  CO2: 44.01 * ATOMIC_MASS_UNIT,
  CH4: 16.043 * ATOMIC_MASS_UNIT,
  H2: 2.01588 * ATOMIC_MASS_UNIT,
  He: 4.002602 * ATOMIC_MASS_UNIT,
};

const MIN_RADIUS_SCALE = 0.01;
const MIN_TEMPERATURE_K = 1; // Prevent divide by zero in thermal velocity
const EARTH_ALBEDO = 0.3;
const EARTH_OCEAN_FRACTION = 0.71;
const EARTH_CO2_FRACTION = 0.00042;
const STANDARD_ATMOSPHERE_PA = 101325;
const EARTH_COLUMN_MASS = STANDARD_ATMOSPHERE_PA / EARTH_SURFACE_GRAVITY;
const EARTH_YEAR_SECONDS = 365.25 * 24 * 60 * 60;

const clampRadiusScale = (radiusScale: number) =>
  Math.max(radiusScale, MIN_RADIUS_SCALE) * EARTH_RADIUS_METERS;

/**
 * Calculate the surface gravity for a spherical body using Newton's law of universal gravitation.
 * Returns both the absolute acceleration in m/s^2 and the value expressed in Earth gravities.
 */
export function calculateSurfaceGravity({
  massKg,
  radiusScale,
}: SurfaceGravityParams): SurfaceGravityResult {
  const radiusMeters = clampRadiusScale(radiusScale);
  const metersPerSecondSquared =
    (GRAVITATIONAL_CONSTANT * massKg) / (radiusMeters * radiusMeters);
  return {
    metersPerSecondSquared,
    relativeToEarthG: metersPerSecondSquared / EARTH_SURFACE_GRAVITY,
  };
}

/**
 * Calculate the escape velocity required to leave the planet's gravitational influence.
 * v_escape = sqrt((2 * G * M) / R)
 */
export function calculateEscapeVelocity({
  massKg,
  radiusScale,
}: EscapeVelocityParams): EscapeVelocityResult {
  const radiusMeters = clampRadiusScale(radiusScale);
  const metersPerSecond = Math.sqrt(
    (2 * GRAVITATIONAL_CONSTANT * massKg) / radiusMeters
  );
  return {
    metersPerSecond,
    kilometersPerSecond: metersPerSecond / 1000,
  };
}

const resolveMolecularMass = (
  gas: string,
  overrides?: Record<string, number>
) => {
  if (overrides && overrides[gas] !== undefined) {
    return overrides[gas];
  }
  return DEFAULT_MOLECULAR_MASSES[gas];
};

const calculateThermalVelocity = (
  temperatureKelvin: number,
  molecularMassKg: number
) => Math.sqrt((3 * BOLTZMANN_CONSTANT * temperatureKelvin) / molecularMassKg);

/**
 * Evaluate atmospheric retention for each gas in the composition.
 * Flags gases whose thermal velocities exceed one-sixth of the escape velocity,
 * indicating long-term atmospheric loss.
 */
export function evaluateAtmosphericRetention({
  massKg,
  radiusScale,
  temperatureKelvin,
  composition,
  molecularMassOverrides,
  escapeVelocityMetersPerSecond,
}: AtmosphericRetentionParams): AtmosphericRetentionResult {
  const safeTemperature = Math.max(temperatureKelvin, MIN_TEMPERATURE_K);
  const escapeVelocity =
    escapeVelocityMetersPerSecond ??
    calculateEscapeVelocity({ massKg, radiusScale }).metersPerSecond;
  const thresholdVelocity = escapeVelocity / 6;

  const gases: GasRetentionDetail[] = [];
  const warnings: string[] = [];

  Object.entries(composition).forEach(([gas, abundance]) => {
    const molecularMass = resolveMolecularMass(gas, molecularMassOverrides);
    if (!molecularMass) {
      return;
    }

    const thermalVelocity = calculateThermalVelocity(
      safeTemperature,
      molecularMass
    );

    const status: GasRetentionDetail["status"] =
      thermalVelocity > thresholdVelocity ? "escaping" : "retained";

    gases.push({
      gas,
      thermalVelocity,
      thresholdVelocity,
      status,
    });

    if (status === "escaping" && abundance > 0) {
      warnings.push(
        `${gas} likely escapes: thermal velocity ${(
          thermalVelocity / 1000
        ).toFixed(2)} km/s exceeds escape threshold ${(thresholdVelocity / 1000).toFixed(
          2
        )} km/s.`
      );
    }
  });

  return {
    escapeVelocity,
    escapeVelocityKm: escapeVelocity / 1000,
    thresholdVelocity,
    gases: gases.sort((a, b) => a.gas.localeCompare(b.gas)),
    warnings,
  };
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

interface AlbedoParams {
  cloudCoverFraction: number;
  oceanCoverageFraction: number;
}

export function estimatePlanetaryAlbedo({
  cloudCoverFraction,
  oceanCoverageFraction,
}: AlbedoParams): number {
  const cloudContribution = (cloudCoverFraction - 0.67) * 0.12;
  const oceanContribution =
    (oceanCoverageFraction - EARTH_OCEAN_FRACTION) * -0.05;
  const albedo = EARTH_ALBEDO + cloudContribution + oceanContribution;
  return clamp(albedo, 0.12, 0.8);
}

export function calculateStellarFlux(
  star: StarData,
  orbitalDistanceAu: number
): number {
  const distanceMeters =
    orbitalDistanceAu * PHYSICAL_CONSTANTS.ASTRONOMICAL_UNIT_METERS;
  return (
    star.luminosityWatts /
    (4 * Math.PI * distanceMeters * distanceMeters)
  );
}

export interface EquilibriumTemperatureParams {
  starType: string;
  orbitalDistanceAu: number;
  albedo?: number;
}

export interface EquilibriumTemperatureResult {
  star: StarData;
  orbitalDistanceAu: number;
  albedo: number;
  stellarFlux: number;
  equilibriumTemperature: number;
}

export function calculateEquilibriumTemperature({
  starType,
  orbitalDistanceAu,
  albedo = EARTH_ALBEDO,
}: EquilibriumTemperatureParams): EquilibriumTemperatureResult {
  const star = getStarData(starType);
  const clampedOrbitalDistance = Math.max(orbitalDistanceAu, 0.05);
  const stellarFlux = calculateStellarFlux(star, clampedOrbitalDistance);
  const distanceMeters =
    clampedOrbitalDistance * PHYSICAL_CONSTANTS.ASTRONOMICAL_UNIT_METERS;
  const temperature =
    star.temperatureKelvin *
    Math.sqrt(star.radiusMeters / (2 * distanceMeters)) *
    Math.pow(1 - clamp(albedo, 0, 1), 0.25);

  return {
    star,
    orbitalDistanceAu: clampedOrbitalDistance,
    albedo: clamp(albedo, 0, 1),
    stellarFlux,
    equilibriumTemperature: temperature,
  };
}

export interface GreenhouseParams {
  surfacePressureAtm: number;
  oceanCoverageFraction: number;
  co2Fraction: number;
  greenhouseIndex?: number;
}

export function estimateGreenhouseEffect({
  surfacePressureAtm,
  oceanCoverageFraction,
  co2Fraction,
  greenhouseIndex = 1,
}: GreenhouseParams): { deltaKelvin: number; factors: GreenhouseFactors } {
  const pressureFactor = clamp(surfacePressureAtm, 0.1, 10);
  const oceanFactor = clamp(
    oceanCoverageFraction / EARTH_OCEAN_FRACTION,
    0.1,
    2.5
  );
  const co2Factor = clamp(
    (co2Fraction || EARTH_CO2_FRACTION) / EARTH_CO2_FRACTION,
    0.05,
    20
  );

  const weighted =
    0.45 * pressureFactor + 0.35 * oceanFactor + 0.2 * co2Factor;
  const greenhouseDelta =
    33 * greenhouseIndex * clamp(weighted, 0.2, 5);

  return {
    deltaKelvin: greenhouseDelta,
    factors: {
      pressureFactor,
      oceanFactor,
      co2Factor,
      greenhouseIndex,
    },
  };
}

export interface TemperatureModelParams {
  starType: string;
  orbitalDistanceAu: number;
  cloudCoverFraction: number;
  oceanCoverageFraction: number;
  surfacePressureAtm: number;
  composition: Record<string, number>;
  greenhouseIndex?: number;
}

export interface GreenhouseFactors {
  pressureFactor: number;
  oceanFactor: number;
  co2Factor: number;
  greenhouseIndex: number;
}

export interface TemperatureModel {
  star: StarData;
  albedo: number;
  orbitalDistanceAu: number;
  stellarFlux: number;
  equilibriumTemperature: number;
  greenhouseDelta: number;
  surfaceTemperature: number;
  greenhouseFactors: GreenhouseFactors;
}

export interface TectonicActivityParams {
  radiusScale: number;
  gravityMps2: number;
  tectonicValue: number;
}

export interface TectonicActivityResult {
  actual: number;
  recommended: number;
  range: { min: number; max: number };
  status: "too_low" | "optimal" | "high";
  warnings: string[];
}

export interface CloudCoverParams {
  surfaceTemperatureKelvin: number;
  oceanCoverageFraction: number;
  greenhouseIndex?: number;
}

export interface CloudCoverResult {
  suggestedFraction: number;
  status: "dry" | "balanced" | "saturated";
  warnings: string[];
}

export interface WindCoriolisParams {
  rotationPeriodHours: number;
  radiusScale: number;
}

export interface WindCoriolisResult {
  coriolisParameter: number;
  equatorialVelocity: number;
  qualitative: "weak" | "moderate" | "strong";
}

export function calculateTemperatureModel({
  starType,
  orbitalDistanceAu,
  cloudCoverFraction,
  oceanCoverageFraction,
  surfacePressureAtm,
  composition,
  greenhouseIndex,
}: TemperatureModelParams): TemperatureModel {
  const albedo = estimatePlanetaryAlbedo({
    cloudCoverFraction,
    oceanCoverageFraction,
  });
  const equilibrium = calculateEquilibriumTemperature({
    starType,
    orbitalDistanceAu,
    albedo,
  });

  const co2Fraction = composition.CO2 ?? EARTH_CO2_FRACTION;
  const greenhouse = estimateGreenhouseEffect({
    surfacePressureAtm,
    oceanCoverageFraction,
    co2Fraction,
    greenhouseIndex,
  });

  return {
    star: equilibrium.star,
    albedo: equilibrium.albedo,
    orbitalDistanceAu: equilibrium.orbitalDistanceAu,
    stellarFlux: equilibrium.stellarFlux,
    equilibriumTemperature: equilibrium.equilibriumTemperature,
    greenhouseDelta: greenhouse.deltaKelvin,
    surfaceTemperature:
      equilibrium.equilibriumTemperature + greenhouse.deltaKelvin,
    greenhouseFactors: greenhouse.factors,
  };
}

export function evaluateTectonicActivity({
  radiusScale,
  gravityMps2,
  tectonicValue,
}: TectonicActivityParams): TectonicActivityResult {
  const sizeFactor = clamp(radiusScale, 0.2, 3.5);
  const gravityFactor = clamp(gravityMps2 / EARTH_SURFACE_GRAVITY, 0.25, 3);

  const baseRecommendation = clamp(
    5 * Math.pow(sizeFactor, 0.55) * Math.pow(gravityFactor, -0.1),
    0.5,
    9.5
  );

  const tolerance = clamp(1.2 + sizeFactor * 0.3, 1.0, 2.5);
  const range = {
    min: clamp(baseRecommendation - tolerance, 0, 10),
    max: clamp(baseRecommendation + tolerance, 0, 10),
  };

  let status: TectonicActivityResult["status"] = "optimal";
  if (tectonicValue < range.min) status = "too_low";
  if (tectonicValue > range.max) status = "high";

  const warnings: string[] = [];
  if (radiusScale < 0.5 && status !== "high") {
    warnings.push("Small worlds (<0.5 Earth radii) tend to lose tectonic activity over time.");
  }
  if (radiusScale > 1.8 && status === "too_low") {
    warnings.push("Large planets typically sustain vigorous tectonics; consider increasing activity.");
  }
  if (gravityFactor > 2.2 && status === "high") {
    warnings.push("Very high gravity may suppress plate motion despite high tectonic input.");
  }

  return {
    actual: tectonicValue,
    recommended: baseRecommendation,
    range,
    status,
    warnings,
  };
}

export function estimateCloudCover({
  surfaceTemperatureKelvin,
  oceanCoverageFraction,
  greenhouseIndex = 1,
}: CloudCoverParams): CloudCoverResult {
  const tempFactor = clamp(surfaceTemperatureKelvin / 288, 0.6, 1.6);
  const oceanFactor = clamp(oceanCoverageFraction, 0, 1);
  const greenhouseFactor = clamp(greenhouseIndex, 0.5, 2);

  const suggested = clamp(0.5 * oceanFactor * tempFactor * greenhouseFactor, 0.05, 0.95);
  let status: CloudCoverResult["status"] = "balanced";
  const warnings: string[] = [];

  if (suggested < 0.2) {
    status = "dry";
    warnings.push("Low cloud cover; expect high diurnal temperature swings.");
  } else if (suggested > 0.75) {
    status = "saturated";
    warnings.push("High cloud cover likely; consider cooling effects and reduced insolation.");
  }

  return {
    suggestedFraction: suggested,
    status,
    warnings,
  };
}

export function evaluateWindCoriolis({
  rotationPeriodHours,
  radiusScale,
}: WindCoriolisParams): WindCoriolisResult {
  const radiusMeters = radiusScale * EARTH_RADIUS_METERS;
  const rotationSeconds = rotationPeriodHours * 3600;
  const equatorialVelocity = (2 * Math.PI * radiusMeters) / rotationSeconds;
  const coriolisParameter = (4 * Math.PI / rotationSeconds);

  let qualitative: WindCoriolisResult["qualitative"] = "moderate";
  if (equatorialVelocity < 300) qualitative = "weak";
  if (equatorialVelocity > 600) qualitative = "strong";

  return {
    coriolisParameter,
    equatorialVelocity,
    qualitative,
  };
}

export interface AtmosphericPressureParams {
  surfacePressureAtm: number;
  gravityMps2: number;
  surfaceTemperatureKelvin: number;
  composition: Record<string, number>;
}

export interface AtmosphericPressureResult {
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

const classifyPressureStatus = (ratio: number): AtmosphericPressureResult["status"] => {
  if (ratio < 0.6) return "low";
  if (ratio > 1.8) return "high";
  return "nominal";
};

export function deriveSurfacePressure(gravityMps2: number): number {
  const expectedPressurePa = EARTH_COLUMN_MASS * gravityMps2;
  return expectedPressurePa / STANDARD_ATMOSPHERE_PA;
}

export function evaluateAtmosphericPressure({
  surfacePressureAtm,
  gravityMps2,
  surfaceTemperatureKelvin,
  composition,
}: AtmosphericPressureParams): AtmosphericPressureResult {
  const baselinePressureAtm = deriveSurfacePressure(gravityMps2);
  const pressureAtm = surfacePressureAtm ?? baselinePressureAtm;
  const pressurePa = pressureAtm * STANDARD_ATMOSPHERE_PA;
  const expectedPressureAtm = baselinePressureAtm;
  const expectedPressurePa = expectedPressureAtm * STANDARD_ATMOSPHERE_PA;

  const differenceRatio = expectedPressurePa > 0 ? pressurePa / expectedPressurePa : 0;
  const status = classifyPressureStatus(differenceRatio);

  const columnMass = gravityMps2 > 0 ? pressurePa / gravityMps2 : 0;
  const meanMolecularMass =
    Object.entries(composition).reduce((acc, [gas, fraction]) => {
      const molecularMass = resolveMolecularMass(gas);
      if (molecularMass === undefined) return acc;
      return acc + molecularMass * fraction;
    }, 0) || DEFAULT_MOLECULAR_MASSES.N2;

  const scaleHeightMeters =
    (BOLTZMANN_CONSTANT * Math.max(surfaceTemperatureKelvin, MIN_TEMPERATURE_K)) /
    (meanMolecularMass * Math.max(gravityMps2, 0.1));

  const warnings: string[] = [];
  if (status === "low") {
    warnings.push(
      `Surface pressure (${pressureAtm.toFixed(
        2
      )} atm) is low for ${gravityMps2.toFixed(2)} m/s² gravity; thin atmosphere expected.`
    );
  }
  if (status === "high") {
    warnings.push(
      `Surface pressure (${pressureAtm.toFixed(
        2
      )} atm) is high for ${gravityMps2.toFixed(
        2
      )} m/s² gravity; dense atmosphere may collapse.`
    );
  }
  if (scaleHeightMeters / 1000 > 25) {
    warnings.push(
      `Scale height ${(scaleHeightMeters / 1000).toFixed(
        1
      )} km suggests extremely extended atmosphere.`
    );
  } else if (scaleHeightMeters / 1000 < 3) {
    warnings.push(
      `Scale height ${(scaleHeightMeters / 1000).toFixed(
        1
      )} km suggests a very compressed atmosphere.`
    );
  }

  return {
    pressureAtm,
    expectedPressureAtm,
    columnMassKgPerM2: columnMass,
    meanMolecularMassKg: meanMolecularMass,
    scaleHeightKm: scaleHeightMeters / 1000,
    earthNormalizedPressure: pressureAtm,
    differenceRatio,
    status,
    warnings,
  };
}

export interface OrbitalPeriodParams {
  starType: string;
  orbitalDistanceAu: number;
}

export interface OrbitalPeriodResult {
  star: StarData;
  orbitalDistanceAu: number;
  periodSeconds: number;
  periodDays: number;
  periodYears: number;
}

export function calculateOrbitalPeriod({
  starType,
  orbitalDistanceAu,
}: OrbitalPeriodParams): OrbitalPeriodResult {
  const star = getStarData(starType);
  const semiMajorAxisMeters =
    orbitalDistanceAu * PHYSICAL_CONSTANTS.ASTRONOMICAL_UNIT_METERS;
  const periodSeconds =
    2 *
    Math.PI *
    Math.sqrt(
      Math.pow(semiMajorAxisMeters, 3) /
        (GRAVITATIONAL_CONSTANT * star.massKg)
    );
  return {
    star,
    orbitalDistanceAu,
    periodSeconds,
    periodDays: periodSeconds / (60 * 60 * 24),
    periodYears: periodSeconds / EARTH_YEAR_SECONDS,
  };
}

export interface HillSphereParams {
  starType: string;
  planetMassKg: number;
  orbitalDistanceAu: number;
}

export interface HillSphereResult {
  star: StarData;
  orbitalDistanceAu: number;
  radiusMeters: number;
  radiusKilometers: number;
  radiusAu: number;
}

export function calculateHillSphere({
  starType,
  planetMassKg,
  orbitalDistanceAu,
}: HillSphereParams): HillSphereResult {
  const star = getStarData(starType);
  const semiMajorAxisMeters =
    orbitalDistanceAu * PHYSICAL_CONSTANTS.ASTRONOMICAL_UNIT_METERS;
  const radiusMeters =
    semiMajorAxisMeters *
    Math.cbrt(planetMassKg / (3 * star.massKg));

  return {
    star,
    orbitalDistanceAu,
    radiusMeters,
    radiusKilometers: radiusMeters / 1000,
    radiusAu: radiusMeters / PHYSICAL_CONSTANTS.ASTRONOMICAL_UNIT_METERS,
  };
}

export const PHYSICS_CONSTANTS = {
  GRAVITATIONAL_CONSTANT,
  BOLTZMANN_CONSTANT,
  EARTH_RADIUS_METERS,
  EARTH_SURFACE_GRAVITY,
  ATOMIC_MASS_UNIT,
  DEFAULT_MOLECULAR_MASSES,
};

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

export type {
  SurfaceGravityResult,
  EscapeVelocityResult,
  GasRetentionDetail,
  AtmosphericRetentionResult,
};
