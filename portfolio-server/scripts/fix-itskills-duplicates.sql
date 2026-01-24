-- ==============================================================================
-- IT Skills Duplicate Cleanup Script
-- ==============================================================================
-- Purpose: Remove duplicate ItSkills entries that differ only in capitalization
-- Database: Production (verceldb_restore)
-- Date: 2026-01-24
-- ==============================================================================

-- STEP 1: Identify ALL duplicates (case-insensitive)
-- ==============================================================================
SELECT 
    LOWER(name) as normalized_name,
    COUNT(*) as duplicate_count,
    string_agg(name || ' (color: ' || color || ', id: ' || id || ')', ' | ') as variations
FROM "ItSkills"
GROUP BY LOWER(name)
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, normalized_name;

-- ==============================================================================
-- STEP 2: Check how many students use each variation
-- ==============================================================================
-- For "Artificial intelligence" vs "Artificial Intelligence"
SELECT 
    'Lowercase (artificial intelligence)' as variation,
    COUNT(*) as student_count
FROM "Students"
WHERE it_skills::text ILIKE '%"artificial intelligence"%'
    AND it_skills::text NOT ILIKE '%"Artificial Intelligence"%'
UNION ALL
SELECT 
    'Capitalized (Artificial Intelligence)' as variation,
    COUNT(*) as student_count  
FROM "Students"
WHERE it_skills::text ILIKE '%"Artificial Intelligence"%'
    AND it_skills::text NOT ILIKE '%"artificial intelligence"%'
UNION ALL
SELECT 
    'Both (mixed case)' as variation,
    COUNT(*) as student_count
FROM "Students"
WHERE it_skills::text ILIKE '%"artificial intelligence"%'
    AND it_skills::text ILIKE '%"Artificial Intelligence"%';

-- ==============================================================================
-- STEP 3: Standardize student data (UPDATE to consistent capitalization)
-- ==============================================================================
-- WARNING: This updates student profiles! Test on a backup first!
-- This will change all "Artificial intelligence" → "Artificial Intelligence"

BEGIN;

-- Show what will be updated
SELECT 
    student_id,
    first_name,
    last_name,
    'Has lowercase AI skill' as status
FROM "Students"
WHERE it_skills::text ILIKE '%"Artificial intelligence"%'
ORDER BY student_id;

-- Uncomment the following UPDATE to actually change the data:
/*
UPDATE "Students"
SET it_skills = (
    -- Process each level (上級, 中級, 初級)
    SELECT jsonb_object_agg(level_key, updated_skills)
    FROM (
        SELECT 
            level_key,
            COALESCE(
                (
                    SELECT jsonb_agg(
                        CASE 
                            WHEN elem->>'name' = 'Artificial intelligence'
                            THEN jsonb_build_object(
                                'name', 'Artificial Intelligence',
                                'color', elem->>'color'
                            )
                            ELSE elem
                        END
                    )
                    FROM jsonb_array_elements(it_skills->level_key) AS elem
                ),
                it_skills->level_key
            ) as updated_skills
        FROM (VALUES ('上級'), ('中級'), ('初級')) AS levels(level_key)
        WHERE it_skills ? level_key
    ) subquery
)
WHERE it_skills::text ILIKE '%"Artificial intelligence"%';
*/

-- If you ran the UPDATE, verify changes:
SELECT 
    student_id,
    first_name,
    last_name,
    it_skills->'初級' as beginner_skills
FROM "Students"
WHERE it_skills::text ILIKE '%"Artificial Intelligence"%'
ORDER BY student_id;

-- ROLLBACK; -- Uncomment to undo changes
-- COMMIT; -- Uncomment to save changes

-- ==============================================================================
-- STEP 4: Remove duplicate ItSkills entries
-- ==============================================================================

BEGIN;

-- Show which entries will be deleted
SELECT 
    id,
    name,
    color,
    'Will be deleted' as action
FROM "ItSkills"
WHERE name = 'Artificial intelligence';  -- lowercase version

-- Uncomment to actually delete:
/*
DELETE FROM "ItSkills" 
WHERE name = 'Artificial intelligence'  -- Keep "Artificial Intelligence" (capital I)
AND color = '#2196f3';
*/

-- Verify only one remains
SELECT 
    id,
    name,
    color,
    "createdAt"
FROM "ItSkills"
WHERE LOWER(name) = 'artificial intelligence';
-- Should show only one entry: "Artificial Intelligence"

-- ROLLBACK; -- Uncomment to undo
-- COMMIT; -- Uncomment to save

-- ==============================================================================
-- STEP 5: Verify filtering works with case-insensitive search
-- ==============================================================================
-- This simulates what the new backend code will do

-- Test: Find students with "Artificial Intelligence" (any case)
SELECT 
    student_id,
    first_name,
    last_name,
    'Has AI skill' as match_type
FROM "Students"
WHERE (
    EXISTS (
        SELECT 1 
        FROM jsonb_array_elements(it_skills->'上級') AS elem
        WHERE LOWER(elem->>'name') = 'artificial intelligence'
    ) OR
    EXISTS (
        SELECT 1 
        FROM jsonb_array_elements(it_skills->'中級') AS elem
        WHERE LOWER(elem->>'name') = 'artificial intelligence'
    ) OR
    EXISTS (
        SELECT 1 
        FROM jsonb_array_elements(it_skills->'初級') AS elem
        WHERE LOWER(elem->>'name') = 'artificial intelligence'
    )
)
AND active = true
ORDER BY student_id;

-- Expected: Should return students 210042, 210509, etc.

-- ==============================================================================
-- STEP 6: Find OTHER potential duplicate skills
-- ==============================================================================
SELECT 
    LOWER(name) as normalized_name,
    array_agg(DISTINCT name) as variations,
    COUNT(DISTINCT name) as variation_count
FROM "ItSkills"
GROUP BY LOWER(name)
HAVING COUNT(DISTINCT name) > 1
ORDER BY variation_count DESC;

-- ==============================================================================
-- COMPLETE CLEANUP (Run all steps at once - USE WITH CAUTION!)
-- ==============================================================================
/*
BEGIN;

-- 1. Standardize student data
UPDATE "Students"
SET it_skills = (
    SELECT jsonb_object_agg(level_key, updated_skills)
    FROM (
        SELECT 
            level_key,
            COALESCE(
                (
                    SELECT jsonb_agg(
                        CASE 
                            WHEN elem->>'name' = 'Artificial intelligence'
                            THEN jsonb_build_object('name', 'Artificial Intelligence', 'color', elem->>'color')
                            ELSE elem
                        END
                    )
                    FROM jsonb_array_elements(it_skills->level_key) AS elem
                ),
                it_skills->level_key
            ) as updated_skills
        FROM (VALUES ('上級'), ('中級'), ('初級')) AS levels(level_key)
        WHERE it_skills ? level_key
    ) subquery
)
WHERE it_skills::text ILIKE '%"Artificial intelligence"%';

-- 2. Remove lowercase duplicate
DELETE FROM "ItSkills" 
WHERE name = 'Artificial intelligence' AND color = '#2196f3';

-- 3. Verify
SELECT 'Students with AI skill:' as status, COUNT(*) as count
FROM "Students"
WHERE it_skills::text ILIKE '%Artificial Intelligence%';

SELECT 'ItSkills entries:' as status, COUNT(*) as count
FROM "ItSkills"
WHERE LOWER(name) = 'artificial intelligence';

COMMIT;
*/

-- ==============================================================================
-- End of script
-- ==============================================================================
