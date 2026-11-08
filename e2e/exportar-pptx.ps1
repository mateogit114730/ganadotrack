# Exporta la presentación a PDF con Microsoft PowerPoint.
# Uso: powershell -ExecutionPolicy Bypass -File exportar-pptx.ps1 [ruta.pptx]
param([string]$Pptx = (Join-Path $PSScriptRoot '..\docs\entregas\GanadoTrack_Defensa.pptx'))

$Pptx = (Resolve-Path $Pptx).Path
$Pdf = [System.IO.Path]::ChangeExtension($Pptx, '.pdf')
$ppt = New-Object -ComObject PowerPoint.Application
try {
    $pres = $ppt.Presentations.Open($Pptx, $true, $false, $false)   # solo lectura, sin ventana
    $pres.SaveAs($Pdf, 32)                                          # 32 = PDF
    Write-Output ("Diapositivas: " + $pres.Slides.Count)
    $pres.Close()
    Write-Output "PDF: $Pdf"
} finally {
    $ppt.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($ppt) | Out-Null
}
