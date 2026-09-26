param(
  [string]$Fuente,
  [string]$Assets,
  [string]$ColorFondo = '#0A0A06',
  [int]$UmbralTinta = 52,
  [int]$AlfaMin = 46,
  [int]$AlfaMax = 64,
  [double]$PctMaster = 86,
  [double]$PxAdaptive = 500,
  [double]$PctFavicon = 76
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

if (-not $Fuente) { $Fuente = Join-Path $PSScriptRoot '..\assets\icoAPP.jpg' }
if (-not $Assets) { $Assets = Join-Path $PSScriptRoot '..\assets' }
$Fuente = [System.IO.Path]::GetFullPath($Fuente)
$Assets = [System.IO.Path]::GetFullPath($Assets)
if (-not (Test-Path -LiteralPath $Fuente)) { throw "No existe la fuente: $Fuente" }
New-Item -ItemType Directory -Path $Assets -Force | Out-Null

$script:pin = [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
$script:plano24 = [System.Drawing.Imaging.PixelFormat]::Format24bppRgb
$script:UmbralTinta = $UmbralTinta
$script:AlfaMin = $AlfaMin
$script:AlfaMax = $AlfaMax
$script:ColorFondo = $ColorFondo

function Medir([System.Drawing.Bitmap]$bmp) {
  $w = $bmp.Width
  $h = $bmp.Height
  $d = $bmp.LockBits((New-Object System.Drawing.Rectangle(0, 0, $w, $h)), [System.Drawing.Imaging.ImageLockMode]::ReadOnly, $script:pin)
  $buf = New-Object byte[] ($d.Stride * $h)
  [System.Runtime.InteropServices.Marshal]::Copy($d.Scan0, $buf, 0, $buf.Length)
  $stride = $d.Stride
  $bmp.UnlockBits($d)
  $filas = New-Object 'int[]' $h
  $xmin = New-Object 'int[]' $h
  $xmax = New-Object 'int[]' $h
  for ($y = 0; $y -lt $h; $y++) {
    $o = $y * $stride
    $c = 0
    $lo = $w
    $hi = -1
    for ($x = 0; $x -lt $w; $x++) {
      $i = $o + $x * 4
      if ((0.2126 * $buf[$i + 2] + 0.7152 * $buf[$i + 1] + 0.0722 * $buf[$i]) -gt $script:UmbralTinta) {
        $c++
        if ($x -lt $lo) { $lo = $x }
        if ($x -gt $hi) { $hi = $x }
      }
    }
    $filas[$y] = $c
    $xmin[$y] = $lo
    $xmax[$y] = $hi
  }
  return , @($buf, $stride, $filas, $xmin, $xmax)
}

function Recorte([int[]]$filas, [int[]]$xmin, [int[]]$xmax, [int]$y0, [int]$y1) {
  $top = -1; $bot = -1; $izq = [int]::MaxValue; $der = -1
  for ($y = $y0; $y -le $y1; $y++) {
    if ($filas[$y] -le 0) { continue }
    if ($top -lt 0) { $top = $y }
    $bot = $y
    if ($xmin[$y] -lt $izq) { $izq = $xmin[$y] }
    if ($xmax[$y] -gt $der) { $der = $xmax[$y] }
  }
  if ($top -lt 0) { return $null }
  return [pscustomobject]@{ X = $izq; Y = $top; W = ($der - $izq + 1); H = ($bot - $top + 1) }
}

function Alfa-De([double]$lum) {
  if ($lum -le $script:AlfaMin) { return 0 }
  if ($lum -ge $script:AlfaMax) { return 255 }
  return [int][Math]::Round(($lum - $script:AlfaMin) * 255 / ($script:AlfaMax - $script:AlfaMin))
}

function Recorte-Alfa([byte[]]$buf, [int]$stride, [int]$w, [int]$h, [switch]$Blanco) {
  $out = [System.Drawing.Bitmap]::new($w, $h, $script:pin)
  $d = $out.LockBits((New-Object System.Drawing.Rectangle(0, 0, $w, $h)), [System.Drawing.Imaging.ImageLockMode]::ReadWrite, $script:pin)
  $ob = New-Object byte[] ($d.Stride * $h)
  for ($y = 0; $y -lt $h; $y++) {
    $o = $y * $stride
    for ($x = 0; $x -lt $w; $x++) {
      $i = $o + $x * 4
      $a = Alfa-De (0.2126 * $buf[$i + 2] + 0.7152 * $buf[$i + 1] + 0.0722 * $buf[$i])
      if ($a -le 0) { continue }
      if ($Blanco) {
        $ob[$i] = 255; $ob[$i + 1] = 255; $ob[$i + 2] = 255
      } else {
        $ob[$i] = $buf[$i]; $ob[$i + 1] = $buf[$i + 1]; $ob[$i + 2] = $buf[$i + 2]
      }
      $ob[$i + 3] = [byte]$a
    }
  }
  [System.Runtime.InteropServices.Marshal]::Copy($ob, 0, $d.Scan0, $ob.Length)
  $out.UnlockBits($d)
  return $out
}

function Grafo([System.Drawing.Graphics]$g) {
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $g.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
}

function Redimensionar([System.Drawing.Bitmap]$origen, [int]$tw, [int]$th) {
  $cur = [System.Drawing.Bitmap]::new($origen)
  while (($cur.Width / $tw) -gt 2 -and ($cur.Height / $th) -gt 2) {
    $nw = [Math]::Max($tw, [int][Math]::Round($cur.Width / 2))
    $nh = [Math]::Max($th, [int][Math]::Round($cur.Height / 2))
    $nxt = [System.Drawing.Bitmap]::new($nw, $nh, $script:pin)
    $g = [System.Drawing.Graphics]::FromImage($nxt)
    Grafo $g
    $g.DrawImage($cur, 0, 0, $nw, $nh)
    $g.Dispose()
    $cur.Dispose()
    $cur = $nxt
  }
  $fin = [System.Drawing.Bitmap]::new($tw, $th, $script:pin)
  $g = [System.Drawing.Graphics]::FromImage($fin)
  Grafo $g
  $g.DrawImage($cur, 0, 0, $tw, $th)
  $g.Dispose()
  $cur.Dispose()
  return $fin
}

function Componer([System.Drawing.Bitmap]$recorte, [int]$lienzo, [double]$bx, [double]$by, [double]$bw, [double]$bh, [int]$sx, [int]$sy, [int]$sw, [int]$sh, [bool]$opaco) {
  $ancho = [int][Math]::Round($bw)
  $alto = [int][Math]::Round($bh)
  $dx = [int][Math]::Round($bx)
  $dy = [int][Math]::Round($by)
  $rec = $recorte.Clone((New-Object System.Drawing.Rectangle($sx, $sy, $sw, $sh)), $script:pin)
  $dib = Redimensionar $rec $ancho $alto
  $rec.Dispose()
  $destino = [System.Drawing.Bitmap]::new($lienzo, $lienzo, $script:pin)
  $g = [System.Drawing.Graphics]::FromImage($destino)
  Grafo $g
  if ($opaco) { $g.Clear([System.Drawing.ColorTranslator]::FromHtml($script:ColorFondo)) }
  else { $g.Clear([System.Drawing.Color]::Transparent) }
  $g.DrawImage($dib, $dx, $dy, $ancho, $alto)
  $g.Dispose()
  $dib.Dispose()
  $final = $destino
  if ($opaco) {
    $rgb = [System.Drawing.Bitmap]::new($lienzo, $lienzo, $script:plano24)
    $g2 = [System.Drawing.Graphics]::FromImage($rgb)
    $g2.DrawImage($destino, 0, 0)
    $g2.Dispose()
    $destino.Dispose()
    $final = $rgb
  }
  return $final
}

$src = [System.Drawing.Bitmap]::new($Fuente)
$W = $src.Width
$H = $src.Height
$m = Medir $src
$src.Dispose()
$buf = $m[0]; $stride = $m[1]; $filas = $m[2]; $xmin = $m[3]; $xmax = $m[4]

$lockup = Recorte $filas $xmin $xmax 0 ($H - 1)
if (-not $lockup) { throw 'No se detecta contenido en la imagen fuente.' }

$corteSup = $lockup.Y + [int][Math]::Floor($lockup.H * 0.3)
$corteInf = $lockup.Y + [int][Math]::Floor($lockup.H * 0.7)
$split = $corteSup
$minimo = [int]::MaxValue
for ($y = $corteSup; $y -le $corteInf; $y++) {
  if ($filas[$y] -lt $minimo) { $minimo = $filas[$y]; $split = $y }
}
$emblema = Recorte $filas $xmin $xmax $lockup.Y ($split - 1)
$wordmark = Recorte $filas $xmin $xmax ($split + 1) ($lockup.Y + $lockup.H - 1)
if (-not $emblema) { throw 'No se detecta el emblema.' }
if (-not $wordmark) { $wordmark = $lockup }

Write-Host ''
Write-Host "Fuente: $Fuente ($W x $H)"
Write-Host ("  lockup   : x[{0}..{1}] y[{2}..{3}]  {4}x{5}  centro=({6}, {7})" -f $lockup.X, ($lockup.X + $lockup.W - 1), $lockup.Y, ($lockup.Y + $lockup.H - 1), $lockup.W, $lockup.H, [Math]::Round($lockup.X + $lockup.W / 2, 1), [Math]::Round($lockup.Y + $lockup.H / 2, 1))
Write-Host ("  emblema  : x[{0}..{1}] y[{2}..{3}]  {4}x{5}" -f $emblema.X, ($emblema.X + $emblema.W - 1), $emblema.Y, ($emblema.Y + $emblema.H - 1), $emblema.W, $emblema.H)
Write-Host ("  wordmark : x[{0}..{1}] y[{2}..{3}]  {4}x{5}" -f $wordmark.X, ($wordmark.X + $wordmark.W - 1), $wordmark.Y, ($wordmark.Y + $wordmark.H - 1), $wordmark.W, $wordmark.H)
Write-Host "  separacion emblema/wordmark: y=$split"

$recorte = Recorte-Alfa $buf $stride $W $H
$recorteBlanco = Recorte-Alfa $buf $stride $W $H -Blanco

$anchoMaster = [int][Math]::Round(1024 * $PctMaster / 100)
$altoMaster = [int][Math]::Round($anchoMaster * $lockup.H / $lockup.W)
$master = Componer $recorte 1024 ((1024 - $anchoMaster) / 2) ((1024 - $altoMaster) / 2) $anchoMaster $altoMaster $lockup.X $lockup.Y $lockup.W $lockup.H $true
$master.Save((Join-Path $Assets 'icon.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$master.Dispose()
Write-Host "  -> icon.png                     lockup ${anchoMaster}x${altoMaster} sobre lienzo 1024 opaco $ColorFondo"

$anchoAd = [int][Math]::Round($PxAdaptive)
$altoAd = [int][Math]::Round($anchoAd * $emblema.H / $emblema.W)
$adaptive = Componer $recorte 1024 ((1024 - $anchoAd) / 2) ((1024 - $altoAd) / 2) $anchoAd $altoAd $emblema.X $emblema.Y $emblema.W $emblema.H $false
$adaptive.Save((Join-Path $Assets 'android-icon-foreground.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$adaptive.Dispose()
Write-Host ("  -> android-icon-foreground.png  emblema {0}x{1} ({2}% del lienzo) sobre 1024 RGBA" -f $anchoAd, $altoAd, [Math]::Round(100 * $anchoAd / 1024, 1))

$mono = Componer $recorteBlanco 1024 ((1024 - $anchoAd) / 2) ((1024 - $altoAd) / 2) $anchoAd $altoAd $emblema.X $emblema.Y $emblema.W $emblema.H $false
$mono.Save((Join-Path $Assets 'android-icon-monochrome.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$mono.Dispose()
Write-Host "  -> android-icon-monochrome.png  misma geometria en blanco"

$anchoFav = [int][Math]::Round(64 * $PctFavicon / 100)
$altoFav = [int][Math]::Round($anchoFav * $emblema.H / $emblema.W)
$fav = Componer $recorte 64 ((64 - $anchoFav) / 2) ((64 - $altoFav) / 2) $anchoFav $altoFav $emblema.X $emblema.Y $emblema.W $emblema.H $true
$fav.Save((Join-Path $Assets 'favicon.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$fav.Dispose()
Write-Host "  -> favicon.png                  emblema ${anchoFav}x${altoFav} sobre 64 opaco $ColorFondo"

$recorte.Dispose()
$recorteBlanco.Dispose()

Write-Host ''
foreach ($n in @('icon.png', 'android-icon-foreground.png', 'android-icon-monochrome.png', 'favicon.png')) {
  $r = Join-Path $Assets $n
  $im = [System.Drawing.Image]::FromFile($r)
  Write-Host ("  {0,-34} {1}x{2}  {3} px/{4}  {5} KB" -f $n, $im.Width, $im.Height, $im.PixelFormat, (Test-Path $r), [Math]::Round((Get-Item $r).Length / 1KB))
  $im.Dispose()
}
Write-Host ''
