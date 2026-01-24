# IT Skills Filter - Complete Production Fix

## Current Issues Identified

### 1. **Duplicate ItSkills Entries**

Your production database has TWO entries for the same skill:

- `"Artificial intelligence"` (lowercase 'i', color #2196f3)
- `"Artificial Intelligence"` (capital 'I', color #ff6f61)

### 2. **Case-Sensitive Filtering Code Not Deployed**

Production server is still running old case-sensitive code.

### 3. **Data Inconsistency**

Students have `"Artificial intelligence"` (lowercase) in their profiles, but filters might be using `"Artificial Intelligence"` (capital) from the dropdown.

## Complete Fix - Step by Step

### Step 1: Remove Duplicate ItSkills Entries

Connect to your production database and run:

\`\`\`sql
-- First, check for duplicates
SELECT
LOWER(name) as normalized_name,
COUNT(_) as count,
array_agg(name || ' (' || color || ')') as variations
FROM "ItSkills"
GROUP BY LOWER(name)
HAVING COUNT(_) > 1
ORDER BY count DESC;
\`\`\`

**Expected output will show**:
\`\`\`
normalized_name | count | variations
--------------------------+-------+------------------------------------------
artificial intelligence | 2 | {"Artificial intelligence (#2196f3)", "Artificial Intelligence (#ff6f61)"}
\`\`\`

Then **delete the duplicate** (keep the one from the migration we created):

\`\`\`sql
-- Delete the old lowercase version, keep the new capitalized one from our migration
DELETE FROM "ItSkills"
WHERE name = 'Artificial intelligence'
AND color = '#2196f3';

-- Verify only one remains
SELECT name, color
FROM "ItSkills"
WHERE name ILIKE '%artificial%intelligence%';
-- Should return: "Artificial Intelligence" | #ff6f61
\`\`\`

### Step 2: Deploy Case-Insensitive Code

\`\`\`bash

# SSH to production server

ssh your-production-server

# Navigate to project

cd /path/to/jduportfolio/portfolio-server

# Pull latest code

git pull origin main-january-24 # or your branch name

# Check the code was updated

grep -A 5 "buildItSkillsCondition" src/services/studentService.js | head -15

# Should show: "const skillName = String(n).toLowerCase()"

\`\`\`

### Step 3: Run Migrations

\`\`\`bash
cd /path/to/jduportfolio/portfolio-server
npm run migrate
\`\`\`

This will:

- Add the 32 missing AI/ML skills (including proper "Artificial Intelligence")
- The new entry will be created, but you'll need to manually delete the old duplicate

### Step 4: Restart Server

\`\`\`bash

# If using PM2

pm2 restart portfolio-server

# If using systemd

sudo systemctl restart portfolio-server

# Verify restart

pm2 logs portfolio-server # or check your logs
\`\`\`

### Step 5: Verify Fix

Test these URLs on production:

\`\`\`

# Test 1: Filter with capital I

https://portfolio.jdu.uz/api/students?filter={"it_skills":["Artificial Intelligence"]}

# Test 2: Filter with lowercase i (should work now!)

https://portfolio.jdu.uz/api/students?filter={"it_skills":["artificial intelligence"]}

# Test 3: Filter with all caps

https://portfolio.jdu.uz/api/students?filter={"it_skills":["ARTIFICIAL INTELLIGENCE"]}
\`\`\`

**All three should return student 210042 (Rinat Mambetlepesov) and student 210509 (Azizbek Safarov)!**

## Alternative: Quick Database Fix Without Migration

If you want to fix the duplicate issue immediately without running the full migration:

\`\`\`sql
-- Step 1: Update student profiles to use consistent capitalization
-- This updates all students' it_skills to use "Artificial Intelligence" (capital I)
UPDATE "Students"
SET it_skills = (
SELECT jsonb_object_agg(
level_key,
(
SELECT jsonb_agg(
CASE
WHEN elem->>'name' ILIKE 'artificial intelligence'
THEN jsonb_build_object('name', 'Artificial Intelligence', 'color', elem->>'color')
ELSE elem
END
)
FROM jsonb_array_elements(it_skills->level_key) AS elem
)
)
FROM (VALUES ('上級'), ('中級'), ('初級')) AS levels(level_key)
WHERE it_skills ? level_key
)
WHERE it_skills::text ILIKE '%artificial%intelligence%';

-- Step 2: Remove the old duplicate entry
DELETE FROM "ItSkills"
WHERE name = 'Artificial intelligence'
AND color = '#2196f3';

-- Step 3: Ensure the correct entry exists
INSERT INTO "ItSkills" (name, color, "createdAt", "updatedAt")
VALUES ('Artificial Intelligence', '#ff6f61', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Verify
SELECT student_id, first_name, last_name
FROM "Students"
WHERE (
it_skills->'上級' @> '[{"name": "Artificial Intelligence"}]'::jsonb OR
it_skills->'中級' @> '[{"name": "Artificial Intelligence"}]'::jsonb OR
it_skills->'初級' @> '[{"name": "Artificial Intelligence"}]'::jsonb
);
-- Should return students 210042, 210509, etc.
\`\`\`

## Why The Filter Wasn't Working

Looking at your database query results, students have:
\`\`\`json
{"name": "Artificial intelligence"} // lowercase 'i'
\`\`\`

But your ItSkills dropdown likely shows both:

- "Artificial intelligence" (old entry)
- "Artificial Intelligence" (new entry from migration)

**The problem**:

1. Old code uses case-sensitive matching with `@>` operator
2. When you select "Artificial intelligence" from filter → Case must match EXACTLY
3. If you select "Artificial Intelligence" (capital I) → No match because students have lowercase 'i'
4. Result: Empty array `[]` ❌

**After the fix**:

1. New code uses case-insensitive matching with `LOWER()`
2. Any capitalization will work ✅
3. Duplicates removed → consistent data ✅

## Summary

**Current state**: ❌ Broken (old code + duplicate data)  
**Required actions**:

1. ✅ Remove duplicate ItSkills entries
2. ✅ Deploy case-insensitive code
3. ✅ Run migration
4. ✅ Restart server

**ETA**: 10-15 minutes

---

**Created**: 2026-01-24  
**Status**: Action required (manual deployment)
