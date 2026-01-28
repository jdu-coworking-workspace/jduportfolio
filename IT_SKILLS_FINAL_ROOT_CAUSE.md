# IT Skills Filter - Final Root Cause & Solution

**Date**: 2026-01-24  
**Status**: ✅ Case-insensitive code is WORKING | ❌ Leading spaces in database

---

## 🎯 Root Cause Discovered!

### **The Real Problem: Leading Spaces in ItSkills Table**

When you manually type the URL:

```
https://portfolio.jdu.uz/api/students?filter={%22it_skills%22:[%22Artificial%20intelligence%22]}
```

Result: ✅ **Returns 13 students** (210042, 211109, 211171, etc.)

When the frontend sends the URL:

```
https://portfolio.jdu.uz/api/students?filter=%7B%22it_skills%22:%5B%22+Artificial+intelligence%22%5D%7D
```

Decoded: `{"it_skills":[" Artificial intelligence"]}` ← **NOTE THE LEADING SPACE!**  
Result: ❌ **Returns empty array `[]`**

---

## Why This Happens

1. **ItSkills table** (production database) has entries with **leading spaces**:

   ```sql
   name: " Artificial intelligence"  ← Has leading space!
   length: 24 characters (should be 23)
   ```

2. Frontend fetches skills from `/api/itskills` → Gets `" Artificial intelligence"` (with space)

3. User selects it from dropdown → Filter sends `" Artificial intelligence"` (with space)

4. Backend searches for: `" Artificial intelligence"` (with space)

5. Student data has: `"Artificial intelligence"` (NO space)

6. Result: **NO MATCH** ❌

---

## ✅ Solution

### Step 1: Fix Leading/Trailing Spaces in Database

Run this SQL on **production database**:

```sql
-- Check for spaces
SELECT
    id,
    '|' || name || '|' as name_with_pipes,  -- Shows spaces clearly
    LENGTH(name) as length,
    color
FROM "ItSkills"
WHERE name != TRIM(name);

-- Fix spaces in ItSkills table
UPDATE "ItSkills"
SET name = TRIM(name),
    "updatedAt" = NOW()
WHERE name != TRIM(name);

-- Fix spaces in student profiles
UPDATE "Students"
SET it_skills = (
    SELECT jsonb_object_agg(
        level,
        (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'name', TRIM(skill->>'name'),
                    'color', skill->>'color'
                )
            )
            FROM jsonb_array_elements(it_skills->level) AS skill
        )
    )
    FROM (VALUES ('上級'), ('中級'), ('初級')) AS levels(level)
    WHERE it_skills ? level
)
WHERE it_skills IS NOT NULL
  AND it_skills::text ~ '"\s+\w+';

-- Verify
SELECT name, LENGTH(name), color
FROM "ItSkills"
WHERE LOWER(name) = 'artificial intelligence';
-- Should show: "Artificial intelligence" (23 chars, no space)
```

**Full script**: `/portfolio-server/scripts/fix-itskills-spaces.sql`

---

### Step 2: Remove Duplicates (Optional)

After trimming, you might have exact duplicates:

```sql
-- Check for duplicates
SELECT
    LOWER(TRIM(name)) as normalized,
    COUNT(*),
    array_agg(id || ': ' || name) as entries
FROM "ItSkills"
GROUP BY LOWER(TRIM(name))
HAVING COUNT(*) > 1;

-- Delete duplicates (keep newest)
DELETE FROM "ItSkills" a
USING "ItSkills" b
WHERE a.id < b.id
  AND LOWER(TRIM(a.name)) = LOWER(TRIM(b.name));
```

---

## ✅ Verify Fix Works

After running the SQL fixes, test again:

```bash
# All three should return the SAME 13+ students:

# Test 1
curl "https://portfolio.jdu.uz/api/students?filter={%22it_skills%22:[%22Artificial%20intelligence%22]}"

# Test 2
curl "https://portfolio.jdu.uz/api/students?filter={%22it_skills%22:[%22Artificial%20Intelligence%22]}"

# Test 3
curl "https://portfolio.jdu.uz/api/students?filter={%22it_skills%22:[%22ARTIFICIAL%20INTELLIGENCE%22]}"
```

Expected: All return students 210042, 211109, 211171, 211548, 214843, 215131, 220084, 220708, 224246, 224845, 224928, 2313123, etc.

---

## Summary

**✅ Good News**: Case-insensitive filtering IS already working on production!  
**❌ Bad News**: ItSkills table has leading spaces, causing mismatches  
**💡 Solution**: Run SQL to trim spaces from skill names (5 minute fix)

---

## Files Created

1. ✅ `IT_SKILLS_ROOT_CAUSE_SOLUTION.md` - Complete analysis
2. ✅ `portfolio-server/scripts/fix-itskills-spaces.sql` - SQL fix script
3. ✅ `IT_SKILLS_FINAL_ROOT_CAUSE.md` - This summary (you are here)

---

**Ready to fix?** Just run the SQL script on production database! 🚀
