# Student Search Fields - Detailed Report

## Executive Summary

This report documents all database fields that are currently searched when a user enters text in the student search input field. The search functionality is implemented in the backend service layer (`portfolio-server/src/services/studentService.js`).

---

## 1. Searchable Fields Overview

When a user types in the search input field, the system searches across **8 database columns** with intelligent pattern matching based on the input type.

**Location**: `portfolio-server/src/services/studentService.js:264`

```javascript
const searchableColumns = [
	'email',
	'first_name',
	'last_name',
	'skills', // JSONB field
	'it_skills', // JSONB field
	'jlpt', // TEXT field (stores JSON string)
	'student_id',
	'partner_university',
]
```

**Note**: `self_introduction` and `hobbies` were removed from searchable columns to prevent false matches. These fields contain long text that could cause incorrect results when searching for specific terms (e.g., searching "N2" might match text in self-introduction instead of JLPT level).

---

## 2. Field-by-Field Analysis

### 2.1 Text Fields (Standard Substring Matching)

These fields use case-insensitive partial matching (`Op.iLike` with `%searchValue%`):

#### 2.1.1 Email (`email`)

- **Type**: STRING
- **Search Pattern**: `email ILIKE '%searchValue%'`
- **Example**: Searching "john" matches "john@example.com", "johnson@test.com"
- **Use Case**: Find students by email address

#### 2.1.2 First Name (`first_name`)

- **Type**: STRING
- **Search Pattern**: `first_name ILIKE '%searchValue%'`
- **Example**: Searching "taro" matches "Taro", "Tarou", "Taro Yamada"
- **Use Case**: Find students by first name

#### 2.1.3 Last Name (`last_name`)

- **Type**: STRING
- **Search Pattern**: `last_name ILIKE '%searchValue%'`
- **Example**: Searching "yamada" matches "Yamada", "Yamada Taro"
- **Use Case**: Find students by last name

#### 2.1.4 Partner University (`partner_university`)

- **Type**: STRING
- **Search Pattern**: `partner_university ILIKE '%searchValue%'`
- **Example**: Searching "東京" matches "東京通信大学"
- **Use Case**: Find students by their partner university name

---

### 2.2 JSONB Fields (Multi-Level Search)

These fields are stored as JSONB and searched across three skill levels: 上級 (Advanced), 中級 (Intermediate), 初級 (Beginner).

#### 2.2.1 Skills (`skills`)

- **Type**: JSONB
- **Structure**: `{"上級": [...], "中級": [...], "初級": [...]}`
- **Search Pattern**: Searches across all three levels using text casting
  ```sql
  (skills->'上級'::text ILIKE '%searchValue%' OR
   skills->'中級'::text ILIKE '%searchValue%' OR
   skills->'初級'::text ILIKE '%searchValue%')
  ```
- **Example**: Searching "JavaScript" matches if it appears in any skill level
- **Use Case**: Find students by their skills (language skills, soft skills, etc.)

#### 2.2.2 IT Skills (`it_skills`)

- **Type**: JSONB
- **Structure**: `{"上級": [{"name": "JavaScript"}], "中級": [...], "初級": [...]}`
- **Search Pattern**: Same as skills - searches across all three levels
  ```sql
  (it_skills->'上級'::text ILIKE '%searchValue%' OR
   it_skills->'中級'::text ILIKE '%searchValue%' OR
   it_skills->'初級'::text ILIKE '%searchValue%')
  ```
- **Example**: Searching "Python" matches if Python is listed in any IT skill level
- **Use Case**: Find students by programming languages or IT skills

---

### 2.3 Special Fields (Pattern-Based Matching)

#### 2.3.1 Student ID (`student_id`)

- **Type**: STRING
- **Search Pattern**: **Prefix matching** (`student_id ILIKE 'searchValue%'`)
- **Special Behavior**:
  - If search value is **purely numeric** (e.g., "2312"), **ONLY** searches `student_id` field
  - Uses prefix match instead of substring match for better performance
- **Example**:
  - Searching "2312" matches "23120001", "23120002" (prefix match)
  - Searching "2312" does NOT match "12312" (not a prefix)
- **Use Case**: Quick lookup by student ID

#### 2.3.2 JLPT (`jlpt`)

- **Type**: TEXT (stores JSON string like `{"highest":"N1"}`)
- **Search Pattern**:
  - **Special Case**: If search value matches JLPT pattern (`N1`, `N2`, `N3`, `N4`, `N5`), **ONLY** searches `jlpt` field
  - Uses exact matching for the "highest" level in JSON string
  ```sql
  jlpt ILIKE '%"highest":"N1"%' OR
  jlpt ILIKE '%"highest":"N1",%' OR
  jlpt ILIKE '%"highest":"N1"}%'
  ```
- **Example**:
  - Searching "N1" only searches JLPT field (prevents false matches)
  - Searching "N2" matches students with N2 as their highest JLPT level
- **Use Case**: Find students by JLPT level

---

## 3. Search Logic Flow

### 3.1 Pattern Detection

The search logic applies different strategies based on the input pattern:

