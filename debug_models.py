
import sys
import os
import json
import torch

# Add hifi_gan to path
HIFI_GAN_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'hifi_gan')
sys.path.append(HIFI_GAN_DIR)

try:
    from models import Generator
    print("Successfully imported Generator")
except ImportError as e:
    print(f"Failed to import Generator: {e}")
    sys.exit(1)

class AttrDict(dict):
    def __init__(self, *args, **kwargs):
        super(AttrDict, self).__init__(*args, **kwargs)
        self.__dict__ = self

def test_init():
    config_path = os.path.join(HIFI_GAN_DIR, 'config_v1.json')
    if not os.path.exists(config_path):
        print(f"Config not found at {config_path}")
        return

    with open(config_path) as f:
        data = f.read()
        json_config = json.loads(data)
        config = AttrDict(json_config)
    
    print("Config loaded.")
    try:
        g = Generator(config)
        print("Generator instantiated successfully.")
    except Exception as e:
        print(f"Generator instantiation failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_init()
