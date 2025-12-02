# API Testing Script for PowerShell
# Usage: .\test-api.ps1 [API_URL]

param(
    [string]$ApiUrl = "http://localhost:3000/api"
)

$ErrorActionPreference = "Stop"

Write-Host "🧪 Testing API Endpoints" -ForegroundColor Cyan
Write-Host "API Base URL: $ApiUrl" -ForegroundColor Cyan
Write-Host ""

$BaseUrl = $ApiUrl -replace "/api$", ""
$Passed = 0
$Failed = 0
$Token = ""

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Endpoint,
        [string]$Data = "",
        [int]$ExpectedStatus
    )
    
    Write-Host "Testing: $Name" -ForegroundColor Yellow
    
    $headers = @{
        "Content-Type" = "application/json"
    }
    
    if ($Token) {
        $headers["Authorization"] = "Bearer $Token"
    }
    
    try {
        if ($Method -eq "GET") {
            $response = Invoke-WebRequest -Uri $Endpoint -Method GET -Headers $headers -ErrorAction Stop
        }
        elseif ($Method -eq "POST") {
            $response = Invoke-WebRequest -Uri $Endpoint -Method POST -Headers $headers -Body $Data -ErrorAction Stop
        }
        elseif ($Method -eq "PUT") {
            $response = Invoke-WebRequest -Uri $Endpoint -Method PUT -Headers $headers -Body $Data -ErrorAction Stop
        }
        elseif ($Method -eq "DELETE") {
            $response = Invoke-WebRequest -Uri $Endpoint -Method DELETE -Headers $headers -ErrorAction Stop
        }
        
        $statusCode = $response.StatusCode
        
        if ($statusCode -eq $ExpectedStatus) {
            Write-Host "✅ PASSED (Status: $statusCode)" -ForegroundColor Green
            $script:Passed++
            $response.Content.Substring(0, [Math]::Min(200, $response.Content.Length))
            Write-Host ""
            return $true
        }
        else {
            Write-Host "❌ FAILED (Expected: $ExpectedStatus, Got: $statusCode)" -ForegroundColor Red
            $script:Failed++
            return $false
        }
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "❌ FAILED (Status: $statusCode)" -ForegroundColor Red
        $script:Failed++
        return $false
    }
}

# Test 1: Health Check
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "Test 1: Health Check" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Test-Endpoint "GET /health" "GET" "$BaseUrl/health" "" 200
Write-Host ""

# Test 2: Register User
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "Test 2: User Registration" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
$RandomUser = "testuser$(Get-Date -Format 'yyyyMMddHHmmss')"
$RegisterData = @{
    username = $RandomUser
    email = "$RandomUser@test.com"
    password = "password123"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$ApiUrl/auth/register" -Method POST -Body $RegisterData -ContentType "application/json" -ErrorAction Stop
    $responseObj = $response.Content | ConvertFrom-Json
    $Token = $responseObj.data.token
    
    if ($Token) {
        Write-Host "✅ User registered. Token obtained." -ForegroundColor Green
        Write-Host "Token: $($Token.Substring(0, [Math]::Min(50, $Token.Length)))..." -ForegroundColor Gray
        $Passed++
    }
    else {
        Write-Host "❌ Registration failed. Cannot continue tests." -ForegroundColor Red
        exit 1
    }
}
catch {
    Write-Host "❌ Registration failed. Cannot continue tests." -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
Write-Host ""

# Test 3: Login
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "Test 3: User Login" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
$LoginData = @{
    email = "$RandomUser@test.com"
    password = "password123"
} | ConvertTo-Json
Test-Endpoint "POST /auth/login" "POST" "$ApiUrl/auth/login" $LoginData 200
Write-Host ""

# Test 4: Create Note
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "Test 4: Create Note" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
$NoteData = @{
    title = "Test Note"
    content = "This is a test note"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$ApiUrl/notes" -Method POST -Headers @{"Authorization" = "Bearer $Token"; "Content-Type" = "application/json"} -Body $NoteData -ErrorAction Stop
    $responseObj = $response.Content | ConvertFrom-Json
    $NoteId = $responseObj.data.note.id
    
    if ($NoteId) {
        Write-Host "✅ Note created. ID: $NoteId" -ForegroundColor Green
        $Passed++
    }
    else {
        Write-Host "❌ Failed to create note" -ForegroundColor Red
        $NoteId = 1
        $Failed++
    }
}
catch {
    Write-Host "❌ Failed to create note" -ForegroundColor Red
    $NoteId = 1
    $Failed++
}
Write-Host ""

# Test 5: Get All Notes
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "Test 5: Get All Notes" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Test-Endpoint "GET /notes" "GET" "$ApiUrl/notes" "" 200
Write-Host ""

# Test 6: Get Note by ID
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "Test 6: Get Note by ID" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Test-Endpoint "GET /notes/:id" "GET" "$ApiUrl/notes/$NoteId" "" 200
Write-Host ""

# Test 7: Update Note
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "Test 7: Update Note" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
$UpdateData = @{
    title = "Updated Test Note"
    content = "This note has been updated"
} | ConvertTo-Json
Test-Endpoint "PUT /notes/:id" "PUT" "$ApiUrl/notes/$NoteId" $UpdateData 200
Write-Host ""

# Test 8: Delete Note
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "Test 8: Delete Note" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Test-Endpoint "DELETE /notes/:id" "DELETE" "$ApiUrl/notes/$NoteId" "" 200
Write-Host ""

# Summary
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "Passed: $Passed" -ForegroundColor Green
Write-Host "Failed: $Failed" -ForegroundColor Red
Write-Host ""

if ($Failed -eq 0) {
    Write-Host "✅ All tests passed!" -ForegroundColor Green
    exit 0
}
else {
    Write-Host "❌ Some tests failed" -ForegroundColor Red
    exit 1
}

