#!/bin/bash
# Deploy Infrastructure with Terraform

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(dirname "$SCRIPT_DIR")/infrastructure"

echo "======================================"
echo "Deploying ImageHub Infrastructure"
echo "======================================"

cd "$INFRA_DIR"

# Initialize Terraform
echo ""
echo "Initializing Terraform..."
terraform init

# Plan the deployment
echo ""
echo "Planning deployment..."
terraform plan -out=tfplan

# Apply the deployment
echo ""
read -p "Do you want to apply this plan? (yes/no): " confirm
if [ "$confirm" = "yes" ]; then
    echo ""
    echo "Applying infrastructure changes..."
    terraform apply tfplan
    
    echo ""
    echo "======================================"
    echo "✓ Deployment completed successfully!"
    echo "======================================"
    echo ""
    echo "Important outputs:"
    terraform output
else
    echo "Deployment cancelled."
fi

# Clean up plan file
rm -f tfplan
