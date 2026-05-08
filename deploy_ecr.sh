#!/bin/bash

# AWS Deployment Setup Script
# Run on local machine or EC2 to prepare for deployment

set -e

echo "🚀 VibeShift MusicGen AWS Deployment Setup"
echo "=========================================="

# Configuration
AWS_REGION="${AWS_REGION:-us-east-1}"
ECR_REPO_NAME="vibeshift-musicgen"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "AWS Account ID: $AWS_ACCOUNT_ID"
echo "Region: $AWS_REGION"

# Step 1: Create ECR repository
echo ""
echo "📦 Creating ECR repository..."
aws ecr create-repository \
    --repository-name $ECR_REPO_NAME \
    --region $AWS_REGION \
    2>/dev/null || echo "Repository already exists"

ECR_URL="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO_NAME"
echo "✅ ECR URL: $ECR_URL"

# Step 2: Build Docker image
echo ""
echo "🐳 Building Docker image..."
docker build -t $ECR_REPO_NAME:latest -t $ECR_URL:latest .

# Step 3: Login to ECR
echo ""
echo "🔐 Logging into ECR..."
aws ecr get-login-password --region $AWS_REGION | \
    docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Step 4: Push to ECR
echo ""
echo "📤 Pushing image to ECR..."
docker push $ECR_URL:latest
docker tag $ECR_URL:latest $ECR_URL:$(date +%Y%m%d_%H%M%S)
docker push $ECR_URL:$(date +%Y%m%d_%H%M%S)

echo ""
echo "✅ Deployment image ready!"
echo ""
echo "Next steps:"
echo "1. Launch EC2 instance (g4dn.xlarge with Ubuntu 22.04)"
echo "2. Run: bash deploy_ec2.sh $ECR_URL:latest"
echo ""
echo "Or use AWS ECS/Fargate:"
echo "   - Create task definition with image: $ECR_URL:latest"
echo "   - Assign GPU capabilities"
echo "   - Create service with ALB"
