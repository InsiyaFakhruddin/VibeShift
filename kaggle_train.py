# ============================================================
# VibeShift CycleGAN Training Script for Kaggle
# ============================================================
# This script trains CycleGAN for genre conversion using Kaggle GPU
# Updated for n_mels=80 and new loss functions (MultiScaleSTFTLoss, weighted_mel_loss)
# 
# Usage: 
#   1. Upload this script as a Kaggle Notebook
#   2. Add GTZAN dataset to input
#   3. Change GENRE_A and GENRE_B below
#   4. Run all cells
# ============================================================

#@title # 1. Setup and Install Dependencies
# %%writefile requirements.txt
# torch torchvision torchaudio numpy scipy librosa soundfile

# !pip install -r requirements.txt

#@title # 2. Import Libraries
import os
import sys
import torch
import numpy as np
import warnings
warnings.filterwarnings('ignore')

print("=" * 65)
print("🚀 VibeShift CycleGAN Training - Kaggle")
print("=" * 65)

# Check GPU
if torch.cuda.is_available():
    print(f"✅ GPU Available: {torch.cuda.get_device_name(0)}")
    print(f"   GPU Memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB")
    device = 'cuda'
else:
    print("⚠️  No GPU available")
    device = 'cpu'

# Set working directory
WORKING_DIR = '/kaggle/working'
DATA_DIR = '/kaggle/input'
OUTPUT_DIR = '/kaggle/output'

os.makedirs(f"{WORKING_DIR}/checkpoints", exist_ok=True)
os.makedirs(f"{OUTPUT_DIR}/models", exist_ok=True)

#@title # 3. Setup Dataset Paths
# Find GTZAN dataset
def find_gtzan_dir():
    """Find GTZAN dataset in input folders"""
    for root, dirs, files in os.walk(DATA_DIR):
        if 'genres_original' in dirs:
            return os.path.join(root, 'genres_original')
        # Check if we're in the genres folder directly
        if any(f.endswith('.wav') for f in files):
            return root
    return None

GTZAN_AUDIO = find_gtzan_dir()
if GTZAN_AUDIO:
    print(f"✅ Found GTZAN at: {GTZAN_AUDIO}")
else:
    print("⚠️  GTZAN not found - please add dataset to input")
    # Try common paths
    possible_paths = [
        "/kaggle/input/gtzan",
        "/kaggle/input/gtzan-genre-collection",
        "/kaggle/input/gtzan-dataset",
    ]
    for p in possible_paths:
        if os.path.exists(p):
            GTZAN_AUDIO = p
            print(f"✅ Found at: {GTZAN_AUDIO}")
            break

# Create mels directory
GTZAN_MELS = f"{WORKING_DIR}/Data/mels"
os.makedirs(GTZAN_MELS, exist_ok=True)

#@title # 4. Convert Audio to Mel Spectrograms (80 mels)
from modules.audio_to_mel import audio_to_mel, verify_mel

GENRES = ['blues', 'classical', 'country', 'disco', 
          'hiphop', 'jazz', 'metal', 'pop', 'reggae', 'rock']

print("\nConverting audio to mel spectrograms (80 mels)...")

for genre in GENRES:
    in_dir  = os.path.join(GTZAN_AUDIO, genre) if GTZAN_AUDIO else None
    out_dir = os.path.join(GTZAN_MELS, genre)
    os.makedirs(out_dir, exist_ok=True)
    
    if in_dir and os.path.exists(in_dir):
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
    else:
        print(f"⚠️  {genre}: input directory not found")

print("\n✅ Mel spectrograms ready (80 mels)!")

#@title # 4.5 Optional: Separate vocals using Demucs
# Optional vocal separation for vocal/instrumental stem files.
# Run this before training if you want preprocessed stems in `Data/gtzan_stems`.
#
# !pip install demucs
# !python preprocess_data.py

#@title # 5. Training Configuration - SET YOUR GENRES HERE
# ============================================================
# CHANGE THESE VALUES FOR DIFFERENT GENRE PAIRS
# ============================================================

