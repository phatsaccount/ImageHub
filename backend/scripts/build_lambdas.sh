#!/bin/bash
# Build Lambda Deployment Packages
# This script creates .zip files for Lambda functions with dependencies

set -e

echo "======================================"
echo "Building Lambda Deployment Packages"
echo "======================================"

# Create deployment directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
DEPLOY_DIR="$BACKEND_DIR/deployment"

mkdir -p "$DEPLOY_DIR"

# Function to build Lambda package
build_lambda() {
    local LAMBDA_NAME=$1
    local LAMBDA_DIR="$BACKEND_DIR/lambdas/$LAMBDA_NAME"
    local BUILD_DIR="$DEPLOY_DIR/build_$LAMBDA_NAME"
    local OUTPUT_ZIP="$DEPLOY_DIR/${LAMBDA_NAME}.zip"

    echo ""
    echo "Building $LAMBDA_NAME..."
    echo "--------------------------------------"

    # Clean previous build
    rm -rf "$BUILD_DIR"
    rm -f "$OUTPUT_ZIP"
    mkdir -p "$BUILD_DIR"

    # Copy Lambda code
    cp "$LAMBDA_DIR/handler.py" "$BUILD_DIR/"

    # Install dependencies if requirements.txt exists
    if [ -f "$LAMBDA_DIR/requirements.txt" ]; then
        echo "Installing dependencies for $LAMBDA_NAME..."
        pip install -r "$LAMBDA_DIR/requirements.txt" -t "$BUILD_DIR/" --quiet
    fi

    # Create zip file
    cd "$BUILD_DIR"
    zip -r "$OUTPUT_ZIP" . -q
    cd - > /dev/null

    # Clean up build directory
    rm -rf "$BUILD_DIR"

    echo "✓ Created: $OUTPUT_ZIP"
    echo "  Size: $(du -h "$OUTPUT_ZIP" | cut -f1)"
}

# Build Image Processor Lambda
build_lambda "image_processor"

# Build Presigned URL Lambda
build_lambda "get_presigned_url"

echo ""
echo "======================================"
echo "✓ All Lambda packages built successfully!"
echo "======================================"
echo ""
echo "Deployment packages are in: $DEPLOY_DIR"
ls -lh "$DEPLOY_DIR"/*.zip
