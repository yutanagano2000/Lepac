$body = @{
    folders = @(
        @{
            managementNumber = '0001'
            folderName = '0001-佐東 P3327'
            folderPath = '\\server\share\0001-佐東 P3327'
            subfolders = @(
                @{
                    key = 'agreement'
                    name = '01_合意書'
                    path = '\\server\share\0001-佐東 P3327\01_合意書'
                    files = @(
                        @{ name = '合意書.pdf'; path = '\\server\share\0001\01_合意書\合意書.pdf'; size = 1024; modifiedAt = '2026-01-15T10:00:00.000Z' },
                        @{ name = '合意書_修正.pdf'; path = '\\server\share\0001\01_合意書\合意書_修正.pdf'; size = 2048; modifiedAt = '2026-02-01T09:30:00.000Z' }
                    )
                },
                @{
                    key = 'landInfo'
                    name = '02_土地情報'
                    path = '\\server\share\0001-佐東 P3327\02_土地情報'
                    files = @(
                        @{ name = '謄本.pdf'; path = '\\server\share\0001\02_土地情報\謄本.pdf'; size = 512; modifiedAt = '2026-01-10T08:00:00.000Z' }
                    )
                }
            )
        },
        @{
            managementNumber = '0012'
            folderName = '0012-田中 P4567'
            folderPath = '\\server\share\0012-田中 P4567'
            subfolders = @(
                @{
                    key = 'drawings'
                    name = '03_図面'
                    path = '\\server\share\0012-田中 P4567\03_図面'
                    files = @(
                        @{ name = '配置図.dwg'; path = '\\server\share\0012\03_図面\配置図.dwg'; size = 4096; modifiedAt = '2026-02-10T14:00:00.000Z' }
                    )
                }
            )
        }
    )
} | ConvertTo-Json -Depth 10

Write-Host "=== Test 1: sync-files API ===" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri 'http://localhost:3000/api/sync-files' -Method POST -Headers @{
        'Authorization' = 'Bearer 2c95cd0c1f0712252ffeb4076d35a118b94df8ccb9dbb90f7286bfefc03b3b19'
        'Content-Type' = 'application/json'
    } -Body $body
    Write-Host "SUCCESS:" -ForegroundColor Green
    $response | ConvertTo-Json
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host $reader.ReadToEnd()
    }
}

Write-Host ""
Write-Host "=== Test 2: sync-files 認証エラー ===" -ForegroundColor Cyan
try {
    $response2 = Invoke-RestMethod -Uri 'http://localhost:3000/api/sync-files' -Method POST -Headers @{
        'Authorization' = 'Bearer wrong-token'
        'Content-Type' = 'application/json'
    } -Body '{"folders":[]}'
    Write-Host "UNEXPECTED SUCCESS" -ForegroundColor Yellow
    $response2 | ConvertTo-Json
} catch {
    $statusCode = [int]$_.Exception.Response.StatusCode
    Write-Host "Expected 401, got: $statusCode" -ForegroundColor $(if ($statusCode -eq 401) { "Green" } else { "Red" })
}
