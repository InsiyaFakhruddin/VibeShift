"""
Full pipeline: Audio → Mel → CycleGAN → Mel → Audio
Jazz → Disco Genre Transformation
"""
import torch
from audio_to_mel   import audio_to_mel
from cyclegan      import CycleGAN
from mel_to_audio  import MelToAudio

GENRE_A = 'jazz'
GENRE_B = 'rock'

print("=" * 65)
print(f"🎵 Genre Conversion: {GENRE_A.upper()} → {GENRE_B.upper()}")
print("=" * 65)
print()

# ── Load CycleGAN ─────────────────────────────────────────────────
print(f"Loading trained model...")
model = CycleGAN(device='cuda' if torch.cuda.is_available() else 'cpu')

# Try to load the latest checkpoint (epoch 250 - the best one before error)
checkpoint_path = f'checkpoints/{GENRE_A}_to_{GENRE_B}/final.pt'
try:
    model.load(checkpoint_path)
    print(f"✅ Model loaded from {checkpoint_path}")
except FileNotFoundError:
    # Fallback to final.pt if epoch_250.pt doesn't exist
    model.load(f'checkpoints/{GENRE_A}_to_{GENRE_B}/final.pt')
    print(f"✅ Model loaded from checkpoints/{GENRE_A}_to_{GENRE_B}/final.pt")

print()

# ── Load BigVGAN-v2 ──────────────────────────────────────────
print(f"Loading BigVGAN-v2 for audio reconstruction...")
m2a = MelToAudio()
print(f"✅ BigVGAN-v2 ready")
print()

# ── Convert ───────────────────────────────────────────────────────
input_path  = 'test_cases\\genre_change\\Jazz2.mp3'
output_path = f'output_{GENRE_A}_to_{GENRE_B}.wav'

print(f"Converting audio...")
mel      = audio_to_mel(input_path)               # (1, 80, T)
print(f"  ✓ Mel-spectrogram extracted: {mel.shape}")

fake_mel = model.convert_a_to_b(mel)              # (1, 80, T)
# Clamp the fake mel to HiFi-GAN's expected range to prevent buzzing
fake_mel = torch.clamp(fake_mel, min=-11.5, max=1.5)
print(f"  ✓ Genre transformation applied: {fake_mel.shape}")

audio    = m2a.convert(fake_mel)
print(f"  ✓ Audio reconstructed: {audio.shape}")

raw_output_path = f'output_{GENRE_A}_to_{GENRE_B}_raw.wav'
m2a.save(audio, raw_output_path)
print(f"  ✓ Raw audio saved to {raw_output_path}")


print(f"✅ Done! {'🎵' * 10}")
print(f"Raw output: {raw_output_path}")

