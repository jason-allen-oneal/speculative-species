"use client";
import { useState } from "react";

export default function ControlPanel({
  ocean,
  axialTilt,
  orbitalDist,
  rotationPeriod,
  cloudCover,
  tectonic,
  planetSize,
  setOcean,
  setAxialTilt,
  setOrbitalDist,
  setRotationPeriod,
  setCloudCover,
  setTectonic,
  setPlanetSize,
  onGenerate,
}: ControlPanelProps) {
  const [localValues, setLocalValues] = useState({
    ocean,
    axialTilt,
    orbitalDist,
    rotationPeriod,
    cloudCover,
    tectonic,
    planetSize,
  });

  const applyChanges = () => {
    // Apply local values to parent state via setters
    setOcean(localValues.ocean);
    setAxialTilt(localValues.axialTilt);
    setOrbitalDist(localValues.orbitalDist);
    setRotationPeriod(localValues.rotationPeriod);
    setCloudCover(localValues.cloudCover);
    setTectonic(localValues.tectonic);
    setPlanetSize(localValues.planetSize);
    if (onGenerate) onGenerate(localValues as Record<string, number>);
  };

  const handleSlider = (key: string, value: number) => {
    setLocalValues((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="w-full bg-gray-900/60 border-b border-gray-800 px-4 py-2 flex items-center gap-4">
      <div className="flex-1 flex items-center gap-6">
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-300">Ocean Coverage: {Math.round(localValues.ocean * 100)}%</label>
          <input
            aria-label="Ocean Coverage"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={localValues.ocean}
            onChange={(e) => handleSlider("ocean", parseFloat(e.target.value))}
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-300">Axial Tilt: {localValues.axialTilt.toFixed(2)}°</label>
          <input
            aria-label="Axial Tilt"
            type="range"
            min={0}
            max={90}
            step={0.01}
            value={localValues.axialTilt}
            onChange={(e) => handleSlider("axialTilt", parseFloat(e.target.value))}
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-300">Orbital Distance: {localValues.orbitalDist.toFixed(2)} AU</label>
          <input
            aria-label="Orbital Distance"
            type="range"
            min={0.1}
            max={10}
            step={0.01}
            value={localValues.orbitalDist}
            onChange={(e) => handleSlider("orbitalDist", parseFloat(e.target.value))}
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-300">Day Length: {localValues.rotationPeriod.toFixed(1)} hrs</label>
          <input
            aria-label="Day Length"
            type="range"
            min={1}
            max={1000}
            step={0.1}
            value={localValues.rotationPeriod}
            onChange={(e) => handleSlider("rotationPeriod", parseFloat(e.target.value))}
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-300">Cloud Cover: {Math.round(localValues.cloudCover * 100)}%</label>
          <input
            aria-label="Cloud Cover"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={localValues.cloudCover}
            onChange={(e) => handleSlider("cloudCover", parseFloat(e.target.value))}
            disabled
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-300">Tectonic Activity: {localValues.tectonic.toFixed(2)}</label>
          <input
            aria-label="Tectonic Activity"
            type="range"
            min={0}
            max={10}
            step={0.01}
            value={localValues.tectonic}
            onChange={(e) => handleSlider("tectonic", parseFloat(e.target.value))}
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-300">Planet Radius: {localValues.planetSize.toFixed(2)}×</label>
          <input
            aria-label="Planet Radius"
            type="range"
            min={0.1}
            max={5}
            step={0.01}
            value={localValues.planetSize}
            onChange={(e) => handleSlider("planetSize", parseFloat(e.target.value))}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={applyChanges}
          className="rounded-md bg-blue-600 px-3 py-1 text-sm font-semibold text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          Generate
        </button>
      </div>
    </div>
    );
  }
