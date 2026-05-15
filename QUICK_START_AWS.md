# Quick Start — Running VibeShift Backend on AWS

## What This Gets You

A running FastAPI backend on EC2 that the Expo mobile app can talk to. No GPU needed — AI inference is handled by Replicate's serverless API.

---

## Fastest Path (5 steps)

### 1. Launch EC2

- AMI: Ubuntu 22.04 LTS
- Instance type: `t3.small` (no GPU needed)
- Security group: open port 22 (SSH) and port 8001 (API)
- Key pair: save the `.pem` file

### 2. SSH In & Install Dependencies

```bash
ssh -i your-key.pem ubuntu@YOUR_EC2_IP

sudo apt update && sudo apt install -y python3.10 python3.10-venv python3-pip ffmpeg libsndfile1 git
```

### 3. Clone & Install

```bash
git clone https://github.com/InsiyaFakhruddin/vibeshift-fyp.git
cd vibeshift-fyp/backend
python3.10 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
```

### 4. Create `.env`

```bash
nano .env
```

```env
CLERK_ISSUER=https://your-clerk-domain.clerk.accounts.dev
CLERK_JWKS_URL=https://your-clerk-domain.clerk.accounts.dev/.well-known/jwks.json
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-bucket
REPLICATE_API_TOKEN=your-token
```

### 5. Start the Server

```bash
uvicorn main:app --host 0.0.0.0 --port 8001
```

Test it:
```bash
curl http://YOUR_EC2_IP:8001/docs
```

**Update the app:**
In `frontend/VibeShift/.env` on your dev machine:
```env
EXPO_PUBLIC_API_URL=http://YOUR_EC2_IP:8001
```

---

## Keep It Running (systemd)

```bash
sudo nano /etc/systemd/system/vibeshift.service
```

```ini
[Unit]
Description=VibeShift Backend
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/vibeshift-fyp/backend
Environment="PATH=/home/ubuntu/vibeshift-fyp/backend/venv/bin"
EnvironmentFile=/home/ubuntu/vibeshift-fyp/backend/.env
ExecStart=/home/ubuntu/vibeshift-fyp/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8001
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable vibeshift
sudo systemctl start vibeshift
```

---

## Useful Commands

```bash
sudo systemctl status vibeshift     # check status
sudo journalctl -u vibeshift -f     # live logs
sudo systemctl restart vibeshift    # restart after code update
```

---

## Architecture Reminder

```
Expo App → EC2:8001 (FastAPI)
                ├── Replicate API  → Demucs + MusicGen (serverless AI)
                └── AWS S3         → audio file storage
```

No GPU on EC2. No Docker required for basic setup. See [AWS_DEPLOYMENT_GUIDE.md](AWS_DEPLOYMENT_GUIDE.md) for Docker and advanced options.

---

## Checklist

- [ ] EC2 running, port 8001 open
- [ ] `.env` filled in
- [ ] `curl http://EC2_IP:8001/docs` responds
- [ ] Frontend `.env` updated with EC2 IP
- [ ] Login + upload + transform works end-to-end
