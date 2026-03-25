# app.py
import streamlit as st
import tempfile
import os
import time
from pathlib import Path
from pydub import AudioSegment
import shutil

from stemmer import run_demucs, list_stems, cleanup_dir
from editor import load_audio, save_audio, pitch_shift_audio, change_timbre_simple
from mixer import export_mix

st.set_page_config(page_title="VibeShift — Demixer Demo", layout="centered")
st.title("VibeShift — Demixer Demo")

st.markdown("Upload your song")

# ------------------------
# Create global folders
# ------------------------
APP_ROOT = Path(__file__).parent
STEMS_ROOT = APP_ROOT / "stems"
OUTPUT_ROOT = APP_ROOT / "output_songs"

STEMS_ROOT.mkdir(exist_ok=True)
OUTPUT_ROOT.mkdir(exist_ok=True)

# ------------------------
# Session workspace
# ------------------------
if "WORKDIR" not in st.session_state:
    st.session_state["WORKDIR"] = tempfile.mkdtemp(prefix="vibeshift_")

WORKDIR = st.session_state["WORKDIR"]
st.sidebar.write("Workspace:", WORKDIR)

# ------------------------
# Upload song
# ------------------------
uploaded = st.file_uploader("Upload a song (mp3 / wav)", type=["mp3", "wav", "m4a"], accept_multiple_files=False)

if uploaded is not None:
    input_path = os.path.join(WORKDIR, uploaded.name)
    with open(input_path, "wb") as f:
        f.write(uploaded.getbuffer())

    st.success(f"Saved as {input_path}")
    st.session_state["uploaded_path"] = input_path
    song_name = Path(uploaded.name).stem
    st.session_state["song_name"] = song_name

    # Create folder for this song inside stems/
    song_stem_folder = STEMS_ROOT / song_name
    song_stem_folder.mkdir(exist_ok=True)
    st.session_state["song_stem_folder"] = str(song_stem_folder)

    if st.button("Separate stems"):
        with st.spinner("Running Demucs…"):
            try:
                stems_dir = run_demucs(input_path)
                st.success(f"Stems saved in: {stems_dir}")

                stems = list_stems(stems_dir)
                st.session_state["stems_dir"] = stems_dir
                st.session_state["original_stems"] = stems
                st.session_state["modified"] = {}
                st.session_state["added_stems"] = []

            except Exception as e:
                st.error(f"Demucs failed: {e}")
                st.stop()

# -----------------------------------
# If stems exist, show editing tools
# -----------------------------------
if "original_stems" in st.session_state:
    stems = st.session_state["original_stems"]

    st.header("Stems")

    # -----------------------------
    # Add extra stems (upload or preloaded)
    # -----------------------------
    st.subheader("➕ Add a new stem")

    # Option 1: Upload your own
    add_file = st.file_uploader("Upload extra stem", type=["wav", "mp3"], key="add_stem_upload")
    if add_file is not None:
        dest = os.path.join(WORKDIR, f"added_{int(time.time())}_{add_file.name}")
        with open(dest, "wb") as f:
            f.write(add_file.getbuffer())
        st.session_state["added_stems"].append(dest)
        st.success(f"Added stem saved: {dest}")

    # Option 2: Preloaded stems
    ASSETS_ROOT = APP_ROOT / "assets"
    instruments = [p.name for p in ASSETS_ROOT.iterdir() if p.is_dir()]
    selected_instrument = st.selectbox("Choose instrument", [""] + instruments, key="asset_instrument")

    if selected_instrument:
        instrument_path = ASSETS_ROOT / selected_instrument
        stem_files = sorted([f.name for f in instrument_path.glob("*.*") if f.suffix.lower() in [".wav", ".mp3"]])
        selected_stem = st.selectbox("Choose a stem", [""] + stem_files, key="asset_stem")

        if selected_stem:
            stem_path = instrument_path / selected_stem
            try:
                stem_audio = AudioSegment.from_file(stem_path)
                song_audio = AudioSegment.from_file(st.session_state["uploaded_path"])

                # Match duration
                if len(stem_audio) < len(song_audio):
                    repeats = int(len(song_audio) / len(stem_audio)) + 1
                    stem_audio = stem_audio * repeats
                stem_audio = stem_audio[:len(song_audio)]

                # Ensure stereo
                if stem_audio.channels == 1:
                    stem_audio = stem_audio.set_channels(2)

                dest = os.path.join(WORKDIR, f"added_{selected_instrument}_{selected_stem}.wav")
                stem_audio.export(dest, format="wav")
                st.session_state["added_stems"].append(dest)
                st.success(f"Added preloaded stem: {selected_stem}")

            except Exception as e:
                st.error(f"Failed to add stem: {e}")

    # -----------------------------
    # Show existing stems for editing
    # -----------------------------
    for idx, stem_path in enumerate(stems):
        name = Path(stem_path).name
        st.markdown(f"### {name}")
        try:
            y, sr = load_audio(stem_path)
        except Exception as e:
            st.error(f"Error loading stem {name}: {e}")
            continue

        preview_path = os.path.join(WORKDIR, f"preview_{idx}.wav")
        save_audio(preview_path, y, sr)
        st.audio(preview_path)

        col1, col2, col3 = st.columns([1, 1, 1])
        with col1:
            semis = st.slider(f"Pitch — {name}", -12, 12, 0, key=f"pitch_slider_{idx}")
        with col2:
            tim = st.slider(f"Timbre — {name}", 50, 200, 100, key=f"timbre_slider_{idx}")
        with col3:
            delete = st.checkbox(f"Delete", key=f"del_{idx}")

        if st.button(f"Apply changes to {name}", key=f"apply_{idx}"):
            if delete:
                st.session_state["modified"][stem_path] = None
                st.success(f"{name} deleted.")
            else:
                try:
                    y2, sr2 = load_audio(stem_path)
                    y2 = pitch_shift_audio(y2, sr2, semis)
                    y2 = change_timbre_simple(y2, tim / 100)
                    outp = os.path.join(WORKDIR, f"modified_{idx}_{name}")
                    save_audio(outp, y2, sr2)
                    st.session_state["modified"][stem_path] = outp
                    st.success(f"{name} modified.")
                except Exception as e:
                    st.error(f"Error modifying: {e}")

    # -----------------------------
    # Added stems support preview
    # -----------------------------
    if st.session_state["added_stems"]:
        st.subheader("Added Stems")
        for i, p in enumerate(st.session_state["added_stems"]):
            st.write(Path(p).name)
            try:
                y, sr = load_audio(p)
                prev = os.path.join(WORKDIR, f"added_preview_{i}.wav")
                save_audio(prev, y, sr)
                st.audio(prev)
            except:
                pass

    # -----------------------------
    # Mix & Export
    # -----------------------------
    st.header("Mix & Export")
    mix_name = f"{st.session_state['song_name']}_mix.wav"
    mix_path = OUTPUT_ROOT / mix_name

    if st.button("Mix & Generate Download"):
        include = []
        sr_final = 44100

        for p in stems:
            mod = st.session_state["modified"].get(p, "orig")
            if mod is None:
                continue
            elif mod == "orig":
                y, sr_final = load_audio(p)
                include.append(y)
            else:
                y, sr_final = load_audio(mod)
                include.append(y)

        for p in st.session_state["added_stems"]:
            y, sr_final = load_audio(p)
            include.append(y)

        export_mix(str(mix_path), include, sr_final)
        st.success("Mix created!")
        st.audio(str(mix_path))

        with open(mix_path, "rb") as f:
            st.download_button("Download Mix", f.read(), file_name=mix_name, mime="audio/wav")
