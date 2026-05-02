import torch
import numpy as np
import os
import sys
import json
import soundfile as sf
from scipy.signal import butter, sosfilt

CURRENT_DIR  = os.path.dirname(os.path.abspath(__file__))
HIFI_GAN_DIR = os.path.join(CURRENT_DIR, 'hifi_gan')

if HIFI_GAN_DIR not in sys.path:
    sys.path.append(HIFI_GAN_DIR)

try:
    from models import Generator
except ImportError:
    print(f"Warning: Could not import Generator from {HIFI_GAN_DIR}.")
    Generator = None


class AttrDict(dict):
    def __init__(self, *args, **kwargs):
        super(AttrDict, self).__init__(*args, **kwargs)
        self.__dict__ = self


def smooth_audio(audio, sample_rate=22050):
    """Gentle low-pass at 10kHz — removes HF vocoder noise, inaudible range."""
    sos = butter(4, 10000, btype='low', fs=sample_rate, output='sos')
    return sosfilt(sos, audio).astype(np.float32)


def safe_normalize(audio, headroom_db=-1.0):
    """Peak-normalize to just below 0dBFS to prevent hard clipping on playback."""
    peak = np.max(np.abs(audio))
    if peak < 1e-9:
        return audio
    target = 10 ** (headroom_db / 20.0)
    return (audio / peak) * target


def chunked_inference(generator, mel_tensor, device,
                      chunk_frames=256, overlap_frames=64):
    """
    Process a long mel in overlapping chunks with equal-power crossfade.

    Equal-power (sqrt) crossfade keeps combined energy constant at seams,
    preventing the volume dip that linear crossfades cause.
    """
    T          = mel_tensor.shape[2]
    hop_length = 256
    all_audio  = []
    pos        = 0

    while pos < T:
        start = max(0, pos - overlap_frames)
        end   = min(T, pos + chunk_frames + overlap_frames)

        chunk = mel_tensor[:, :, start:end].to(device)

        with torch.no_grad():
            audio = generator(chunk).squeeze().cpu().numpy().astype(np.float32)

        # How many overlap samples were added on each side
        left_pad  = (pos - start) * hop_length
        right_pad = (end - min(T, pos + chunk_frames)) * hop_length

        # Trim padding so only the core chunk remains
        if right_pad > 0:
            audio = audio[left_pad:-right_pad]
        else:
            audio = audio[left_pad:]

        all_audio.append(audio)
        pos += chunk_frames

    if len(all_audio) == 1:
        return all_audio[0]

    # ── Equal-power crossfade at every boundary ──────────────────────
    fade_samples = overlap_frames * hop_length
    result       = all_audio[0].copy()

    for i in range(1, len(all_audio)):
        next_chunk = all_audio[i]

        if fade_samples > 0 and len(result) >= fade_samples and len(next_chunk) >= fade_samples:
            t = np.linspace(0.0, 1.0, fade_samples, dtype=np.float32)

            # Square-root curves — power stays constant across the seam
            fade_out = np.sqrt(1.0 - t)   # A: 1.0 → 0.0  (power)
            fade_in  = np.sqrt(t)          # B: 0.0 → 1.0  (power)

            # Apply crossfade: tail of result overlaps head of next_chunk
            result[-fade_samples:] = (
                result[-fade_samples:] * fade_out +
                next_chunk[:fade_samples] * fade_in
            )
            result = np.concatenate([result, next_chunk[fade_samples:]])
        else:
            result = np.concatenate([result, next_chunk])

    return result

