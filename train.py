from modules.cyclegan import CycleGAN
import torch

# ── Check CUDA Availability ──────────────────────────────────────
print("=" * 65)
print("🚀 VibeShift CycleGAN Training")
print("=" * 65)

if torch.cuda.is_available():
    print(f"✅ CUDA Available: {torch.cuda.get_device_name(0)}")
    print(f"   GPU Memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB")
    device = 'cuda'
    print(f"   Training will use GPU (MUCH FASTER)")
else:
    print("⚠️  CUDA Not Available - Training will use CPU (SLOWER)")
    device = 'cpu'

print("=" * 65)
print()

# Pick any two GTZAN genres
GENRE_A = 'jazz'
GENRE_B = 'disco'

print(f"📊 Training Configuration:")
print(f"   Genre A: {GENRE_A.upper()}")
print(f"   Genre B: {GENRE_B.upper()}")
print(f"   Direction: {GENRE_A} ↔ {GENRE_B}")
print()

# ── Epoch recommendation ──────────────────────────────────────────
# Jazz and Disco are quite different (upbeat jazz vs upbeat disco/funk)
# This requires more training to capture the style transfer properly
EPOCHS = 300  # Increased from 200 for better convergence

print(f"⚠️  Epoch Configuration:")
print(f"   Total Epochs: {EPOCHS}")
print(f"   LR Decay Start: 125 (at epoch 125)")
print(f"   Reason: Jazz→Disco is a significant genre shift")
print(f"   More epochs = better style capture (but slower training)")
print()

model = CycleGAN(
    n_res_blocks    = 6,       # 6 for 4GB GPU (use 9 if you have 8GB+)
    lr              = 2e-4,
    lambda_cycle    = 10.0,
    lambda_identity = 5.0,
    device          = device,
)

model.train(
    root_a         = f'Data/mels/{GENRE_A}',
    root_b         = f'Data/mels/{GENRE_B}',
    epochs         = EPOCHS,
    batch_size     = 1,        # must stay 1 for 4GB GPU
    segment_frames = 256,      # ~3s per crop — GPU safe
    decay_start    = EPOCHS // 2,  # LR decay starts at halfway point
    save_dir       = f'checkpoints/{GENRE_A}_to_{GENRE_B}',
    save_every     = 25,       # Save every 25 epochs (not 10) to reduce disk usage
)
