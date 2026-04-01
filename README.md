# 🎵 VibeShift — Music Genre Transformation (FYP-2)

## 📌 Project Overview

VibeShift is an intelligent music processing system that transforms audio across different music genres using advanced deep learning techniques. The pipeline converts raw audio into Mel-spectrograms (frequency domain representations), processes them through neural networks for genre transformation, and reconstructs high-quality audio using HiFi-GAN.

**Key Features:**
- Audio to Mel-spectrogram conversion using Librosa
- Genre-aware audio processing  
- State-of-the-art HiFi-GAN audio reconstruction
- End-to-end ML pipeline for music transformation

---

## ⚙️ Prerequisites

**Before you start, ensure you have:**
- Windows/Mac/Linux OS with terminal access
- 8GB+ RAM (GPU recommended for faster processing)
- ~5GB free disk space (for dependencies and models)
- Git installed (for cloning the repo)
- NVIDIA GPU driver (optional, but recommended)

---

## ⚠️ IMPORTANT: Virtual Environment Setup

**⚠️ DO NOT copy any existing `vibeshift-env` folder from another computer.**

Each team member must create their own isolated Python environment. This ensures:
- No conflicting package versions
- Proper dependency isolation
- Reproducible setup on all machines

---

## 🧩 Step 1: Install Python 3.10

Python version **3.10 is REQUIRED** for this project. Newer versions have compilation issues with some audio libraries.

**Download Python 3.10:**
https://www.python.org/downloads/release/python-3100/

**During installation:**
- ✅ Check "Add Python to PATH"
- ✅ Check "Install pip"
- Do NOT install for all users (install for current user only)

**Verify installation:**
```bash
python --version
```
Should output: `Python 3.10.x`

---

## 🧩 Step 2: Clone the Repository

```bash
git clone https://github.com/mehreensaghar/VibeShift.git
cd VibeShift
```

---

## 🧩 Step 3: Create Virtual Environment

Navigate to the project folder and create an isolated Python environment:

```bash
py -3.10 -m venv vibeshift-env
```

This creates a `vibeshift-env` folder containing isolated Python packages.

---

## 🧩 Step 4: Activate Virtual Environment

The activation command depends on your operating system:

### **Windows (PowerShell):**
```bash
.\vibeshift-env\Scripts\Activate.ps1
```

### **Windows (Command Prompt):**
```bash
vibeshift-env\Scripts\activate.bat
```

### **Mac/Linux:**
```bash
source vibeshift-env/bin/activate
```

**You should see `(vibeshift-env)` at the start of your terminal prompt.**

---

## 🧩 Step 5: Upgrade pip

Ensure pip (Python package manager) is up to date:

```bash
python -m pip install --upgrade pip
```

---

## 🧩 Step 6: Install Python Dependencies

Install all required packages from requirements.txt:

```bash
pip install -r requirements.txt
```

This installs:
- **NumPy** — Numerical computing
- **Librosa** — Audio analysis and mel-spectrogram conversion
- **PyTorch** — Deep learning framework (CPU version)
- **SoundFile** — Audio file I/O
- **Matplotlib** — Data visualization
- **SciPy, Scikit-learn** — Scientific computing

**Expected time:** 2-5 minutes depending on internet speed.

---

## 🧩 Step 7: (Recommended) Install PyTorch with GPU Support

If you have an **NVIDIA GPU**, install the GPU-accelerated version for much faster processing:

```bash
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
```

**Check if GPU is available:**
```bash
python -c "import torch; print('GPU Available:', torch.cuda.is_available())"
```

Output should be: `GPU Available: True`

If GPU not detected, that's okay — the CPU version will still work (just slower).

**Note:** Mac users with Apple Silicon should skip this and use the default CPU installation.

---

## 🧩 Step 8: Download and Setup HiFi-GAN

HiFi-GAN is a pre-trained neural network that converts Mel-spectrograms back into high-quality audio.

### **Step 8.1: Download the Model**

Download the pre-trained model from:
https://github.com/jik876/hifi-gan/releases/tag/v1

Look for **"UNIVERSAL_V1"** folder and download:
- `g_02500000` (this is the trained generator model)

Alternative download (Google Drive):
https://drive.google.com/drive/folders/1-eEYTB5Av9jNql0WGBlRoi-WH2J7bp5Y?usp=sharing

### **Step 8.2: Place the Model**

1. Extract/copy the downloaded file
2. Navigate to: `modules/hifi_gan/`
3. Place the generator file here and **rename it to `generator_v1`** (without extension)

**Your folder should look like:**
```
modules/hifi_gan/
  ├── config_v1.json         (already included ✓)
  ├── generator_v1            (model you just downloaded)
  ├── models.py               (already included ✓)
  ├── utils.py                (already included ✓)
  └── (other hifi_gan files)
```

---

