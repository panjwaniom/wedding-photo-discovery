# STEP 1 — run on your HOME PC (PowerShell).
# Dumps the Immich database to a single .sql file (~200-300 MB).
# Run from the wedding-face-search folder.

$ErrorActionPreference = "Stop"

Write-Output "Checking containers are running..."
docker ps --format "{{.Names}}" | Select-String -Pattern "immich_postgres" | Out-Null
if ($LASTEXITCODE -ne 0) {
  # Select-String exit code check via match instead
  $names = docker ps --format "{{.Names}}"
  if ($names -notmatch "immich_postgres") {
    Write-Output "ERROR: immich_postgres is not running. Start Immich first."
    exit 1
  }
}

$out = Join-Path $PSScriptRoot "immich-db-dump.sql"
Write-Output "Dumping database (takes a few minutes)..."
# NOTE: PowerShell's own `>` redirect re-encodes output and corrupts the dump.
# cmd.exe redirection passes bytes through untouched.
cmd /c "docker exec immich_postgres pg_dump -U postgres -d immich --clean --if-exists > `"$out`""

$size = (Get-Item $out).Length / 1MB
Write-Output ("Done: {0} ({1:N1} MB)" -f $out, $size)
Write-Output "Next: upload library + dump to the VPS (see deploy/README.md step 4)."
