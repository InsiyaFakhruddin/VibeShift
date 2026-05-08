import torch
import numpy as np
import soundfile as sf
from modules.audio_to_mel import audio_to_mel, verify_mel

test_file = 'test_cases\\genre_change\\Jazz2.mp3'  # your test file

# ── Stage 1: Original mel ─────────────────────────────────────────
mel = audio_to_mel(test_file)
print("=== ORIGINAL MEL ===")
verify_mel(mel)

# Save what HiFi-GAN would produce from the ORIGINAL mel (no CycleGAN)
# If this sounds bad, the problem is HiFi-GAN, not CycleGAN
from modules.mel_to_audio import MelToAudio
m2a = MelToAudio()
audio_passthrough = m2a.convert(mel)
sf.write('debug_passthrough.wav', audio_passthrough, 22050)
print(">>> Listen to debug_passthrough.wav — should sound like the original")

# ── Stage 2: After CycleGAN ──────────────────────────────────────
from modules.cyclegan import CycleGAN
model = CycleGAN(device='cpu')
model.load('checkpoints/jazz_to_rock/final.pt')

fake_mel = model.convert_a_to_b(mel)
print("\n=== FAKE MEL (after CycleGAN) ===")
verify_mel(fake_mel)  # <-- this will tell you everything

fake_mel_clamped = torch.clamp(fake_mel, min=-11.5, max=1.5)
audio_converted = m2a.convert(fake_mel_clamped)
sf.write('debug_converted.wav', audio_converted, 22050)
print(">>> Listen to debug_converted.wav")