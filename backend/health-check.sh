#!/bin/bash

# Backend Health Check Script
# Tests all health endpoints for Kishkwambi Backend

BACKEND_URL="https://www7-backend.kanzidata.com"

echo "🏥 Kishkwambi Backend Health Check"
echo "=================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Basic Health
echo "1️⃣  Testing Basic Health (/api/health)..."
RESPONSE=$(curl -s -w "\n%{http_code}" "${BACKEND_URL}/api/health")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" == "200" ]; then
    echo -e "${GREEN}✅ Basic Health: PASS${NC}"
    echo "   Response: $BODY"
else
    echo -e "${RED}❌ Basic Health: FAIL (HTTP $HTTP_CODE)${NC}"
    echo "   Response: $BODY"
fi
echo ""

# Test 2: Detailed Health (Docker endpoint)
echo "2️⃣  Testing Detailed Health (/health)..."
RESPONSE=$(curl -s -w "\n%{http_code}" "${BACKEND_URL}/health")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" == "200" ]; then
    echo -e "${GREEN}✅ Detailed Health: PASS${NC}"
    echo "   Response: $BODY"
else
    echo -e "${RED}❌ Detailed Health: FAIL (HTTP $HTTP_CODE)${NC}"
    echo "   Response: $BODY"
fi
echo ""

# Test 3: Database Connection
echo "3️⃣  Testing Database Connection (/api/status)..."
RESPONSE=$(curl -s -w "\n%{http_code}" "${BACKEND_URL}/api/status")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" == "200" ]; then
    if echo "$BODY" | grep -q '"connected":true'; then
        echo -e "${GREEN}✅ Database: CONNECTED${NC}"
        echo "   Response: $BODY"
    else
        echo -e "${RED}❌ Database: DISCONNECTED${NC}"
        echo "   Response: $BODY"
    fi
else
    echo -e "${RED}❌ Database Check: FAIL (HTTP $HTTP_CODE)${NC}"
    echo "   Response: $BODY"
fi
echo ""

# Test 4: Test Endpoint
echo "4️⃣  Testing Test Endpoint (/api/test)..."
RESPONSE=$(curl -s -w "\n%{http_code}" "${BACKEND_URL}/api/test")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" == "200" ]; then
    echo -e "${GREEN}✅ Test Endpoint: PASS${NC}"
    echo "   Response: $BODY"
else
    echo -e "${RED}❌ Test Endpoint: FAIL (HTTP $HTTP_CODE)${NC}"
    echo "   Response: $BODY"
fi
echo ""

# Test 5: Check if InspectionPhotos static serving works
echo "5️⃣  Testing InspectionPhotos Static Serving..."
RESPONSE=$(curl -s -w "\n%{http_code}" "${BACKEND_URL}/InspectionPhotos/")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "403" ]; then
    echo -e "${GREEN}✅ InspectionPhotos Serving: AVAILABLE${NC}"
    echo "   (HTTP $HTTP_CODE - Folder accessible)"
else
    echo -e "${YELLOW}⚠️  InspectionPhotos Serving: UNKNOWN (HTTP $HTTP_CODE)${NC}"
fi
echo ""

# Test 6: Vision API Endpoint (without image, just to see if it responds)
echo "6️⃣  Testing Vision API Endpoint..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BACKEND_URL}/api/vision/process-image")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" == "400" ]; then
    echo -e "${GREEN}✅ Vision API: AVAILABLE (responds to requests)${NC}"
    echo "   Response: $BODY"
elif [ "$HTTP_CODE" == "200" ]; then
    echo -e "${GREEN}✅ Vision API: AVAILABLE${NC}"
    echo "   Response: $BODY"
else
    echo -e "${YELLOW}⚠️  Vision API: HTTP $HTTP_CODE${NC}"
    echo "   Response: $BODY"
fi
echo ""

# Test 7: Batch Upload Endpoint
echo "7️⃣  Testing Batch Upload Endpoint..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BACKEND_URL}/api/upload/batch-photos-arrived-containers")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" == "400" ] || [ "$HTTP_CODE" == "200" ]; then
    echo -e "${GREEN}✅ Batch Upload: AVAILABLE (responds to requests)${NC}"
    echo "   Response: $BODY"
else
    echo -e "${YELLOW}⚠️  Batch Upload: HTTP $HTTP_CODE${NC}"
    echo "   Response: $BODY"
fi
echo ""

# Summary
echo "=================================="
echo "🏁 Health Check Complete!"
echo ""
echo "Backend URL: $BACKEND_URL"
echo "Timestamp: $(date)"

