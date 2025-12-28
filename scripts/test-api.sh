#!/bin/bash
# Singularity API Test Script
# This script tests all API endpoints and seeds mock data

API_URL="http://localhost:3001/api/v1"
EMAIL="test@singularity.app"
PASSWORD="Test123!"

echo "========================================"
echo "  Singularity API Test Script"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ==========================================
# 1. Health Check
# ==========================================
echo -e "${YELLOW}1. Health Check${NC}"
curl -s http://localhost:3001/health | jq .
echo ""

# ==========================================
# 2. Login to get token
# ==========================================
echo -e "${YELLOW}2. Logging in...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}")

echo "$LOGIN_RESPONSE" | jq .

# Extract access token
ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.session.access_token')

if [ "$ACCESS_TOKEN" == "null" ] || [ -z "$ACCESS_TOKEN" ]; then
  echo -e "${RED}Login failed! Make sure you created the user in Supabase Auth first.${NC}"
  echo "Go to: https://supabase.com/dashboard/project/fcsiqoebtpfhzreamotp/auth/users"
  echo "Add user: $EMAIL with password: $PASSWORD"
  exit 1
fi

echo -e "${GREEN}Login successful! Token obtained.${NC}"
echo ""

# ==========================================
# 3. Create Biomarkers
# ==========================================
echo -e "${YELLOW}3. Creating Biomarkers...${NC}"

# Bulk create biomarkers
BIOMARKERS='{"biomarkers": [
  {"name": "Vitamin D", "category": "Vitamins", "value": 45, "unit": "ng/mL", "date_tested": "2024-12-15", "reference_range_low": 30, "reference_range_high": 100, "optimal_range_low": 50, "optimal_range_high": 80, "notes": "Slightly below optimal"},
  {"name": "hs-CRP", "category": "Inflammation", "value": 2.1, "unit": "mg/L", "date_tested": "2024-12-15", "reference_range_low": 0, "reference_range_high": 3, "optimal_range_low": 0, "optimal_range_high": 1, "notes": "Elevated inflammation"},
  {"name": "Testosterone", "category": "Hormones", "value": 650, "unit": "ng/dL", "date_tested": "2024-12-15", "reference_range_low": 300, "reference_range_high": 1000, "optimal_range_low": 600, "optimal_range_high": 900},
  {"name": "Fasting Glucose", "category": "Metabolic", "value": 92, "unit": "mg/dL", "date_tested": "2024-12-15", "reference_range_low": 70, "reference_range_high": 100, "optimal_range_low": 70, "optimal_range_high": 90},
  {"name": "HbA1c", "category": "Metabolic", "value": 5.4, "unit": "%", "date_tested": "2024-12-15", "reference_range_low": 4.0, "reference_range_high": 5.7, "optimal_range_low": 4.0, "optimal_range_high": 5.3},
  {"name": "Ferritin", "category": "Blood", "value": 120, "unit": "ng/mL", "date_tested": "2024-12-15", "reference_range_low": 30, "reference_range_high": 400, "optimal_range_low": 50, "optimal_range_high": 150},
  {"name": "B12", "category": "Vitamins", "value": 680, "unit": "pg/mL", "date_tested": "2024-12-15", "reference_range_low": 200, "reference_range_high": 900, "optimal_range_low": 500, "optimal_range_high": 800},
  {"name": "TSH", "category": "Hormones", "value": 1.8, "unit": "mIU/L", "date_tested": "2024-12-15", "reference_range_low": 0.5, "reference_range_high": 4.5, "optimal_range_low": 1.0, "optimal_range_high": 2.5}
]}'

curl -s -X POST "$API_URL/biomarkers/bulk" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d "$BIOMARKERS" | jq .

echo -e "${GREEN}Biomarkers created!${NC}"
echo ""

# ==========================================
# 4. Create Supplements
# ==========================================
echo -e "${YELLOW}4. Creating Supplements...${NC}"

# Create supplements one by one
SUPPLEMENTS=(
  '{"name": "Vitamin D3", "brand": "Thorne", "dose": "5000 IU", "timing": "Morning", "frequency": "Daily", "is_active": true, "price_per_serving": 0.25, "category": "Vitamins", "notes": "Take with fat for absorption"}'
  '{"name": "Omega-3 Fish Oil", "brand": "Nordic Naturals", "dose": "2000mg", "timing": "With meals", "frequency": "Daily", "is_active": true, "price_per_serving": 0.45, "category": "Essential Fatty Acids"}'
  '{"name": "Magnesium Glycinate", "brand": "Pure Encapsulations", "dose": "400mg", "timing": "Evening", "frequency": "Daily", "is_active": true, "price_per_serving": 0.35, "category": "Minerals"}'
  '{"name": "Creatine Monohydrate", "brand": "Thorne", "dose": "5g", "timing": "Post-workout", "frequency": "Daily", "is_active": true, "price_per_serving": 0.20, "category": "Performance"}'
  '{"name": "Vitamin K2", "brand": "Thorne", "dose": "100mcg", "timing": "Morning", "frequency": "Daily", "is_active": true, "price_per_serving": 0.18, "category": "Vitamins"}'
  '{"name": "Zinc Picolinate", "brand": "Thorne", "dose": "30mg", "timing": "Evening", "frequency": "Daily", "is_active": false, "price_per_serving": 0.15, "category": "Minerals", "notes": "Paused - adequate levels"}'
)

