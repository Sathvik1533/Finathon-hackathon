#!/usr/bin/env bash
# ==============================================================================
# FIN-11 LedgerSense | 1-Click AWS Enterprise CloudFormation Deployment
# Topology: AWS ECS Fargate, ALB, Amazon S3, Amazon DynamoDB, Amazon Bedrock IAM
# ==============================================================================
set -euo pipefail

STACK_NAME="${1:-finathon-ledgersense-prod}"
REGION="${AWS_REGION:-${2:-us-east-1}}"
TEMPLATE_FILE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/aws/cloudformation.yaml"

echo "========================================================================"
echo "🚀 FIN-11 LedgerSense | Deploying AWS Cloud Topology to region: $REGION"
echo "Stack Name: $STACK_NAME"
echo "Template:   $TEMPLATE_FILE"
echo "========================================================================"

if ! command -v aws >/dev/null 2>&1; then
  echo "❌ Error: AWS CLI is not installed or not in PATH."
  echo "Please install AWS CLI: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
  exit 1
fi

echo "🔍 Validating AWS CloudFormation template..."
aws cloudformation validate-template \
  --template-body "file://$TEMPLATE_FILE" \
  --region "$REGION" > /dev/null
echo "✓ CloudFormation template validation passed successfully."

echo ""
echo "🚀 Launching AWS CloudFormation stack (ECS Fargate + ALB + S3 + DynamoDB + Bedrock)..."
aws cloudformation deploy \
  --template-file "$TEMPLATE_FILE" \
  --stack-name "$STACK_NAME" \
  --capabilities CAPABILITY_IAM \
  --region "$REGION" \
  --parameter-overrides \
      EnvironmentName="finathon-ledgersense" \
      BedrockModelId="amazon.nova-pro-v1:0" \
      DesiredCount=2

echo ""
echo "========================================================================"
echo "✅ AWS PRODUCTION CLOUD DEPLOYMENT COMPLETED!"
echo "========================================================================"
echo "Stack Outputs:"
aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --query "Stacks[0].Outputs" \
  --output table

ALB_DNS=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --query "Stacks[0].Outputs[?OutputKey=='ALBDnsName'].OutputValue" \
  --output text)

echo ""
echo "🌐 Public Web Application URL: http://$ALB_DNS/"
echo "🩺 API Health Check URL:        http://$ALB_DNS/api/health"
echo "☁️ Cloud Topology Status:      http://$ALB_DNS/api/cloud/status"
echo "========================================================================"
