"""mel_to_audio.py — BigVGAN-v2 replacement for HiFi-GAN

BigVGAN-v2 is trained on diverse audio (speech, music, environmental sounds)
and handles out-of-distribution mel spectrograms far better than HiFi-GAN.

Drop-in replacement for HiFi-GAN UNIVERSAL_V1.
Interface remains identical — no changes to convert.py needed.
"""

import torch
import numpy as np
import soundfile as sf


class MelToAudio:
    def __init__(self, device='cpu'):
        self.device = torch.device(device)
        self.sample_rate = 22050
        self._load_model()

    def _load_model(self):
        """Load BigVGAN-v2 checkpoint from Hugging Face."""
        try:
            import bigvgan
        except ImportError:
            raise ImportError(
                "bigvgan not found. Install with:\n  pip install bigvgan"
            )

        print("Loading BigVGAN-v2 from Hugging Face...")
        self.generator = bigvgan.BigVGAN.from_pretrained(
            'nvidia/bigvgan_v2_22khz_80band_fmax8k_256x',
            use_cuda_kernel=False  # set True if on CUDA for 1.5-3x speedup
        )
        self.generator.remove_weight_norm()
        self.generator.eval()
        self.generator.to(self.device)
        print(f"✅ BigVGAN-v2 loaded | device={self.device} | sr={self.sample_rate}")
        print("   Checkpoint: nvidia/bigvgan_v2_22khz_80band_fmax8k_256x")
        print("   (22050Hz, 80 mel bands, fmax=8000 — perfect match)")

    def convert(self, mel_spectrogram, normalize=True):
        """
        Convert log mel-spectrogram to audio using BigVGAN-v2.

        Args:
            mel_spectrogram : Tensor (1, 80, T) or (80, T) or numpy array
            normalize       : Peak-normalize to -1 dBFS

        Returns:
            audio : numpy float32 array, values in [-1, 1]
        """
        if isinstance(mel_spectrogram, np.ndarray):
            mel_tensor = torch.from_numpy(mel_spectrogram).float()
        else:
            mel_tensor = mel_spectrogram.float()

        if mel_tensor.dim() == 2:
            mel_tensor = mel_tensor.unsqueeze(0)
        elif mel_tensor.dim() == 4:
            mel_tensor = mel_tensor.squeeze(1)

        mel_tensor = mel_tensor.to(self.device)

        # BigVGAN handles long sequences natively — no chunking needed
        with torch.no_grad():
            audio = self.generator(mel_tensor)  # (1, 1, T_audio)
            audio = audio.squeeze().cpu().numpy().astype(np.float32)

        audio = np.clip(audio, -1.0, 1.0)

        if normalize:
            peak = np.max(np.abs(audio))
            if peak > 1e-9:
                target = 10 ** (-1.0 / 20.0)  # -1 dBFS
                audio = (audio / peak) * target

        return audio

    def save(self, audio, path, sample_rate=None):
        """Save audio to WAV file."""
        sr = sample_rate or self.sample_rate
        sf.write(path, audio, sr)
        print(f"Saved: {path}  ({len(audio)/sr:.2f}s @ {sr}Hz)")


if __name__ == "__main__":
    import sys
    from audio_to_mel import audio_to_mel, verify_mel

    path = sys.argv[1] if len(sys.argv) > 1 else "../test_cases/full song.mp3"

    print("── Step 1: Audio → Mel ──────────────────────────────")
    mel = audio_to_mel(path)
    verify_mel(mel)

    print("\n── Step 2: Mel → Audio (BigVGAN-v2) ─────────────────")
    m2a = MelToAudio()
    audio = m2a.convert(mel)

    out = "reconstructed.wav"
    m2a.save(audio, out)
    print(f"\nDone. Listen to '{out}'")
