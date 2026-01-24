#!/bin/bash
# ==============================================================================
# Production Deployment Verification Script
# ==============================================================================
# This script helps verify that the IT skills filter fix has been properly deployed
# ==============================================================================

echo "🔍 IT Skills Filter - Production Verification"
echo "=============================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Production URL (change if needed)
PROD_URL="https://portfolio.jdu.uz"

echo "📍 Testing production server: $PROD_URL"
echo ""

# Test 1: Check if server is running
echo "1️⃣ Server Health Check..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL/api/students?filter={}")
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "   ${GREEN}✅ Server is responding (HTTP $HTTP_CODE)${NC}"
else
    echo -e "   ${RED}❌ Server error (HTTP $HTTP_CODE)${NC}"
    exit 1
fi
echo ""

# Test 2: Check if case-insensitive filtering works
echo "2️⃣ Testing Case-Insensitive Filtering..."
echo ""

# Test 2a: Capital I (from ItSkills table)
echo "   Testing 'Artificial Intelligence' (capital I)..."
FILTER_CAPITAL='{"it_skills":["Artificial Intelligence"]}'
RESULT_CAPITAL=$(curl -s "$PROD_URL/api/students?filter=$(echo $FILTER_CAPITAL | jq -sRr @uri)" | jq 'length')
echo "   Found: $RESULT_CAPITAL students"

# Test 2b: Lowercase i (from student data)
echo "   Testing 'Artificial intelligence' (lowercase i)..."
FILTER_LOWER='{"it_skills":["Artificial intelligence"]}'
RESULT_LOWER=$(curl -s "$PROD_URL/api/students?filter=$(echo $FILTER_LOWER | jq -sRr @uri)" | jq 'length')
echo "   Found: $RESULT_LOWER students"

# Test 2c: All lowercase
echo "   Testing 'artificial intelligence' (all lowercase)..."
FILTER_ALL_LOWER='{"it_skills":["artificial intelligence"]}'
RESULT_ALL_LOWER=$(curl -s "$PROD_URL/api/students?filter=$(echo $FILTER_ALL_LOWER | jq -sRr @uri)" | jq 'length')
echo "   Found: $RESULT_ALL_LOWER students"

echo ""

# Analyze results
if [ "$RESULT_CAPITAL" = "$RESULT_LOWER" ] && [ "$RESULT_LOWER" = "$RESULT_ALL_LOWER" ] && [ "$RESULT_CAPITAL" != "0" ]; then
    echo -e "${GREEN}✅ PASS: Case-insensitive filtering is working!${NC}"
    echo "   All variations returned the same number of students: $RESULT_CAPITAL"
    echo ""
    echo "   Expected students (from database query):"
    echo "   - 210042: Rinat Mambetlepesov"
    echo "   - 210509: Azizbek Safarov"
    echo "   - Others..."
elif [ "$RESULT_CAPITAL" = "0" ] && [ "$RESULT_LOWER" = "0" ] && [ "$RESULT_ALL_LOWER" = "0" ]; then
    echo -e "${RED}❌ FAIL: All queries returned 0 results${NC}"
    echo ""
    echo "Possible causes:"
    echo "  1. ❌ Case-sensitive code still deployed (old code)"
    echo "  2. ❌ Duplicate ItSkills entries not cleaned up"
    echo "  3. ❌ Student data has different capitalization than filter"
    echo ""
    echo "Action required:"
    echo "  • Deploy the new case-insensitive code"
    echo "  • Run: portfolio-server/scripts/fix-itskills-duplicates.sql"
    echo "  • Restart the server"
else
    echo -e "${YELLOW}⚠️  WARNING: Inconsistent results${NC}"
    echo "   Capital I: $RESULT_CAPITAL students"
    echo "   Lowercase i: $RESULT_LOWER students"
    echo "   All lowercase: $RESULT_ALL_LOWER students"
    echo ""
    if [ "$RESULT_CAPITAL" != "$RESULT_LOWER" ]; then
        echo -e "${RED}❌ Case-insensitive fix NOT deployed yet${NC}"
        echo ""
        echo "Action required:"
        echo "  • Deploy the updated code from git"
        echo "  • Check: portfolio-server/src/services/studentService.js"
        echo "  • Look for: LOWER(elem->>'name') = '\${escapedName}'"
        echo "  • Restart the server after deployment"
    fi
fi

echo ""
echo "=============================================="

# Test 3: Check for duplicate ItSkills entries
echo ""
echo "3️⃣ Checking for Duplicate Skills in Database..."
echo "   (This requires direct database access)"
echo ""
echo "   Run this SQL query on your production database:"
echo ""
echo "   SELECT LOWER(name) as name, COUNT(*) as count"
echo "   FROM \"ItSkills\""
echo "   GROUP BY LOWER(name)"
echo "   HAVING COUNT(*) > 1;"
echo ""
echo "   If you see 'artificial intelligence' with count > 1,"
echo "   run: portfolio-server/scripts/fix-itskills-duplicates.sql"
echo ""

echo "=============================================="
echo "✅ Verification complete!"
echo ""

if [ "$RESULT_CAPITAL" = "$RESULT_LOWER" ] && [ "$RESULT_CAPITAL" != "0" ]; then
    echo -e "${GREEN}🎉 Production is working correctly!${NC}"
    exit 0
else
    echo -e "${RED}❌ Production needs fixes. See above for actions.${NC}"
    exit 1
fi
