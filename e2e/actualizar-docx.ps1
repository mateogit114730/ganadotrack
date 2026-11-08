# Abre el documento con Microsoft Word, actualiza el índice y los campos, lo guarda y exporta el PDF.
# Uso: powershell -ExecutionPolicy Bypass -File actualizar-docx.ps1 [ruta.docx]
param([string]$Docx = (Join-Path $PSScriptRoot '..\docs\entregas\GanadoTrack_EntregaFinal.docx'))

$Docx = (Resolve-Path $Docx).Path
$Pdf = [System.IO.Path]::ChangeExtension($Docx, '.pdf')
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
    $doc = $word.Documents.Open($Docx, $false, $false)
    foreach ($toc in $doc.TablesOfContents) { $toc.Update() }
    $doc.Fields.Update() | Out-Null
    foreach ($toc in $doc.TablesOfContents) { $toc.UpdatePageNumbers() }
    $doc.Save()
    $doc.ExportAsFixedFormat($Pdf, 17, $false, 0)   # 17 = PDF, calidad de impresión
    Write-Output ("Páginas: " + $doc.ComputeStatistics(2))
    $doc.Close($false)
    Write-Output "PDF: $Pdf"
} finally {
    $word.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
}