## ▶️ Running the Pipeline

Once setup is complete, test the full pipeline:

```bash
python test.py
```

**What happens:**
1. Loads an audio file (`test_cases/full song.mp3`)
2. Converts to Mel-spectrogram
3. Loads HiFi-GAN model
4. Reconstructs audio from Mel-spectrogram
5. Saves output as `reconstructed.wav`

**Expected output:**
```
HiFi-GAN generator loaded successfully.
Audio saved to reconstructed.wav
```

---

## 📁 Project Structure

```
VibeShift/
├── modules/
│   ├── audio_to_mel.py          # Converts audio → Mel-spectrogram
│   ├── mel_to_audio.py          # Converts Mel → audio (uses HiFi-GAN)
│   ├── hifi_gan/                # HiFi-GAN model directory
│   │   ├── models.py
│   │   ├── utils.py
│   │   ├── config_v1.json
│   │   ├── generator_v1         # (Download & place here)
│   │   └── ...
│   ├── audio_to_mel.py
│   └── mel_to_audio.py
├── test_cases/                  # Sample audio files for testing
├── output_songs/                # Generated output directory
├── requirements.txt             # Python dependencies
├── test.py                      # Test script (run this first!)
├── app.py                       # Main application
└── README.md                    # This file
```

---

## 🔧 Troubleshooting

### **"ModuleNotFoundError: No module named..."**
- Make sure virtual environment is **activated** (check `(vibeshift-env)` in terminal)
- Run: `pip install -r requirements.txt` again

### **"FileNotFoundError: generator_v1 not found"**
- Download HiFi-GAN model from the link above
- Ensure it's placed in `modules/hifi_gan/`
- Rename it to exactly `generator_v1`

### **"DLL load failed" or "ImportError" on Windows**
- Make sure you're using **Python 3.10** (not 3.11 or 3.12)
- Reinstall dependencies: `pip install -r requirements.txt --force-reinstall`

### **GPU not detected (CUDA)**
- Check NVIDIA driver: https://www.nvidia.com/Download/driverDetails.aspx
- Reinstall PyTorch with correct CUDA version
- CPU-only mode still works fine (just slower)

### **Audio file not found**
- Check that `test_cases/full song.mp3` exists
- You can replace it with your own audio files in `.mp3` or `.wav` format

---

## 📝 Working with Audio Files

To process your own audio files:

**Option 1: Update test.py**
```python
mel = audio_to_mel("path/to/your/audio.mp3")
```

**Option 2: Use any audio format**
Supported formats: `.mp3`, `.wav`, `.flac`, `.ogg`

**File size recommendation:** < 30MB (processing time increases with file size)

---

## 💻 System Requirements Summary

| Feature | Minimum | Recommended |
|---------|---------|-------------|
| Python | 3.10 | 3.10 |
| RAM | 4GB | 8GB+ |
| Storage | 3GB | 5GB+ |
| GPU | - | NVIDIA (any with CUDA support) |
| OS | Windows/Mac/Linux | Any |

---

## ⚠️ Important Notes for All Team Members

1. **Python Version:** Always use Python 3.10. Do NOT use 3.11 or newer.
2. **Virtual Environment:** Each person creates their own (don't share the `vibeshift-env` folder).
3. **Activate Before Running:** Always run `.\vibeshift-env\Scripts\activate` before testing.
4. **Git Commits:** Never commit the `vibeshift-env` folder or large model files.
5. **Slow First Run:** The first time you run the pipeline, it will be slow as models are loaded. Subsequent runs are faster.

---

## 🚀 Next Steps (For Development)

After setup is complete:

1. **Explore the codebase** in `modules/` to understand the audio pipeline
2. **Implement CycleGAN** for genre transfer logic
3. **Extend test.py** with genre transformation features
4. **Create unit tests** for each module
5. **Build the UI** in `app.py` for user-friendly interaction

---

## 📊 Pipeline Diagram

```
Raw Audio (.mp3/.wav)
    ↓
[audio_to_mel.py]
    ↓
Mel-Spectrogram (80 frequency bins)
    ↓
[CycleGAN / Transformation Logic]
    ↓
Transformed Mel-Spectrogram
    ↓
[mel_to_audio.py + HiFi-GAN]
    ↓
Reconstructed Audio (.wav)
```

---

## 📞 Help & Support

If you encounter issues:

1. **Check troubleshooting section above** ⬆️
2. **Verify Python version:** `python --version`
3. **Check virtual environment:** Look for `(vibeshift-env)` in terminal
4. **Ask team members** who have successfully set up
5. **Create an issue on GitHub** with full error message and setup details

---

## 📄 License

This project is part of the FYP-2 program. See LICENSE file for details.

---

**Last Updated:** April 2026  
**Python Version:** 3.10  
**Status:** ✅ Working & Ready to Use