for supp in "${SUPPLEMENTS[@]}"; do
  curl -s -X POST "$API_URL/supplements" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -d "$supp" | jq -r '.data.name // .error'
done

echo -e "${GREEN}Supplements created!${NC}"
echo ""

# ==========================================
# 5. Create Routines
# ==========================================
echo -e "${YELLOW}5. Creating Routines...${NC}"

# Morning Routine
MORNING_RESPONSE=$(curl -s -X POST "$API_URL/routines" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{"name": "Morning Routine", "time_of_day": "morning"}')

MORNING_ID=$(echo "$MORNING_RESPONSE" | jq -r '.data.id')
echo "Morning Routine ID: $MORNING_ID"

# Evening Routine
EVENING_RESPONSE=$(curl -s -X POST "$API_URL/routines" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{"name": "Evening Routine", "time_of_day": "evening"}')

EVENING_ID=$(echo "$EVENING_RESPONSE" | jq -r '.data.id')
echo "Evening Routine ID: $EVENING_ID"

# Add routine items
if [ "$MORNING_ID" != "null" ]; then
  echo "Adding morning routine items..."
  curl -s -X POST "$API_URL/routines/$MORNING_ID/items" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -d '{"title": "Wake up + hydrate (16oz water)", "time": "6:00 AM"}' | jq -r '.data.title // .error'

  curl -s -X POST "$API_URL/routines/$MORNING_ID/items" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -d '{"title": "Take morning supplements", "time": "6:15 AM"}' | jq -r '.data.title // .error'

  curl -s -X POST "$API_URL/routines/$MORNING_ID/items" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -d '{"title": "Cold shower", "duration": "3 min"}' | jq -r '.data.title // .error'

  curl -s -X POST "$API_URL/routines/$MORNING_ID/items" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -d '{"title": "Meditation", "duration": "10 min"}' | jq -r '.data.title // .error'
fi

if [ "$EVENING_ID" != "null" ]; then
  echo "Adding evening routine items..."
  curl -s -X POST "$API_URL/routines/$EVENING_ID/items" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -d '{"title": "Take evening supplements", "time": "8:00 PM"}' | jq -r '.data.title // .error'

  curl -s -X POST "$API_URL/routines/$EVENING_ID/items" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -d '{"title": "Blue light blocking", "time": "9:00 PM"}' | jq -r '.data.title // .error'

  curl -s -X POST "$API_URL/routines/$EVENING_ID/items" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -d '{"title": "Reading (no screens)", "duration": "30 min"}' | jq -r '.data.title // .error'

  curl -s -X POST "$API_URL/routines/$EVENING_ID/items" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -d '{"title": "Sleep", "time": "10:00 PM"}' | jq -r '.data.title // .error'
fi

echo -e "${GREEN}Routines created!${NC}"
echo ""

# ==========================================
# 6. Create Goals
# ==========================================
echo -e "${YELLOW}6. Creating Goals...${NC}"

GOALS=(
  '{"title": "Optimize Vitamin D Levels", "category": "Vitamins", "target_biomarker": "Vitamin D", "current_value": 45, "target_value": 70, "direction": "increase", "status": "active", "notes": "Aiming for 50-80 ng/mL"}'
  '{"title": "Reduce Inflammation", "category": "Metabolic", "target_biomarker": "hs-CRP", "current_value": 2.1, "target_value": 1.0, "direction": "decrease", "status": "active", "notes": "Target under 1.0 mg/L"}'
  '{"title": "Improve Sleep Quality", "category": "Lifestyle", "direction": "maintain", "status": "active", "notes": "Track with Oura ring"}'
)

for goal in "${GOALS[@]}"; do
  GOAL_RESPONSE=$(curl -s -X POST "$API_URL/goals" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -d "$goal")

  GOAL_ID=$(echo "$GOAL_RESPONSE" | jq -r '.data.id')
  GOAL_TITLE=$(echo "$GOAL_RESPONSE" | jq -r '.data.title // .error')
  echo "Created goal: $GOAL_TITLE (ID: $GOAL_ID)"
done

echo -e "${GREEN}Goals created!${NC}"
echo ""

# ==========================================
# 7. Verify Data
# ==========================================
echo -e "${YELLOW}7. Verifying Data...${NC}"

echo "Biomarkers:"
curl -s "$API_URL/biomarkers" -H "Authorization: Bearer $ACCESS_TOKEN" | jq '.data | length'

echo "Supplements:"
curl -s "$API_URL/supplements" -H "Authorization: Bearer $ACCESS_TOKEN" | jq '.data | length'

echo "Routines:"
curl -s "$API_URL/routines" -H "Authorization: Bearer $ACCESS_TOKEN" | jq '.data | length'

echo "Goals:"
curl -s "$API_URL/goals" -H "Authorization: Bearer $ACCESS_TOKEN" | jq '.data | length'

echo ""
echo "========================================"
echo -e "${GREEN}  API Test Complete!${NC}"
echo "========================================"
echo ""
echo "Test Account:"
echo "  Email:    $EMAIL"
echo "  Password: $PASSWORD"
echo ""
