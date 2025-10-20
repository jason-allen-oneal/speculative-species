from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import json
import os
import uuid

from lib.generator import PlanetGenerator
from lib.services.planet import PlanetService

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(BASE_DIR, "config.json")
TMP_DIR = BASE_DIR


@app.post("/generate")
async def generate_planet(request: Request):
    """Accept updated parameters from frontend and regenerate the planet"""
    payload = await request.json()

    # Create unique tmp config for this user session
    session_id = str(uuid.uuid4())[:8]
    tmp_path = os.path.join(TMP_DIR, f"tmp_config_{session_id}.json")

    # Load the base config
    service = PlanetService(CONFIG_PATH)
    

    # Update parameters dynamically
    updates = {
        "parameters.physics.gravity_g": payload.get("gravity_g"),
        "parameters.hydrology.ocean_fraction": payload.get("ocean_fraction"),
        "parameters.stellar.axial_tilt_deg": payload.get("axial_tilt_deg"),
        "parameters.atmosphere.surface_pressure_atm": payload.get("surface_pressure_atm"),
        "parameters.stellar.orbital_distance_au": payload.get("orbital_distance_au"),
        "parameters.stellar.rotation_period_hours": payload.get("rotation_period_hours"),
        "parameters.atmosphere.cloud_cover_fraction": payload.get("cloud_cover_fraction"),
        "parameters.geology.tectonic_activity_level": payload.get("tectonic_activity_level"),
        "parameters.physical.radius_scale": payload.get("radius_scale", 1.0),
    }

    for key, val in updates.items():
        if val is not None:
            service.set_value(key, val)

    # Save new tmp config
    service.save(tmp_path)
    print(f"[+] Saved planet configuration to {os.path.basename(tmp_path)}")

    # Generate planet data using updated config
    generator = PlanetGenerator(config_path=tmp_path)
    result = generator.generate()

    return {"session_id": session_id, "generated": result}


@app.get("/defaults")
async def get_defaults():
    """Return base defaults for initializing frontend sliders"""
    service = PlanetService(CONFIG_PATH)
    return service.data
