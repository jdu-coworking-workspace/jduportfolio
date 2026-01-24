# IT Skills Filter Issue - Root Cause & Solution

## Problem Summary

**Issue**: Filtering by "Artificial intelligence" on production returns `[]` (empty array) even though students with this skill exist in the database.

**Affected Environment**: Production (`https://portfolio.jdu.uz`)  
**User Role**: Admin (ID: 1)  
**Date Identified**: 2026-01-24

---

## Root Causes (Multiple Issues)

### 🔴 Issue 1: Case-Sensitive Filtering Code

**Status**: Not deployed to production ❌

The production server is still running OLD case-sensitive code that uses the JSONB containment operator (`@>`):

```javascript
// OLD CODE (currently in production)
const json = JSON.stringify([{ name: String(n) }])
const esc = sequelize.escape(json)
const levelExpr = lvls.map(l => `("Student"."it_skills" IS NOT NULL AND ("Student"."it_skills"->'${l}') @> ${esc}::jsonb)`).join(' OR ')
```

**Problem**: `@>` performs **case-sensitive** matching for text values inside JSONB.

**Fix**: Case-insensitive code exists locally but needs deployment:

```javascript
// NEW CODE (needs deployment)
const skillName = String(n).toLowerCase()
const escapedName = skillName.replace(/'/g, "''")
const levelExpr = lvls
	.map(
		l => `(
    "Student"."it_skills" IS NOT NULL 
    AND EXISTS (
        SELECT 1 
        FROM jsonb_array_elements("Student"."it_skills"->'${l}') AS elem
        WHERE LOWER(elem->>'name') = '${escapedName}'
    )
)`
	)
	.join(' OR ')
```

---

### 🔴 Issue 2: Duplicate ItSkills Entries

**Status**: Exists in production database ❌

Your `ItSkills` table has **duplicate entries** that differ only in capitalization:

| ID    | Name                        | Color     |
| ----- | --------------------------- | --------- |
| (old) | `"Artificial intelligence"` | `#2196f3` |
| (new) | `"Artificial Intelligence"` | `#ff6f61` |

**Database Evidence**:

```sql
verceldb_restore=# SELECT name, color FROM "ItSkills"
                   WHERE LOWER(name) = 'artificial intelligence';

            name             |  color
-----------------------------+---------
 Artificial intelligence     | #2196f3  ← OLD (should be deleted)
 Artificial Intelligence     | #ff6f61  ← NEW (keep this one)
```

**Impact**: Filter dropdown shows both variations, causing confusion.

---

### 🔴 Issue 3: Data Inconsistency

**Status**: Exists in production database ⚠️

Student profiles use different capitalization than the ItSkills table:

**Students' data** (from production database):

```json
{
	"name": "Artificial intelligence", // lowercase 'i'
	"color": "#2196f3"
}
```

**ItSkills table** (filter dropdown):

- Shows both: `"Artificial intelligence"` AND `"Artificial Intelligence"`

**Result**:

- If user selects `"Artificial Intelligence"` (capital I) → No match with student data (lowercase i) ❌
- If user selects `"Artificial intelligence"` (lowercase i) → **Should** match, but old case-sensitive code prevents it ❌

---

## Complete Solution

### ✅ Step 1: Deploy Case-Insensitive Code

**On your production server**:

```bash
# 1. Navigate to project
cd /path/to/jduportfolio/portfolio-server

# 2. Pull latest code
git pull origin main-january-24  # or your branch name

# 3. Verify the new code exists
grep -A 8 "buildItSkillsCondition" src/services/studentService.js | grep "toLowerCase"
# Should show: const skillName = String(n).toLowerCase()

# 4. Install dependencies (if any new ones)
npm install

# 5. Restart the server
pm2 restart portfolio-server
# OR
sudo systemctl restart portfolio-server
```

**Files affected**:

- ✅ `portfolio-server/src/services/studentService.js` (lines 268-293)
- ✅ `portfolio-server/src/services/draftService.js` (lines 86-103)

---

### ✅ Step 2: Run Migration (Add Missing Skills)

```bash
cd /path/to/jduportfolio/portfolio-server
npm run migrate
```

This migration adds 32 missing AI/ML skills:

- File: `migrations/20260124193916-add-missing-ai-ml-it-skills.js`
- Adds: "Artificial Intelligence", "Machine Learning", "Deep Learning", etc.

---

### ✅ Step 3: Clean Up Duplicate ItSkills

**Connect to production database** and run:

```sql
-- Check for duplicates
SELECT LOWER(name) as name, COUNT(*)
FROM "ItSkills"
GROUP BY LOWER(name)
HAVING COUNT(*) > 1;

-- Remove old lowercase duplicate
DELETE FROM "ItSkills"
WHERE name = 'Artificial intelligence'
AND color = '#2196f3';

-- Verify only one remains
SELECT name, color
FROM "ItSkills"
WHERE LOWER(name) = 'artificial intelligence';
-- Should return only: "Artificial Intelligence" | #ff6f61
```

