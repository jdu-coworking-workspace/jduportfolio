-- ==============================================================================
-- Fix Leading/Trailing Spaces in ItSkills Table
-- ==============================================================================
-- Purpose: Remove leading and trailing spaces from skill names
-- Database: Production (verceldb_restore)
-- Date: 2026-01-24
-- ==============================================================================

-- STEP 1: Identify skills with leading/trailing spaces
-- ==============================================================================
SELECT 
    id,
    name,
    LENGTH(name) as name_length,
    LENGTH(TRIM(name)) as trimmed_length,
    LENGTH(name) - LENGTH(TRIM(name)) as space_count,
    color,
    CASE 
        WHEN name != TRIM(name) THEN 'HAS SPACES'
        ELSE 'CLEAN'
    END as status
FROM "ItSkills"
WHERE name != TRIM(name)
ORDER BY name;

-- ==============================================================================
-- STEP 2: Preview what will be updated
-- ==============================================================================
SELECT 
    id,
    '''' || name || '''' as current_name,  -- Shows with quotes to see spaces
    '''' || TRIM(name) || '''' as trimmed_name,
    color
FROM "ItSkills"
WHERE name != TRIM(name);

-- ==============================================================================
-- STEP 3: Fix leading/trailing spaces in ItSkills table
-- ==============================================================================
BEGIN;

-- Update skill names to remove leading/trailing spaces
UPDATE "ItSkills"
SET name = TRIM(name),
    "updatedAt" = NOW()
WHERE name != TRIM(name);

-- Show what was updated
SELECT 
    id,
    name,
    color,
    'Updated' as status
FROM "ItSkills"
WHERE "updatedAt" > NOW() - INTERVAL '1 minute';

-- ROLLBACK; -- Uncomment to undo
COMMIT; -- Uncomment to save

-- ==============================================================================
-- STEP 4: Update student profiles to match trimmed skill names
-- ==============================================================================
-- This will update any student it_skills that have leading/trailing spaces

BEGIN;

-- Show students affected
SELECT 
    student_id,
    first_name,
    last_name,
    'Has skills with spaces' as status
FROM "Students"
WHERE it_skills::text LIKE '% Artificial intelligence%'
   OR it_skills::text LIKE '%Artificial intelligence %';

-- Update function to trim skill names in JSONB
CREATE OR REPLACE FUNCTION trim_skill_names(skills jsonb) 
RETURNS jsonb AS $$
DECLARE
    level_key text;
    result jsonb := '{}'::jsonb;
    trimmed_skills jsonb;
BEGIN
    -- Loop through each level (上級, 中級, 初級)
    FOR level_key IN SELECT jsonb_object_keys(skills) LOOP
        -- Trim each skill name in the level array
        SELECT jsonb_agg(
            jsonb_build_object(
                'name', TRIM(elem->>'name'),
                'color', elem->>'color'
            )
        ) INTO trimmed_skills
        FROM jsonb_array_elements(skills->level_key) AS elem;
        
        -- Add to result
        result := result || jsonb_build_object(level_key, trimmed_skills);
    END LOOP;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Update all students with trimmed skill names
UPDATE "Students"
SET it_skills = trim_skill_names(it_skills),
    "updatedAt" = NOW()
WHERE it_skills IS NOT NULL
  AND it_skills != 'null'::jsonb
  AND it_skills::text ~ '\s["\{]name["\}]\s*:\s*["\{]\s+\w+'; -- Has spaces in skill names

-- Drop the temporary function
DROP FUNCTION IF EXISTS trim_skill_names(jsonb);

-- ROLLBACK; -- Uncomment to undo
COMMIT; -- Uncomment to save

-- ==============================================================================
-- STEP 5: Verify the fix
-- ==============================================================================

-- Check for any remaining spaces
SELECT 
    id,
    name,
    LENGTH(name) as length,
    color
FROM "ItSkills"
WHERE name != TRIM(name);
-- Should return 0 rows

-- Test the filter with exact name
SELECT 
    student_id,
    first_name,
    last_name
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
-- Should return students 210042, 210509, 211109, 211171, etc.

-- ==============================================================================
-- End of script
-- ==============================================================================
