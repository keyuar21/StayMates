#!/bin/bash

# This script automates building, tagging, and pushing a Docker image to AWS ECR.
# The script will exit immediately if any command fails.
set -e

# --- Configuration ---
# 👉 You can change these values for other projects.
AWS_REGION="ap-south-1"
AWS_ACCOUNT_ID="563765641164"
REPOSITORY_NAME="staymates-app"
IMAGE_TAG="latest"

# --- Script Logic ---
# Construct the full ECR image URI from the variables above.
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
FULL_IMAGE_NAME="${ECR_REGISTRY}/${REPOSITORY_NAME}:${IMAGE_TAG}"

echo "ECR Target: ${FULL_IMAGE_NAME}"
echo ""

# 1. Authenticate Docker to your AWS ECR registry.
echo "🔐 Authenticating with AWS ECR..."
aws ecr get-login-password --region "${AWS_REGION}" | docker login --username AWS --password-stdin "${ECR_REGISTRY}"
echo "✅ Authentication successful!"
echo ""

# 2. Build the image for the correct 'amd64' architecture.
echo "🛠️ Building Docker image for linux/amd64 architecture..."
docker buildx build --platform linux/amd64 -t "${REPOSITORY_NAME}:${IMAGE_TAG}" . --load
echo "✅ Build complete."
echo ""

# 3. Tag the newly built image with the ECR repository URI.
echo "🏷️ Tagging image for ECR..."
docker tag "${REPOSITORY_NAME}:${IMAGE_TAG}" "${FULL_IMAGE_NAME}"
echo "✅ Tagging complete."
echo ""

# 4. Push the tagged image to your ECR repository.
echo "🚀 Pushing image to ECR..."
docker push "${FULL_IMAGE_NAME}"
echo ""
echo "🎉 Success! The amd64 image has been pushed to your ECR repository."