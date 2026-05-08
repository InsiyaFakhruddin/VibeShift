# editor.py — robust audio load/save & simple transforms
import numpy as np
import librosa
import soundfile as sf
import tempfile
import os
from typing import Tuple, Union, Optional
from io import BytesIO

# Optional helper: pydub fallback for mp3/other formats if librosa/audioread fails.
try:
    from pydub import AudioSegment
    _HAS_PYDUB = True
except Exception:
    _HAS_PYDUB = False


def _ensure_numpy_float32(arr: np.ndarray) -> np.ndarray:
    arr = np.asarray(arr, dtype=np.float32)
    arr = np.nan_to_num(arr)
    arr = np.clip(arr, -1.0, 1.0)
    return arr


def _reshape_librosa_output(y: np.ndarray) -> np.ndarray:
    """
    Librosa.load(..., mono=False) can return:
     - 1D array shape (n_samples,) for mono
     - 2D array shape (n_channels, n_samples) for multi-channel
    We return:
     - 1D (n_samples,) for mono
     - 2D (n_samples, n_channels) for multi-channel
    """
    if y is None:
        return y
    y = np.asarray(y)
    if y.ndim == 1:
        return y
    if y.ndim == 2:
        r0, r1 = y.shape
        # Common librosa shape is (n_channels, n_samples) -> transpose
        if r0 <= 8 and r1 > r0:
            return y.T  # (n_samples, n_channels)
        return y  # already (n_samples, n_channels)
    return y.flatten()


def load_audio(path_or_file: Union[str, bytes, BytesIO], sr: Optional[int] = None) -> Tuple[np.ndarray, int]:
    """
    Robust audio loader.
    Accepts:
      - file path (str)
      - bytes or BytesIO from uploaded file
    Returns:
      (y, sr)
      y is either shape (n_samples,) for mono or (n_samples, n_channels) for multi
    """
    tmp = None
    try:
        if isinstance(path_or_file, (bytes, BytesIO)):
            tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
            if isinstance(path_or_file, BytesIO):
                tmp.write(path_or_file.getvalue())
            else:
                tmp.write(path_or_file)
            tmp.close()
            path = tmp.name
        else:
            path = str(path_or_file)

        # Primary: librosa
        try:
            y, sr_native = librosa.load(path, sr=sr, mono=False)
            y = _reshape_librosa_output(y)
            y = _ensure_numpy_float32(y)
            return y, int(sr_native)
        except Exception as e_lib:
            # Fallback: pydub (handles mp3/wma etc)
            if _HAS_PYDUB:
                try:
                    audio = AudioSegment.from_file(path)
                    sr_native = audio.frame_rate
                    data = np.array(audio.get_array_of_samples())
                    if audio.channels > 1:
                        data = data.reshape((-1, audio.channels))
                    sample_width = audio.sample_width
                    max_val = float(1 << (8 * sample_width - 1))
                    data = data.astype(np.float32) / max_val
                    if data.ndim == 2 and data.shape[1] == 1:
                        data = data[:, 0]
                    data = _ensure_numpy_float32(data)
                    return data, int(sr_native)
                except Exception:
                    raise RuntimeError(f"librosa failed and pydub fallback failed: {e_lib}")
            else:
                raise RuntimeError(
                    f"librosa failed to load the audio ({e_lib}). "
                    "Install pydub + ffmpeg for more format support."
                )
    finally:
        if tmp is not None:
            try:
                os.unlink(tmp.name)
            except Exception:
                pass


def save_audio(path: str, y: np.ndarray, sr: int):
    """
    Save audio to disk.
    Accepts y as 1D (n_samples,) or 2D (n_samples, n_channels)
    """
    y = np.asarray(y)
    if y.ndim == 1:
        out = _ensure_numpy_float32(y)
    elif y.ndim == 2:
        out = _ensure_numpy_float32(y)
    else:
        raise ValueError("Unsupported audio shape to save. Expect 1D or 2D array.")
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    sf.write(path, out, sr)
    return path


def pitch_shift_audio(y: np.ndarray, sr: int, semitones: float):
    """
    Shift pitch by semitones.
    Works for mono (n,) or multi (n_samples, n_channels).
    """
    if semitones == 0:
        return y
    if y.ndim == 1:
        return librosa.effects.pitch_shift(y, sr=sr, n_steps=semitones)
    else:
        chans = []
        for ch in range(y.shape[1]):
            chans.append(librosa.effects.pitch_shift(y[:, ch], sr=sr, n_steps=semitones))
        maxlen = max(len(c) for c in chans)
        chans = [np.pad(c, (0, maxlen - len(c))) for c in chans]
        out = np.stack(chans, axis=1)
        return out


def change_timbre_simple(y: np.ndarray, strength: float = 1.25):
    """
    Simple timbre modification using HPSS harmonic enrichment.
    strength >1 increases harmonic component.
    """
    if strength == 1.0:
        return y
    if y.ndim == 1:
        harm, perc = librosa.effects.hpss(y)
        out = harm * strength + perc
        return np.clip(out, -1.0, 1.0)
    else:
        chans = []
        for ch in range(y.shape[1]):
            harm, perc = librosa.effects.hpss(y[:, ch])
            out_ch = np.clip(harm * strength + perc, -1.0, 1.0)
            chans.append(out_ch)
        maxlen = max(len(c) for c in chans)
        chans = [np.pad(c, (0, maxlen - len(c))) for c in chans]
        out = np.stack(chans, axis=1)
        return out


def normalize_audio(y: np.ndarray):
    y = np.asarray(y, dtype=np.float32)
    peak = np.max(np.abs(y))
    if peak > 0:
        return y / peak * 0.98
    return y
