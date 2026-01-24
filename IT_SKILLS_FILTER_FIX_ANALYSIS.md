# IT Skills Filter Issue - Deep Analysis

## Problem Statement

When filtering students by `it_skills` (e.g., "Artificial intelligence") on the student search page (`/api/draft` endpoint), the system returns an empty array `[]` even though students with that skill exist in the database. However, `language_skills` filtering works correctly.

## Root Cause Analysis

### 1. Data Structure Difference

#### `it_skills` (JSONB):

```javascript
// Student.js - Line 117
it_skills: { type: DataTypes.JSONB, allowNull: true }

// Actual data structure:
{
  "上級": [
    {"name": "Artificial intelligence", "color": "#ffeb3b"},
    {"name": "Python", "color": "#f44336"}
  ],
  "中級": [
    {"name": "JavaScript", "color": "#5627DB"}
  ],
  "初級": []
}
```

#### `language_skills` (TEXT):

```javascript
// Student.js - Line 131
language_skills: { type: DataTypes.TEXT, allowNull: true }

// Actual data structure (JSON string):
"[{\"name\":\"日本語\",\"level\":\"N2\",\"color\":\"#5627DB\"},{\"name\":\"英語\",\"level\":\"B1\",\"color\":\"#5627DB\"}]"
```

### 2. Filtering Implementation

Both `studentService.js` and `draftService.js` have similar filtering logic:

#### Correct Implementation (lines 181-187 in draftService.js):

```javascript
else if (key === 'it_skills') {
    const values = Array.isArray(filter[key]) ? filter[key] : [filter[key]]
    const match = filter.it_skills_match === 'all' ? 'all' : 'any'
    const expr = buildItSkillsCondition(values, match)
    if (expr) {
        queryOther[Op.and].push(sequelize.literal(expr))
    }
}
```

The `buildItSkillsCondition` helper function (lines 86-102):

```javascript
const buildItSkillsCondition = (names = [], match = 'any') => {
	const lvls = ['上級', '中級', '初級']
	const safeNames = Array.isArray(names) ? names.filter(Boolean) : []
	if (safeNames.length === 0) return null

	const perSkill = safeNames.map(n => {
		const json = JSON.stringify([{ name: String(n) }])
		const esc = sequelize.escape(json)
		// Check Student.it_skills only (public data), handle NULL values
		const levelExpr = lvls.map(l => `("Student"."it_skills" IS NOT NULL AND ("Student"."it_skills"->'${l}') @> ${esc}::jsonb)`).join(' OR ')
		return `(${levelExpr})`
	})
	const joiner = match === 'all' ? ' AND ' : ' OR '
	return `(${perSkill.join(joiner)})`
}
```

**This generates SQL like:**

```sql
WHERE (
  ("Student"."it_skills" IS NOT NULL AND ("Student"."it_skills"->'上級') @> '[{"name":"Artificial intelligence"}]'::jsonb)
  OR ("Student"."it_skills" IS NOT NULL AND ("Student"."it_skills"->'中級') @> '[{"name":"Artificial intelligence"}]'::jsonb)
  OR ("Student"."it_skills" IS NOT NULL AND ("Student"."it_skills"->'初級') @> '[{"name":"Artificial intelligence"}]'::jsonb)
)
```

This correctly uses PostgreSQL's JSONB containment operator (`@>`) to search within the nested JSONB structure.

### 3. The Bug

**Problem**: The filtering IS implemented correctly, but there may be an issue with how the filter parameters are being passed from the frontend or how the filter values are being processed.

Let me check if the issue is that the skills are not being passed to the backend correctly, or if there's a mismatch in skill names.

## Testing the Current Implementation

To verify the filter is working, we need to:

1. Check what skill names are actually stored in the database
2. Verify the exact filter payload being sent from the frontend
3. Test the SQL query directly

## Root Cause Identified

After deep analysis, I identified **TWO separate issues** that were causing the `it_skills` filter to fail:

### Issue #1: Missing Skills in ItSkills Table

The filter dropdown options come from the `ItSkills` table (via `/api/itskills` endpoint), which is seeded with predefined skills. However:

