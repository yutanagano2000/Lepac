# テスト用の認証Cookie取得のため、APIを直接叩く（セッションバイパス）
# DBフォールバック確認はdev server側のログで確認

Write-Host "=== Test 3: filesystem findFolder (DB fallback) ===" -ForegroundColor Cyan
Write-Host "CABINET_BASE_PATHが存在しないパスの場合、DBキャッシュから返されるか確認" -ForegroundColor Gray
Write-Host ""

# セッション取得（next-authのCSRF token取得 → ログイン）
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

# まずCSRFトークンを取得
try {
    $csrf = Invoke-WebRequest -Uri 'http://localhost:3000/api/auth/csrf' -SessionVariable session -UseBasicParsing
    $csrfToken = ($csrf.Content | ConvertFrom-Json).csrfToken
    Write-Host "CSRF Token: $csrfToken" -ForegroundColor Gray
} catch {
    Write-Host "CSRF取得失敗: $($_.Exception.Message)" -ForegroundColor Red
}

# ログイン
try {
    $loginBody = "username=admin&password=admin&csrfToken=$csrfToken"
    $login = Invoke-WebRequest -Uri 'http://localhost:3000/api/auth/callback/credentials' -Method POST -Body $loginBody -ContentType 'application/x-www-form-urlencoded' -WebSession $session -UseBasicParsing -MaximumRedirection 0 -ErrorAction SilentlyContinue
} catch {
    # 302リダイレクトはエラーになるが正常
}

# filesystem API をテスト
Write-Host ""
Write-Host "--- findFolder (managementNumber=0001) ---" -ForegroundColor Yellow
try {
    $result = Invoke-RestMethod -Uri 'http://localhost:3000/api/filesystem?action=findFolder&managementNumber=0001' -WebSession $session
    Write-Host "found: $($result.found)" -ForegroundColor Green
    Write-Host "source: $($result.source)" -ForegroundColor Green
    Write-Host "folderName: $($result.folderName)" -ForegroundColor Green
    if ($result.subfolders) {
        foreach ($sf in $result.subfolders) {
            Write-Host "  $($sf.key): fileCount=$($sf.fileCount), exists=$($sf.exists)" -ForegroundColor Gray
        }
    }
} catch {
    $statusCode = [int]$_.Exception.Response.StatusCode
    Write-Host "Error: status=$statusCode $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "--- listFiles (managementNumber=0001, subfolder=agreement) ---" -ForegroundColor Yellow
try {
    $result2 = Invoke-RestMethod -Uri 'http://localhost:3000/api/filesystem?action=listFiles&managementNumber=0001&subfolder=agreement' -WebSession $session
    Write-Host "totalCount: $($result2.totalCount)" -ForegroundColor Green
    Write-Host "source: $($result2.source)" -ForegroundColor Green
    if ($result2.files) {
        foreach ($f in $result2.files) {
            Write-Host "  $($f.name) ($($f.size) bytes)" -ForegroundColor Gray
        }
    }
} catch {
    $statusCode = [int]$_.Exception.Response.StatusCode
    Write-Host "Error: status=$statusCode $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "--- listAllProjects ---" -ForegroundColor Yellow
try {
    $result3 = Invoke-RestMethod -Uri 'http://localhost:3000/api/filesystem?action=listAllProjects' -WebSession $session
    Write-Host "totalCount: $($result3.totalCount)" -ForegroundColor Green
    Write-Host "source: $($result3.source)" -ForegroundColor Green
    if ($result3.folders) {
        foreach ($f in $result3.folders) {
            Write-Host "  $($f.folderName) (mgmt=$($f.managementNumber))" -ForegroundColor Gray
        }
    }
} catch {
    $statusCode = [int]$_.Exception.Response.StatusCode
    Write-Host "Error: status=$statusCode $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Test 4: findFolder (存在しない管理番号) ===" -ForegroundColor Cyan
try {
    $result4 = Invoke-RestMethod -Uri 'http://localhost:3000/api/filesystem?action=findFolder&managementNumber=9999' -WebSession $session
    Write-Host "found: $($result4.found)" -ForegroundColor $(if ($result4.found -eq $false) { "Green" } else { "Red" })
    Write-Host "source: $($result4.source)" -ForegroundColor Green
} catch {
    $statusCode = [int]$_.Exception.Response.StatusCode
    Write-Host "Error: status=$statusCode" -ForegroundColor Red
}
