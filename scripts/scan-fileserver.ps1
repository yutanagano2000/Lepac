# scan-fileserver.ps1
# ファイルサーバーをスキャンし、案件フォルダ情報をAPIに同期する
# 使用方法: .\scripts\scan-fileserver.ps1 -ApiUrl "https://your-app.vercel.app" -CronSecret "your-secret"

param(
    [Parameter(Mandatory=$false)]
    [string]$ApiUrl = "http://localhost:3000",

    [Parameter(Mandatory=$false)]
    [string]$CronSecret = $env:CRON_SECRET,

    [Parameter(Mandatory=$false)]
    [string]$BasePath = $env:CABINET_BASE_PATH
)

# デフォルト値
if (-not $BasePath) {
    $BasePath = "C:\Person Energy\◇Person独自案件管理\□Person独自案件"
}

if (-not $CronSecret) {
    Write-Host "[ERROR] CRON_SECRET が設定されていません。-CronSecret パラメータまたは環境変数 CRON_SECRET を設定してください。" -ForegroundColor Red
    exit 1
}

# ログ出力
$LogFile = Join-Path $PSScriptRoot "scan-fileserver.log"
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    Write-Host $logEntry -ForegroundColor $(if ($Level -eq "ERROR") { "Red" } elseif ($Level -eq "WARN") { "Yellow" } else { "White" })
    Add-Content -Path $LogFile -Value $logEntry -Encoding UTF8
}

# サブフォルダ定義（APIの SUBFOLDERS と同一）
$SubfolderMap = @{
    "01_合意書" = "agreement"
    "02_土地情報" = "landInfo"
    "03_図面" = "drawings"
    "04_発電シミュレーション" = "simulation"
    "05_法令関係" = "legal"
    "06_電力申請" = "powerApplication"
    "07_材料発注" = "materialOrder"
    "08_工事関係" = "construction"
    "09_連系資料" = "gridConnection"
    "10_土地決済・所有権移転" = "settlement"
}

Write-Log "======== ファイルサーバースキャン開始 ========"
Write-Log "BasePath: $BasePath"
Write-Log "ApiUrl: $ApiUrl"

# ベースパスの存在確認
if (-not (Test-Path $BasePath)) {
    Write-Log "ベースパスが存在しません: $BasePath" "ERROR"
    exit 1
}

# 案件フォルダを取得（数字で始まるフォルダのみ）
$projectFolders = Get-ChildItem -Path $BasePath -Directory | Where-Object {
    $_.Name -match '^\d+-'
}

Write-Log "対象フォルダ数: $($projectFolders.Count)"

# バッチサイズ（1回のAPI送信あたりのフォルダ数）
$BatchSize = 50
$allFolders = @()

foreach ($folder in $projectFolders) {
    # 管理番号抽出（"-" の前の数字部分）
    if ($folder.Name -match '^(\d+)-') {
        $mgmtNumber = $Matches[1].PadLeft(4, '0')
    } else {
        Write-Log "管理番号を抽出できません: $($folder.Name)" "WARN"
        continue
    }

    $folderData = @{
        managementNumber = $mgmtNumber
        folderName = $folder.Name
        folderPath = $folder.FullName
        subfolders = @()
    }

    # サブフォルダをスキャン
    foreach ($subName in $SubfolderMap.Keys) {
        $subPath = Join-Path $folder.FullName $subName
        if (Test-Path $subPath) {
            $files = @()
            # ファイルを再帰的に取得（隠しファイル・desktop.iniを除外）
            Get-ChildItem -Path $subPath -File -Recurse -ErrorAction SilentlyContinue |
                Where-Object { -not $_.Name.StartsWith('.') -and $_.Name -ne 'desktop.ini' } |
                Select-Object -First 500 |
                ForEach-Object {
                    $files += @{
                        name = $_.Name
                        path = $_.FullName
                        size = [int]$_.Length
                        modifiedAt = $_.LastWriteTime.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
                    }
                }

            $folderData.subfolders += @{
                key = $SubfolderMap[$subName]
                name = $subName
                path = $subPath
                files = $files
            }
        }
    }

    $allFolders += $folderData
}

Write-Log "スキャン完了: $($allFolders.Count) フォルダ"

# バッチ送信
$totalBatches = [Math]::Ceiling($allFolders.Count / $BatchSize)
$successCount = 0
$errorCount = 0

for ($i = 0; $i -lt $allFolders.Count; $i += $BatchSize) {
    $batchNum = [Math]::Floor($i / $BatchSize) + 1
    $batch = $allFolders[$i..([Math]::Min($i + $BatchSize - 1, $allFolders.Count - 1))]

    Write-Log "バッチ $batchNum/$totalBatches 送信中 ($($batch.Count) フォルダ)..."

    $body = @{
        folders = $batch
    } | ConvertTo-Json -Depth 10 -Compress

    try {
        $response = Invoke-RestMethod `
            -Uri "$ApiUrl/api/sync-files" `
            -Method POST `
            -Headers @{ "Authorization" = "Bearer $CronSecret"; "Content-Type" = "application/json" } `
            -Body $body `
            -TimeoutSec 120

        Write-Log "バッチ $batchNum 成功: フォルダ=$($response.foldersProcessed), ファイル=$($response.filesProcessed), エラー=$($response.errorCount)"
        $successCount += $response.foldersProcessed

        if ($response.errors) {
            foreach ($err in $response.errors) {
                Write-Log "  API側エラー: $err" "WARN"
            }
            $errorCount += $response.errorCount
        }
    } catch {
        Write-Log "バッチ $batchNum 送信失敗: $($_.Exception.Message)" "ERROR"
        $errorCount += $batch.Count
    }
}

Write-Log "======== 同期完了 ========"
Write-Log "成功: $successCount フォルダ, エラー: $errorCount"
