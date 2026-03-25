# stemmer.py
import os
import subprocess
import shutil
from pathlib import Path
import time
import sys
from pydub import AudioSegment

# Permanent storage folders
STEMS_ROOT = "stems"
OUTPUT_ROOT = "output_songs"


# -------------------------------------------
# 1. Ensure input song is stereo
# -------------------------------------------
def ensure_stereo(audio_path: str) -> str:
    """
    Convert mono audio to stereo if necessary.
    Returns path to stereo file.
    """
    audio = AudioSegment.from_file(audio_path)
    if audio.channels == 1:
        stereo_path = str(Path(audio_path).with_name(Path(audio_path).stem + "_stereo.mp3"))
        audio = audio.set_channels(2)
        audio.export(stereo_path, format="mp3")
        print(f"Converted mono to stereo: {stereo_path}")
        return stereo_path
    return audio_path


# -------------------------------------------
# 2. Run Demucs & save in stems/<song_name>/
# -------------------------------------------
def run_demucs(input_path: str):
    """
    Run Demucs and save stems into:
        stems/<song_name>/
    """

    # Guarantee 2-channel input
    input_path = ensure_stereo(input_path)

    song_name = Path(input_path).stem
    song_stem_folder = Path(STEMS_ROOT) / song_name

    # --- NEW: Remove old stem folder to prevent overwrite errors ---
    if song_stem_folder.exists():
        shutil.rmtree(song_stem_folder, ignore_errors=True)

    # Create a clean folder
    song_stem_folder.mkdir(parents=True, exist_ok=True)

    # Temporary Demucs output folder
    temp_out = "demucs_temp"
    shutil.rmtree(temp_out, ignore_errors=True)
    os.makedirs(temp_out, exist_ok=True)

    python_exe = sys.executable
    cmd = [python_exe, "-m", "demucs", input_path, "--out", temp_out]
    print("Running Demucs:", " ".join(cmd))

    try:
        subprocess.run(cmd, check=True)
    except subprocess.CalledProcessError as e:
        raise RuntimeError(f"Demucs failed: {e}")

    input_name = Path(input_path).stem
    time.sleep(0.5)

    # Find demucs output folder
    demucs_out = None
    for root, dirs, files in os.walk(temp_out):
        if input_name in root and any(f.endswith(".wav") for f in files):
            demucs_out = Path(root)
            break

    if demucs_out is None:
        raise FileNotFoundError("Could not locate Demucs output.")

    # Move stems to our permanent folder
    for wav in demucs_out.glob("*.wav"):
        shutil.move(str(wav), song_stem_folder)

    # Clean up demucs temp folder
    shutil.rmtree(temp_out, ignore_errors=True)

    print(f"🟩 Stems saved to: {song_stem_folder.resolve()}")
    return str(song_stem_folder)


# -------------------------------------------
# 3. Save final mixed song
# -------------------------------------------
def save_final_mix(song_name: str, final_audio_path: str):
    """
    Save final mixed audio into:
        output_songs/<song_name>/final_mix.wav

    If the song already exists, overwrite final_mix.wav.
    If it's a new song, create the folder.
    """

    out_dir = Path(OUTPUT_ROOT) / song_name

    # Create folder if it doesn't exist
    out_dir.mkdir(parents=True, exist_ok=True)

    target_path = out_dir / "final_mix.wav"

    # --- NEW: remove old final_mix.wav so overwrite is clean ---
    if target_path.exists():
        target_path.unlink()   # delete only the mix file, not the whole folder

    # Save the new mix
    shutil.copy(final_audio_path, target_path)

    print(f"🟦 Final mixed audio saved to: {target_path.resolve()}")
    return str(target_path)


# -------------------------------------------
# 4. List all stems for a track
# -------------------------------------------
def list_stems(stems_dir: str):
    return sorted([
        os.path.join(stems_dir, f)
        for f in os.listdir(stems_dir)
        if f.lower().endswith(".wav")
    ])


# -------------------------------------------
# 5. Cleanup helper
# -------------------------------------------
def cleanup_dir(path: str):
    if os.path.exists(path):
        shutil.rmtree(path)
