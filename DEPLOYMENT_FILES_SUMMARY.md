# AWS Deployment Files Summary

## 📁 Files Created

### 1. **QUICK_START_AWS.md** ⭐ START HERE
- **Purpose:** Complete end-to-end deployment guide
- **Contains:** Step-by-step instructions for both CloudFormation and manual deployment
- **Best for:** Getting deployed to AWS quickly

### 2. **AWS_DEPLOYMENT_GUIDE.md** 📖
- **Purpose:** Comprehensive architecture and technical guide
- **Contains:** 
  - Detailed explanations of each architecture option
  - Step-by-step setup instructions
  - Cost analysis
  - Deployment checklist
- **Best for:** Understanding the full picture before deploying

### 3. **API_TESTING_GUIDE.md** 🧪
- **Purpose:** How to test and integrate the API
- **Contains:**
  - Local testing procedures
  - Frontend integration examples (React Native & Web)
  - Environment configuration
  - Monitoring and scaling
  - Error handling
- **Best for:** Testing locally and integrating with frontend

### 4. **backend/modules/genre_transform/musicgen/api.py** 💻
- **Purpose:** FastAPI wrapper for MusicGen
- **Contains:**
  - Health check endpoints
  - Audio transformation endpoint
  - S3 integration (optional)
  - CORS middleware
  - Error handling
- **Status:** Ready to deploy
- **Usage:** Auto-loaded when Docker container starts

### 5. **Dockerfile** 🐳
- **Purpose:** Docker image for AWS deployment
- **Contains:**
  - Multi-stage build for minimal size
  - NVIDIA CUDA 12.2 with runtime
  - All Python dependencies
  - MusicGen model pre-download
  - Security (non-root user)
- **Status:** Ready to build and push to ECR

### 6. **cloudformation-template.yaml** ☁️
- **Purpose:** AWS infrastructure as code
- **Creates:**
  - EC2 instance with GPU (g4dn.xlarge)
  - Security groups
  - IAM roles and permissions
  - S3 bucket for audio
  - CloudWatch log group and alarms
- **Status:** Ready to deploy
- **Usage:** `aws cloudformation create-stack --template-body file://cloudformation-template.yaml ...`

### 7. **deploy_ecr.sh** 📤
- **Purpose:** Automated Docker build and ECR push
- **Does:**
  - Creates ECR repository
  - Builds Docker image
  - Pushes to AWS ECR
  - Provides next steps
- **Usage:** `bash deploy_ecr.sh`
- **Requires:** AWS credentials configured

### 8. **deploy_ec2.sh** 🚀
- **Purpose:** Automated EC2 instance setup and container deployment
- **Does:**
  - Updates system
  - Installs Docker and NVIDIA drivers
  - Sets up logging
  - Pulls and runs container with GPU
  - Waits for API to be ready
  - Displays API endpoints
- **Usage:** `bash deploy_ec2.sh <ECR_IMAGE_URL>`
- **Run on:** EC2 instance via SSH

### 9. **requirements.txt** (Updated) 📦
- **Changes:** Added API and deployment dependencies
- **New packages:**
  - `fastapi` - REST API framework
  - `uvicorn` - ASGI server
  - `gunicorn` - Production WSGI server
  - `pydantic` - Data validation
  - `boto3` - AWS SDK

---

## 🔄 Deployment Flow

```
┌─────────────────────────────────────────────────────────┐
│ Option 1: CloudFormation (Automatic)                    │
├─────────────────────────────────────────────────────────┤
│ 1. Run: aws cloudformation create-stack ...             │
│ 2. Run: bash deploy_ecr.sh                              │
│ 3. SSH to instance                                       │
│ 4. Run: bash deploy_ec2.sh <ECR_IMAGE>                  │
│ 5. Done! API is running                                 │
└─────────────────────────────────────────────────────────┘

OR

┌─────────────────────────────────────────────────────────┐
│ Option 2: Manual EC2 Setup                              │
├─────────────────────────────────────────────────────────┤
│ 1. Create EC2 instance manually (AWS Console)           │
│ 2. Run: bash deploy_ecr.sh (on local machine)           │
│ 3. SSH to instance                                       │
│ 4. Run: bash deploy_ec2.sh <ECR_IMAGE>                  │
│ 5. Done! API is running                                 │
└─────────────────────────────────────────────────────────┘

OR

┌─────────────────────────────────────────────────────────┐
│ Option 3: Local Development & Testing                   │
├─────────────────────────────────────────────────────────┤
│ 1. cd backend/modules/genre_transform/musicgen          │
│ 2. pip install fastapi uvicorn                          │
│ 3. uvicorn api:app --reload                             │
│ 4. Test at http://localhost:8000                        │
│ 5. Follow Option 1 or 2 when ready to deploy            │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 Quick Reference

### To Deploy to AWS (Fastest)
```bash
# 1. Build and push Docker image
bash deploy_ecr.sh
# Outputs: YOUR_ECR_IMAGE_URL

# 2. Deploy EC2 with CloudFormation
aws cloudformation create-stack \
  --stack-name vibeshift-musicgen \
  --template-body file://cloudformation-template.yaml \
  --parameters ParameterKey=KeyPairName,ParameterValue=your-key

