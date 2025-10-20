import json
import os


class PlanetService:
    def __init__(self, config_path: str):
        self.config_path = config_path
        self.data = None
        self.load_config()

    def load_config(self):
        if not os.path.exists(self.config_path):
            raise FileNotFoundError(f"Config file not found: {self.config_path}")
        with open(self.config_path, "r") as f:
            self.data = json.load(f)

    def save(self, out_path=None):
        out_path = out_path or self.config_path
        with open(out_path, "w") as f:
            json.dump(self.data, f, indent=2)

    def set_value(self, dotted_key: str, value):
        """Sets nested JSON value given a dotted path."""
        keys = dotted_key.split(".")
        ref = self.data
        for k in keys[:-1]:
            ref = ref.setdefault(k, {})
        ref[keys[-1]] = value
