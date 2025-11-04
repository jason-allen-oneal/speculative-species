"use client";

export default function PhysicsInfo({
  surfaceGravity,
  escapeVelocity,
  retention,
  temperature,
  pressure,
  orbital,
  hillSphere,
  tectonic,
  cloudSuggestion,
  wind,
}: PhysicsInfoProps) {
  const alerts = [...retention.warnings, ...pressure.warnings, ...tectonic.warnings, ...cloudSuggestion.warnings];

  const gravityPercent = surfaceGravity.relativeToEarthG * 100;
  const surfaceTempC = temperature.surfaceTemperature - 273.15;
  const equilibriumTempC = temperature.equilibriumTemperature - 273.15;
  const greenhouseDeltaC = temperature.greenhouseDelta;
  const pressureText = pressure.pressureAtm;
  const windSpeedKmh = wind.equatorialVelocity * 3.6;
  const moonZoneMillionKm = hillSphere.radiusKilometers / 1_000_000;

  const tectonicStatusCopy: Record<typeof tectonic.status, string> = {
    too_low: "Mostly quiet crust",
    optimal: "Earth-like plate motion",
    high: "Restless tectonics",
  };

  const cloudStatusCopy: Record<typeof cloudSuggestion.status, string> = {
    dry: "Skies stay mostly clear",
    balanced: "Mix of sun and clouds",
    saturated: "Thick cloud blanket",
  };

  const windStatusCopy: Record<typeof wind.qualitative, string> = {
    weak: "Gentle winds",
    moderate: "Steady winds",
    strong: "Stormy winds",
  };

  const statTiles: Array<MetricCardProps> = [
    {
      label: "Surface Gravity",
      value: `${gravityPercent.toFixed(0)}% of Earth's pull`,
      detail: `${surfaceGravity.metersPerSecondSquared.toFixed(2)} m/s² at the ground`,
    },
    {
      label: "How Fast to Leave",
      value: `${escapeVelocity.kilometersPerSecond.toFixed(1)} km/s launch speed`,
      detail: "For comparison, Earth needs ~11.2 km/s",
    },
    {
      label: "Typical Temperature",
      value: `${surfaceTempC.toFixed(0)} °C (~${temperature.surfaceTemperature.toFixed(0)} K)`,
      detail: `Sunlight alone gives ~${equilibriumTempC.toFixed(0)} °C; the air adds +${greenhouseDeltaC.toFixed(0)} °C`,
    },
    {
      label: "Air Pressure",
      value: `${pressureText.toFixed(2)} × Earth's air pressure`,
      detail: `Model expects ~${pressure.expectedPressureAtm.toFixed(2)} × Earth`,
    },
    {
      label: "Geology Activity",
      value: `${tectonicStatusCopy[tectonic.status]}`,
      detail: `Current level ${tectonic.actual.toFixed(1)} (goal ${tectonic.range.min.toFixed(1)}–${tectonic.range.max.toFixed(1)})`,
    },
    {
      label: "Likely Cloud Cover",
      value: `${(cloudSuggestion.suggestedFraction * 100).toFixed(0)}% ${cloudStatusCopy[cloudSuggestion.status]}`,
      detail: "Cloud slider stays manual for fine tuning",
    },
    {
      label: "Wind/Coriolis",
      value: windStatusCopy[wind.qualitative],
      detail: `Estimated ${windSpeedKmh.toFixed(0)} km/h at the equator`,
    },
    {
      label: "Room for Moons",
      value: `Stable orbits out to ~${moonZoneMillionKm.toFixed(1)} million km`,
      detail: `About ${hillSphere.radiusAu.toFixed(3)} AU from ${hillSphere.star.name}`,
    },
  ];

  return (
    <section className="bg-gray-900/85 border border-gray-700 rounded-lg shadow-lg p-3 text-[10px] text-gray-100 space-y-3 w-full">
      <header className="space-y-1">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-white/90">Planet Snapshot</h2>
        <div className="space-y-0.5 text-[10px] text-gray-400 leading-snug">
          <div>Star · {temperature.star.name} ({temperature.star.classification ?? temperature.star.type})</div>
          <div>Year length · {orbital.periodDays.toFixed(0)} days (~{orbital.periodYears.toFixed(2)} Earth years)</div>
        </div>
      </header>

      <div className="grid gap-2 sm:grid-cols-2">
        {statTiles.map((tile) => (
          <StatRow key={tile.label} {...tile} />
        ))}

        {alerts.length > 0 && (
          <div className="sm:col-span-2 flex flex-col gap-1 rounded-md border border-red-700/60 bg-red-900/10 px-3 py-2 text-[10px] text-red-200">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-red-300">
              Alerts
            </div>
            <ul className="space-y-0.5">
              {alerts.map((warning) => (
                <li key={warning}>• {warning}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

function StatRow({ label, value, detail }: MetricCardProps) {
  return (
    <div className="flex flex-col gap-0.5 rounded-md border border-gray-700/50 bg-gray-800/40 px-2 py-1.5">
      <div className="text-[8px] uppercase tracking-wide text-gray-400">
        {label}
      </div>
      <div className="text-[11px] font-semibold text-white leading-snug">{value}</div>
      {detail && <div className="text-[9px] text-gray-400 leading-snug">{detail}</div>}
    </div>
  );
}
