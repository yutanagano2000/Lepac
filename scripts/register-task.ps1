# register-task.ps1
# ファイルサーバースキャンをWindowsタスクスケジューラに登録する
# 使用方法: 管理者権限で実行 → .\scripts\register-task.ps1 -ApiUrl "https://your-app.vercel.app" -CronSecret "your-secret"

param(
    [Parameter(Mandatory=$true)]
    [string]$ApiUrl,

    [Parameter(Mandatory=$true)]
    [string]$CronSecret,

    [Parameter(Mandatory=$false)]
    [string]$BasePath = "",

    [Parameter(Mandatory=$false)]
    [string]$TaskName = "GeoChecker-FileServerSync"
)

# 管理者権限チェック
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "[ERROR] このスクリプトは管理者権限で実行してください。" -ForegroundColor Red
    exit 1
}

$scriptPath = Join-Path $PSScriptRoot "scan-fileserver.ps1"
if (-not (Test-Path $scriptPath)) {
    Write-Host "[ERROR] scan-fileserver.ps1 が見つかりません: $scriptPath" -ForegroundColor Red
    exit 1
}

# 既存タスクの削除
$existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Write-Host "既存タスク '$TaskName' を削除します..."
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

# 引数組み立て
$arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`" -ApiUrl `"$ApiUrl`" -CronSecret `"$CronSecret`""
if ($BasePath) {
    $arguments += " -BasePath `"$BasePath`""
}

# アクション定義
$action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument $arguments

# トリガー: 9:00〜18:00の毎時0分（計10回/日）
$triggers = @()
for ($hour = 9; $hour -le 18; $hour++) {
    $triggers += New-ScheduledTaskTrigger -Daily -At "${hour}:00"
}

# 設定
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 30)

# タスク登録
Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger $triggers `
    -Settings $settings `
    -Description "GeoChecker ファイルサーバー同期（毎時0分、9:00-18:00）" `
    -RunLevel Highest

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " タスク '$TaskName' を登録しました" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "スケジュール: 毎日 9:00〜18:00 の毎時0分"
Write-Host "スクリプト: $scriptPath"
Write-Host "送信先: $ApiUrl/api/sync-files"
Write-Host ""
Write-Host "手動テスト:"
Write-Host "  .\scripts\scan-fileserver.ps1 -ApiUrl `"$ApiUrl`" -CronSecret `"$CronSecret`""
