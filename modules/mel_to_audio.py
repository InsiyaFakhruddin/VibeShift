import torch
import numpy as np
import os
import sys
import json
import soundfile as sf

# Add hifi_gan to path
# Assuming the structure:
# VibeShift/
#   modules/
#     mel_to_audio.py
#   hifi_gan/
#     models.py
#     config_v1.json
#     generator_v1


CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
# hifi_gan is now in the same modules directory, or a subdirectory of it?
# The user asked to put it IN modules folder. So it should be modules/hifi_gan
HIFI_GAN_DIR = os.path.join(CURRENT_DIR, 'hifi_gan')

if HIFI_GAN_DIR not in sys.path:
    sys.path.append(HIFI_GAN_DIR)

try:
    from models import Generator
except ImportError:
    # If hifi_gan is not found or not setup yet, we might want to handle it gracefully
    # But for now let's assume it will be there.
    # We can also try importing with package prefix if it was installed as a package, 
    # but here it's a raw repo clone.
    print(f"Warning: Could not import Generator from {HIFI_GAN_DIR}. Make sure hifi_gan is installed/downloaded.")
    Generator = None

class MelToAudio:
    def __init__(self, device='cpu'):
        self.device = torch.device(device)
        self.generator = None
        self.hifi_gan_dir = HIFI_GAN_DIR
        self.config_path = os.path.join(self.hifi_gan_dir, 'config_v1.json')
        self.model_path = os.path.join(self.hifi_gan_dir, 'generator_v1')
        
        self._load_model()

    def _load_model(self):
        if not os.path.exists(self.config_path):
            raise FileNotFoundError(f"Config file not found at {self.config_path}")
        
        if not os.path.exists(self.model_path):
            print(f"\n[ERROR] Model file not found at {self.model_path}")
            print("Please download the HiFi-GAN model manually:")
            print("Option 1 (GitHub Releases - if available):")
            print("   Download 'generator_v1' from https://github.com/jik876/hifi-gan/releases/tag/v1")
            print("Option 2 (Google Drive - Official):")
            print("   https://drive.google.com/drive/folders/1-eEYTB5Av9jNql0WGBlRoi-WH2J7bp5Y?usp=sharing")
            print("   Look for 'UNIVERSAL_V1' folder -> 'g_02500000' (or similar best checkpoint)")
            print(f"3. Place the file in: {self.hifi_gan_dir}")
            print("4. RENAME the file to 'generator_v1' if it has a different name.")
            raise FileNotFoundError(f"Model file not found at {self.model_path}")

        try:
            with open(self.config_path) as f:
                data = f.read()
                json_config = json.loads(data)
                # The generic configuration might need to be converted to an object 
                # if the Generator expects an object/AttrDict.
                # Looking at HiFi-GAN code, it usually expects an AttrDict.
                class AttrDict(dict):
                    def __init__(self, *args, **kwargs):
                        super(AttrDict, self).__init__(*args, **kwargs)
                        self.__dict__ = self
                
                self.config = AttrDict(json_config)

            self.generator = Generator(self.config)
            state_dict = torch.load(self.model_path, map_location=self.device)
            self.generator.load_state_dict(state_dict['generator'])
            self.generator.eval()
            self.generator.remove_weight_norm()
            self.generator.to(self.device)
            print("HiFi-GAN generator loaded successfully.")
            
        except Exception as e:
            print(f"Error loading HiFi-GAN model: {e}")
            raise

    def convert(self, mel_spectrogram):
        """
        Convert mel-spectrogram to audio.
        Args:
            mel_spectrogram: numpy array (n_mels, time) or tensor (1, n_mels, time)
                             HiFi-GAN expects (1, 80, T)
        Returns:
            audio: numpy array (samples,)
        """
        if self.generator is None:
            raise RuntimeError("Generator not initialized.")

        # Ensure input is a tensor
        if isinstance(mel_spectrogram, np.ndarray):
            mel_tensor = torch.from_numpy(mel_spectrogram)
        else:
            mel_tensor = mel_spectrogram

        # Ensure shape is (1, 80, T)
        if mel_tensor.dim() == 2:
             # (80, T) -> (1, 80, T)
             mel_tensor = mel_tensor.unsqueeze(0)
        
        mel_tensor = mel_tensor.to(self.device)

        with torch.no_grad():
            generated_audio = self.generator(mel_tensor)
        
        # Output shape is (1, 1, samples) or (1, samples) depending on version
        # We need to squeeze it to 1D
        audio_out = generated_audio.squeeze().cpu().numpy()
        
        return audio_out
    
    def save(self, audio, path, sample_rate=22050):
        sf.write(path, audio, sample_rate)
        print(f"Audio saved to {path}")

if __name__ == "__main__":
    # Test stub
    # Create a dummy mel to test instantiation if possible
    try:
        m2a = MelToAudio()
        print("MelToAudio initialized successfully.")
    except Exception as e:
        print(f"Initialization failed: {e}")

