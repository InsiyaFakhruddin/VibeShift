# VibeShift MusicGen AWS Hosting - Quick Start Guide

## 📋 Overview

This guide helps you deploy your MusicGen audio transformation API on AWS with GPU support.

**What you're deploying:**
- FastAPI server with MusicGen (facebook/musicgen-melody)
- Demucs audio separation
- Runs on NVIDIA GPUs for fast inference
- Accessible via REST API

**Architecture:**
```
Frontend (React Native/Web)
    ↓
API Gateway / ALB
    ↓
EC2 Instance (g4dn.xlarge with NVIDIA GPU)
    ↓
Docker Container (FastAPI + MusicGen)
    ↓
S3 Bucket (for audio storage)
```

---

## 🚀 Option 1: Quick Deploy with CloudFormation (Easiest)

### Prerequisites
- AWS account with appropriate permissions
- AWS CLI configured
- EC2 key pair created

### Step 1: Create Stack
```bash
# Navigate to VibeShift root directory
cd ~/Documents/VibeShift

# Deploy CloudFormation template
aws cloudformation create-stack \
  --stack-name vibeshift-musicgen-stack \
  --template-body file://cloudformation-template.yaml \
  --parameters \
    ParameterKey=KeyPairName,ParameterValue=your-key-pair-name \
    ParameterKey=InstanceType,ParameterValue=g4dn.xlarge \
    ParameterKey=EnvironmentName,ParameterValue=production \
  --region us-east-1

# Wait for stack creation (5-10 minutes)
aws cloudformation wait stack-create-complete \
  --stack-name vibeshift-musicgen-stack \
  --region us-east-1

# Get outputs
aws cloudformation describe-stacks \
  --stack-name vibeshift-musicgen-stack \
  --query 'Stacks[0].Outputs' \
  --region us-east-1
```

### Step 2: Build and Push Container
```bash
# Build and push to ECR
bash deploy_ecr.sh

# Output will show your ECR image URL
```

### Step 3: Deploy on EC2
```bash
# Get the instance IP from CloudFormation output
INSTANCE_IP=$(aws cloudformation describe-stacks \
  --stack-name vibeshift-musicgen-stack \
  --query 'Stacks[0].Outputs[?OutputKey==`InstancePublicIP`].OutputValue' \
  --output text)

# SSH into instance
ssh -i your-key.pem ubuntu@$INSTANCE_IP

# On EC2: Download and run deployment script
curl -O https://raw.githubusercontent.com/your-repo/deploy_ec2.sh
bash deploy_ec2.sh YOUR_ECR_IMAGE_URL:latest
```

### Step 4: Test the API
```bash
curl http://$INSTANCE_IP:8000/health
```

---

## 🏗️ Option 2: Manual Deployment

### Step 1: Create EC2 Instance

**AWS Console:**
1. EC2 → Launch Instance
2. AMI: Ubuntu 22.04 LTS
3. Instance Type: `g4dn.xlarge`
4. Storage: 100GB gp3
5. Security Group: Allow ports 22 (SSH) and 8000 (API)
6. Key Pair: Create or select existing
7. Launch!

**Or with AWS CLI:**
```bash
aws ec2 run-instances \
  --image-id ami-0c02fb55db3c27f89 \
  --instance-type g4dn.xlarge \
  --key-name your-key-pair \
  --security-group-ids sg-xxxxx \
  --block-device-mappings DeviceName=/dev/sda1,Ebs={VolumeSize=100,VolumeType=gp3} \
  --region us-east-1
```

### Step 2: Connect to Instance
```bash
# Get instance IP
INSTANCE_IP=$(aws ec2 describe-instances \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text)

# SSH
ssh -i your-key.pem ubuntu@$INSTANCE_IP
```

### Step 3: Setup EC2 (Run on Instance)
```bash
# Create ECR repository
aws ecr create-repository \
  --repository-name vibeshift-musicgen \
  --region us-east-1

# Get ECR URL
export ECR_URL=$(aws sts get-caller-identity --query Account --output text).dkr.ecr.us-east-1.amazonaws.com/vibeshift-musicgen
echo "ECR URL: $ECR_URL"

# Copy the deployment script URL and run it
# (Or manually follow the steps in deploy_ec2.sh)
```

### Step 4: Build Docker Image
```bash
# On your local machine
cd ~/Documents/VibeShift
bash deploy_ecr.sh
```

### Step 5: Run Container on EC2
```bash
# On EC2 instance
export ECR_IMAGE="YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/vibeshift-musicgen:latest"

# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin $(echo $ECR_IMAGE | cut -d'/' -f1)

# Pull and run
docker pull $ECR_IMAGE

docker run -d \
  --name vibeshift-api \
  --gpus all \
  -p 8000:8000 \
  -e CUDA_VISIBLE_DEVICES=0 \
  --restart unless-stopped \
  $ECR_IMAGE
```

### Step 6: Verify It Works
```bash
# From your local machine
curl http://$INSTANCE_IP:8000/health
curl http://$INSTANCE_IP:8000/genres

# Should return JSON responses
```

---

## 💻 Testing Locally First

### Before deploying to AWS, test on your machine:

```bash
# Install API dependencies
pip install fastapi uvicorn python-multipart

# Run API locally
cd backend/modules/genre_transform/musicgen
uvicorn api:app --reload --host 0.0.0.0 --port 8000
```

**Test endpoints:**
```bash
# Health check
curl http://localhost:8000/health

# List genres
curl http://localhost:8000/genres

# Transform audio
curl -X POST http://localhost:8000/transform \
  -F "audio_file=@test_song.mp3" \
  -F "target_genre=rock" \
  -F "duration=10" \
  --output result.wav

# Play result
ffplay result.wav
```

