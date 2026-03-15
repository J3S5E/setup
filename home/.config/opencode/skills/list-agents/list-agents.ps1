$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$agentsPath = Join-Path $scriptDir "..\..\agents"

if (-not (Test-Path $agentsPath)) {
    Write-Error "Agents folder not found: $agentsPath"
    exit 1
}

$mdFiles = Get-ChildItem -Path $agentsPath -Filter "*.md" -File

$agents = @()

foreach ($file in $mdFiles) {
    $content = Get-Content $file.FullName -Raw
    
    if ($content -match '(?s)^---\s*\n(.*?)\n---') {
        $frontmatter = $Matches[1]
        
        $name = $null
        $description = $null
        $mode = $null
        
        if ($frontmatter -match 'name:\s*(.+?)(?:\n|$)') {
            $name = $Matches[1].Trim()
        }
        if ($frontmatter -match 'description:\s*(.+?)(?:\n|$)') {
            $description = $Matches[1].Trim()
        }
        if ($frontmatter -match 'mode:\s*(.+?)(?:\n|$)') {
            $mode = $Matches[1].Trim()
        }
        
        if ($mode -eq 'subagent' -and $name -and $description) {
            $agents += [PSCustomObject]@{
                Name = $name
                Description = $description
            }
        }
    }
}

$agents | Sort-Object Name | Format-Table -AutoSize
