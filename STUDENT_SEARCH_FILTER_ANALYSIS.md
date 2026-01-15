# Student Search and Filter Analysis Report

## Executive Summary

This document provides a comprehensive analysis of how Recruiter, Admin, and Staff roles search and filter student data in both the frontend (`portfolio-client`) and backend (`portfolio-server`) codebases.

---

## 1. Overview of Search and Filter Architecture

### 1.1 Frontend Architecture

The search and filter functionality is implemented using two main components:

1. **`Filter` Component** (`portfolio-client/src/components/Filter/Filter.jsx`)

   - Handles user input for search and filter fields
   - Manages filter state persistence in `localStorage`
   - Provides autocomplete suggestions for student IDs
   - Debounces search input (300ms delay)

2. **`Table` Component** (`portfolio-client/src/components/Table/Table.jsx`)
   - Fetches data from backend API endpoints
   - Applies filters and sorting parameters
   - Displays results in table or grid view
   - Handles pagination

### 1.2 Backend Architecture

The backend implements a service-controller pattern:

1. **Controller Layer** (`portfolio-server/src/controllers/studentController.js`)

   - Parses HTTP request parameters (filter, recruiterId, onlyBookmarked, sortBy, sortOrder)
   - Validates user type (Recruiter, Admin, Staff)
   - Calls service layer methods

2. **Service Layer** (`portfolio-server/src/services/studentService.js`)
   - Constructs complex Sequelize WHERE clauses
   - Applies role-based access control (RBAC)
   - Handles JSONB queries for skills
   - Merges draft data with student profiles

---

## 2. Search Functionality

### 2.1 Search Input Fields

When a user enters text in the search input field, the system searches across the following database columns:

**Searchable Columns** (defined in `studentService.js:264`):

```javascript
const searchableColumns = [
	'email',
	'first_name',
	'last_name',
	'self_introduction',
	'hobbies',
	'skills', // JSONB field
	'it_skills', // JSONB field
	'jlpt', // TEXT field (often JSON string)
	'student_id',
]
```

### 2.2 Search Query Construction

The search uses **case-insensitive partial matching** (`Op.iLike`) across all searchable columns:

```264:310:portfolio-server/src/services/studentService.js
const searchableColumns = ['email', 'first_name', 'last_name', 'self_introduction', 'hobbies', 'skills', 'it_skills', 'jlpt', 'student_id']

// Helper to build JSONB @> conditions for it_skills across levels
const buildItSkillsCondition = (names = [], match = 'any') => {
	const lvls = ['上級', '中級', '初級']
	const safeNames = Array.isArray(names) ? names.filter(Boolean) : []
	if (safeNames.length === 0) return null

	const perSkill = safeNames.map(n => {
		// JSON array string for [{"name":"<n>"}]
		const json = JSON.stringify([{ name: String(n) }])
		const esc = sequelize.escape(json) // safe string with quotes
		const levelExpr = lvls.map(l => `(("Student"."it_skills"->'${l}') @> ${esc}::jsonb)`).join(' OR ')
		return `(${levelExpr})`
	})
	const joiner = match === 'all' ? ' AND ' : ' OR '
	return `(${perSkill.join(joiner)})`
}

Object.keys(filter).forEach(key => {
	if (filter[key]) {
		if (key === 'search') {
			const searchValue = String(filter[key])
			querySearch[Op.or] = searchableColumns.map(column => {
				if (['skills', 'it_skills'].includes(column)) {
					return {
						[Op.or]: [
							{
								[column]: {
									'上級::text': { [Op.iLike]: `%${searchValue}%` },
								},
							},
							{
								[column]: {
									'中級::text': { [Op.iLike]: `%${searchValue}%` },
								},
							},
							{
								[column]: {
									'初級::text': { [Op.iLike]: `%${searchValue}%` },
								},
							},
						],
					}
				}
				return { [column]: { [Op.iLike]: `%${searchValue}%` } }
			})
```

**Key Points:**

- Uses `Op.iLike` for case-insensitive partial matching (e.g., "john" matches "John", "Johnson")
- For JSONB fields (`skills`, `it_skills`), searches across three levels: `上級` (Advanced), `中級` (Intermediate), `初級` (Beginner)
- Uses `Op.or` to combine all column searches (matches if ANY column contains the search term)

### 2.3 Student ID Autocomplete

