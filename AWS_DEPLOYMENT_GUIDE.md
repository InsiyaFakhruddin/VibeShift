# AWS Deployment Guide — VibeShift

## Architecture Overview

VibeShift uses a serverless-first approach for AI inference — **no GPU is required on the server** because all heavy ML (Demucs + MusicGen) runs on the [Replicate](https://replicate.com) API. Your server only needs to be a lightweight FastAPI host.

```
Mobile App (Expo)
     ↓ HTTPS
FastAPI on EC2 (t3.small is enough — no GPU needed)
     ├── AWS S3       — audio file storage
     ├── Replicate    — Demucs + MusicGen inference (serverless, pay-per-run)
     └── Clerk        — JWT auth (fully hosted, no setup needed)
```

**Estimated monthly cost (light usage):**
| Component | Cost |
|-----------|------|
| EC2 t3.small (on-demand) | ~$15/month |
| S3 storage (10GB audio) | ~$0.25/month |
| Replicate (per transform ~$0.05) | Pay-per-use |
| Clerk (free tier) | $0 |
| **Total** | **~$15-30/month** |

---

## Prerequisites

- AWS account
- EC2 key pair (.pem file)
- S3 bucket created
- Replicate account with API token
- Clerk application set up (get your issuer URL and JWKS URL from Clerk Dashboard)

---

## Step 1: Launch EC2 Instance

**From AWS Console:**
1. EC2 → Launch Instance
2. AMI: **Ubuntu 22.04 LTS**
3. Instance Type: `t3.small` (2 vCPU, 2GB RAM — sufficient since AI is on Replicate)
4. Storage: 20GB gp3
5. Security Group — allow inbound:
   - Port 22 (SSH) — your IP only
   - Port 8001 (API) — 0.0.0.0/0 (or restrict to your frontend IP)
6. Key Pair: create or select existing
7. Launch

**Or with AWS CLI:**
```bash
aws ec2 run-instances \
  --image-id ami-0c02fb55db3c27f89 \
  --instance-type t3.small \
  --key-name your-key-pair \
  --security-group-ids sg-xxxxx \
  --block-device-mappings DeviceName=/dev/sda1,Ebs={VolumeSize=20,VolumeType=gp3} \
  --region us-east-1
```

---

## Step 2: Connect to Instance

```bash
chmod 600 your-key.pem
ssh -i your-key.pem ubuntu@YOUR_INSTANCE_IP
```

---

## Step 3: Setup Server Environment

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Python 3.10 + pip
sudo apt install -y python3.10 python3.10-venv python3-pip ffmpeg libsndfile1

# Install Git
sudo apt install -y git

# Clone your repo
git clone https://github.com/InsiyaFakhruddin/vibeshift-fyp.git
cd vibeshift-fyp/backend

# Create virtual environment
python3.10 -m venv venv
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt
```

---

## Step 4: Configure Environment Variables

```bash
nano .env
```

Paste and fill in your values:
```env
CLERK_ISSUER=https://your-clerk-domain.clerk.accounts.dev
CLERK_JWKS_URL=https://your-clerk-domain.clerk.accounts.dev/.well-known/jwks.json

AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-vibeshift-bucket

REPLICATE_API_TOKEN=your-replicate-token
```

Save: `Ctrl+O`, `Enter`, `Ctrl+X`

---

## Step 5: Run the Backend

**Quick test:**
```bash
uvicorn main:app --host 0.0.0.0 --port 8001
```

Test from your local machine:
```bash
curl http://YOUR_EC2_IP:8001/docs
```

---

## Step 6: Run as a Background Service (systemd)

Create a service so the backend starts automatically on reboot:

```bash
sudo nano /etc/systemd/system/vibeshift.service
```

Paste:
```ini
[Unit]
Description=VibeShift FastAPI Backend
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/vibeshift-fyp/backend
Environment="PATH=/home/ubuntu/vibeshift-fyp/backend/venv/bin"
EnvironmentFile=/home/ubuntu/vibeshift-fyp/backend/.env
ExecStart=/home/ubuntu/vibeshift-fyp/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8001
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable vibeshift
sudo systemctl start vibeshift
sudo systemctl status vibeshift
```

View logs:
```bash
sudo journalctl -u vibeshift -f
```

---

## Step 7: Update Frontend to Point to EC2

In `frontend/VibeShift/.env`:
```env
EXPO_PUBLIC_API_URL=http://YOUR_EC2_PUBLIC_IP:8001
```

Rebuild/restart Expo after changing this.

---

## Optional: Docker Deployment

If you prefer Docker:

```dockerfile
# Dockerfile (in backend/)
FROM python:3.10-slim

RUN apt-get update && apt-get install -y ffmpeg libsndfile1 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8001
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
```

Build and run:
```bash
docker build -t vibeshift-backend .
docker run -d \
  --name vibeshift-backend \
  -p 8001:8001 \
  --env-file .env \
  --restart unless-stopped \
  vibeshift-backend
```

---

## S3 Bucket Setup

Your S3 bucket needs:

1. **Block all public access** — ON (files are served via pre-signed URLs, never public)
2. **CORS configuration** (for web access if needed):
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": []
  }
]
```

3. **IAM permissions** — the AWS credentials in `.env` need:
```json
{
  "Effect": "Allow",
  "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
  "Resource": "arn:aws:s3:::your-bucket-name/*"
}
```

---

## Common Operations

```bash
# Restart backend
sudo systemctl restart vibeshift

# View live logs
sudo journalctl -u vibeshift -f

# Stop backend
sudo systemctl stop vibeshift

# Pull latest code and restart
cd ~/vibeshift-fyp
git pull origin main
sudo systemctl restart vibeshift
```

---

## Deployment Checklist

- [ ] EC2 instance running (Ubuntu 22.04)
- [ ] Port 8001 open in security group
- [ ] Python 3.10 + dependencies installed
- [ ] `.env` file filled in with all credentials
- [ ] `uvicorn main:app` starts without errors
- [ ] `curl http://EC2_IP:8001/docs` responds
- [ ] systemd service enabled (auto-restarts on crash/reboot)
- [ ] S3 bucket exists with correct IAM permissions
- [ ] Frontend `.env` updated with EC2 IP
- [ ] Clerk allowed origins updated in Clerk Dashboard (add your EC2 IP)
- [ ] End-to-end test: login → upload song → transform → result plays

---

## Troubleshooting

**`401 Unauthorized` on all requests:**
- JWKS URL in `.env` doesn't match your Clerk app
- Check Clerk Dashboard → API Keys → copy the correct issuer URL

**Transform job stuck on `processing` forever:**
- Check logs: `sudo journalctl -u vibeshift -f`
- Check your Replicate API token is valid: `https://replicate.com/account`
- Check S3 credentials are correct

**`ConnectionRefused` from the app:**
- Check the EC2 security group allows port 8001
- Check the service is running: `sudo systemctl status vibeshift`
- Verify the IP in `EXPO_PUBLIC_API_URL` matches your EC2 public IP

**S3 upload fails:**
- Verify `S3_BUCKET_NAME` matches the actual bucket name (case-sensitive)
- Verify IAM permissions include `s3:PutObject`
