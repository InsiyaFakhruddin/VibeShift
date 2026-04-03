import os
import numpy as np
import torch
from torch.utils.data import Dataset


class GTZANMelDataset(Dataset):
    """
    Loads GTZAN mel spectrograms saved as .npy files for two genres.

    Expected folder structure:
        data/
            blues/       *.npy   shape: (80, T)
            classical/   *.npy
            country/     *.npy
            ... etc

    Each .npy file is one 30-second mel: shape (80, T).
    Files are randomly paired — CycleGAN does NOT need paired data.

    Output tensors: (1, 80, segment_frames) — GPU-safe fixed size
    """

    GTZAN_GENRES = [
        'blues', 'classical', 'country', 'disco',
        'hiphop', 'jazz', 'metal', 'pop', 'reggae', 'rock'
    ]

    def __init__(self, root_a, root_b, segment_frames=256):
        self.segment_frames = segment_frames

        self.files_a = self._get_files(root_a)
        self.files_b = self._get_files(root_b)

        assert len(self.files_a) > 0, f"No .npy files found in {root_a}"
        assert len(self.files_b) > 0, f"No .npy files found in {root_b}"

        print(f"Dataset: {len(self.files_a)} files in A, "
              f"{len(self.files_b)} files in B")

    def _get_files(self, folder):
        return sorted([
            os.path.join(folder, f)
            for f in os.listdir(folder)
            if f.endswith('.npy')
        ])

    def _load(self, path):
        mel = np.load(path).astype(np.float32)   # (80, T)

        # Normalize to [-1, 1] to match Generator Tanh output
        mn, mx = mel.min(), mel.max()
        mel = 2.0 * (mel - mn) / (mx - mn + 1e-8) - 1.0

        T = mel.shape[1]

        # Random crop to fixed length
        if T >= self.segment_frames:
            start = np.random.randint(0, T - self.segment_frames + 1)
            mel   = mel[:, start : start + self.segment_frames]
        else:
            pad = self.segment_frames - T
            mel = np.pad(mel, ((0, 0), (0, pad)), mode='reflect')

        # (80, T) → (1, 80, T)
        return torch.from_numpy(mel).unsqueeze(0)

    def __len__(self):
        return max(len(self.files_a), len(self.files_b))

    def __getitem__(self, idx):
        a = self._load(self.files_a[idx % len(self.files_a)])
        b = self._load(self.files_b[idx % len(self.files_b)])
        return a, b