The frontend provides autocomplete suggestions for student IDs:

```140:159:portfolio-client/src/components/Filter/Filter.jsx
// Function to fetch student ID suggestions
const fetchStudentIdSuggestions = useCallback(
	async searchTerm => {
		if (!searchTerm.trim() || disableStudentIdSearch) return []

		try {
			const response = await axios.get(`/api/students/ids?search=${encodeURIComponent(searchTerm)}`)
			const data = response.data
			return data.map(student => ({
				label: student.display,
				field: 'search',
				type: 'student_id',
				value: student.student_id,
			}))
		} catch (error) {
			console.error('Error fetching student ID suggestions:', error)
			return []
		}
	},
	[disableStudentIdSearch]
)
```

**Backend Implementation** (`studentService.js:914-950`):

- Searches by `student_id`, `first_name`, or `last_name`
- Limits results to 10 suggestions
- Applies role-based visibility (Recruiters only see visible students)

---

## 3. Filter Functionality

### 3.1 Available Filter Fields

The filter system supports multiple field types:

#### 3.1.1 Programming Languages (IT Skills)

- **Field Key**: `it_skills`
- **Type**: Checkbox (multi-select)
- **Options**: Dynamically loaded from `/api/itskills` endpoint
- **Match Mode**: `any` (default) or `all` (controlled by `it_skills_match`)
- **Backend Query**: Uses JSONB `@>` operator to search across skill levels

**Difference between "Any" and "All":**

- **"Any" (OR logic)**: Student must have **at least ONE** of the selected programming languages. For example, if you select "JavaScript" and "Python", it will show students who have JavaScript OR Python (or both).
- **"All" (AND logic)**: Student must have **ALL** of the selected programming languages. For example, if you select "JavaScript" and "Python", it will only show students who have BOTH JavaScript AND Python.

```311:317:portfolio-server/src/services/studentService.js
} else if (key === 'it_skills') {
	const values = Array.isArray(filter[key]) ? filter[key] : [filter[key]]
	const match = filter.it_skills_match === 'all' ? 'all' : 'any'
	const expr = buildItSkillsCondition(values, match)
	if (expr) {
		queryOther[Op.and].push(sequelize.literal(expr))
	}
```

#### 3.1.2 JLPT Level

- **Field Key**: `jlpt`
- **Type**: Checkbox (multi-select)
- **Options**: `['N1', 'N2', 'N3', 'N4', 'N5']`
- **Backend Query**: Searches for JSON string pattern `%"highest":"N1"%` (matches highest level)

```346:354:portfolio-server/src/services/studentService.js
} else if (['jlpt', 'jdu_japanese_certification'].includes(key)) {
	if (Array.isArray(filter[key])) {
		// Match only the highest level inside stored JSON string e.g. {"highest":"N5"}
		queryOther[Op.and].push({
			[Op.or]: filter[key].map(level => ({
				[key]: { [Op.iLike]: `%"highest":"${level}"%` },
			})),
		})
	}
```

#### 3.1.3 JDU Japanese Certification

- **Field Key**: `jdu_japanese_certification`
- **Type**: Checkbox (multi-select)
- **Options**: `['Q1', 'Q2', 'Q3', 'Q4', 'Q5']`
- **Backend Query**: Same pattern as JLPT (searches for `%"highest":"Q1"%`)

#### 3.1.4 Partner University

- **Field Key**: `partner_university`
- **Type**: Checkbox (multi-select)
- **Options**:
  - Tokyo Communication University
  - Kyoto Tachibana University
  - Sanno University
  - Sanno Junior College
  - Niigata Sangyo University
  - Otemae University
  - Okayama University of Science
- **Backend Query**: Uses `Op.in` for array matching

```363:364:portfolio-server/src/services/studentService.js
} else if (Array.isArray(filter[key])) {
	queryOther[key] = { [Op.in]: filter[key] }
```

#### 3.1.5 Special Skills (Other Information)

- **Field Key**: `other_information`
- **Type**: Radio (single-select)
- **Options**: `['Yes', 'No']` (translated)
- **Backend Query**:
  - "Yes" → `{ [Op.ne]: null }` (field is not null)
  - "No" → `{ [Op.is]: null }` (field is null)

**Difference between "Yes" and "No":**

