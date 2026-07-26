<#
  generate-icons.ps1
  ------------------
  DEV-TIME TOOL — NOT part of the runtime app. Run manually, once, whenever
  the source logo changes. Uses only .NET's built-in System.Drawing (no npm
  packages, no sharp/jimp) to turn the small non-square source logo into the
  full PWA/Windows icon set under prototip/assets/icons/.

  Source: grande_logo1.png is 134x145 RGBA, black emblem on transparent bg.
  Because it's not square and far smaller than the sizes we need, we:
    1. Build a large (1024x1024) transparent "master" canvas.
    2. Draw the source onto it scaled up (high-quality bicubic), fit inside a
       safe-zone box that is ~74% of the canvas (masterSize / 1.35), centered
       on BOTH axes so the non-square mark is padded, never stretched or
       cropped. The ~26% margin also satisfies PWA "maskable" icon guidance
       (Android/Chrome may crop icons to a circle/squircle; keeping content
       inside a centered ~80% safe zone avoids clipping the mark).
    3. Downscale that single master to each required output size with
       high-quality bicubic interpolation, so every size shares identical
       anti-aliasing/framing instead of being resampled from a smaller PNG.
    4. Build favicon.ico by hand (ICO header + directory entries + embedded
       PNG payloads for 16/32/256px) — Windows Vista+ Explorer/shell accept
       PNG-compressed ICO entries at any size, so no BMP/DIB encoding needed.

  Usage:
    powershell -ExecutionPolicy Bypass -File .\generate-icons.ps1
#>

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$src    = "C:\Users\rahmi\Downloads\grande_logo1.png"
$outDir = Join-Path $PSScriptRoot "icons"
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

# ---------- 1) build the padded square master ----------
$masterSize = 1024
$safeFactor = 1.35   # canvas side = safe-box side * safeFactor  ->  ~26% margin

$srcImg = [System.Drawing.Image]::FromFile($src)

$master = New-Object System.Drawing.Bitmap $masterSize, $masterSize, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($master)
$g.Clear([System.Drawing.Color]::Transparent)
$g.CompositingMode    = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
$g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
$g.InterpolationMode  = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode      = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode    = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

$safeBox = $masterSize / $safeFactor
$scale   = [Math]::Min($safeBox / $srcImg.Width, $safeBox / $srcImg.Height)
$drawW   = $srcImg.Width  * $scale
$drawH   = $srcImg.Height * $scale
$drawX   = ($masterSize - $drawW) / 2.0
$drawY   = ($masterSize - $drawH) / 2.0

$g.DrawImage($srcImg, [System.Drawing.RectangleF]::new($drawX, $drawY, $drawW, $drawH))
$g.Dispose()
$srcImg.Dispose()

Write-Host "Master canvas: ${masterSize}x${masterSize}, logo drawn at $([Math]::Round($drawX,1)),$([Math]::Round($drawY,1)) size $([Math]::Round($drawW,1))x$([Math]::Round($drawH,1))"

# ---------- 2) resize helper ----------
function New-ResizedPng {
    param([System.Drawing.Bitmap]$MasterBmp, [int]$Size, [string]$OutPath)
    $bmp = New-Object System.Drawing.Bitmap $Size, $Size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $gr = [System.Drawing.Graphics]::FromImage($bmp)
    $gr.CompositingMode    = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
    $gr.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $gr.InterpolationMode  = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $gr.SmoothingMode      = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $gr.PixelOffsetMode    = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $gr.Clear([System.Drawing.Color]::Transparent)
    $gr.DrawImage($MasterBmp, [System.Drawing.Rectangle]::new(0, 0, $Size, $Size))
    $gr.Dispose()
    $bmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
    return $bmp
}

$icon512 = New-ResizedPng -MasterBmp $master -Size 512 -OutPath (Join-Path $outDir "icon-512.png")
$icon192 = New-ResizedPng -MasterBmp $master -Size 192 -OutPath (Join-Path $outDir "icon-192.png")
$iconAppleTouch = New-ResizedPng -MasterBmp $master -Size 180 -OutPath (Join-Path $outDir "apple-touch-icon.png")
$icon32  = New-ResizedPng -MasterBmp $master -Size 32  -OutPath (Join-Path $outDir "favicon-32.png")
$icon16  = New-ResizedPng -MasterBmp $master -Size 16  -OutPath (Join-Path $outDir "favicon-16.png")
# 256px is only needed in-memory, to embed into favicon.ico (not a required
# standalone deliverable, so it's not written to disk).
$icon256 = New-ResizedPng -MasterBmp $master -Size 256 -OutPath (Join-Path $env:TEMP "grande-icon-256-tmp.png")

Write-Host "Wrote icon-512.png, icon-192.png, apple-touch-icon.png, favicon-32.png, favicon-16.png"

# ---------- 3) build favicon.ico by hand (multi-res, PNG-compressed entries) ----------
function Get-PngBytes {
    param([System.Drawing.Bitmap]$Bmp)
    $ms = New-Object System.IO.MemoryStream
    $Bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    return $ms.ToArray()
}

$entries = @(
    @{ Size = 16;  Bytes = (Get-PngBytes $icon16) },
    @{ Size = 32;  Bytes = (Get-PngBytes $icon32) },
    @{ Size = 256; Bytes = (Get-PngBytes $icon256) }
)

$icoPath = Join-Path $outDir "favicon.ico"
$fs = [System.IO.File]::Create($icoPath)
$bw = New-Object System.IO.BinaryWriter($fs)

# ICONDIR header: reserved(u16)=0, type(u16)=1, count(u16)
$bw.Write([uint16]0)
$bw.Write([uint16]1)
$bw.Write([uint16]$entries.Count)

$headerSize = 6
$dirEntrySize = 16
$offset = $headerSize + ($dirEntrySize * $entries.Count)

foreach ($e in $entries) {
    $wByte = if ($e.Size -ge 256) { 0 } else { $e.Size }   # 0 means 256 in ICO format
    $hByte = $wByte
    $bw.Write([byte]$wByte)          # width
    $bw.Write([byte]$hByte)          # height
    $bw.Write([byte]0)               # color count (0 = no palette / >=8bpp)
    $bw.Write([byte]0)               # reserved
    $bw.Write([uint16]1)             # color planes
    $bw.Write([uint16]32)            # bits per pixel
    $bw.Write([uint32]$e.Bytes.Length)  # size of image data
    $bw.Write([uint32]$offset)          # offset of image data from file start
    $offset += $e.Bytes.Length
}
$bw.Flush()
# NOTE: BinaryWriter.Write(byte[]) is ambiguous for PowerShell's method binder
# in this context (it silently resolved to the scalar Write(byte) overload,
# writing one byte per array instead of the whole array). Writing straight to
# the FileStream with the explicit (buffer, offset, count) overload avoids
# that ambiguity entirely.
foreach ($e in $entries) { $fs.Write($e.Bytes, 0, $e.Bytes.Length) }

$fs.Flush(); $bw.Close(); $fs.Close()
Write-Host "Wrote favicon.ico with sizes: $($entries.Size -join ', ')"

$master.Dispose(); $icon512.Dispose(); $icon192.Dispose(); $iconAppleTouch.Dispose()
$icon32.Dispose(); $icon16.Dispose(); $icon256.Dispose()
Remove-Item (Join-Path $env:TEMP "grande-icon-256-tmp.png") -ErrorAction SilentlyContinue

Write-Host "Done. Icons written to $outDir"
