# PowerShell script to start an Easy Public Tunnel using SSH (Serveo/Pinggy)
# No installation required.

Write-Host "Stopping any old tunnels..." -ForegroundColor Gray
try { Stop-Process -Name "ssh" -ErrorAction SilentlyContinue } catch {}

Write-Host "`n🚀 Starting Easy Public Tunnel..." -ForegroundColor Cyan
Write-Host "Attempting Method 1: Serveo (Best for no-warning links)" -ForegroundColor Yellow

# We run SSH and capture the output to show the user the URL
# strict host checking no to avoid the 'yes/no' prompt
# -R 80:localhost:5000 forward port 5000
# serveo.net is the host

$cmd = "ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=60 -R 80:localhost:5000 serveo.net"

Write-Host "Running: $cmd" -ForegroundColor DarkGray
Write-Host "`n⚠️  Look for the URL below (e.g. https://something.serveo.net) ⚠️" -ForegroundColor Magenta
Write-Host "--------------------------------------------------------"

# Execute SSH directly. It will block and stream output.
ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=60 -R 80:localhost:5000 serveo.net
