#!/bin/bash

# EC2 Deployment Script
# Run on EC2 instance to pull and run the container
# Usage: bash deploy_ec2.sh <ECR_IMAGE_URL>

set -e

ECR_IMAGE="${1:-}"
AWS_REGION="${AWS_REGION:-us-east-1}"

if [ -z "$ECR_IMAGE" ]; then
    echo "Usage: bash deploy_ec2.sh <ECR_IMAGE_URL>"
    echo "Example: bash deploy_ec2.sh 123456789.dkr.ecr.us-east-1.amazonaws.com/vibeshift-musicgen:latest"
    exit 1
fi

echo "🚀 VibeShift MusicGen EC2 Deployment"
echo "===================================="
echo "Image: $ECR_IMAGE"

# Update system
echo ""
echo "📦 Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# Install Docker
echo ""
echo "🐳 Installing Docker..."
sudo apt-get install -y docker.io
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ubuntu

# Verify Docker GPU support
echo ""
echo "🎮 Verifying NVIDIA GPU..."
sudo apt-get install -y nvidia-container-runtime
docker run --rm --gpus all nvidia/cuda:12.2.0-runtime-ubuntu22.04 nvidia-smi

# Login to ECR
echo ""
echo "🔐 Logging into ECR..."
aws ecr get-login-password --region $AWS_REGION | \
    docker login --username AWS --password-stdin $(echo $ECR_IMAGE | cut -d'/' -f1)

# Pull image
echo ""
echo "📥 Pulling Docker image from ECR..."
docker pull $ECR_IMAGE

# Stop any existing container
echo ""
echo "🛑 Stopping existing containers..."
docker stop vibeshift-api 2>/dev/null || true
docker rm vibeshift-api 2>/dev/null || true

# Run container
echo ""
echo "▶️  Starting VibeShift API container..."
docker run -d \
    --name vibeshift-api \
    --gpus all \
    -p 8000:8000 \
    -e CUDA_VISIBLE_DEVICES=0 \
    -e PYTHONUNBUFFERED=1 \
    --restart unless-stopped \
    --log-driver json-file \
    --log-opt max-size=10m \
    --log-opt max-file=3 \
    $ECR_IMAGE

# Wait for container to start
echo ""
echo "⏳ Waiting for API to start..."
for i in {1..60}; do
    if curl -s http://localhost:8000/health > /dev/null; then
        echo "✅ API is ready!"
        break
    fi
    echo "  Waiting... ($i/60)"
    sleep 2
done

# Show logs
echo ""
echo "📋 Recent logs:"
docker logs vibeshift-api | tail -20

# Display API info
echo ""
echo "✅ Deployment complete!"
echo ""
echo "API Endpoints:"
echo "  Health: http://$(hostname -I | awk '{print $1}'):8000/health"
echo "  Info:   http://$(hostname -I | awk '{print $1}'):8000/info"
echo "  Genres: http://$(hostname -I | awk '{print $1}'):8000/genres"
echo "  Transform: POST to http://$(hostname -I | awk '{print $1}'):8000/transform"
echo ""
echo "View logs with: docker logs -f vibeshift-api"
echo "Stop with: docker stop vibeshift-api"
