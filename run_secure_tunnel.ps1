Clear-Host
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "   🚀 STARTING SECURE PUBLIC LINK (Cloudflare)   " -ForegroundColor Cyan
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "1. Keep this window OPEN." -ForegroundColor Yellow
Write-Host "2. Look for the link ending in .trycloudflare.com below." -ForegroundColor Yellow
Write-Host "3. That is your SECURE PUBLIC LINK." -ForegroundColor Yellow
Write-Host "=========================================================`n" -ForegroundColor Cyan

# Run the tunnel (assuming cloudflared.exe is in the same folder)
.\cloudflared.exe tunnel --url http://localhost:5000
