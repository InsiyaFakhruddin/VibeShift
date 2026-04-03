# Pulling Updates to VibeShift

This guide explains how to pull the latest changes if you've already cloned the VibeShift repository.

## Quick Start (No Local Changes)

If you haven't made any changes to your local copy, simply run:

```bash
git pull origin main
```

This downloads and applies all updates from the remote repository.

---

## If You Have Local Changes

### Option 1: Keep Your Changes (Recommended during active development)

If you've made local modifications and want to keep them while updating the code:

```bash
git stash
git pull origin main
git stash pop
```

**What this does:**
- `git stash` - Saves your local changes temporarily
- `git pull origin main` - Downloads the latest updates
- `git stash pop` - Re-applies your saved changes on top of the updates

**⚠️ If conflicts occur:** Git will mark conflicting sections in affected files. Open those files, manually resolve the conflicts (choose which version to keep), then run:
```bash
git add .
git commit -m "Resolved merge conflicts"
```

### Option 2: Discard Your Changes (Start Fresh)

If you want to reset to the latest remote version and discard all local changes:

```bash
git reset --hard origin/main
```

**⚠️ Warning:** This permanently deletes any uncommitted local changes. Only use if you're sure you don't need them.

---

## Step-by-Step Guide for First-Time Pullers

### 1. Check Your Current Status
```bash
git status
```
You should see which files have been modified locally (if any).

### 2. Pull the Updates
```bash
git pull origin main
```

### 3. Verify the Pull
```bash
git log --oneline -5
```
You should see the latest commits from the remote repository.

### 4. Verify All Files Are Present
```bash
ls -la
```
You should see:
- ✅ `train.py` - Training script
- ✅ `convert.py` - Inference/conversion script
- ✅ `prepare_dataset.py` - Dataset preparation script
- ✅ `modules/cyclegan/` - CycleGAN implementation
- ✅ `checkpoints/` - Pre-trained models
- ✅ `README.md` - Updated documentation

---

## What's New in Recent Updates?

### Updated Files:
- **README.md** - Added pull instructions and genre transformation pipeline documentation
- **train.py** - CycleGAN training with GPU support
- **convert.py** - Full pipeline for audio genre conversion
- **modules/cyclegan/** - Complete CycleGAN architecture

### New Folders:
- **checkpoints/** - Pre-trained jazz↔disco models (ready to use!)
- **test_cases/** - Sample audio files for testing

---

## Common Issues & Solutions

### Issue: "fatal: Not a git repository"
**Solution:** Make sure you're in the VibeShift directory:
```bash
cd /path/to/VibeShift
git status
```

### Issue: "Permission denied" or "Access to repository denied"
**Solution:** Ensure you have proper authentication. For HTTPS:
```bash
git config user.name "Your Name"
git config user.email "your.email@example.com"
```

For SSH, ensure your SSH key is added to GitHub.

### Issue: Merge conflicts after pull
**Solution:** Use the stash approach (see Option 1 above) or manually edit conflicting files and resolve them.

### Issue: Behind by N commits, ahead by M commits
**Solution:** You have local changes. Use the stash approach to clean up:
```bash
git stash
git pull origin main
git stash pop  # or git stash drop if you don't want your changes
```

---

## Next Steps After Pulling

### 1. Verify the Python Environment
```bash
conda activate vibeshift-env
# or
source vibeshift-env/bin/activate  # On Linux/Mac
```

### 2. Install/Update Dependencies (if any changed)
```bash
pip install -r requirements.txt
```

### 3. Test the Conversion Pipeline
```bash
python convert.py
```

This will use the pre-trained jazz→disco model to transform a test audio file. You should see `output_jazz_to_disco.wav` created.

### 4. Train Your Own Model (Optional)
```bash
python train.py
```

This trains a new CycleGAN model for jazz↔disco genre transformation (requires GTZAN dataset).

---

## Need Help?

- Check the main **README.md** for setup and usage documentation
- Review **modules/cyclegan/** for architecture details
- See **test_cases/** for sample audio files

Happy training! 🎵