class MelToAudio:
    def __init__(self, device='cpu'):
        self.device      = torch.device(device)
        self.generator   = None
        self.hifi_gan_dir = HIFI_GAN_DIR
        self.config_path  = os.path.join(self.hifi_gan_dir, 'config_v1.json')
        self.model_path   = os.path.join(self.hifi_gan_dir, 'generator_v1')
        self.sample_rate  = 22050

        self._load_model()

    def _load_model(self):
        if Generator is None:
            raise ImportError("HiFi-GAN Generator could not be imported.")
        if not os.path.exists(self.config_path):
            raise FileNotFoundError(f"Config not found: {self.config_path}")
        if not os.path.exists(self.model_path):
            print(f"\n[ERROR] Model not found: {self.model_path}")
            print("Download UNIVERSAL_V1 from:")
            print("  https://drive.google.com/drive/folders/1-eEYTB5Av9jNql0WGBlRoi-WH2J7bp5Y")
            raise FileNotFoundError(f"Model not found: {self.model_path}")

        with open(self.config_path) as f:
            self.config = AttrDict(json.load(f))

        self.sample_rate = self.config.get('sampling_rate', 22050)

        # Validate params match audiotomel.py
        expected = {
            'sampling_rate': 22050,
            'num_mels':       80,
            'n_fft':          1024,
            'hop_size':       256,
            'win_size':       1024,
            'fmin':           0,
            'fmax':           8000,
        }
        mismatches = [
            f"  {k}: config={self.config[k]}, expected={v}"
            for k, v in expected.items()
            if k in self.config and self.config[k] != v
        ]
        if mismatches:
            print("WARNING: Config mismatches (will cause noise):")
            for m in mismatches:
                print(m)

        self.generator = Generator(self.config)

        # Silence the torch.load FutureWarning — safe because this is a
        # known trusted checkpoint from the official HiFi-GAN repo
        checkpoint = torch.load(
            self.model_path,
            map_location=self.device,
            weights_only=False   # required for HiFi-GAN checkpoint format
        )

        state_dict = checkpoint.get('generator', checkpoint)
        self.generator.load_state_dict(state_dict)
        self.generator.eval()
        self.generator.to(self.device)

        # Silence the weight_norm FutureWarning — remove_weight_norm()
        # replaces the deprecated parametrization with fused weights
        if hasattr(self.generator, 'remove_weight_norm'):
            import warnings
            with warnings.catch_warnings():
                warnings.simplefilter("ignore", FutureWarning)
                self.generator.remove_weight_norm()

        print(f"HiFi-GAN loaded | device={self.device} | sr={self.sample_rate}")

    def convert(self, mel_spectrogram, smooth=True, normalize=True):
        """
        Convert log mel-spectrogram to audio using chunked inference.

        Args:
            mel_spectrogram : Tensor (1, 80, T) or (80, T) or numpy array
            smooth          : Gentle 10kHz low-pass to remove HF crackling
            normalize       : Peak-normalize to -1 dBFS

        Returns:
            audio : numpy float32 array, values in [-1, 1]
        """
        if self.generator is None:
            raise RuntimeError("Generator not loaded.")

        if isinstance(mel_spectrogram, np.ndarray):
            mel_tensor = torch.from_numpy(mel_spectrogram).float()
        else:
            mel_tensor = mel_spectrogram.float()

        if mel_tensor.dim() == 2:
            mel_tensor = mel_tensor.unsqueeze(0)
        elif mel_tensor.dim() == 4:
            mel_tensor = mel_tensor.squeeze(1)

        mn, mx = mel_tensor.min().item(), mel_tensor.max().item()
        if mn < -13 or mx > 3:
            print(f"WARNING: Mel range [{mn:.2f}, {mx:.2f}] — expected [-11.5, 1.5]")
            print("         Output will likely be noisy. Check audiotomel.py.")

        # ── Chunked inference (key fix for long audio) ───────────────────
        T = mel_tensor.shape[2]
        duration_s = T * 256 / self.sample_rate
        print(f"Processing {duration_s:.1f}s of audio in chunks...")

        audio = chunked_inference(
            self.generator,
            mel_tensor,
            self.device,
            chunk_frames=256,    # ~2.9s per chunk
            overlap_frames=64    # ~0.74s crossfade overlap (doubled from 32)
        )

        # ── Post-processing ──────────────────────────────────────────────
        audio = np.clip(audio, -1.0, 1.0)

        if smooth:
            audio = smooth_audio(audio, self.sample_rate)

        audio = np.clip(audio, -1.0, 1.0)

        if normalize:
            audio = safe_normalize(audio, headroom_db=-1.0)

        return audio

    def save(self, audio, path, sample_rate=None):
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

    print("\n── Step 2: Mel → Audio ──────────────────────────────")
    m2a = MelToAudio()
    audio = m2a.convert(mel)

    out = "reconstructed.wav"
    m2a.save(audio, out)
    print(f"\nDone. Listen to '{out}'")