
import os
import sys
import torch
import numpy as np
import matplotlib.pyplot as plt
import librosa
import librosa.display
import soundfile as sf

# Add project root to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from modules.audio_to_mel import audio_to_mel
from modules.mel_to_audio import MelToAudio

def plot_mel(mel_tensor, save_path="test_mel_output.png"):
    """
    Plots the mel spectrogram.
    mel_tensor: (1, n_mels, T)
    """
    mel_np = mel_tensor.squeeze().numpy()
    
    plt.figure(figsize=(10, 4))
    # librosa.display.specshow expects db scale usually, but our mel is log-magnitude
    # which is similar to dB.
    librosa.display.specshow(mel_np, sr=22050, hop_length=256, x_axis='time', y_axis='mel')
    plt.colorbar(format='%+2.0f dB')
    plt.title('Mel-Spectrogram')
    plt.tight_layout()
    plt.savefig(save_path)
    plt.close()
    print(f"Mel spectrogram plot saved to {save_path}")

def run_test():
    # 1. Select audio file
    test_file = "test_cases/tutorial short clips.mp3"
    if not os.path.exists(test_file):
        print(f"Test file {test_file} not found.")
        return

    print(f"Processing {test_file}...")

    # 2. Convert Audio -> Mel
    try:
        # Load only first 10 seconds to make it quick
        # We need to modify audio_to_mel to support duration/offset or just load checking
        # But audio_to_mel currently converts the WHOLE thing or pads/cuts to 'duration' default 30s?
        # Let's inspect audio_to_mel arguments... it has duration=30.0 default. 
        # So it will take first 30s. That's fine.
        print("Converting Audio to Mel...")
        mel = audio_to_mel(test_file, duration=10.0) # limit to 10s for speed
        print(f"Mel shape: {mel.shape}")
        
        plot_mel(mel)

    except Exception as e:
        print(f"Audio -> Mel failed: {e}")
        import traceback
        traceback.print_exc()
        return

    # 3. Convert Mel -> Audio
    try:
        print("Initializing HiFi-GAN...")
        m2a = MelToAudio(device='cpu')
        
        print("Converting Mel to Audio...")
        audio_out = m2a.convert(mel)
        print(f"Generated audio shape: {audio_out.shape}")
        
        output_path = "test_end_to_end_output.wav"
        m2a.save(audio_out, output_path)
        print(f"Success! Audio saved to {output_path}")
        
    except Exception as e:
        print(f"Mel -> Audio failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    run_test()