**Full cleanup script**: `portfolio-server/scripts/fix-itskills-duplicates.sql`

---

### ✅ Step 4: Verify the Fix

Run the verification script:

```bash
cd /path/to/jduportfolio/portfolio-server
./scripts/verify-production-fix.sh
```

**Or test manually**:

```bash
# Test 1: Capital I
curl "https://portfolio.jdu.uz/api/students?filter=%7B%22it_skills%22:%5B%22Artificial%20Intelligence%22%5D%7D"

# Test 2: Lowercase i
curl "https://portfolio.jdu.uz/api/students?filter=%7B%22it_skills%22:%5B%22Artificial%20intelligence%22%5D%7D"

# Test 3: All lowercase
curl "https://portfolio.jdu.uz/api/students?filter=%7B%22it_skills%22:%5B%22artificial%20intelligence%22%5D%7D"
```

**Expected Result**: All three should return the same students:

- Student 210042: Rinat Mambetlepesov
- Student 210509: Azizbek Safarov
- Student 211109: Mardonbek Xolboyev (possibly)

---

## Why It Failed Before

### Scenario 1: User selects "Artificial Intelligence" (capital I)

1. Filter sends: `{"it_skills":["Artificial Intelligence"]}`
2. Student 210042 has: `{"name": "Artificial intelligence"}` (lowercase i)
3. Old code compares: `"Artificial Intelligence" == "Artificial intelligence"` → **FALSE** ❌
4. Result: Empty array `[]`

### Scenario 2: User selects "Artificial intelligence" (lowercase i)

1. Filter sends: `{"it_skills":["Artificial intelligence"]}`
2. Student 210042 has: `{"name": "Artificial intelligence"}` (exact match!)
3. Old code compares: `"Artificial intelligence" == "Artificial intelligence"` → **TRUE** ✅
4. **But**: Duplicate entries in ItSkills table might cause filter to use the wrong one
5. Result: Might work, but inconsistent ⚠️

---

## After the Fix

### Any capitalization will work! ✅

1. Filter sends: `{"it_skills":["ARTIFICIAL INTELLIGENCE"]}` (any case)
2. Student has: `{"name": "Artificial intelligence"}`
3. New code compares: `LOWER("ARTIFICIAL INTELLIGENCE") == LOWER("Artificial intelligence")`
4. Result: `"artificial intelligence" == "artificial intelligence"` → **TRUE** ✅
5. Returns: Student 210042 and others with the skill!

---

## Files Created for This Fix

### Documentation

1. ✅ `IT_SKILLS_FILTER_FIX_COMPLETE.md` - Original detailed analysis
2. ✅ `IT_SKILLS_PRODUCTION_DEPLOYMENT.md` - Deployment instructions
3. ✅ `IT_SKILLS_COMPLETE_PRODUCTION_FIX.md` - Complete fix guide
4. ✅ `IT_SKILLS_ROOT_CAUSE_SOLUTION.md` - This file

### Code Changes

1. ✅ `migrations/20260124193916-add-missing-ai-ml-it-skills.js` - New migration
2. ✅ `src/services/studentService.js` - Updated filtering logic
3. ✅ `src/services/draftService.js` - Updated filtering logic

### Scripts

1. ✅ `scripts/fix-itskills-duplicates.sql` - Database cleanup script
2. ✅ `scripts/verify-production-fix.sh` - Verification script

---

## Deployment Checklist

- [ ] 1. SSH to production server
- [ ] 2. Pull latest code (`git pull`)
- [ ] 3. Run migrations (`npm run migrate`)
- [ ] 4. Clean up duplicate ItSkills entries (run SQL script)
- [ ] 5. Restart server (`pm2 restart`)
- [ ] 6. Verify with test queries (3 different capitalizations)
- [ ] 7. Test on frontend (filter by "Artificial Intelligence")
- [ ] 8. Confirm students appear in results

---

## Success Criteria

✅ **Pass Criteria**:

- All three test queries (capital I, lowercase i, all lowercase) return the same number of students
- Students 210042, 210509 appear in results
- Filter dropdown shows only ONE "Artificial Intelligence" entry
- No duplicates in ItSkills table

❌ **Fail Criteria**:

- Different results for different capitalizations
- Empty array `[]` returned for any variation
- Duplicate entries still visible in filter dropdown

---

## Timeline

- **2026-01-24 00:19**: Issue identified (screenshots provided)
- **2026-01-24 00:20**: Root causes analyzed
- **2026-01-24**: Fix implemented locally, ready for deployment

---

**Status**: ⏳ **Pending Deployment**  
**Priority**: 🔴 **High** (Production issue affecting all IT skills filtering)  
**ETA**: 10-15 minutes (after deployment starts)

---

## Quick Reference Commands

```bash
# Deployment
cd /path/to/portfolio-server && git pull && npm run migrate && pm2 restart portfolio-server

# Database cleanup
psql -h <host> -U <user> -d verceldb_restore -f scripts/fix-itskills-duplicates.sql

# Verification
./scripts/verify-production-fix.sh
```
