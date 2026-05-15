# Pulling Updates — VibeShift

This guide covers how to pull the latest changes from the VibeShift repository.

---

## Quick Pull (No Local Changes)

```bash
cd fyp_project
git pull origin main
```

---

## If You Have Local Changes

### Option 1: Save and restore your changes (recommended)

```bash
git stash
git pull origin main
git stash pop
```

- `git stash` — saves your local changes temporarily
- `git pull` — downloads the latest from remote
- `git stash pop` — re-applies your saved changes on top

If conflicts occur, Git will mark them in the files. Resolve manually then:
```bash
git add .
git commit -m "Resolved merge conflicts"
```

### Option 2: Discard local changes (start fresh)

```bash
git reset --hard origin/main
```

> **Warning:** This permanently deletes any uncommitted local changes.

---

## After Pulling

### Backend — install any new dependencies

```bash
cd backend
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux
pip install -r requirements.txt
```

Restart the backend:
```bash
# If running manually:
uvicorn main:app --host 0.0.0.0 --port 8001 --reload

# If running as systemd service:
sudo systemctl restart vibeshift
```

### Frontend — install any new packages

```bash
cd frontend/VibeShift
npm install
npx expo start
```

---

## Verify the Pull

```bash
git log --oneline -5
```

You should see the latest commits at the top.

---

## Common Issues

**`fatal: Not a git repository`**
Make sure you're in the project directory:
```bash
cd path/to/fyp_project
git status
```

**`Permission denied` / `Access denied`**
Ensure you're a collaborator on the repo and authenticated:
```bash
git config user.name "Your Name"
git config user.email "your.email@example.com"
```

**`Merge conflict` after pull**
Use Option 1 (stash) above, or open the conflicting files, manually resolve the `<<<<<<` markers, then commit.

---

## Project Structure Reminder

After pulling, ensure your local `.env` files are present (they are gitignored and never committed):
- `backend/.env` — Clerk, AWS S3, Replicate credentials
- `frontend/VibeShift/.env` — Clerk publishable key, API URL

See [README.md](README.md) for the full env variable reference.
