"use client";
import { useState } from "react";
import Tooltip from "./Tooltip";

interface Props {
  gravity: number;
  oceanFraction: number;
  axialTilt: number;
  pressure: number;
  orbitalDist: number;
  rotationPeriod: number;
  cloudCover: number;
  tectonic: number;
  planetSize: number;
  setGravity: (n: number) => void;
  setOceanFraction: (n: number) => void;
  setAxialTilt: (n: number) => void;
  setPressure: (n: number) => void;
  setOrbitalDist: (n: number) => void;
  setRotationPeriod: (n: number) => void;
  setCloudCover: (n: number) => void;
  setTectonic: (n: number) => void;
  setPlanetSize: (n: number) => void;
  onGenerate: (vals: Record<string, number>) => void;
}

export default function ControlPanel({
  gravity,
  oceanFraction,
  axialTilt,
  pressure,
  orbitalDist,
  rotationPeriod,
  cloudCover,
  tectonic,
  planetSize,
  setGravity,
  setOceanFraction,
  setAxialTilt,
  setPressure,
  setOrbitalDist,
  setRotationPeriod,
  setCloudCover,
  setTectonic,
  setPlanetSize,
  onGenerate,
}: Props) {
  const [localValues, setLocalValues] = useState({
    gravity,
    oceanFraction,
    axialTilt,
    pressure,
    orbitalDist,
    rotationPeriod,
    cloudCover,
    tectonic,
    planetSize,
  });

  const applyChanges = () => {
    setGravity(localValues.gravity);
    setOceanFraction(localValues.oceanFraction);
    setAxialTilt(localValues.axialTilt);
    setPressure(localValues.pressure);
    setOrbitalDist(localValues.orbitalDist);
    setRotationPeriod(localValues.rotationPeriod);
    setCloudCover(localValues.cloudCover);
    setTectonic(localValues.tectonic);
    setPlanetSize(localValues.planetSize);
    onGenerate(localValues);
  };

  const handleChange = (key: keyof typeof localValues, value: number) => {
    setLocalValues((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="w-full flex flex-wrap items-center justify-center gap-3 p-3 bg-gray-900/80 backdrop-blur-md border-b border-gray-700">
      {[
        {
          id: "gravity",
          label: "Gravity (g)",
          min: 0.1,
          max: 3,
          step: 0.05,
          text: "Determines surface weight and atmospheric retention. Higher gravity compresses the atmosphere, lowers mountain height, and increases surface pressure.",
        },
        {
          id: "oceanFraction",
          label: "Ocean Coverage",
          min: 0,
          max: 1,
          step: 0.01,
          text: "Fraction of the planet covered by oceans. More water moderates temperature but reduces visible land area.",
        },
        {
          id: "axialTilt",
          label: "Axial Tilt (°)",
          min: 0,
          max: 45,
          step: 0.5,
          text: "Angle between the rotation axis and orbital plane. Controls seasonal variation—higher tilt means harsher seasons and stronger polar contrast.",
        },
        {
          id: "pressure",
          label: "Atmospheric Pressure (atm)",
          min: 0.1,
          max: 10,
          step: 0.1,
          text: "Surface air pressure in Earth atmospheres. Denser atmospheres trap heat (greenhouse effect), thinner ones lose it quickly.",
        },
        {
          id: "orbitalDist",
          label: "Orbital Distance (AU)",
          min: 0.1,
          max: 5,
          step: 0.1,
          text: "Distance from the parent star in astronomical units. Closer orbits mean more stellar radiation and higher temperatures; farther means colder, dimmer light.",
        },
        {
          id: "rotationPeriod",
          label: "Day Length (hours)",
          min: 4,
          max: 96,
          step: 1,
          text: "Time taken for one full rotation. Shorter days spin the planet faster (stronger Coriolis effects and faster winds), longer days mean slower rotation and wider temperature swings.",
        },
        {
          id: "cloudCover",
          label: "Cloud Cover (%)",
          min: 0,
          max: 1,
          step: 0.05,
          text: "Proportion of the sky covered by clouds. High values brighten the planet (increased albedo) but cool the surface slightly.",
        },
        {
          id: "tectonic",
          label: "Tectonic Activity",
          min: 0,
          max: 10,
          step: 0.5,
          text: "Relative geological activity. Drives mountain building and volcanism; higher values mean rougher terrain and more active crust.",
        },
        {
          id: "planetSize",
          label: "Planet Radius (×Earth)",
          min: 0.3,
          max: 3,
          step: 0.05,
          text: "Scales the overall planet size. Larger planets have stronger gravity and more curvature; smaller ones look rockier and airless.",
        },
      ].map((slider) => (
        <Tooltip key={slider.id} id={slider.id} text={slider.text}>
          <label className="flex flex-col items-center text-xs text-gray-200 whitespace-nowrap">
            <span>
              {slider.label}:{" "}
              {slider.id === "oceanFraction" || slider.id === "cloudCover"
                ? Math.round(localValues[slider.id as keyof typeof localValues] * 100) + "%"
                : localValues[slider.id as keyof typeof localValues].toFixed(2)}
            </span>
            <input
              type="range"
              min={slider.min}
              max={slider.max}
              step={slider.step}
              value={localValues[slider.id as keyof typeof localValues]}
              onChange={(e) =>
                handleChange(slider.id as keyof typeof localValues, parseFloat(e.target.value))
              }
              className="w-28 accent-blue-500"
            />
          </label>
        </Tooltip>
      ))}

      <button
        onClick={applyChanges}
        className="ml-4 px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium"
      >
        Generate
      </button>
    </div>
  );
}