```javascript
if (searchValue is purely numeric) {
  // Only search student_id with prefix match
  search: student_id ILIKE 'searchValue%'
}
else if (searchValue matches JLPT pattern: N1-N5) {
  // Only search jlpt field with exact matching
  search: jlpt ILIKE '%"highest":"N1"%'
}
else {
  // Search all 10 columns with substring matching
  search: (email OR first_name OR last_name OR ...) ILIKE '%searchValue%'
}
```

### 3.2 Search Query Construction

**Location**: `portfolio-server/src/services/studentService.js:285-342`

1. **Numeric Input** (e.g., "2312"):

   - Searches only: `student_id` with prefix match
   - Prevents false matches in other numeric fields

2. **JLPT Pattern** (e.g., "N1", "N2"):

   - Searches only: `jlpt` field
   - Matches exact JLPT level in JSON structure
   - Prevents "N1" from matching "N3" or appearing in other columns

3. **General Text** (e.g., "John", "programming"):
   - Searches all 8 columns using `Op.or` (OR logic)
   - Matches if search term appears in ANY of the columns
   - Uses substring matching for text fields
   - Uses text casting for JSONB fields (skills, it_skills)

---

## 4. Search Matching Details

### 4.1 Case Sensitivity

- **All searches are case-insensitive** using PostgreSQL's `ILIKE` operator
- Example: "JOHN" matches "john", "John", "JOHN"

### 4.2 Partial Matching

- **Substring matching** is used for most fields (wrapped with `%`)
- Example: "yam" matches "Yamada", "Yamamoto", "Yamashita"

### 4.3 Prefix Matching (Student ID)

- **Only student_id uses prefix matching** (no leading `%`)
- Example: "2312" matches "23120001" but not "12312"

### 4.4 JSONB Field Searching

- JSONB fields (`skills`, `it_skills`) are cast to text and searched
- Searches across all three levels: 上級, 中級, 初級
- Uses `::text` casting to enable text search on JSONB data

---

## 5. Fields NOT Currently Searched

The following student fields are **NOT** included in the search:

- `self_introduction` (removed - long text field causes false matches)
- `hobbies` (removed - long text field causes false matches)
- `date_of_birth` (age calculation field)
- `phone`
- `address`
- `gender`
- `semester`
- `faculty`
- `department`
- `student_status`
- `graduation_year` (only filterable, not searchable)
- `graduation_season`
- `partner_university_credits`
- `world_language_university_credits`
- `business_skills_credits`
- `japanese_employment_credits`
- `liberal_arts_education_credits`
- `specialized_education_credits`
- `total_credits`
- `jdu_japanese_certification` (only filterable, not searchable)
- `ielts` (only filterable, not searchable)
- `other_information` (only filterable, not searchable)
- `deliverables` (JSONB)
- `gallery` (JSONB)
- `photo` (file path)
- `kintone_id` (internal ID)

---

## 6. Performance Considerations

### 6.1 Indexing Recommendations

For optimal search performance, the following columns should have database indexes:

- `email` (unique index already exists)
- `first_name`
- `last_name`
- `student_id` (unique index already exists)
- `partner_university`
- `jlpt` (if frequently searched)

### 6.2 JSONB Search Performance

- JSONB fields (`skills`, `it_skills`) use text casting which may be slower
- Consider adding GIN indexes on JSONB columns for better performance
- Current implementation searches all three levels, which may impact performance on large datasets

---

## 7. Code References

### Backend Implementation

- **File**: `portfolio-server/src/services/studentService.js`
- **Method**: `getAllStudents(filter, recruiterId, onlyBookmarked, userType, sortOptions)`
- **Lines**: 264-342 (search logic)

### Frontend Implementation

- **File**: `portfolio-client/src/components/Filter/Filter.jsx`
- **Component**: Search input with debouncing (300ms)
- **File**: `portfolio-client/src/components/Table/Table.jsx`
- **Component**: Table that displays search results

---

## 8. Summary Table

| Field Name           | Type   | Search Pattern        | Special Behavior         |
| -------------------- | ------ | --------------------- | ------------------------ |
| `email`              | STRING | Substring (`%value%`) | Case-insensitive         |
| `first_name`         | STRING | Substring (`%value%`) | Case-insensitive         |
| `last_name`          | STRING | Substring (`%value%`) | Case-insensitive         |
| `skills`             | JSONB  | Text cast, 3 levels   | Searches 上級/中級/初級  |
| `it_skills`          | JSONB  | Text cast, 3 levels   | Searches 上級/中級/初級  |
| `jlpt`               | TEXT   | Exact JSON match      | Only if input is N1-N5   |
| `student_id`         | STRING | Prefix (`value%`)     | Only if input is numeric |
| `partner_university` | STRING | Substring (`%value%`) | Case-insensitive         |

---

**Report Generated**: Based on current codebase analysis  
**Last Updated**: Current implementation in `studentService.js:264-342`  
**Total Searchable Fields**: 8 database columns

---

## 9. Change History

### Removed Fields (2024)

- **`self_introduction`**: Removed from search to prevent false matches in long text fields
- **`hobbies`**: Removed from search to prevent false matches in long text fields

**Reason**: These fields contain long sentences that could cause incorrect search results. For example, searching "N2" might match text in self-introduction instead of the actual JLPT level field, leading to students with JLPT N2 being omitted from results.
