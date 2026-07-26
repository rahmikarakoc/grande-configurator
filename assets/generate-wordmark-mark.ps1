<#
  generate-wordmark-mark.ps1
  --------------------------
  DEV-TIME TOOL — NOT part of the runtime app. Run manually, once, whenever
  the source logo changes. Uses only .NET's built-in System.Drawing (no npm
  packages, no sharp/jimp) — same constraint as generate-icons.ps1.

  Produces a SMALL, TIGHTLY-CROPPED mark for inline use next to text (e.g.
  in #catalogTrigger, to the left of "Ürünler"), as opposed to
  generate-icons.ps1's padded-square PWA/favicon set. That padded set adds a
  deliberate ~26% margin so the mark survives Android's maskable-icon
  circle/squircle cropping -- exactly the padding that makes it look small
  and lost when displayed at ~20-24px next to text (confirmed by rendering
  icon-192.png at 20px and comparing zoomed crops against a tight crop:
  the padded version's ink is visibly smaller inside the same box).

  Steps:
    1. Load the source (black emblem on transparent bg -- generate-icons.ps1's
       header comment says 134x145, but the file on disk actually measures
       763x781 at run time; this script reads Width/Height dynamically so
       it's correct either way, it just doesn't match that stale comment).
    2. Scan alpha channel to find the tight bounding box of non-transparent
       ink (the source has its own small internal margin we don't want to
       keep 1:1 -- we recompute the REAL content bbox instead of assuming).
    3. Add a small proportional padding (6% of the bbox's larger side) --
       "a couple px of breathing room", not a forced square pad.
    4. Scale that padded crop up to a target height (128px source, meant to
       be displayed at ~20-24px in CSS -- >4x oversampled so it stays crisp
       on high-DPI screens up to 3x device pixel ratio) in ONE resampling
       step straight from the original bitmap (avoids double blur from
       crop-then-resize as two separate draws).
    5. Save as prototip/assets/icons/wordmark-mark.png (natural aspect
       ratio preserved, NOT square).

  Usage:
    powershell -ExecutionPolicy Bypass -File .\generate-wordmark-mark.ps1
#>

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$src    = "C:\Users\rahmi\Downloads\grande_logo1.png"
$outDir = Join-Path $PSScriptRoot "icons"
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }
$outPath = Join-Path $outDir "wordmark-mark.png"

# ---------- 1) load source + find tight alpha bounding box ----------
$srcImg = New-Object System.Drawing.Bitmap $src
$w = $srcImg.Width
$h = $srcImg.Height

$minX = $w; $minY = $h; $maxX = -1; $maxY = -1
$alphaThreshold = 10   # ignore near-fully-transparent anti-aliasing dust

for ($y = 0; $y -lt $h; $y++) {
  for ($x = 0; $x -lt $w; $x++) {
    $a = $srcImg.GetPixel($x, $y).A
    if ($a -gt $alphaThreshold) {
      if ($x -lt $minX) { $minX = $x }
      if ($x -gt $maxX) { $maxX = $x }
      if ($y -lt $minY) { $minY = $y }
      if ($y -gt $maxY) { $maxY = $y }
    }
  }
}

if ($maxX -lt 0) { throw "No non-transparent pixels found in $src" }

$bboxW = $maxX - $minX + 1
$bboxH = $maxY - $minY + 1
Write-Host "Source: ${w}x${h}. Tight ink bbox: x=$minX y=$minY w=$bboxW h=$bboxH"

# ---------- 2) proportional padding around the tight bbox ----------
$padFactor = 0.06
$pad = [Math]::Max(2, [Math]::Round($padFactor * [Math]::Max($bboxW, $bboxH)))
$paddedW = $bboxW + (2 * $pad)
$paddedH = $bboxH + (2 * $pad)

# ---------- 3) scale padded crop up to target height in one resample ----------
$targetH = 128
$scale   = $targetH / $paddedH
$targetW = [Math]::Round($paddedW * $scale)

$out = New-Object System.Drawing.Bitmap $targetW, $targetH, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($out)
$g.Clear([System.Drawing.Color]::Transparent)
$g.CompositingMode    = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
$g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
$g.InterpolationMode  = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode      = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode    = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

$destRect = [System.Drawing.RectangleF]::new($pad * $scale, $pad * $scale, $bboxW * $scale, $bboxH * $scale)
$srcRect  = [System.Drawing.RectangleF]::new($minX, $minY, $bboxW, $bboxH)
$g.DrawImage($srcImg, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
$g.Dispose()

$out.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Wrote $outPath ($targetW x $targetH, natural aspect ratio, tight crop + ${pad}px->$([Math]::Round($pad*$scale,1))px scaled padding)"

$out.Dispose()
$srcImg.Dispose()
