# Set the app version everywhere it is written down.
# Usage: scripts/bump-version.ps1 1.4.1
param([Parameter(Mandatory)][ValidatePattern('^\d+\.\d+\.\d+$')][string]$Version)

$root = Split-Path $PSScriptRoot -Parent
$utf8 = New-Object System.Text.UTF8Encoding $false

$targets = @(
    @{ Path = 'package.json'; Pattern = '"version":\s*"[^"]+"'; Value = "`"version`": `"$Version`"" },
    @{ Path = 'src-tauri/tauri.conf.json'; Pattern = '"version":\s*"[^"]+"'; Value = "`"version`": `"$Version`"" },
    @{ Path = 'src-tauri/Cargo.toml'; Pattern = '(?m)^version = "[^"]+"'; Value = "version = `"$Version`"" }
)

foreach ($t in $targets) {
    $path = Join-Path $root $t.Path
    $text = [IO.File]::ReadAllText($path)
    # only the first match: the app's own version comes first in each file
    $next = ([regex]$t.Pattern).Replace($text, $t.Value, 1)
    [IO.File]::WriteAllText($path, $next, $utf8)
}

cargo update -p aero-dock --manifest-path (Join-Path $root 'src-tauri/Cargo.toml') --quiet
