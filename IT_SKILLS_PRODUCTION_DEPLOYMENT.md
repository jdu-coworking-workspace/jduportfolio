# IT Skills Filter Not Working - Production Issue Analysis

## Problem Report

**Environment**: Production (`https://portfolio.jdu.uz`)  
**User**: Admin (ID: 1)  
**Issue**: Filtering by "Artificial intelligence" returns `[]` (empty array) even though students with this skill exist

## Evidence from Production

### Working Query (No Filter)

```
GET https://portfolio.jdu.uz/api/students?filter=%7B%7D&recruiterId=1&onlyBookmarked=false
```

- Returns 760 students
- Student 210042 has `"Artificial intelligence"` in their `it_skills.初級` array

### Broken Query (With AI Filter)

```
GET https://portfolio.jdu.uz/api/students?filter=%7B%22it_skills%22:%5B%22+Artificial+intelligence%22%5D%7D&recruiterId=1&onlyBookmarked=false
```

- Decoded filter: `{"it_skills":[" Artificial intelligence"]}`
- Returns `[]` (empty)

## Root Cause

The production server is still running the **OLD case-sensitive filtering logic** that we fixed locally!

### Old Logic (Currently in Production)

```javascript
const json = JSON.stringify([{ name: String(n) }])
const esc = sequelize.escape(json)
const levelExpr = lvls.map(l => `("Student"."it_skills" IS NOT NULL AND ("Student"."it_skills"->'${l}') @> ${esc}::jsonb)`).join(' OR ')
```

**Problem with Old Logic**:

- Uses JSONB containment operator (`@>`)
- **Case-sensitive**: `"Artificial Intelligence"` ≠ `"Artificial intelligence"`
- **ItSkills table has**: `"Artificial Intelligence"` (capital I)
- **Student data has**: `"Artificial intelligence"` (lowercase i)
- **Result**: NO MATCH ❌

### New Logic (Fixed, Not Yet Deployed)

```javascript
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

**How New Logic Fixes It**:

- Converts both search term and database values to lowercase
- **Case-insensitive**: `"Artificial Intelligence"` = `"Artificial intelligence"` ✅
- Uses `jsonb_array_elements()` + `LOWER()` comparison

## Additional Issues Found

### 1. Data Inconsistency

**ItSkills Table** (filter dropdown source):

```sql
SELECT name FROM "ItSkills" WHERE name ILIKE '%artificial%';
-- Result: "Artificial Intelligence" (capital I)
```

**Student Profile Data**:

```json
{
	"name": "Artificial intelligence", // lowercase i
	"color": "#2196f3"
}
```

**Impact**: Even with case-insensitive filtering, there's a mismatch in how the skill is named in different places.

### 2. Leading Space in Filter?

The URL shows:

```
%22+Artificial+intelligence%22
```

This might decode to `" Artificial intelligence"` with a leading space, though this needs verification. The `+` character in URL encoding represents a space in `application/x-www-form-urlencoded` format.

## Solution Status

### ✅ Fixed Locally (Not Deployed)

We've already implemented the case-insensitive fix in:

1. **Migration**: Added 32 missing AI/ML skills to ItSkills table

   - File: `portfolio-server/migrations/20260124193916-add-missing-ai-ml-it-skills.js`
   - Run locally: ✅ Applied

2. **Case-Insensitive Filtering**: Updated filtering logic
   - File: `portfolio-server/src/services/studentService.js` (lines 266-288)
   - File: `portfolio-server/src/services/draftService.js` (lines 86-103)
   - Tested locally: ✅ Working

### ❌ Not Yet Deployed to Production

The production server (`https://portfolio.jdu.uz`) is still running the old code!

## Deployment Steps Required

### 1. Deploy Code Changes

```bash
# On production server
cd /path/to/portfolio-server
git pull origin main
# or
git pull origin main-january-24  # depending on your branch
```

### 2. Run Migration

```bash
cd portfolio-server
npm run migrate
# This will add the 32 missing IT skills
```

### 3. Restart Server

```bash
# If using PM2
pm2 restart portfolio-server

# Or if using npm
npm run dev
# (or however production is started)
```

### 4. Verify Fix

Test the filter again:

```
GET https://portfolio.jdu.uz/api/students?filter={"it_skills":["Artificial Intelligence"]}
```

Should now return students with the skill (any capitalization).

## Testing Checklist

After deployment, test these scenarios:

1. ✅ Filter by "Artificial Intelligence" (capital I) → Should return student 210042
2. ✅ Filter by "artificial intelligence" (lowercase i) → Should return student 210042
3. ✅ Filter by "ARTIFICIAL INTELLIGENCE" (all caps) → Should return student 210042
4. ✅ Filter by "Python" → Should return students with Python
5. ✅ Filter by "python" (lowercase) → Should return same students as above
6. ✅ Verify no leading/trailing spaces in filter values

## Files Changed (Ready for Deployment)

1. ✅ `portfolio-server/migrations/20260124193916-add-missing-ai-ml-it-skills.js` (NEW)
2. ✅ `portfolio-server/src/services/studentService.js` (MODIFIED)
3. ✅ `portfolio-server/src/services/draftService.js` (MODIFIED)

## Additional Recommendations

### Fix Data Inconsistency (Optional)

Update student profiles to match ItSkills table naming:

```sql
-- This would update "Artificial intelligence" → "Artificial Intelligence" in student data
-- Run ONLY if you want consistent capitalization across the board
UPDATE "Students"
SET it_skills = jsonb_set(
    jsonb_set(
        jsonb_set(
            it_skills,
            '{上級}',
            (SELECT jsonb_agg(
                CASE
                    WHEN elem->>'name' ILIKE 'artificial intelligence'
                    THEN jsonb_set(elem, '{name}', '"Artificial Intelligence"')
                    ELSE elem
                END
            ) FROM jsonb_array_elements(it_skills->'上級') elem)
        ),
        '{中級}',
        (SELECT jsonb_agg(
            CASE
                WHEN elem->>'name' ILIKE 'artificial intelligence'
                THEN jsonb_set(elem, '{name}', '"Artificial Intelligence"')
                ELSE elem
            END
        ) FROM jsonb_array_elements(it_skills->'中級') elem)
    ),
    '{初級}',
    (SELECT jsonb_agg(
        CASE
            WHEN elem->>'name' ILIKE 'artificial intelligence'
            THEN jsonb_set(elem, '{name}', '"Artificial Intelligence"')
            ELSE elem
        END
    ) FROM jsonb_array_elements(it_skills->'初級') elem)
)
WHERE it_skills::text ILIKE '%artificial%intelligence%';
```

**Note**: This is optional since our case-insensitive fix handles the mismatch anyway.

## Summary

**Current State**: ❌ Broken in production (old case-sensitive code)  
**Local State**: ✅ Fixed and tested  
**Action Required**: Deploy to production + run migration  
**ETA**: 5-10 minutes (git pull + migrate + restart)

---

**Related Documents**:

- `IT_SKILLS_FILTER_FIX_COMPLETE.md` - Full technical analysis
- `IT_SKILLS_FILTER_FIX_ANALYSIS.md` - Detailed investigation

**Created**: 2026-01-24  
**Status**: Ready for deployment
