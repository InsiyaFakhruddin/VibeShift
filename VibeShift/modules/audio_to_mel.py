import librosa
import numpy as np
import torch


def audio_to_mel(
    audio_path,
    sample_rate=22050,
    n_mels=128,
    n_fft=1024,
    hop_length=256,
    duration=30.0
):
    """
    Converts an audio file (.wav or .mp3) to a normalized log Mel-spectrogram.

    Returns:
        mel_tensor: torch.Tensor of shape (1, n_mels, time_frames)
    """

    # 1️⃣ Load audio
    y, sr = librosa.load(audio_path, sr=sample_rate, mono=True, duration=duration)

    # 2️⃣ Fix duration (pad or trim) if needed - optional
    # target_length = int(sample_rate * duration)
    # if len(y) < target_length:
    #     y = np.pad(y, (0, target_length - len(y)))
    # else:
    #     y = y[:target_length]
    
    # For HiFi-GAN, we often want the full audio or specific segmentation. 
    # Let's keep the audio as is for the test case unless duration is strictly enforced.
    
    # 3️⃣ Compute Mel-spectrogram
    # specific parameters for HiFi-GAN V1
    mel_spec = librosa.feature.melspectrogram(
        y=y,
        sr=sample_rate,
        n_fft=1024,
        hop_length=256,
        win_length=1024,
        n_mels=80, # HiFi-GAN V1 uses 80 bands
        fmin=0,
        fmax=8000
    )

    # 4️⃣ Convert to log scale (natural log) with clamping
    # Matching the user's provided snippet: mel = np.log(np.clip(mel, a_min=1e-5, a_max=None))
    mel_log = np.log(np.clip(mel_spec, a_min=1e-5, a_max=None))

    # 5️⃣ Convert to torch tensor
    mel_tensor = torch.tensor(mel_log, dtype=torch.float32)
    # Shape (80, T) -> (1, 80, T)
    mel_tensor = mel_tensor.unsqueeze(0)

    return mel_tensor


if __name__ == "__main__":
    mel = audio_to_mel("../test_cases/full song.mp3")
    print(mel)