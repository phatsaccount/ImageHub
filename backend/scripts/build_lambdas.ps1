# Build Lambda Deployment Packages (Windows PowerShell)
# This script creates .zip files for Lambda functions with dependencies

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Building Lambda Deployment Packages" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

# Set up directories
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Split-Path -Parent $ScriptDir
$DeployDir = Join-Path $BackendDir "deployment"

# Create deployment directory
New-Item -ItemType Directory -Force -Path $DeployDir | Out-Null

# Function to build Lambda package
function Build-Lambda {
    param(
        [string]$LambdaName
    )
    
    $LambdaDir = Join-Path $BackendDir "lambdas\$LambdaName"
    $BuildDir = Join-Path $DeployDir "build_$LambdaName"
    $OutputZip = Join-Path $DeployDir "$LambdaName.zip"
    
    Write-Host ""
    Write-Host "Building $LambdaName..." -ForegroundColor Yellow
    Write-Host "--------------------------------------"
    
    # Clean previous build
    if (Test-Path $BuildDir) {
        Remove-Item -Recurse -Force $BuildDir
    }
    if (Test-Path $OutputZip) {
        Remove-Item -Force $OutputZip
    }
    New-Item -ItemType Directory -Force -Path $BuildDir | Out-Null
    
    # Copy Lambda code
    Copy-Item (Join-Path $LambdaDir "handler.py") $BuildDir
    
    # Install dependencies if requirements.txt exists
    $RequirementsFile = Join-Path $LambdaDir "requirements.txt"
    if (Test-Path $RequirementsFile) {
        Write-Host "Installing dependencies for $LambdaName..."
        pip install -r $RequirementsFile -t $BuildDir --quiet
    }
    
    # Create zip file
    Push-Location $BuildDir
    Compress-Archive -Path * -DestinationPath $OutputZip -Force
    Pop-Location
    
    # Clean up build directory
    Remove-Item -Recurse -Force $BuildDir
    
    $FileSize = (Get-Item $OutputZip).Length / 1MB
    Write-Host "✓ Created: $OutputZip" -ForegroundColor Green
    Write-Host "  Size: $([math]::Round($FileSize, 2)) MB"
}

# Build Image Processor Lambda
Build-Lambda "image_processor"

# Build Presigned URL Lambda
Build-Lambda "get_presigned_url"

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "✓ All Lambda packages built successfully!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Deployment packages are in: $DeployDir"
Get-ChildItem -Path $DeployDir -Filter *.zip | Format-Table Name, @{Name="Size (MB)";Expression={[math]::Round($_.Length/1MB, 2)}}
