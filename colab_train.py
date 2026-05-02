# ============================================================
# VibeShift CycleGAN Training Script for Google Colab
# ============================================================
# This script trains CycleGAN for genre conversion using GPU
# Updated for n_mels=80 and new loss functions (MultiScaleSTFTLoss, weighted_mel_loss)
# 
# Usage: Change GENRE_A and GENRE_B below, then run all cells
# ============================================================

#@title # 1. Mount Google Drive (to save models)
#{#}markdown
from google.colab import drive
drive.mount('/content/drive')

#@title # 2. Clone Repository & Install Dependencies
#{#}markdown
import os
import subprocess

# Clone or update your repository
REPO_URL = "https://github.com/YOUR_USERNAME/VibeShift.git"  # Change to your repo
!git clone {REPO_URL} /content/VibeShift || cd /content/VibeShift && git pull

%cd /content/VibeShift

# Install requirements
!pip install torch torchvision torchaudio numpy scipy librosa soundfile

#@title # 3. Download GTZAN Dataset
#{#}markdown
import os
import urllib.request
import tarfile

# Create data directories
os.makedirs('Data/genres_original', exist_ok=True)
os.makedirs('Data/mels', exist_ok=True)

# Download GTZAN dataset (~1GB)
GTZAN_URL = "https://huggingface.co/datasets/marsyas/gtzan/resolve/main/gtzan.tar.gz"
GTZAN_PATH = "/content/gtzan.tar.gz"

print("Downloading GTZAN dataset...")
if not os.path.exists(GTZAN_PATH):
    urllib.request.urlretrieve(GTZAN_URL, GTZAN_PATH)
    print("Download complete!")

# Extract
print("Extracting...")
with tarfile.open(GTZAN_PATH, "r:gz") as tar:
    tar.extractall("Data/genres_original")

# Fix directory structure - GTZAN extracts to gtzan/genres_original/
if os.path.exists("Data/genres_original/gtzan"):
    # Move contents up
    for genre in os.listdir("Data/genres_original/gtzan/genres_original"):
        src = f"Data/genres_original/gtzan/genres_original/{genre}"
        dst = f"Data/genres_original/{genre}"
        if os.path.isdir(src):
            os.rename(src, dst)
    os.rmdir("Data/genres_original/gtzan/genres_original")
    os.rmdir("Data/genres_original/gtzan")

print("GTZAN dataset ready!")

#@title # 4. Convert Audio to Mel Spectrograms (80 mels)
#{#}markdown
import numpy as np
from modules.audio_to_mel import audio_to_mel, verify_mel
import warnings
warnings.filterwarnings('ignore')

GENRES = ['blues', 'classical', 'country', 'disco', 
          'hiphop', 'jazz', 'metal', 'pop', 'reggae', 'rock']

GTZAN_AUDIO = 'Data/genres_original'
GTZAN_MELS  = 'Data/mels'

print("Converting audio to mel spectrograms (80 mels)...")

for genre in GENRES:
    in_dir  = os.path.join(GTZAN_AUDIO, genre)
    out_dir = os.path.join(GTZAN_MELS, genre)
    os.makedirs(out_dir, exist_ok=True)
    
    if not os.path.exists(in_dir):
        print(f"Warning: {in_dir} not found, skipping {genre}")
        continue
        
    files = [f for f in os.listdir(in_dir) if f.endswith('.wav')]
    print(f"{genre}: converting {len(files)} files...")
    
    for fname in files:
        audio_path = os.path.join(in_dir, fname)
        npy_path   = os.path.join(out_dir, fname.replace('.wav', '.npy'))

        if os.path.exists(npy_path):
            continue

        try:
            mel = audio_to_mel(audio_path)  # Uses n_mels=80 by default
            verify_mel(mel, strict=True)     # Verify mel is in expected range
            np.save(npy_path, mel.squeeze(0).numpy())
        except Exception as e:
            print(f"  SKIP {fname}: {e}")

    print(f"  Done → {out_dir}")

print("\n✅ All mel spectrograms ready (80 mels)!")

#@title # 4.5 Optional: Separate vocals using Demucs
#{#}markdown
# Optional vocal separation for vocal/instrumental stem files.
# Run this before training if you want preprocessed stems in `Data/gtzan_stems`.
#
# !pip install demucs
# !python preprocess_data.py

