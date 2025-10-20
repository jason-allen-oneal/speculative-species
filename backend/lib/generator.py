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

        # === Atmospheric Parameters ===
        pressure_atm = atm.get("surface_pressure_atm", 1.0)
        cloud_cover = atm.get("cloud_cover_fraction", 0.4)
        radius_scale = phys.get("radius_scale", 1.0)

        # === Derived Physical & Geological Values ===
        # Gravity affects both crustal stress and plate dynamics
        crust_stress_index = round((tectonic_level / 10) * gravity * 100, 2)
        plate_velocity_cm_yr = round(tectonic_level * 0.45 + gravity * 0.1, 2)
        mountain_formation_factor = round(1.0 + tectonic_level * 0.2 - (gravity - 1.0) * 0.15, 2)
        volcanic_flux_factor = round(1.0 + tectonic_level / 10.0, 2)
        geothermal_flux_w_m2 = round(0.06 + tectonic_level * 0.01, 3)
        
        # === Climate and Stellar Values ===
        solar_flux_rel = round(1 / (distance_au ** 2), 3)
        
        # Enhanced temperature calculation with atmospheric effects
        base_temp = 288 * solar_flux_rel
        # Ocean moderates temperature (higher heat capacity)
        ocean_effect = -(ocean_fraction * 8)
        # Atmospheric pressure increases greenhouse effect
        greenhouse_effect = (pressure_atm - 1.0) * 15
        # Clouds increase albedo (cooling effect)
        cloud_effect = -(cloud_cover * 12)
        # Axial tilt affects average temperature slightly
        tilt_effect = tilt * 0.05
        # Gravity affects atmospheric retention
        gravity_effect = -(gravity - 1.0) * 3
        # Volcanic activity adds heat
        volcanic_effect = volcanic_flux_factor * 1.5
        
        mean_surface_temp_k = round(
            base_temp + ocean_effect + greenhouse_effect + 
            cloud_effect + tilt_effect + gravity_effect + volcanic_effect,
            2,
        )
        
        # === Atmospheric Dynamics ===
        # Coriolis effect strength (affected by rotation period)
        coriolis_strength = round(24.0 / rotation_period, 3)
        # Wind speed factor (faster rotation = faster winds)
        avg_wind_speed_m_s = round(
            10 * coriolis_strength * (pressure_atm ** 0.5) * (1 + tectonic_level * 0.05),
            2
        )
        
        # === Weather System Parameters ===
        # Temperature gradient from equator to pole
        temp_gradient_k = round(40 * tilt / 23.5 * (1 - ocean_fraction * 0.3), 2)
        # Precipitation intensity
        precip_factor = round(ocean_fraction * cloud_cover * 2.5, 2)
        # Storm frequency (higher on faster rotating, high pressure planets)
        storm_frequency = round(
            coriolis_strength * pressure_atm * (1 + cloud_cover), 2
        )

        # === Pack Result ===
        self.generated = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "parameters": p,
            "physics": {
                **physics,
                "effective_gravity_m_s2": round(gravity * 9.81, 2),
            },
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
                "mean_surface_temp_c": round(mean_surface_temp_k - 273.15, 2),
                "solar_flux_rel": solar_flux_rel,
                "cloud_cover_fraction": cloud_cover,
                "surface_pressure_atm": pressure_atm,
                "temp_gradient_equator_pole_k": temp_gradient_k,
                "precipitation_factor": precip_factor,
                "storm_frequency_index": storm_frequency,
            },
            "atmosphere": {
                "surface_pressure_atm": pressure_atm,
                "coriolis_strength": coriolis_strength,
                "avg_wind_speed_m_s": avg_wind_speed_m_s,
                "scale_height_km": round(8.5 / gravity, 2),
            },
            "physical": phys,
        }

        return self.generated
