# Builds square PNG icons from public/yellow-icon.png (transparent canvas, no fill).
$ErrorActionPreference = 'Stop'
$frontend = Split-Path $PSScriptRoot -Parent
$public = Join-Path $frontend 'public'
$src = Join-Path $public 'yellow-icon.png'
$outDir = Join-Path $public 'icons'

if (-not (Test-Path $src)) {
  Write-Error "Missing $src"
}

New-Item -ItemType Directory -Force -Path $outDir | Out-Null
Add-Type -AssemblyName System.Drawing

function New-TransparentSquareIcon {
  param([int]$Size, [string]$OutPath, [double]$PaddingRatio = 0.12)

  $bmp = New-Object System.Drawing.Bitmap $Size, $Size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $g.Clear([System.Drawing.Color]::Transparent)

  $icon = [System.Drawing.Image]::FromFile($src)
  $pad = [int]($Size * $PaddingRatio)
  $maxW = $Size - 2 * $pad
  $maxH = $Size - 2 * $pad
  $scale = [Math]::Min($maxW / $icon.Width, $maxH / $icon.Height)
  $w = [int]($icon.Width * $scale)
  $h = [int]($icon.Height * $scale)
  $x = [int](($Size - $w) / 2)
  $y = [int](($Size - $h) / 2)
  $g.DrawImage($icon, $x, $y, $w, $h)

  $bmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bmp.Dispose()
  $icon.Dispose()
}

New-TransparentSquareIcon -Size 512 -OutPath (Join-Path $outDir 'icon-512.png') -PaddingRatio 0.1
New-TransparentSquareIcon -Size 192 -OutPath (Join-Path $outDir 'icon-192.png') -PaddingRatio 0.1
New-TransparentSquareIcon -Size 180 -OutPath (Join-Path $outDir 'apple-touch-icon.png') -PaddingRatio 0.1
New-TransparentSquareIcon -Size 512 -OutPath (Join-Path $outDir 'icon-512-maskable.png') -PaddingRatio 0.2

Write-Host "Wrote icons to $outDir"