- **"Yes"**: Shows students who **have** special skills (the `other_information` field is not empty/null). These students have filled in additional information about their special skills or other qualifications.
- **"No"**: Shows students who **do not have** special skills (the `other_information` field is empty/null). These students have not provided any additional special skills information.

#### 3.1.6 Expected Graduation Year (卒業予定年)

- **Field Key**: `graduation_year`
- **Type**: Checkbox (multi-select)
- **Options**: Dynamically generated from current year to 5 years ahead (e.g., `['2025年', '2026年', '2027年', '2028年', '2029年', '2030年']`)
- **Backend Query**: Uses `Op.iLike` to match year in various formats:
  - Matches `graduation_year` field containing the year in formats like:
    - `"2025年12月"` (Japanese format)
    - `"2025-12-01"` (ISO date format)
    - `"2025"` (plain year)
- **Implementation**: Added in latest update to allow filtering students by their expected graduation year

```340:345:portfolio-server/src/services/studentService.js
} else if (key === 'other_information') {
	if (filter[key] === '有り') {
		queryOther['other_information'] = { [Op.ne]: null }
	} else if (filter[key] === '無し') {
		queryOther['other_information'] = { [Op.is]: null }
	}
```

### 3.2 Filter State Management

**Frontend** (`Filter.jsx`):

- Filter state is persisted in `localStorage` using a `persistKey` (e.g., `'students-filter-v1'`)
- State changes are debounced (500ms) before saving to `localStorage`
- Filter state is merged with default values on component mount

**Backend**:

- Filters are received as JSON in the `filter` query parameter
- Filters are parsed and validated in the controller
- Each filter key is processed individually to build WHERE clauses

---

## 4. Role-Based Access Control (RBAC)

### 4.1 Recruiter Role

**Visibility Restrictions:**

- Recruiters can only see students with `visibility: true`
- Applied in backend service:

```373:376:portfolio-server/src/services/studentService.js
query[Op.and] = [querySearch, queryOther, { active: true }]
if (normalizedUserType === 'recruiter') {
	query[Op.and].push({ visibility: true })
}
```

**Bookmark Functionality:**

- Recruiters can bookmark students
- Filter by bookmarked students using `onlyBookmarked: 'true'`
- Bookmark filter uses SQL EXISTS subquery:

```377:379:portfolio-server/src/services/studentService.js
if (onlyBookmarked === 'true' && recruiterId) {
	query[Op.and].push(sequelize.literal(`EXISTS (SELECT 1 FROM "Bookmarks" AS "Bookmark" WHERE "Bookmark"."studentId" = "Student"."id" AND "Bookmark"."recruiterId" = ${sequelize.escape(recruiterId)})`))
}
```

**Student ID Autocomplete:**

- Recruiters only see visible student IDs in autocomplete:

```930:933:portfolio-server/src/services/studentService.js
// Recruiters should only see public (visible) student IDs
if (normalizedRole === 'recruiter') {
	whereClause.visibility = true
}
```

### 4.2 Admin Role

**Full Access:**

- Admins can see all active students (no visibility restriction)
- Can view draft profiles and pending drafts
- Can toggle student visibility
- Can approve/reject student profile drafts

**Draft Profile Access:**

- Admins see merged draft data when viewing student profiles
- Draft data is merged if status is NOT 'draft':

```430:442:portfolio-server/src/services/studentService.js
// 4. DRAFT MA'LUMOTLARNI BIRLASHTIRISH (o'zgarishsiz qoladi)
const studentsWithDraftData = students.map(student => {
	const studentJson = student.toJSON()
	if (studentJson.draft && studentJson.draft.profile_data && studentJson.draft.status !== 'draft') {
		const draftData = studentJson.draft.profile_data
		const fieldsToMerge = ['deliverables', 'gallery', 'self_introduction', 'hobbies', 'hobbies_description', 'special_skills_description', 'other_information', 'it_skills', 'skills']
		fieldsToMerge.forEach(field => {
			if (draftData[field] !== undefined) {
				studentJson[field] = draftData[field]
			}
		})
	}
	return studentJson
})
```

### 4.3 Staff Role

**Similar to Admin:**

- Staff can see all active students
- Can view and review draft profiles
- Can approve/reject student profile drafts
- **Cannot** toggle student visibility (only Admin can)

**CheckProfile Page:**

