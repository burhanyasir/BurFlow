# Verify build artifacts are fresh (not stale)
# Fails if any .ts source file is newer than the corresponding .js in dist/
# Intended for CI pipelines

$root = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
$failed = $false

Get-ChildItem -Path "$root\packages" -Recurse -Filter "*.ts" -Exclude "*.d.ts", "*__tests__*", "*node_modules*" | ForEach-Object {
    $srcFile = $_.FullName
    $relativePath = $srcFile.Substring($root.Length + 1)
    
    # Find corresponding dist file
    $distFile = $srcFile -replace '\\src\\', '\dist\' -replace '\.ts$', '.js'
    
    if (Test-Path $distFile) {
        $srcTime = (Get-Item $srcFile).LastWriteTime
        $distTime = (Get-Item $distFile).LastWriteTime
        if ($srcTime -gt $distTime) {
            Write-Warning "STALE: $relativePath (src: $srcTime, dist: $distTime)"
            $failed = $true
        }
    } else {
        Write-Warning "MISSING: $relativePath has no compiled dist file"
        $failed = $true
    }
}

if ($failed) {
    Write-Error "Build artifacts are stale. Run 'npm run build' to rebuild."
    exit 1
}

Write-Output "All build artifacts are fresh."
exit 0
