"""
modules/genre_transform/genre_transfer.py

Module 2 — Genre Transfer Pipeline
Exact port of the working Colab Mode B implementation.
No stemmer.py dependency — self-contained.

Usage:
    from genre_transfer import GenreTransfer

    gt = GenreTransfer(device='cuda')
    result = gt.convert(
        input_path   = 'song.mp3',
        target_genre = 'rock',
        duration     = 10.0,
        start_offset = 5.0,
        guidance     = 9.5,
        vocal_mix    = 1.5,
        instr_mix    = 1.0,
    )
"""

import os
import glob
import subprocess
import shutil
import sys
import torch
import torchaudio
import numpy as np
import librosa
from pathlib import Path
from scipy.signal import butter, sosfilt


# ── Genre prompt library ───────────────────────────────────────────────────────
# If the user passes a genre not in this dict, their input is used as the prompt directly.
GENRE_PROMPTS = {
    'blues':     'blues music, slide guitar, harmonica, soulful vocals, slow rhythm',
    'classical': 'classical orchestral music, strings, piano, symphony, elegant',
    'country':   'country music, acoustic guitar, banjo, twang, fiddle, storytelling',
    'disco':     'disco music, funky bass guitar, four-on-the-floor drums, synthesizer, dance',
    'hiphop':    'hip hop music, boom bap drums, heavy bass, rap, urban, drum machine',
    'jazz':      'jazz music, piano, upright bass, trumpet, swing, improvisation',
    'metal':     'heavy metal, distorted electric guitar, double bass drum, aggressive, loud',
    'pop':       'pop music, catchy hook, synthesizer, polished production, upbeat, chorus',
    'reggae':    'reggae music, offbeat guitar, bass, relaxed, jamaican, one drop rhythm',
    'rock':      'rock music, electric guitar, live drums, bass, energetic, band performance',
}