GENRE_A = 'jazz'      # Source genre
GENRE_B = 'classical' # Target genre

# Training settings
EPOCHS = 300
BATCH_SIZE = 1
SEGMENT_FRAMES = 256
N_RES_BLOCKS = 6
LEARNING_RATE = 2e-4

print(f"\n{'='*65}")
print(f"Training Configuration:")
print(f"  Genre A: {GENRE_A.upper()}")
print(f"  Genre B: {GENRE_B.upper()}")
print(f"  Direction: {GENRE_A} → {GENRE_B}")
print(f"  Epochs: {EPOCHS}")
print(f"  Batch Size: {BATCH_SIZE}")
print(f"  Res Blocks: {N_RES_BLOCKS}")
print(f"  Mel Bins: 80 (compatible with HiFi-GAN UNIVERSAL_V1)")
print(f"{'='*65}")

#@title # 6. Train CycleGAN Model
from modules.cyclegan import CycleGAN

print(f"\n🚀 Starting training: {GENRE_A} → {GENRE_B}")

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
    root_a         = f'{GTZAN_MELS}/{GENRE_A}',
    root_b         = f'{GTZAN_MELS}/{GENRE_B}',
    epochs         = EPOCHS,
    batch_size     = BATCH_SIZE,
    segment_frames = SEGMENT_FRAMES,
    decay_start    = EPOCHS // 2,
    save_dir       = f'{WORKING_DIR}/checkpoints/{GENRE_A}_to_{GENRE_B}',
    save_every     = 25,
)

print(f"\n✅ Training complete for {GENRE_A} → {GENRE_B}!")

#@title # 7. Save Models to Output Directory
import shutil
import glob

checkpoint_dir = f'{WORKING_DIR}/checkpoints/{GENRE_A}_to_{GENRE_B}'
output_model_dir = f'{OUTPUT_DIR}/models/{GENRE_A}_to_{GENRE_B}'
os.makedirs(output_model_dir, exist_ok=True)

print(f"\nSaving models to {output_model_dir}...")

if os.path.exists(checkpoint_dir):
    pt_files = glob.glob(os.path.join(checkpoint_dir, '*.pt'))
    for f in pt_files:
        fname = os.path.basename(f)
        dst = os.path.join(output_model_dir, fname)
        shutil.copy2(f, dst)
        print(f"  ✅ Saved: {fname}")

print(f"\n📁 All models saved to: {output_model_dir}")

# List saved models
print("\nSaved model files:")
for f in os.listdir(output_model_dir):
    fpath = os.path.join(output_model_dir, f)
    size_mb = os.path.getsize(fpath) / (1024*1024)
    print(f"  - {f} ({size_mb:.1f} MB)")

#@title # 8. Test Conversion (Optional)
from modules.audio_to_mel import audio_to_mel
from modules.mel_to_audio import MelToAudio

# Load model
model = CycleGAN(device=device)
model.load(f'{WORKING_DIR}/checkpoints/{GENRE_A}_to_{GENRE_B}/final.pt')

# Load HiFi-GAN
m2a = MelToAudio()

# Test with a sample from training data
test_file = f'{GTZAN_AUDIO}/{GENRE_A}/jazz.00054.wav'  # Use any existing file
output_path = f'{OUTPUT_DIR}/output_{GENRE_A}_to_{GENRE_B}_test.wav'

if os.path.exists(test_file):
    print(f"\nTesting conversion with: {test_file}")
    mel = audio_to_mel(test_file)
    fake_mel = model.convert_a_to_b(mel)
    # Clamp to prevent buzzing (as per updated convert.py)
    fake_mel = torch.clamp(fake_mel, min=-11.5, max=1.5)
    audio = m2a.convert(fake_mel)
    m2a.save(audio, output_path)
    print(f"✅ Test conversion saved to: {output_path}")
else:
    print(f"⚠️  Test file not found: {test_file}")

print("\n" + "="*65)
print("🎉 Training pipeline complete!")
print("="*65)