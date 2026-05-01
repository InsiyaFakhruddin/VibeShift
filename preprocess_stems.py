"""
preprocess_stems.py — run once before training
Separates all GTZAN tracks into vocals + no_vocals stems using Demucs.

Usage:
    python preprocess_stems.py

Requirements:
    pip install demucs

Output:
    data/gtzan_stems/<genre>/<song>_no_vocals.wav
    data/gtzan_stems/<genre>/<song>_vocals.wav
"""

import os
import subprocess
from pathlib import Path

# Configuration
GTZAN_DIR = Path('Data/genres_original')  # your GTZAN root
OUTPUT_DIR = Path('Data/gtzan_stems')      # where separated stems go

# Genres to process
GENRES = ['blues', 'classical', 'country', 'disco', 
          'hiphop', 'jazz', 'metal', 'pop', 'reggae', 'rock']


def separate_stems(audio_file, output_dir):
    """
    Use Demucs to separate vocals from instrumentals.
    """
    stem_dir = output_dir / audio_file.stem
    
    # Check if already processed
    if (stem_dir / 'no_vocals.wav').exists():
        print(f"  ✓ Already done: {audio_file.name}")
        return True
    
    try:
        subprocess.run([
            'demucs',
            '--two-stems=vocals',
            '-o', str(output_dir),
            '--filename', '{stem}.{ext}',
            str(audio_file)
        ], check=True, capture_output=True)
        print(f"  ✓ Separated: {audio_file.name}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"  ✗ Failed: {audio_file.name} - {e}")
        return False
    except FileNotFoundError:
        print(f"  ✗ Demucs not found. Install with: pip install demucs")
        return False


def main():
    print("=" * 65)
    print("🎵 GTZAN Stem Separation using Demucs")
    print("=" * 65)
    print(f"\nInput:  {GTZAN_DIR}")
    print(f"Output: {OUTPUT_DIR}")
    print()
    
    # Check if demucs is available
    try:
        subprocess.run(['demucs', '--version'], 
                       capture_output=True, check=True)
        print("✓ Demucs is installed")
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("✗ Demucs not found!")
        print("\nPlease install demucs first:")
        print("  pip install demucs")
        print("\nOr use alternative stem separation:")
        print("  - Spleeter: pip install spleeter")
        print("  - Demucs: pip install demucs")
        return
    
    total_processed = 0
    total_skipped = 0
    
    for genre in GENRES:
        genre_input = GTZAN_DIR / genre
        genre_output = OUTPUT_DIR / genre
        
        if not genre_input.exists():
            print(f"\n⚠️  Genre not found: {genre_input}")
            continue
        
        # Create output directory
        os.makedirs(genre_output, exist_ok=True)
        
        # Get all wav files
        audio_files = list(genre_input.glob('*.wav'))
        
        if not audio_files:
            print(f"\n{genre.upper()}: No audio files found")
            continue
        
        print(f"\n{genre.upper()}: Processing {len(audio_files)} files...")
        
        for audio_file in audio_files:
            # Check if already processed
            stem_dir = genre_output / audio_file.stem
            if (stem_dir / 'no_vocals.wav').exists():
                total_skipped += 1
                continue
            
            # Process
            success = separate_stems(audio_file, genre_output)
            if success:
                total_processed += 1
            else:
                total_skipped += 1
    
    print("\n" + "=" * 65)
    print("📊 Stem Separation Summary")
    print("=" * 65)
    print(f"  Processed: {total_processed}")
    print(f"  Skipped:   {total_skipped}")
    print(f"  Output:    {OUTPUT_DIR}")
    print("\n✅ Stem separation complete!")
    print("\nTo use stems in training:")
    print("  1. In your dataset loader, load 'no_vocals.wav' instead of '.wav'")
    print("  2. This removes vocals, letting CycleGAN learn instrumental style")
    print("  3. At inference: separate → transform → remix with original vocals")


if __name__ == "__main__":
    main()