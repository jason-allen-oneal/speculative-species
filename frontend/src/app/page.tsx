"use client";
import { useState } from "react";
import PlanetCanvas from "@/components/PlanetCanvas";
import ControlPanel from "@/components/ControlPanel";

export default function HomePage() {
  // === Core Planet Parameters ===
  const [gravity, setGravity] = useState(1.0);
  const [oceanFraction, setOceanFraction] = useState(0.68);
  const [axialTilt, setAxialTilt] = useState(23.5);
  const [pressure, setPressure] = useState(1.0);
  const [orbitalDist, setOrbitalDist] = useState(1.0);
  const [rotationPeriod, setRotationPeriod] = useState(24.0);
  const [cloudCover, setCloudCover] = useState(0.4);
  const [tectonic, setTectonic] = useState(3.0);
  const [planetSize, setPlanetSize] = useState(1.0); // NEW

  // === Generated Planet Data ===
  const [planetData, setPlanetData] = useState<any>(null);

  // === API Call ===
  const handleGenerate = async (vals: Record<string, number>) => {
      const payload = {
        gravity_g: vals.gravity,
        ocean_fraction: vals.oceanFraction,
        axial_tilt_deg: vals.axialTilt,
        surface_pressure_atm: vals.pressure,
        orbital_distance_au: vals.orbitalDist,
        rotation_period_hours: vals.rotationPeriod,
        cloud_cover_fraction: vals.cloudCover,
        tectonic_activity_level: vals.tectonic,
        radius_scale: vals.planetSize,
      };


    try {
      console.log("generation payload", payload);
      const res = await fetch("http://127.0.0.1:8000/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`Backend returned ${res.status}`);

      const data = await res.json();
      setPlanetData(data);
      console.log("Planet generated:", data.generated);
    } catch (err) {
      console.error("Generation error:", err);
    }
  };

  // === Render ===
  return (
    <main className="w-screen h-screen bg-gradient-to-b from-black via-gray-900 to-black text-white overflow-hidden flex flex-col">
      {/* === Top Controls Bar === */}
      <ControlPanel
        gravity={gravity}
        oceanFraction={oceanFraction}
        axialTilt={axialTilt}
        pressure={pressure}
        orbitalDist={orbitalDist}
        rotationPeriod={rotationPeriod}
        cloudCover={cloudCover}
        tectonic={tectonic}
        planetSize={planetSize}           // NEW PROP
        setPlanetSize={setPlanetSize}     // NEW PROP
        setGravity={setGravity}
        setOceanFraction={setOceanFraction}
        setAxialTilt={setAxialTilt}
        setPressure={setPressure}
        setOrbitalDist={setOrbitalDist}
        setRotationPeriod={setRotationPeriod}
        setCloudCover={setCloudCover}
        setTectonic={setTectonic}
        onGenerate={handleGenerate}
      />

      {/* === Planet Canvas === */}
      <div className="flex-grow flex items-center justify-center">
        <PlanetCanvas planetData={planetData} />
      </div>
    </main>
  );
}
