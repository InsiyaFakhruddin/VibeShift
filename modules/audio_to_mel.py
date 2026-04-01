import librosa
import numpy as np
import torch


def audio_to_mel(
    audio_path,
    sample_rate=22050,
    n_fft=1024,
    hop_length=256,
    win_length=1024,
    n_mels=80,
    fmin=0,
    fmax=8000
):
    """
    Converts audio to log Mel-spectrogram compatible with HiFi-GAN UNIVERSAL_V1.
    Returns: torch.Tensor of shape (1, 80, T)
    """

    # Load and normalize audio
    y, sr = librosa.load(audio_path, sr=sample_rate, mono=True)
    y = y / (np.max(np.abs(y)) + 1e-9)

    # Amplitude mel-spectrogram (power=1.0, NOT librosa default of 2.0)
    mel_spec = librosa.feature.melspectrogram(
        y=y,
        sr=sr,
        n_fft=n_fft,
        hop_length=hop_length,
        win_length=win_length,
        n_mels=n_mels,
        fmin=fmin,
        fmax=fmax,
        power=1.0
    )

    # HiFi-GAN exact log compression
    mel_log = np.log(np.clip(mel_spec, a_min=1e-5, a_max=None))

    # (80, T) → (1, 80, T)
    mel_tensor = torch.from_numpy(mel_log).float().unsqueeze(0)

    return mel_tensor


def verify_mel(mel_tensor):
    mn   = mel_tensor.min().item()
    mx   = mel_tensor.max().item()
    mean = mel_tensor.mean().item()
    print(f"Mel shape : {mel_tensor.shape}")
    print(f"Mel min   : {mn:.3f}  (expected ≈ -11.5)")
    print(f"Mel max   : {mx:.3f}  (expected ≈  +1.5)")
    print(f"Mel mean  : {mean:.3f} (expected ≈  -4.0)")
    if mn < -13 or mx > 3:
        print("WARNING: Mel range outside expected bounds — check parameters.")
    else:
        print("Mel range looks correct.")


if __name__ == "__main__":
    import sys
    path = sys.argv[1] if len(sys.argv) > 1 else "../test_cases/full song.mp3"
    mel = audio_to_mel(path)
    verify_mel(mel)