class GenreTransfer:
    """
    Full genre transfer pipeline — Colab Mode B port.
    Audio → Demucs (--two-stems=vocals) → Vocal FX → MusicGen → Tempo Match → Mix
    """

    def __init__(self, device=None):
        self.device      = device or ('cuda' if torch.cuda.is_available() else 'cpu')
        self.processor   = None
        self.model       = None
        self.sample_rate = 32000
        self._load_musicgen()

    def _load_musicgen(self):
        from transformers import AutoProcessor, MusicgenMelodyForConditionalGeneration
        print('Loading MusicGen melody model...')
        self.processor = AutoProcessor.from_pretrained('facebook/musicgen-melody')
        self.model = MusicgenMelodyForConditionalGeneration.from_pretrained(
            'facebook/musicgen-melody',
            torch_dtype=torch.float16 if self.device == 'cuda' else torch.float32,
        ).to(self.device)
        self.model.eval()
        self.sample_rate = self.model.config.audio_encoder.sampling_rate
        print(f'✅ MusicGen loaded | device={self.device} | sr={self.sample_rate}')

    # ── Main entry point ───────────────────────────────────────────────────────

    def convert(
        self,
        input_path: str,
        target_genre: str,
        duration: float     = 35.0,
        start_offset: float = 5.0,
        guidance: float     = 9.5,
        vocal_mix: float    = 1.5,
        instr_mix: float    = 1.0,
        output_dir: str     = 'output_songs',
        stems_dir: str      = 'separated',
    ) -> dict:
        """
        Args:
            input_path   : Path to input audio (MP3, WAV etc.)
            target_genre : Genre name (key in GENRE_PROMPTS) OR a custom text prompt.
                           e.g. 'rock' or 'dark moody jazz with saxophone'
            duration     : Seconds to process. MusicGen works best under 60s. Default 35.
            start_offset : Start position in the audio in seconds. Default 5.
            guidance     : MusicGen guidance scale. Higher = stronger genre shift. Default 9.5.
            vocal_mix    : Volume multiplier for vocals in final mix. Default 1.5.
            instr_mix    : Volume multiplier for converted instrumental. Default 1.0.
            output_dir   : Folder to save final output WAV.
            stems_dir    : Folder to save Demucs stems.

        Returns:
            dict with keys: output_path, vocals_path, instrumental_path, stems_dir, prompt_used
        """
        target_genre = target_genre.strip()
        # If genre matches library key use its prompt, otherwise treat input as raw prompt
        prompt = GENRE_PROMPTS.get(target_genre.lower(), target_genre)

        SR = 32000  # MusicGen native sample rate

        print('=' * 60)
        print(f'  VibeShift → {target_genre.upper()}')
        print(f'  File         : {input_path}')
        print(f'  Clip         : {start_offset}s → {start_offset + duration}s')
        print(f'  Prompt       : {prompt}')
        print(f'  Guidance     : {guidance}')
        print(f'  Vocal mix    : {vocal_mix}')
        print('=' * 60)

        # ── Step 1: Demucs ────────────────────────────────────────────────────
        print('\nStep 1: Separating vocals and instrumentals...')
        vocals_path, instrumental_path = self._run_demucs(input_path, stems_dir)
        print(f'  ✓ Vocals      : {vocals_path}')
        print(f'  ✓ Instrumental: {instrumental_path}')

        # ── Step 2: Vocal FX ──────────────────────────────────────────────────
        print(f'\nStep 2: Applying {target_genre} vocal effects...')
        vocals_np, vocals_sr = self._apply_vocal_fx(
            vocals_path, target_genre.lower(), start_offset, duration
        )
        print(f'  ✓ Vocal FX applied | {len(vocals_np)/vocals_sr:.1f}s')

        # ── Step 3: MusicGen ──────────────────────────────────────────────────
        print('\nStep 3: Converting instrumental with MusicGen...')
        instr_wav, instr_sr = torchaudio.load(instrumental_path)
        if instr_wav.shape[0] > 1:
            instr_wav = instr_wav.mean(dim=0, keepdim=True)
        if instr_sr != SR:
            instr_wav = torchaudio.functional.resample(instr_wav, instr_sr, SR)

        start_frame = int(start_offset * SR)
        end_frame   = int((start_offset + duration) * SR)
        instr_clip  = instr_wav[:, start_frame:end_frame]
        print(f'  Clip shape: {instr_clip.shape} | {instr_clip.shape[1]/SR:.1f}s')

        # Exact same processor call as Colab
        inputs = self.processor(
            audio          = instr_clip.squeeze().numpy(),
            sampling_rate  = SR,
            text           = [prompt],
            return_tensors = 'pt',
            padding        = True,
        )

        # Cast dtype to match model — fixes CPU/GPU float32/float16 mismatch
        model_dtype = next(self.model.parameters()).dtype
        inputs = {
            k: v.to(dtype=model_dtype, device=self.device) if v.dtype.is_floating_point
               else v.to(device=self.device)
            for k, v in inputs.items()
        }

        print(f'  Input keys : {list(inputs.keys())}')
        print(f'  Generating...')

        with torch.no_grad():
            output_tokens = self.model.generate(
                **inputs,
                do_sample      = True,
                guidance_scale = guidance,
                max_new_tokens = int(duration * 51.2),
            )

        converted_instr = output_tokens[0, 0].float().cpu()   # (T,)
        OUT_SR = self.sample_rate
        print(f'  ✓ Converted | {len(converted_instr)/OUT_SR:.1f}s')

        # ── Step 4: Tempo match + mix ──────────────────────────────────────────
        print('\nStep 4: Tempo matching and mixing...')
        vocals_matched = self._match_vocal_tempo(
            vocals_np         = vocals_np,
            vocals_sr         = vocals_sr,
            instrumental_path = instrumental_path,
            converted_np      = converted_instr.numpy(),
            start_offset      = start_offset,
            duration          = duration,
            target_sr         = OUT_SR,
        )

        # Exact Colab mixing logic
        vocals_tensor = torch.from_numpy(vocals_matched).unsqueeze(0)   # (1, T)
        instr_out     = converted_instr.unsqueeze(0) if converted_instr.dim() == 1 else converted_instr

        min_len    = min(instr_out.shape[1], vocals_tensor.shape[1])
        instr_out  = instr_out[:,     :min_len]
        vocals_out = vocals_tensor[:, :min_len]

        final_mix = instr_out * instr_mix + vocals_out * vocal_mix
        peak = final_mix.abs().max()
        if peak > 1.0:
            final_mix = final_mix / peak * 0.95

        # ── Save ──────────────────────────────────────────────────────────────
        os.makedirs(output_dir, exist_ok=True)
        song_name   = Path(input_path).stem
        safe_genre  = target_genre.replace(' ', '_')[:30]
        output_path = os.path.join(output_dir, f'{song_name}_{safe_genre}.wav')
        torchaudio.save(output_path, final_mix, OUT_SR)

        print(f'\n✅ Done! Saved: {output_path}')
        return {
            'output_path':        output_path,
            'vocals_path':        vocals_path,
            'instrumental_path':  instrumental_path,
            'stems_dir':          stems_dir,
            'prompt_used':        prompt,
        }

    # ── Demucs ────────────────────────────────────────────────────────────────

    def _run_demucs(self, input_path: str, stems_dir: str):
        if os.path.exists(stems_dir):
            shutil.rmtree(stems_dir)
        os.makedirs(stems_dir, exist_ok=True)

        # Exact Colab command: --two-stems=vocals gives vocals.wav + no_vocals.wav
        cmd = [sys.executable, '-m', 'demucs', '--two-stems=vocals', input_path, '-o', stems_dir]
        print(f'  Running demucs...')
        result = subprocess.run(cmd, capture_output=True, text=True)

        if result.returncode != 0:
            print(result.stderr[-2000:])
            raise RuntimeError(f'Demucs failed. See error above.')

        vocal_files = glob.glob(f'{stems_dir}/**/vocals.wav',    recursive=True)
        instr_files = glob.glob(f'{stems_dir}/**/no_vocals.wav', recursive=True)

        if not vocal_files or not instr_files:
            raise FileNotFoundError(
                f'Stems not found in {stems_dir}. '
                f'Vocals: {vocal_files} | Instrumental: {instr_files}'
            )
        return vocal_files[0], instr_files[0]

    # ── Vocal FX ──────────────────────────────────────────────────────────────

    def _apply_vocal_fx(self, vocals_path: str, genre: str, start_offset: float, duration: float):
        y, sr = librosa.load(vocals_path, sr=None, mono=True)
        y = y[int(start_offset * sr):int((start_offset + duration) * sr)]

        if genre in ('rock', 'metal'):
            y   = np.tanh(y * 1.5) / 1.5
            sos = butter(2, 2000, btype='high', fs=sr, output='sos')
            y   = y + sosfilt(sos, y) * 0.3

        elif genre == 'pop':
            peak = np.max(np.abs(y))
            over = np.maximum(np.abs(y) - peak * 0.6, 0)
            y    = y - np.sign(y) * over * 0.5
            sos  = butter(2, 8000, btype='high', fs=sr, output='sos')
            y    = y + sosfilt(sos, y) * 0.2

        elif genre == 'jazz':
            sos = butter(4, 8000, btype='low', fs=sr, output='sos')
            y   = sosfilt(sos, y)

        elif genre in ('disco', 'hiphop'):
            d = int(sr * 0.03); e = np.zeros_like(y); e[d:] = y[:-d] * 0.25; y = y + e

        elif genre in ('country', 'blues'):
            t = np.arange(len(y)) / sr
            y = y * (1.0 + 0.003 * np.sin(2 * np.pi * 5.0 * t))

        elif genre == 'reggae':
            d = int(sr * 0.05); e = np.zeros_like(y); e[d:] = y[:-d] * 0.3; y = y + e
            sos = butter(3, 7000, btype='low', fs=sr, output='sos'); y = sosfilt(sos, y)

        elif genre == 'classical':
            sos = butter(2, 120, btype='high', fs=sr, output='sos'); y = sosfilt(sos, y)
            d = int(sr * 0.04); e = np.zeros_like(y); e[d:] = y[:-d] * 0.15; y = y + e

        peak = np.max(np.abs(y))
        if peak > 1e-9:
            y = y / peak * 0.9
        return y, sr

    # ── Tempo match ───────────────────────────────────────────────────────────

    def _match_vocal_tempo(self, vocals_np, vocals_sr, instrumental_path,
                           converted_np, start_offset, duration, target_sr):
        orig_np, orig_sr = librosa.load(instrumental_path, sr=None, mono=True)
        orig_clip = orig_np[int(start_offset*orig_sr):int((start_offset+duration)*orig_sr)]

        orig_tempo, _ = librosa.beat.beat_track(y=orig_clip,    sr=orig_sr)
        conv_tempo, _ = librosa.beat.beat_track(y=converted_np, sr=target_sr)
        orig_tempo = float(np.atleast_1d(orig_tempo)[0])
        conv_tempo = float(np.atleast_1d(conv_tempo)[0])

        print(f'  Original BPM: {orig_tempo:.1f}  |  Converted BPM: {conv_tempo:.1f}')

        if vocals_sr != target_sr:
            vocals_np = librosa.resample(vocals_np, orig_sr=vocals_sr, target_sr=target_sr)

        if orig_tempo > 1 and conv_tempo > 1:
            stretch   = float(np.clip(conv_tempo / orig_tempo, 0.7, 1.5))
            print(f'  Stretch rate: {stretch:.3f}x')
            vocals_np = librosa.effects.time_stretch(vocals_np, rate=stretch)
        else:
            print('  ⚠️  Tempo detection unreliable — skipping stretch')

        return vocals_np