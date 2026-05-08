"""
convert.py — VibeShift local test runner

Change the settings below and run:
    python convert.py
"""

from genre_transfer import GenreTransfer

# ═══════════════════════════════════════════════════════════════
#  SETTINGS — change these
# ═══════════════════════════════════════════════════════════════

INPUT_PATH = r'C:\Users\mehreen.sagar_wavete\Documents\VibeShift\backend\test_cases\genre_change\jazz3.mp3'

# TARGET GENRE — use a preset name OR type any custom text prompt:
#   Presets : blues, classical, country, disco, hiphop, jazz, metal, pop, reggae, rock
#   Custom  : 'dark cinematic orchestral with heavy drums'
#             'upbeat latin pop with trumpets'
#             'lo-fi hip hop chill beats'
TARGET_GENRE = 'rock'

# Clip settings — match what worked in Colab
DURATION     = 10.0   # seconds to process
START_OFFSET = 5.0    # start from this point in the song

# Quality settings — these matched your best Colab result
GUIDANCE     = 9.5    # genre prompt strength (higher = stronger shift)
VOCAL_MIX    = 1.5    # vocal volume in final mix
INSTR_MIX    = 1.0    # instrumental volume in final mix

# Output
OUTPUT_DIR   = 'output_songs'
STEMS_DIR    = 'separated'

# ═══════════════════════════════════════════════════════════════
#  RUN
# ═══════════════════════════════════════════════════════════════

gt = GenreTransfer()   # auto-detects GPU/CPU

result = gt.convert(
    input_path   = INPUT_PATH,
    target_genre = TARGET_GENRE,
    duration     = DURATION,
    start_offset = START_OFFSET,
    guidance     = GUIDANCE,
    vocal_mix    = VOCAL_MIX,
    instr_mix    = INSTR_MIX,
    output_dir   = OUTPUT_DIR,
    stems_dir    = STEMS_DIR,
)

print()
print('═' * 60)
print('Output files:')
print(f'  Final mix   : {result["output_path"]}')
print(f'  Vocals stem : {result["vocals_path"]}')
print(f'  Instrumental: {result["instrumental_path"]}')
print(f'  Prompt used : {result["prompt_used"]}')
print('═' * 60)