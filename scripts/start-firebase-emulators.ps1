$ErrorActionPreference = 'Stop'
$java = Get-Command java -ErrorAction SilentlyContinue
if (-not $java) {
  $localJava = Get-ChildItem -LiteralPath (Join-Path $PSScriptRoot '..\.tools\java') -Filter java.exe -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
  if (-not $localJava) { throw 'Java 21+ is required. Install Temurin or place a runtime under .tools/java.' }
  $env:JAVA_HOME = Split-Path (Split-Path $localJava.FullName -Parent) -Parent
  $env:PATH = (Split-Path $localJava.FullName -Parent) + [IO.Path]::PathSeparator + $env:PATH
}
firebase.cmd emulators:start --only auth,firestore,functions --project biohabit
