# Deploy Infrastructure with Terraform (Windows PowerShell)

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Deploying ImageHub Infrastructure" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$InfraDir = Join-Path (Split-Path -Parent $ScriptDir) "infrastructure"

Set-Location $InfraDir

# Initialize Terraform
Write-Host ""
Write-Host "Initializing Terraform..." -ForegroundColor Yellow
terraform init

# Plan the deployment
Write-Host ""
Write-Host "Planning deployment..." -ForegroundColor Yellow
terraform plan -out=tfplan

# Apply the deployment
Write-Host ""
$confirm = Read-Host "Do you want to apply this plan? (yes/no)"
if ($confirm -eq "yes") {
    Write-Host ""
    Write-Host "Applying infrastructure changes..." -ForegroundColor Yellow
    terraform apply tfplan
    
    Write-Host ""
    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host "✓ Deployment completed successfully!" -ForegroundColor Green
    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Important outputs:"
    terraform output
} else {
    Write-Host "Deployment cancelled." -ForegroundColor Red
}

# Clean up plan file
if (Test-Path tfplan) {
    Remove-Item tfplan
}