---

## 📱 Frontend Integration

### React Native (Expo)

Update your genre transform screen:

```typescript
const API_URL = 'http://your-instance-ip:8000'; // Or AWS ALB

const transformAudio = async (file: DocumentPickerAsset, genre: string) => {
  const formData = new FormData();
  formData.append('audio_file', {
    uri: file.uri,
    type: file.mimeType || 'audio/mpeg',
    name: file.name,
  } as any);
  formData.append('target_genre', genre);
  formData.append('duration', '10');
  formData.append('start_offset', '5');

  const response = await fetch(`${API_URL}/transform`, {
    method: 'POST',
    body: formData,
  });

  const blob = await response.blob();
  return URL.createObjectURL(blob);
};
```

---

## 🔧 Common Operations

### View API Logs
```bash
docker logs -f vibeshift-api
```

### Stop API
```bash
docker stop vibeshift-api
docker remove vibeshift-api
```

### Restart API
```bash
docker restart vibeshift-api
```

### Update API (new image)
```bash
# Pull new image
docker pull YOUR_ECR_URL:latest

# Stop old container
docker stop vibeshift-api
docker rm vibeshift-api

# Run new container
docker run -d \
  --name vibeshift-api \
  --gpus all \
  -p 8000:8000 \
  --restart unless-stopped \
  YOUR_ECR_URL:latest
```

### Check GPU Usage
```bash
nvidia-smi
nvidia-smi -l 1  # Updates every second
```

---

## 💰 Cost Breakdown

| Component | Cost/Hour | Cost/Month |
|-----------|-----------|-----------|
| g4dn.xlarge (on-demand) | $0.89 | $650 |
| g4dn.xlarge (spot) | $0.26 | $190 |
| Data transfer (egress) | — | $50-100 |
| S3 storage (audio files) | — | $5-20 |
| **Total (spot)** | **~$0.30** | **~$220-310** |
| **Total (on-demand)** | **~$0.95** | **~$700-800** |

**Tips to reduce costs:**
- Use spot instances (70% savings)
- Stop instance when not in use
- Use lifecycle policies in S3
- Consider ECS with Fargate (if GPU support available)

---

## 🚨 Troubleshooting

### API Returns 503 "Model not initialized"
- API is still loading (wait 60 seconds)
- Check logs: `docker logs vibeshift-api`
- Verify GPU: `nvidia-smi`

### "Permission denied" when SSH
- Check key permissions: `chmod 600 key.pem`
- Verify security group allows port 22

### Docker: "GPU not detected"
- Verify NVIDIA drivers: `nvidia-smi`
- Verify nvidia-container-runtime: `docker run --rm --gpus all ubuntu nvidia-smi`

### "Out of memory" error
- Use smaller model or larger instance
- Reduce concurrent requests
- Increase GPU swap (not recommended)

### Audio output is distorted
- Reduce `guidance` parameter (9.5 → 7.0)
- Reduce `vocal_mix` (1.5 → 1.0)
- Reduce duration to < 20s

---

## 📊 Monitoring

### Setup CloudWatch Alarms
```bash
aws cloudwatch put-metric-alarm \
  --alarm-name vibeshift-api-down \
  --alarm-description "Alert when API is down" \
  --metric-name StatusCheckFailed \
  --namespace AWS/EC2 \
  --statistic Minimum \
  --period 300 \
  --threshold 0 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=InstanceId,Value=i-xxxxx
```

### SSH into Instance and Monitor
```bash
# Real-time GPU usage
watch -n 1 nvidia-smi

# Docker container stats
docker stats vibeshift-api

# API logs
docker logs -f --timestamps vibeshift-api
```

---

## 🔐 Security Best Practices

1. **Restrict API Access**
   ```bash
   # Only allow from your frontend
   # In security group, restrict port 8000 to your frontend IP/ALB
   ```

2. **Use Secrets Manager**
   ```bash
   # For S3 credentials
   aws secretsmanager create-secret --name vibeshift/s3
   ```

3. **Setup IAM Roles**
   - Use instance profiles (done in CloudFormation)
   - Don't use root credentials

4. **Enable VPC Endpoints**
   - For S3 access without internet gateway

5. **Use HTTPS/ALB**
   - Setup Application Load Balancer
   - Terminate SSL at ALB

---

## 📚 Additional Resources

- **FastAPI Docs:** http://your-api:8000/docs (auto-generated)
- **MusicGen Model:** https://huggingface.co/facebook/musicgen-melody
- **Demucs:** https://github.com/facebookresearch/demucs
- **AWS GPU Instances:** https://aws.amazon.com/ec2/instance-types/g4/

---

## ✅ Deployment Checklist

- [ ] AWS account setup
- [ ] EC2 key pair created
- [ ] Docker image builds locally
- [ ] requirements.txt updated
- [ ] api.py created
- [ ] CloudFormation template deployed (or manual EC2)
- [ ] ECR repository created
- [ ] Docker image pushed to ECR
- [ ] API container running on EC2
- [ ] Health check passing
- [ ] Frontend configured to use API endpoint
- [ ] CloudWatch alarms setup
- [ ] Tested audio transformation end-to-end

---

## 🆘 Need Help?

Check these in order:
1. API health: `curl http://api-ip:8000/health`
2. Docker logs: `docker logs vibeshift-api`
3. GPU status: `nvidia-smi`
4. Network: `curl -v http://api-ip:8000/health`
5. AWS console for instance state
