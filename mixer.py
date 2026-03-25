# mixer.py
import numpy as np
from typing import List
from editor import normalize_audio, save_audio
import os

def pad_and_sum(stems: List[np.ndarray]):
    """
    Mix list of stems (each: 1D or 2D (n_samples, channels)).
    Convert multi-channel to mono by averaging channels for mixing simplicity.
    """
    mono = []
    for s in stems:
        s = np.asarray(s)
        if s.ndim == 2:
            s_m = s.mean(axis=1)
        else:
            s_m = s
        mono.append(s_m)

    if not mono:
        return np.array([], dtype=np.float32)

    max_len = max(len(s) for s in mono)
    mix = np.zeros(max_len, dtype=np.float32)
    for s in mono:
        mix[:len(s)] += s
    mix = normalize_audio(mix)
    return mix

def export_mix(path: str, stems: List[np.ndarray], sr: int):
    mix = pad_and_sum(stems)
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    save_audio(path, mix, sr)
    return path
