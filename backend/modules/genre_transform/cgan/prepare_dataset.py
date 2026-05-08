"""
Converts GTZAN audio files to .npy mel spectrograms.

Run once before training:
    python prepare_dataset.py

Expects GTZAN audio at:
    data/gtzan/genres_original/<genre>/*.wav

Saves mels to:
    data/gtzan/mels/<genre>/*.npy  shape: (80, T)
"""

import os
import numpy as np
from audio_to_mel import audio_to_mel

GTZAN_AUDIO = 'Data/genres_original'
GTZAN_MELS  = 'Data/mels'

GENRES = [
    'blues', 'classical', 'country', 'disco',
    'hiphop', 'jazz', 'metal', 'pop', 'reggae', 'rock'
]

for genre in GENRES:
    in_dir  = os.path.join(GTZAN_AUDIO, genre)
    out_dir = os.path.join(GTZAN_MELS, genre)
    os.makedirs(out_dir, exist_ok=True)

    files = [f for f in os.listdir(in_dir) if f.endswith('.wav')]
    print(f"{genre}: converting {len(files)} files...")

    for fname in files:
        audio_path = os.path.join(in_dir, fname)
        npy_path   = os.path.join(out_dir, fname.replace('.wav', '.npy'))

        if os.path.exists(npy_path):
            continue  # skip already converted

        try:
            mel = audio_to_mel(audio_path)          # (1, 80, T)
            np.save(npy_path, mel.squeeze(0).numpy()) # save (80, T)
        except Exception as e:
            print(f"  SKIP {fname}: {e}")

    print(f"  Done → {out_dir}")

print("\nAll genres converted.")
