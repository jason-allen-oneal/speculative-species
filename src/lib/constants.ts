export interface StarData {
  type: string;
  name: string;
  classification: string;
  temperatureKelvin: number;
  radiusMeters: number;
  luminosityWatts: number;
  massKg: number;
  colorHex: string;
}

const SOLAR_RADIUS_METERS = 6.957e8;
const SOLAR_LUMINOSITY_WATTS = 3.828e26;
const SOLAR_MASS_KG = 1.98847e30;

function clampColor(value: number) {
  return Math.min(255, Math.max(0, value));
}

function kelvinToHex(temperatureKelvin: number): string {
  const temp = temperatureKelvin / 100;
  let red: number;
  let green: number;
  let blue: number;

  if (temp <= 66) {
    red = 255;
    green = 99.4708025861 * Math.log(temp) - 161.1195681661;
    blue =
      temp <= 19 ? 0 : 138.5177312231 * Math.log(temp - 10) - 305.0447927307;
  } else {
    red = 329.698727446 * Math.pow(temp - 60, -0.1332047592);
    green = 288.1221695283 * Math.pow(temp - 60, -0.0755148492);
    blue = 255;
  }

  red = clampColor(red);
  green = clampColor(green);
  blue = clampColor(blue);

  const toHex = (channel: number) =>
    channel.toString(16).padStart(2, "0");

  return `#${toHex(Math.round(red))}${toHex(Math.round(green))}${toHex(
    Math.round(blue)
  )}`;
}

const STAR_CATALOG: Record<string, StarData> = {
  G2V: {
    type: "G2V",
    name: "Solar Analog",
    classification: "G-type main-sequence",
    temperatureKelvin: 5772,
    radiusMeters: SOLAR_RADIUS_METERS,
    luminosityWatts: SOLAR_LUMINOSITY_WATTS,
    massKg: SOLAR_MASS_KG,
    colorHex: kelvinToHex(5772),
  },
  K5V: {
    type: "K5V",
    name: "Orange Dwarf",
    classification: "K-type main-sequence",
    temperatureKelvin: 4400,
    radiusMeters: 0.7 * SOLAR_RADIUS_METERS,
    luminosityWatts: 0.17 * SOLAR_LUMINOSITY_WATTS,
    massKg: 0.7 * SOLAR_MASS_KG,
    colorHex: kelvinToHex(4400),
  },
  M1V: {
    type: "M1V",
    name: "Red Dwarf",
    classification: "M-type main-sequence",
    temperatureKelvin: 3700,
    radiusMeters: 0.49 * SOLAR_RADIUS_METERS,
    luminosityWatts: 0.08 * SOLAR_LUMINOSITY_WATTS,
    massKg: 0.5 * SOLAR_MASS_KG,
    colorHex: kelvinToHex(3700),
  },
  F5V: {
    type: "F5V",
    name: "Yellow-White Dwarf",
    classification: "F-type main-sequence",
    temperatureKelvin: 6500,
    radiusMeters: 1.3 * SOLAR_RADIUS_METERS,
    luminosityWatts: 2.5 * SOLAR_LUMINOSITY_WATTS,
    massKg: 1.4 * SOLAR_MASS_KG,
    colorHex: kelvinToHex(6500),
  },
};

const DEFAULT_STAR = STAR_CATALOG.G2V;

export function getStarData(starType: string | undefined): StarData {
  if (!starType) return DEFAULT_STAR;
  const normalized = starType.toUpperCase();
  return STAR_CATALOG[normalized] ?? DEFAULT_STAR;
}

export const PHYSICAL_CONSTANTS = {
  ASTRONOMICAL_UNIT_METERS: 1.495978707e11,
  SOLAR_RADIUS_METERS,
  SOLAR_LUMINOSITY_WATTS,
  SOLAR_MASS_KG,
};

export const STAR_DATA = STAR_CATALOG;
