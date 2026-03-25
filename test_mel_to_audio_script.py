
import sys
import os
import torch
import numpy as np
import soundfile as sf

# Add modules to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from modules.mel_to_audio import MelToAudio

def test_mel_to_audio():
    print("Testing MelToAudio...")
    
    # helper to create dummy mel
    def create_dummy_mel():
        # (80, 100)
        return torch.randn(80, 100)

    try:
        m2a = MelToAudio(device='cpu')
    except Exception as e:
        print(f"Failed to initialize MelToAudio: {e}")
        return

    mel = create_dummy_mel()
    print(f"Input mel shape: {mel.shape}")

    try:
        audio = m2a.convert(mel)
        print(f"Output audio shape: {audio.shape}")
        
        # approximate length: 100 * 256 (hop_length)
        expected_len = 100 * 256
        print(f"Expected approx length: {expected_len}")
        
    except Exception as e:
        print(f"Conversion failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_mel_to_audio()
