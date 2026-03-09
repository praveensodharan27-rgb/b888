# Auto-update LoginModal with all images in this folder
Write-Host "Scanning for images..." -ForegroundColor Cyan

# Get all image files
$imageFiles = Get-ChildItem -Path . -Include "*.png","*.jpg","*.jpeg","*.webp" -File

if ($imageFiles.Count -eq 0) {
    Write-Host "No image files found!" -ForegroundColor Red
    exit 1
}

Write-Host "Found $($imageFiles.Count) images:" -ForegroundColor Green
foreach ($img in $imageFiles) {
    $sizeKB = [math]::Round($img.Length / 1KB, 2)
    Write-Host "  - $($img.Name) - $sizeKB KB" -ForegroundColor White
}

# Generate the array code
Write-Host "`nGenerated code for LoginModal.tsx:" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Gray

$arrayCode = "const BACKGROUND_IMAGES = [`n"
foreach ($img in $imageFiles) {
    $arrayCode += "  '/images/$($img.Name)',`n"
}
$arrayCode += "];"

Write-Host $arrayCode -ForegroundColor Yellow
Write-Host "=====================================" -ForegroundColor Gray

# Try to update the file
$loginModalPath = "..\..\components\LoginModal.tsx"
if (Test-Path $loginModalPath) {
    Write-Host "`nUpdating LoginModal.tsx..." -ForegroundColor Cyan
    
    $content = Get-Content $loginModalPath -Raw
    $pattern = 'const BACKGROUND_IMAGES = \[[^\]]*\];'
    
    if ($content -match $pattern) {
        $content = $content -replace $pattern, $arrayCode
        Set-Content -Path $loginModalPath -Value $content -NoNewline
        Write-Host "SUCCESS! LoginModal.tsx updated with $($imageFiles.Count) images" -ForegroundColor Green
    } else {
        Write-Host "Could not find BACKGROUND_IMAGES array. Copy code manually." -ForegroundColor Yellow
    }
} else {
    Write-Host "`nLoginModal.tsx not found. Copy code manually." -ForegroundColor Yellow
}

Write-Host "`nDone!" -ForegroundColor Green