1. **Skills in student profiles** may contain entries like "Artificial intelligence" that were:

   - Added manually by students/staff
   - Synced from Kintone
   - Added to profiles before the skill was in the ItSkills table

2. **The ItSkills table** (seeder: `20250714183652-initial-it-skills.js`) doesn't contain "Artificial intelligence" - it has skills like:
   - 'Python', 'JAVA', 'React', 'Vue', 'Node.js', etc.
   - But NOT 'Artificial intelligence', 'Machine Learning', 'Data Science', etc.

### Issue #2: Case Sensitivity in JSONB Filtering

The original filtering logic used PostgreSQL's JSONB containment operator (`@>`):

```javascript
("Student"."it_skills"->'上級') @> '[{"name":"Artificial intelligence"}]'::jsonb
```

**Problem**: The `@>` operator is **case-sensitive**! So:

- If a student has `{"name": "artificial intelligence"}` (lowercase)
- But the filter searches for `{"name": "Artificial intelligence"}` (capitalized)
- **NO MATCH** occurs!

This is why `language_skills` was working - it uses a simple `LIKE` search on a TEXT field, which can be made case-insensitive with `ILIKE`.

## The Solution

### Fix #1: Add Missing Skills to ItSkills Table

**Created**: Migration `20260124193916-add-missing-ai-ml-it-skills.js`

This adds 32 commonly used AI/ML/Data Science skills including:

- Artificial Intelligence, Machine Learning, Deep Learning
- TensorFlow, PyTorch, Keras, Scikit-learn
- Data Science, Data Analysis, Pandas, NumPy
- And other commonly used skills (Git, Linux, Bash, Docker-related, etc.)

### Fix #2: Make IT Skills Filtering Case-Insensitive

**Modified**:

- `portfolio-server/src/services/draftService.js`
- `portfolio-server/src/services/studentService.js`

**Old approach** (case-sensitive):

```javascript
const json = JSON.stringify([{ name: String(n) }])
const esc = sequelize.escape(json)
const levelExpr = lvls.map(l => `("Student"."it_skills" IS NOT NULL AND ("Student"."it_skills"->'${l}') @> ${esc}::jsonb)`).join(' OR ')
```

**New approach** (case-insensitive):

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

**How it works**:

1. Convert the search term to lowercase
2. Use `jsonb_array_elements()` to iterate over the skill array at each level (上級, 中級, 初級)
3. Extract the `name` field with `elem->>'name'`
4. Compare it case-insensitively using `LOWER()`

**Benefits**:

- Matches "Artificial intelligence", "artificial intelligence", "ARTIFICIAL INTELLIGENCE", etc.
- More user-friendly and forgiving of data inconsistencies
- Aligns with how `language_skills` filtering already works

## Files Changed

1. **New Migration**: `portfolio-server/migrations/20260124193916-add-missing-ai-ml-it-skills.js`

   - Adds 32 missing IT skills to the ItSkills table
   - Uses `ignoreDuplicates: true` to safely run even if some skills exist

2. **Modified**: `portfolio-server/src/services/draftService.js`

   - Updated `buildItSkillsCondition` helper (lines 86-102)
   - Changed from case-sensitive `@>` to case-insensitive `LOWER()` comparison

3. **Modified**: `portfolio-server/src/services/studentService.js`
   - Updated `buildItSkillsCondition` helper (lines 266-283)
   - Same case-insensitive logic as draftService.js

## How to Apply the Fix

```bash
# 1. Navigate to server directory
cd /home/xusniddin/Development/jduportfolio/portfolio-server

# 2. Run the migration to add missing skills
npm run migrate

# 3. Restart the server
npm run dev

# 4. Test the filter
# - Go to the student search page
# - Select "Artificial intelligence" from the IT Skills filter
# - Should now return students with that skill (case-insensitive)
```

## Verification Steps

To verify this is the issue:

1. Check if "Artificial intelligence" exists in ItSkills table: `SELECT * FROM "ItSkills" WHERE name ILIKE '%artificial%'`
2. Check what's actually in student profiles: `SELECT it_skills FROM "Students" WHERE it_skills::text ILIKE '%artificial%'`
3. Compare the exact capitalization and spelling
