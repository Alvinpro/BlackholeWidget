<#
.SYNOPSIS
  One-click release script for BlackholeWidget
.DESCRIPTION
  Automates: install deps -> build -> git commit -> tag -> push -> GitHub Release
.PARAMETER Version
  Release version (defaults to package.json version)
.PARAMETER SkipBuild
  Skip the build step (use existing artifacts)
.PARAMETER DryRun
  Preview only, don't execute
.EXAMPLE
  .\release.ps1
  .\release.ps1 -Version 0.2.0
  .\release.ps1 -DryRun
#>

param(
    [string]$Version,
    [switch]$SkipBuild,
    [switch]$DryRun
)

$ErrorActionPreference = "Continue"

# Read version from package.json
if (-not $Version) {
    $pkg = Get-Content "$PSScriptRoot\package.json" | ConvertFrom-Json
    $Version = $pkg.version
}

$Tag = "v$Version"
$ExeName = "blackhole-widget.exe"
$ExePath = "$PSScriptRoot\src-tauri\target\release\$ExeName"
$CommitMsg = "release $Tag"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  BlackholeWidget Release Script" -ForegroundColor Cyan
Write-Host "  Version: $Version" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check environment
Write-Host "[1/6] Checking environment..." -ForegroundColor Yellow

$missing = @()
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { $missing += "Node.js" }
if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) { $missing += "Rust/Cargo" }
if (-not (Get-Command git -ErrorAction SilentlyContinue))  { $missing += "Git" }

if ($missing.Count -gt 0) {
    Write-Host "  ERROR: Missing tools:" -ForegroundColor Red
    $missing | ForEach-Object { Write-Host "    - $_" -ForegroundColor Red }
    exit 1
}
Write-Host "  OK: environment ready" -ForegroundColor Green

# Check Git status
if (-not $SkipBuild -or -not $DryRun) {
    Write-Host "[2/6] Checking Git repository..." -ForegroundColor Yellow

    $remote = & { $ErrorActionPreference = "Continue"; git -C "$PSScriptRoot" remote get-url origin 2>$null }
    if ($LASTEXITCODE -ne 0) { $remote = "" }
    if (-not $remote) {
        Write-Host "  WARNING: no git remote 'origin' configured" -ForegroundColor Yellow
        Write-Host "  Set it with: git remote add origin https://github.com/YOU/BlackholeWidget.git" -ForegroundColor White
        if (-not $DryRun) {
            $answer = Read-Host "  Continue anyway (push will be skipped)? [y/N]"
            if ($answer -ne 'y' -and $answer -ne 'Y') { exit 0 }
        }
    } else {
        Write-Host "  OK: remote = $remote" -ForegroundColor Green
    }

    # Check gh login (if installed)
    if (Get-Command gh -ErrorAction SilentlyContinue) {
        $null = gh auth status *>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  WARNING: gh not authenticated - run: gh auth login" -ForegroundColor Yellow
        } else {
            Write-Host "  OK: gh authenticated" -ForegroundColor Green
        }
    } else {
        Write-Host "  WARNING: gh not installed - Release creation will be skipped" -ForegroundColor Yellow
        Write-Host "  Install: winget install GitHub.cli" -ForegroundColor White
    }
}

# Build
if (-not $SkipBuild) {
    Write-Host "[3/6] Building frontend..." -ForegroundColor Yellow
    if (-not $DryRun) {
        npm --prefix "$PSScriptRoot" install 2>&1 | Out-Null
        npm --prefix "$PSScriptRoot" run build
        if ($LASTEXITCODE -ne 0) { throw "Frontend build failed" }
    }
    Write-Host "  OK: frontend built" -ForegroundColor Green

    Write-Host "[4/6] Building Rust backend..." -ForegroundColor Yellow
    if (-not $DryRun) {
        cargo build --release --manifest-path "$PSScriptRoot\src-tauri\Cargo.toml"
        if ($LASTEXITCODE -ne 0) { throw "Rust build failed" }
    }
    Write-Host "  OK: Rust built" -ForegroundColor Green
} else {
    Write-Host "[3/6] Skipping build (SkipBuild)" -ForegroundColor Yellow
    Write-Host "[4/6] Skipping build (SkipBuild)" -ForegroundColor Yellow
}