- Staff and Admin use the `ChekProfile` component (`/checkprofile` route)
- This page shows draft profiles with additional filters:
  - Approval Status (`approval_status`)
  - Visibility Status (`visibility`)
  - Reviewer ID (`reviewerId`)

---

## 5. Filter Query Construction Flow

### 5.1 Frontend to Backend Flow

1. **User Input** → `Filter` component updates local state
2. **Debounce** → State changes are debounced (300ms for search, 500ms for localStorage)
3. **Parent Callback** → `onFilterChange` callback updates parent component state
4. **Table Component** → `Table` component receives updated filter state
5. **API Request** → `axios.get('/api/students', { params: { filter: filterState } })`
6. **Backend Controller** → Parses filter from query string
7. **Backend Service** → Constructs Sequelize WHERE clause
8. **Database Query** → Executes query with filters applied

### 5.2 Query Structure

The final WHERE clause structure:

```javascript
{
  [Op.and]: [
    querySearch,        // Search across multiple columns (Op.or)
    queryOther,         // Specific field filters (Op.and array)
    { active: true },   // Always filter active students
    { visibility: true } // If Recruiter role
  ]
}
```

**Example Query Breakdown:**

For a Recruiter searching for "John" with IT skills "JavaScript" and "Python" (any match):

```sql
WHERE (
  -- Search query (Op.or)
  (
    email ILIKE '%John%' OR
    first_name ILIKE '%John%' OR
    last_name ILIKE '%John%' OR
    ...
  )
  AND
  -- IT Skills filter (JSONB query)
  (
    (("Student"."it_skills"->'上級') @> '[{"name":"JavaScript"}]'::jsonb OR
     ("Student"."it_skills"->'中級') @> '[{"name":"JavaScript"}]'::jsonb OR
     ("Student"."it_skills"->'初級') @> '[{"name":"JavaScript"}]'::jsonb)
    OR
    (("Student"."it_skills"->'上級') @> '[{"name":"Python"}]'::jsonb OR
     ("Student"."it_skills"->'中級') @> '[{"name":"Python"}]'::jsonb OR
     ("Student"."it_skills"->'初級') @> '[{"name":"Python"}]'::jsonb)
  )
  AND
  active = true
  AND
  visibility = true
)
```

---

## 6. Sorting Functionality

### 6.1 Sortable Columns

The frontend supports sorting by:

- **Name** (`first_name`, `last_name`)
- **Student ID** (`student_id`)
- **Age** (`date_of_birth` - inverted for age calculation)
- **Email** (`email`)
- **Graduation Year** (`graduation_year`)

### 6.2 Sort Implementation

**Frontend** (`Table.jsx:84-117`):

- Clicking a sortable column header toggles sort order (ASC ↔ DESC)
- Sort parameters are sent to backend: `sortBy` and `sortOrder`

**Backend** (`studentService.js:381-407`):

- Maps frontend column names to database columns
- Special handling for age (inverts sort order since age = current_date - date_of_birth)
- Default sort: `student_id ASC`

```381:407:portfolio-server/src/services/studentService.js
// 2. SARALASH MANTIG'I (YANGI QISM)
let order = []
const { sortBy, sortOrder } = sortOptions
const validSortOrder = sortOrder && ['ASC', 'DESC'].includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'ASC'

// Frontend'dan kelgan nomni DB'dagi ustun nomiga o'girish (xavfsizlik uchun)
const columnMap = {
	name: ['first_name', 'last_name'], // Ism bo'yicha saralash uchun ikkita ustun
	student_id: ['student_id'],
	graduation_year: ['graduation_year'],
	age: ['date_of_birth'],
	email: ['email'],
}

const dbColumns = columnMap[sortBy]

if (dbColumns) {
	if (sortBy === 'age') {
		// Yosh bo'yicha o'sish tartibi -> tug'ilgan sana bo'yicha kamayish tartibi
		const ageSortOrder = validSortOrder === 'ASC' ? 'DESC' : 'ASC'
		order.push([dbColumns[0], ageSortOrder])
	} else {
		dbColumns.forEach(column => order.push([column, validSortOrder]))
	}
} else {
	order.push(['student_id', 'ASC']) // Standart saralash
}
```

---

## 7. Special Cases and Edge Cases

### 7.1 Draft Profile Merging

When a student has a draft profile:

