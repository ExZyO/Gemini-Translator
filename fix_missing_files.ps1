$ErrorActionPreference = "Stop"
$projectDir = Get-Location
$epubDir = Join-Path $projectDir "EPUB-Studio"

$htmlPath = Join-Path $epubDir "index.html"
$htmlContent = Get-Content $htmlPath -Raw

function Extract-Section {
    param([string]$content, [string]$startMarker, [string]$endMarker)
    $startIndex = $content.IndexOf($startMarker)
    if ($startIndex -eq -1) { Write-Host "Could not find $startMarker"; return "" }
    $endIndex = $content.IndexOf($endMarker, $startIndex)
    if ($endIndex -eq -1) { Write-Host "Could not find $endMarker"; return "" }
    return $content.Substring($startIndex, $endIndex - $startIndex)
}

$splitHtml = (Extract-Section $htmlContent '<div id="view-split"' '<div id="view-merge"') -replace 'id="view-split"', 'id="epub-split-tab"'
$mergeHtml = (Extract-Section $htmlContent '<div id="view-merge"' '    <!-- Chapter Preview Modal -->') -replace 'id="view-merge"', 'id="epub-merge-tab"'

# Modal extraction
$modalHtml = Extract-Section $htmlContent '<!-- Chapter Preview Modal -->' '<!-- Export History Panel -->'

$splitHtmlEscaped = $splitHtml.Replace('`', '\`').Replace('$', '\$')
$mergeHtmlEscaped = $mergeHtml.Replace('`', '\`').Replace('$', '\$')
$modalHtmlEscaped = $modalHtml.Replace('`', '\`').Replace('$', '\$')

[System.Collections.ArrayList]$lines = @()
$lines.Add('export const splitTabHtml = `' + $splitHtmlEscaped + '`;')
$lines.Add('export const mergeTabHtml = `' + $mergeHtmlEscaped + '`;')
$lines.Add('export const modalHtml = `' + $modalHtmlEscaped + '`;')

$uiJsContent = $lines -join "`n"

Set-Content -Path (Join-Path $projectDir "epub_studio_ui.js") -Value $uiJsContent -Encoding UTF8

Write-Host "Successfully generated epub_studio_ui.js"
