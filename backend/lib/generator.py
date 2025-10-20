import json
import os
from datetime import datetime
from lib.services.planet import PlanetService


class PlanetGenerator:
    def __init__(self, config_path: str):
        self.service = PlanetService(config_path)
        self.data = self.service.data
        self.generated = {}

    def generate(self):
        p = self.data["parameters"]
        physics = p["physics"]
        hydro = p["hydrology"]
        stellar = p["stellar"]
        geo = p["geology"]
        atm = p["atmosphere"]
        phys = p["physical"]

        # === Input Parameters ===
        gravity = physics.get("gravity_g", 1.0)
        # Normalize and clamp ocean coverage between 0 and 1
        ocean_fraction = min(max(float(hydro.get("ocean_fraction", 0.68)), 0.0), 1.0)

        tilt = stellar.get("axial_tilt_deg", 23.5)
        rotation_period = stellar.get("rotation_period_hours", 24)
        distance_au = stellar.get("orbital_distance_au", 1.0)
        tectonic_level = geo.get("tectonic_activity_level", 3.0)

        # === Derived Physical & Geological Values ===
        crust_stress_index = round((tectonic_level / 10) * gravity * 100, 2)
        plate_velocity_cm_yr = round(tectonic_level * 0.45 + gravity * 0.1, 2)
        mountain_formation_factor = round(1.0 + tectonic_level * 0.2, 2)
        volcanic_flux_factor = round(1.0 + tectonic_level / 10.0, 2)
        geothermal_flux_w_m2 = round(0.06 + tectonic_level * 0.01, 3)

        # === Climate and Stellar Values ===
        solar_flux_rel = round(1 / (distance_au ** 2), 3)
        mean_surface_temp_k = round(
            288 - (ocean_fraction * 10)
            + (tilt * 0.05)
            - (gravity * 0.8)
            + (volcanic_flux_factor * 2),
            2,
        )

        # === Pack Result ===
        self.generated = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "parameters": p,
            "physics": physics,
            "stellar": stellar,
            "hydrology": {
                "ocean_fraction": ocean_fraction,
                "surface_water_fraction": round(ocean_fraction, 3),
            },
            "geology": {
                "tectonic_activity_level": tectonic_level,
                "crust_stress_index": crust_stress_index,
                "plate_velocity_cm_yr": plate_velocity_cm_yr,
                "mountain_formation_factor": mountain_formation_factor,
                "volcanic_flux_factor": volcanic_flux_factor,
                "geothermal_flux_w_m2": geothermal_flux_w_m2,
            },
            "climate": {
                "mean_surface_temp_k": mean_surface_temp_k,
                "solar_flux_rel": solar_flux_rel,
                "cloud_cover_fraction": atm.get("cloud_cover_fraction", 0.4),
                "surface_pressure_atm": atm.get("surface_pressure_atm", 1.0),
            },
            "physical": phys,
        }

        return self.generated