- **Draft status = 'draft'**: Only visible to the student themselves
- **Draft status ≠ 'draft'**: Merged into main profile for Admin/Staff/Recruiter views
- Fields merged: `deliverables`, `gallery`, `self_introduction`, `hobbies`, `hobbies_description`, `special_skills_description`, `other_information`, `it_skills`, `skills`

### 7.2 Empty Filter State

- If no filters are applied, the query returns all active students (with role-based visibility restrictions)
- Empty arrays in filter state are ignored
- Empty strings are treated as no filter

### 7.3 Error Handling

**Frontend:**

- API errors are caught silently in `Table.jsx`
- Returns empty array on error (prevents UI crashes)
- Filter state persistence errors are logged but don't break functionality

**Backend:**

- Invalid filter format returns 400 error
- Database errors are caught and return empty array (200 status) for better UX
- Recruiter without `recruiterId` returns empty array

---

## 8. Performance Considerations

### 8.1 Frontend Optimizations

1. **Debouncing**: Search input is debounced (300ms) to reduce API calls
2. **localStorage Persistence**: Filter state is saved with 500ms debounce
3. **Virtualized Lists**: Large checkbox lists (>120 items) use `react-window` for virtualization
4. **Memoization**: Filter options and suggestions are memoized

### 8.2 Backend Optimizations

1. **Indexed Columns**: Searchable columns should have database indexes
2. **JSONB Queries**: Uses PostgreSQL JSONB operators (`@>`) for efficient skill matching
3. **Limit on Autocomplete**: Student ID suggestions limited to 10 results
4. **Query Optimization**: Uses `Op.and` and `Op.or` efficiently to minimize query complexity

---

## 9. API Endpoints

### 9.1 Student List Endpoint

**Endpoint**: `GET /api/students`

**Query Parameters:**

- `filter` (JSON string): Filter object with search and field filters
- `recruiterId` (number/string): Recruiter ID for bookmark filtering
- `onlyBookmarked` (string): `'true'` to show only bookmarked students
- `sortBy` (string): Column name to sort by
- `sortOrder` (string): `'ASC'` or `'DESC'`

**Response**: Array of student objects with merged draft data

### 9.2 Student ID Autocomplete Endpoint

**Endpoint**: `GET /api/students/ids`

**Query Parameters:**

- `search` (string): Search term for student ID/name

**Response**: Array of objects with `student_id`, `name`, and `display` fields

---

## 10. Summary

### 10.1 Search Fields Used

When entering text in the search input, the following fields are searched:

1. `email`
2. `first_name`
3. `last_name`
4. `self_introduction`
5. `hobbies`
6. `skills` (JSONB - searched across 上級/中級/初級 levels)
7. `it_skills` (JSONB - searched across 上級/中級/初級 levels)
8. `jlpt` (TEXT/JSON)
9. `student_id`

### 10.2 Filter Mechanism

Filters work by:

1. **Frontend**: User selects filter options → state updated → sent to backend as JSON
2. **Backend**: Filters parsed → WHERE clauses constructed → database queried
3. **Result**: Filtered students returned with role-based visibility applied

### 10.3 Role Differences

| Feature                 | Recruiter               | Admin               | Staff               |
| ----------------------- | ----------------------- | ------------------- | ------------------- |
| Visibility Filter       | `visibility: true` only | All active students | All active students |
| Bookmark                | ✅ Yes                  | ❌ No               | ❌ No               |
| Draft Review            | ❌ No                   | ✅ Yes              | ✅ Yes              |
| Toggle Visibility       | ❌ No                   | ✅ Yes              | ❌ No               |
| Student ID Autocomplete | Visible only            | All active          | All active          |

---

## 11. Code References

### Key Files

**Frontend:**

- `portfolio-client/src/pages/Student/Student.jsx` - Main student list page
- `portfolio-client/src/pages/ChekProfile/ChekProfile.jsx` - Draft review page (Admin/Staff)
- `portfolio-client/src/components/Filter/Filter.jsx` - Filter component
- `portfolio-client/src/components/Table/Table.jsx` - Table component

**Backend:**

- `portfolio-server/src/controllers/studentController.js` - HTTP request handlers
- `portfolio-server/src/services/studentService.js` - Business logic and query construction
- `portfolio-server/src/services/draftService.js` - Draft profile filtering logic

---

**Report Generated**: 2024
**Codebase Version**: Current
**Last Updated**: Based on latest codebase analysis
