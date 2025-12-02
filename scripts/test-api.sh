#!/bin/bash

# API Testing Script
# This script tests all API endpoints

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
API_URL="${1:-http://localhost:3000/api}"
BASE_URL="${API_URL%/api}"

echo -e "${BLUE}🧪 Testing API Endpoints${NC}"
echo "API Base URL: $API_URL"
echo ""

# Test counters
PASSED=0
FAILED=0

# Test function
test_endpoint() {
    local name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    local expected_status=$5
    
    echo -e "${YELLOW}Testing: $name${NC}"
    
    if [ "$method" == "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$endpoint" -H "Authorization: Bearer $TOKEN" 2>/dev/null || echo "000")
    elif [ "$method" == "POST" ]; then
        response=$(curl -s -w "\n%{http_code}" -X POST "$endpoint" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $TOKEN" \
            -d "$data" 2>/dev/null || echo "000")
    elif [ "$method" == "PUT" ]; then
        response=$(curl -s -w "\n%{http_code}" -X PUT "$endpoint" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $TOKEN" \
            -d "$data" 2>/dev/null || echo "000")
    elif [ "$method" == "DELETE" ]; then
        response=$(curl -s -w "\n%{http_code}" -X DELETE "$endpoint" \
            -H "Authorization: Bearer $TOKEN" 2>/dev/null || echo "000")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" == "$expected_status" ]; then
        echo -e "${GREEN}✅ PASSED (Status: $http_code)${NC}"
        ((PASSED++))
        echo "$body" | head -c 200
        echo ""
        return 0
    else
        echo -e "${RED}❌ FAILED (Expected: $expected_status, Got: $http_code)${NC}"
        echo "$body" | head -c 200
        echo ""
        ((FAILED++))
        return 1
    fi
}

# Test 1: Health Check
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Test 1: Health Check${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
test_endpoint "GET /health" "GET" "$BASE_URL/health" "" "200"
echo ""

# Test 2: Register User
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Test 2: User Registration${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
RANDOM_USER="testuser$(date +%s)"
REGISTER_DATA="{\"username\":\"$RANDOM_USER\",\"email\":\"$RANDOM_USER@test.com\",\"password\":\"password123\"}"

response=$(curl -s -X POST "$API_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d "$REGISTER_DATA")

TOKEN=$(echo "$response" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo -e "${RED}❌ Registration failed. Cannot continue tests.${NC}"
    echo "$response"
    exit 1
fi

echo -e "${GREEN}✅ User registered. Token obtained.${NC}"
echo "Token: ${TOKEN:0:50}..."
echo ""

# Test 3: Login
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Test 3: User Login${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
LOGIN_DATA="{\"email\":\"$RANDOM_USER@test.com\",\"password\":\"password123\"}"
test_endpoint "POST /auth/login" "POST" "$API_URL/auth/login" "$LOGIN_DATA" "200"
echo ""

# Test 4: Create Note
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Test 4: Create Note${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
NOTE_DATA="{\"title\":\"Test Note\",\"content\":\"This is a test note\"}"
CREATE_RESPONSE=$(curl -s -X POST "$API_URL/notes" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "$NOTE_DATA")

NOTE_ID=$(echo "$CREATE_RESPONSE" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)

if [ -z "$NOTE_ID" ]; then
    echo -e "${RED}❌ Failed to create note${NC}"
    echo "$CREATE_RESPONSE"
    NOTE_ID="1"  # Fallback for testing
else
    test_endpoint "POST /notes" "POST" "$API_URL/notes" "$NOTE_DATA" "201"
fi
echo ""

# Test 5: Get All Notes
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Test 5: Get All Notes${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
test_endpoint "GET /notes" "GET" "$API_URL/notes" "" "200"
echo ""

# Test 6: Get Note by ID
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Test 6: Get Note by ID${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
test_endpoint "GET /notes/:id" "GET" "$API_URL/notes/$NOTE_ID" "" "200"
echo ""

# Test 7: Update Note
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Test 7: Update Note${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
UPDATE_DATA="{\"title\":\"Updated Test Note\",\"content\":\"This note has been updated\"}"
test_endpoint "PUT /notes/:id" "PUT" "$API_URL/notes/$NOTE_ID" "$UPDATE_DATA" "200"
echo ""

# Test 8: File Upload (if file exists)
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Test 8: File Upload${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
# Create a test file
TEST_FILE="/tmp/test-upload.txt"
echo "This is a test file for upload" > "$TEST_FILE"

if [ -f "$TEST_FILE" ]; then
    UPLOAD_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/upload" \
        -H "Authorization: Bearer $TOKEN" \
        -F "file=@$TEST_FILE")
    
    HTTP_CODE=$(echo "$UPLOAD_RESPONSE" | tail -n1)
    if [ "$HTTP_CODE" == "200" ]; then
        echo -e "${GREEN}✅ File upload successful${NC}"
        ((PASSED++))
    else
        echo -e "${RED}❌ File upload failed (Status: $HTTP_CODE)${NC}"
        ((FAILED++))
    fi
    rm -f "$TEST_FILE"
else
    echo -e "${YELLOW}⚠️  Skipping file upload test${NC}"
fi
echo ""

# Test 9: Delete Note
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Test 9: Delete Note${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
test_endpoint "DELETE /notes/:id" "DELETE" "$API_URL/notes/$NOTE_ID" "" "200"
echo ""

# Summary
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi

