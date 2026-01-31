# PowerShell script to start LocalTunnel with a Custom Subdomain
# Usage: ./start_custom_link.ps1

Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "   STARTING CUSTOM PUBLIC LINK (LocalTunnel)   " -ForegroundColor Cyan
Write-Host "=========================================================" -ForegroundColor Cyan

$subdomain = Read-Host "Enter your desired website name (e.g. loki-savings)"

if ([string]::IsNullOrWhiteSpace($subdomain)) {
    $subdomain = "loki-savings-" + (Get-Random -Minimum 1000 -Maximum 9999)
}

Write-Host "`nAttempting to reserve: https://$subdomain.loca.lt" -ForegroundColor Yellow
Write-Host "--------------------------------------------------------"
Write-Host "NOTE: The first time you open the link, it might ask for a password."
Write-Host "The password is your IP address. Getting it now..." -ForegroundColor DarkGray

try {
    $ip = (Invoke-WebRequest -Uri "https://loca.lt/mytunnelpassword" -UseBasicParsing).Content.Trim()
}
catch {
    $ip = "Could not fetch IP. Google 'what is my ip' to find it."
}

Write-Host "YOUR PASSWORD IS: $ip" -ForegroundColor Green
Write-Host "--------------------------------------------------------"

# Run LocalTunnel
if (Get-Command npx -ErrorAction SilentlyContinue) {
    npx localtunnel --port 5000 --subdomain $subdomain
}
else {
    Write-Host "Error: npx is not installed or not in PATH. Please install Node.js." -ForegroundColor Red
}