# 3. SSH to instance and setup
ssh -i key.pem ubuntu@INSTANCE_IP
bash deploy_ec2.sh YOUR_ECR_IMAGE_URL

# 4. Test
curl http://INSTANCE_IP:8000/health
```

### To Test Locally
```bash
cd backend/modules/genre_transform/musicgen
pip install fastapi uvicorn
uvicorn api:app --reload
# Visit: http://localhost:8000/docs (interactive API docs)
```

### To Update Frontend
```typescript
const API_URL = 'http://instance-ip:8000'; // or your ALB DNS

// Call the transform endpoint
const formData = new FormData();
formData.append('audio_file', audioFile);
formData.append('target_genre', 'rock');

const response = await fetch(`${API_URL}/transform`, {
  method: 'POST',
  body: formData,
});
const audioBlob = await response.blob();
```

---

## 📊 File Dependencies

```
cloudformation-template.yaml
    ↑
    └─→ Creates EC2 Instance

Dockerfile
    ↑
    ├─→ requirements.txt (updated)
    ├─→ backend/modules/genre_transform/musicgen/api.py
    └─→ backend/modules/genre_transform/musicgen/genre_transfer.py

deploy_ecr.sh
    ├─→ Dockerfile
    └─→ requirements.txt

deploy_ec2.sh
    ├─→ Pulls Dockerfile from ECR
    └─→ Runs api.py

QUICK_START_AWS.md ⭐ START HERE
    ├─→ cloudformation-template.yaml
    ├─→ deploy_ecr.sh
    ├─→ deploy_ec2.sh
    └─→ AWS_DEPLOYMENT_GUIDE.md

API_TESTING_GUIDE.md
    └─→ backend/modules/genre_transform/musicgen/api.py
```

---

## 🚀 What Happens When You Deploy

### 1. CloudFormation (creates AWS resources)
- ✅ EC2 instance with GPU
- ✅ Security groups
- ✅ IAM roles
- ✅ S3 bucket
- ✅ CloudWatch monitoring

### 2. Docker Image Build & Push
- ✅ Python 3.11 + CUDA 12.2
- ✅ All dependencies installed (torch, torchaudio, demucs, etc.)
- ✅ Pushed to ECR (AWS's container registry)

### 3. Container Deploy on EC2
- ✅ Pulled from ECR
- ✅ GPU access enabled
- ✅ Port 8000 exposed
- ✅ Auto-restart on failure
- ✅ Logging to CloudWatch

### 4. API Endpoints Available
- ✅ `GET /health` - API status
- ✅ `GET /info` - System info & GPU details
- ✅ `GET /genres` - List available genres
- ✅ `POST /transform` - Transform audio to genre
- ✅ `POST /transform-s3` - Process from S3
- ✅ `GET /docs` - Interactive API documentation (Swagger UI)

---

## 💡 Key Features

### What You Get
- ✅ REST API for audio transformation
- ✅ GPU acceleration (NVIDIA T4)
- ✅ Automatic model loading
- ✅ Multi-genre support
- ✅ S3 integration
- ✅ CloudWatch monitoring
- ✅ Auto-restart on failure
- ✅ Interactive API docs
- ✅ CORS enabled (for frontend)

### Performance
- MusicGen model: ~10-20 seconds to transform 10 seconds of audio (on T4)
- Model size: ~3GB VRAM
- Supports concurrent requests (single worker recommended)

### Scalability
- Single instance: ~2-5 transforms per minute
- Multiple instances: Add ALB for load balancing
- Cost-effective with spot instances (70% savings)

---

## 🔒 Security Considerations

✅ What's secure:
- Non-root user in Docker
- IAM roles (no hardcoded credentials)
- Security groups restricting ports
- CORS configured

⚠️ What to customize:
- Restrict API access to your domain only
- Use HTTPS/ALB in production
- Setup secrets for sensitive data
- Enable VPC endpoints for S3

---

## 📞 Support & Next Steps

1. **Start with QUICK_START_AWS.md** - Follow the CloudFormation option
2. **Test locally first** - Use API_TESTING_GUIDE.md
3. **Check AWS_DEPLOYMENT_GUIDE.md** - For detailed architecture
4. **API documentation** - Visit `http://your-api:8000/docs`

### Common Questions

**Q: How much will it cost?**
- A: ~$190-220/month with spot instances, or ~$650/month on-demand

**Q: Can I use a smaller GPU?**
- A: T4 is minimum recommended. Can use smaller instance for testing, but inference will be slower

**Q: How do I update the API code?**
- A: 1) Update api.py, 2) Rebuild Docker image, 3) Push to ECR, 4) Re-run deploy_ec2.sh

**Q: How do I add custom audio effects?**
- A: Edit the vocal FX logic in genre_transfer.py, then rebuild Docker image

**Q: Can I scale to multiple instances?**
- A: Yes! Use ECS with Fargate or ALB + multiple EC2 instances

---

## ✨ You're All Set!

All the files needed for AWS deployment are ready. Choose your deployment path:

1. **Fastest:** Use CloudFormation (5 min setup)
2. **Most Control:** Manual EC2 + Docker
3. **Learning:** Test locally first with api.py

Start with **QUICK_START_AWS.md** 🚀
