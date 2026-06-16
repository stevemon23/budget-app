# ============================================================
# Ledger Budget App — Windows Setup Script
# Run this once to create the full project on your computer
# ============================================================
# HOW TO USE:
#   1. Save this file anywhere (e.g. Desktop) as setup-ledger.ps1
#   2. Right-click it → "Run with PowerShell"
#      OR open PowerShell and run: .\setup-ledger.ps1
#   3. When done, open VS Code and open the budget-app folder
# ============================================================

$root = "$env:USERPROFILE\Desktop\budget-app"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Ledger Budget App — Setup" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Creating project at: $root" -ForegroundColor Yellow
Write-Host ""

# Create folders
New-Item -ItemType Directory -Force -Path "$root\css" | Out-Null
New-Item -ItemType Directory -Force -Path "$root\js" | Out-Null
New-Item -ItemType Directory -Force -Path "$root\icons" | Out-Null

Write-Host "✓ Folders created" -ForegroundColor Green

# ---- index.html ----
@'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  <meta name="apple-mobile-web-app-title" content="Ledger" />
  <meta name="theme-color" content="#A0826D" />
  <link rel="manifest" href="manifest.json" />
  <link rel="apple-touch-icon" href="icons/icon-192.png" />
  <link rel="stylesheet" href="css/theme.css" />
  <title>Ledger</title>
</head>
<body>
  <div id="app">
    <div id="onboarding" class="hidden">
      <div class="ob-progress-bar">
        <div class="ob-progress-fill" id="ob-progress-fill"></div>
      </div>
      <div id="ob-screens"></div>
    </div>
    <div id="main-app" class="hidden">
      <div id="screen-home" class="screen"></div>
      <div id="screen-day" class="screen hidden"></div>
      <div id="screen-add" class="screen hidden"></div>
      <div id="screen-insights" class="screen hidden"></div>
      <div id="screen-goals" class="screen hidden"></div>
      <div id="screen-settings" class="screen hidden"></div>
      <div id="screen-monthly" class="screen hidden"></div>
      <nav id="bottom-nav">
        <button class="nav-btn active" data-screen="home" onclick="App.navigate('home')">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          <span>Home</span>
        </button>
        <button class="nav-btn" data-screen="insights" onclick="App.navigate('insights')">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
          <span>Insights</span>
        </button>
        <button class="nav-btn nav-add-btn" onclick="App.navigate('add')">
          <div class="nav-add-circle">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </div>
        </button>
        <button class="nav-btn" data-screen="goals" onclick="App.navigate('goals')">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
          <span>Goals</span>
        </button>
        <button class="nav-btn" data-screen="settings" onclick="App.navigate('settings')">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          <span>Settings</span>
        </button>
      </nav>
    </div>
  </div>
  <script src="js/data.js"></script>
  <script src="js/insights.js"></script>
  <script src="js/onboarding.js"></script>
  <script src="js/app.js"></script>
  <script>
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(console.error);
    }
  </script>
</body>
</html>
'@ | Set-Content -Path "$root\index.html" -Encoding UTF8

Write-Host "✓ index.html" -ForegroundColor Green

# ---- manifest.json ----
@'
{
  "name": "Ledger",
  "short_name": "Ledger",
  "description": "Your personal budget, built like a calendar.",
  "start_url": "/index.html",
  "display": "standalone",
  "background_color": "#F5F0E8",
  "theme_color": "#A0826D",
  "orientation": "portrait",
  "icons": [
    { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
'@ | Set-Content -Path "$root\manifest.json" -Encoding UTF8

Write-Host "✓ manifest.json" -ForegroundColor Green

# ---- sw.js ----
@'
const CACHE_NAME = 'ledger-v1';
const ASSETS = ['/', '/index.html', '/manifest.json', '/css/theme.css', '/js/data.js', '/js/insights.js', '/js/onboarding.js', '/js/app.js', '/icons/icon-192.png', '/icons/icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => { e.respondWith(caches.match(e.request).then(cached => cached || fetch(e.request))); });
'@ | Set-Content -Path "$root\sw.js" -Encoding UTF8

Write-Host "✓ sw.js" -ForegroundColor Green

# ---- Copy JS and CSS files from the downloaded folder ----
# The script assumes the JS/CSS source files are in the same folder as this script
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

$filesToCopy = @(
    @{ src = "css\theme.css"; dest = "css\theme.css" },
    @{ src = "js\data.js"; dest = "js\data.js" },
    @{ src = "js\insights.js"; dest = "js\insights.js" },
    @{ src = "js\onboarding.js"; dest = "js\onboarding.js" },
    @{ src = "js\app.js"; dest = "js\app.js" }
)

foreach ($f in $filesToCopy) {
    $srcPath = Join-Path $scriptDir $f.src
    $destPath = Join-Path $root $f.dest
    if (Test-Path $srcPath) {
        Copy-Item $srcPath $destPath -Force
        Write-Host "✓ $($f.dest)" -ForegroundColor Green
    } else {
        Write-Host "⚠ $($f.src) not found next to this script — copy it manually" -ForegroundColor Yellow
    }
}

# Copy icons if they exist
$iconSrc192 = Join-Path $scriptDir "icons\icon-192.png"
$iconSrc512 = Join-Path $scriptDir "icons\icon-512.png"
if (Test-Path $iconSrc192) {
    Copy-Item $iconSrc192 "$root\icons\icon-192.png" -Force
    Copy-Item $iconSrc512 "$root\icons\icon-512.png" -Force
    Write-Host "✓ icons" -ForegroundColor Green
} else {
    Write-Host "⚠ Icons not found — app will still work without them" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Done! Project created at:" -ForegroundColor Cyan
Write-Host "  $root" -ForegroundColor White
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Open VS Code"
Write-Host "  2. File → Open Folder → select the budget-app folder on your Desktop"
Write-Host "  3. Right-click index.html → Open with Live Server"
Write-Host "  4. Follow the README.md for iPhone setup"
Write-Host ""
Write-Host "Press any key to close..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