#@title # 5. Training Configuration - SET YOUR GENRES HERE

GENRE_A = 'jazz'   # Source genre
GENRE_B = 'classical'  # Target genre

# Training settings
EPOCHS = 300
BATCH_SIZE = 1
SEGMENT_FRAMES = 256
N_RES_BLOCKS = 6
LEARNING_RATE = 2e-4

print(f"Training Configuration:")
print(f"  Genre A: {GENRE_A.upper()}")
print(f"  Genre B: {GENRE_B.upper()}")
print(f"  Direction: {GENRE_A} → {GENRE_B}")
print(f"  Epochs: {EPOCHS}")
print(f"  Batch Size: {BATCH_SIZE}")
print(f"  Res Blocks: {N_RES_BLOCKS}")
print(f"  Mel Bins: 80 (compatible with HiFi-GAN UNIVERSAL_V1)")

#@title # 6. Train CycleGAN Model
#{#}markdown
import torch
from modules.cyclegan import CycleGAN

print("=" * 65)
print(f"🚀 VibeShift CycleGAN Training: {GENRE_A} → {GENRE_B}")
print("=" * 65)

# Check CUDA
if torch.cuda.is_available():
    print(f"✅ CUDA Available: {torch.cuda.get_device_name(0)}")
    device = 'cuda'
else:
    print("⚠️  CUDA Not Available - using CPU")
    device = 'cpu'

# Create model (includes MultiScaleSTFTLoss and weighted_mel_loss)
model = CycleGAN(
    n_res_blocks    = N_RES_BLOCKS,
    lr              = LEARNING_RATE,
    lambda_cycle    = 10.0,
    lambda_identity = 5.0,
    device          = device,
)

# Train
model.train(
    root_a         = f'Data/mels/{GENRE_A}',
    root_b         = f'Data/mels/{GENRE_B}',
    epochs         = EPOCHS,
    batch_size     = BATCH_SIZE,
    segment_frames = SEGMENT_FRAMES,
    decay_start    = EPOCHS // 2,
    save_dir       = f'checkpoints/{GENRE_A}_to_{GENRE_B}',
    save_every     = 25,
)

print(f"\n✅ Training complete for {GENRE_A} → {GENRE_B}!")

#@title # 7. Save Model to Google Drive
#{#}markdown
import shutil
import os
from datetime import datetime

# Create backup folder with timestamp
timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
backup_dir = f"/content/drive/MyDrive/VibeShift_models/{GENRE_A}_to_{GENRE_B}_{timestamp}"
os.makedirs(backup_dir, exist_ok=True)

# Copy checkpoint files
checkpoint_dir = f'checkpoints/{GENRE_A}_to_{GENRE_B}'
if os.path.exists(checkpoint_dir):
    for f in os.listdir(checkpoint_dir):
        if f.endswith('.pt'):
            src = os.path.join(checkpoint_dir, f)
            dst = os.path.join(backup_dir, f)
            shutil.copy2(src, dst)
            print(f"✅ Saved: {f}")

print(f"\n📁 All models saved to: {backup_dir}")

#@title # 8. Test Conversion (Optional)
#{#}markdown
# Test the trained model with a sample audio file
import torch
from modules.audio_to_mel import audio_to_mel
from modules.cyclegan import CycleGAN
from modules.mel_to_audio import MelToAudio

# Load model
model = CycleGAN(device='cuda' if torch.cuda.is_available() else 'cpu')
model.load(f'checkpoints/{GENRE_A}_to_{GENRE_B}/final.pt')

# Load HiFi-GAN
m2a = MelToAudio()

# Test with a sample from training data
test_file = f'Data/genres_original/{GENRE_A}/jazz.00054.wav'  # Use any existing file
output_path = f'output_{GENRE_A}_to_{GENRE_B}_test.wav'

print(f"Testing conversion with: {test_file}")
mel = audio_to_mel(test_file)
fake_mel = model.convert_a_to_b(mel)
# Clamp to prevent buzzing (as per updated convert.py)
fake_mel = torch.clamp(fake_mel, min=-11.5, max=1.5)
audio = m2a.convert(fake_mel)
m2a.save(audio, output_path)

print(f"✅ Test conversion saved to: {output_path}")
print("\n🎉 Training pipeline complete!")