# Check artifact
Write-Host "[5/6] Checking build artifact..." -ForegroundColor Yellow
if (-not $DryRun) {
    if (-not (Test-Path $ExePath)) {
        throw "Build artifact not found: $ExePath"
    }
}
$sizeMB = [math]::Round((Get-Item $ExePath).Length / 1MB, 1)
Write-Host "  OK: $ExeName ($sizeMB MB)" -ForegroundColor Green

# Git commit + push + Release
Write-Host "[6/6] Publishing to GitHub..." -ForegroundColor Yellow

if ($DryRun) {
    Write-Host "  [DRY RUN] git add -A" -ForegroundColor Gray
    Write-Host "  [DRY RUN] git commit -m '$CommitMsg'" -ForegroundColor Gray
    Write-Host "  [DRY RUN] git tag $Tag" -ForegroundColor Gray
    Write-Host "  [DRY RUN] git push origin main --tags" -ForegroundColor Gray
    Write-Host "  [DRY RUN] gh release create $Tag '$ExePath'" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  Dry run complete. Remove -DryRun to execute." -ForegroundColor Cyan
    exit 0
}

# Commit
Write-Host "  Committing changes..." -ForegroundColor Gray
git -C "$PSScriptRoot" add -A
git -C "$PSScriptRoot" commit -m $CommitMsg 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  OK: committed '$CommitMsg'" -ForegroundColor Green
} else {
    Write-Host "  (nothing to commit)" -ForegroundColor Gray
}

# Tag
Write-Host "  Tagging: $Tag" -ForegroundColor Gray
git -C "$PSScriptRoot" tag -f $Tag

# Push
$remote = git -C "$PSScriptRoot" remote get-url origin 2>$null
if ($remote) {
    Write-Host "  Pushing to origin..." -ForegroundColor Gray
    git -C "$PSScriptRoot" push origin main --tags
    Write-Host "  OK: pushed" -ForegroundColor Green
}

# Create GitHub Release
$ghAvailable = Get-Command gh -ErrorAction SilentlyContinue
$ghLoggedIn = $false
if ($ghAvailable) {
    $null = gh auth status *>&1
    $ghLoggedIn = ($LASTEXITCODE -eq 0)
}
if ($ghLoggedIn -and $remote) {
    Write-Host "  Creating GitHub Release..." -ForegroundColor Gray

    # Delete existing release with same tag if any
    gh release delete $Tag --yes 2>$null

    # Create new release
    $notes = @'
## Changes

- 3D black hole desktop widget
- Drag files to delete (recycle bin or permanent)
- System tray menu: show/hide, zoom in/out, auto-start, settings, exit
- Transparent borderless window
- Settings: confirm before delete, permanent delete toggle

### Download

Download `blackhole-widget.exe` and run directly - no installation needed.
'@

    gh release create $Tag $ExePath `
        --title "Blackhole Widget $Tag" `
        --notes $notes

    if ($LASTEXITCODE -eq 0) {
        Write-Host "  OK: GitHub Release created" -ForegroundColor Green
    } else {
        Write-Host "  WARNING: Release creation failed" -ForegroundColor Yellow
    }
} else {
    Write-Host "  (skipped Release - gh not authenticated or no remote)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Release complete! $Tag" -ForegroundColor Green
Write-Host "  Artifact: $ExePath" -ForegroundColor Green
if ($remote) {
    Write-Host "  Release: $remote/releases/tag/$Tag" -ForegroundColor Green
}
Write-Host "============================================" -ForegroundColor Cyan