# recruiterId and onlyBookmarked Parameters Analysis

## Problem Statement

When logged in as **Admin** and visiting the student search page (ChekProfile), the API request includes parameters that seem specific to recruiters:

```
https://portfolio.jdu.uz/api/draft?filter=%7B%22search%22:%22%22,%22reviewerId%22:null%7D&recruiterId=1&onlyBookmarked=false
```

**Question**: Why are `recruiterId=1` and `onlyBookmarked=false` being sent when the user is an Admin?

## Deep Analysis

### Frontend Code Flow

#### 1. ChekProfile.jsx (Student Search Page)

**File**: `portfolio-client/src/pages/ChekProfile/ChekProfile.jsx`

**Key Lines**:

```javascript
// Line 32: Get userId from session storage
const userId = JSON.parse(sessionStorage.getItem('loginUser')).id

// Lines 377-385: Table props configuration
const tableProps = {
	headers: headers,
	dataLink: '/api/draft',
	filter: filterState,
	recruiterId: userId, // ⚠️ ALWAYS passes userId
	OnlyBookmarked: OnlyBookmarked, // ⚠️ From component prop (defaults to false)
	updateDraftStatusWithComments: updateDraftStatusWithComments,
	userRole: role,
}
```

**Issue Found**:

- **Line 381**: `recruiterId: userId` - This **always** passes the current user's ID, regardless of their role
- **Line 382**: `OnlyBookmarked: OnlyBookmarked` - Defaults to `false` from component props (line 13)

The component was originally designed with recruiters in mind but is now being reused for Admin/Staff views.

#### 2. Table.jsx Component

**File**: `portfolio-client/src/components/Table/Table.jsx`

**Lines 181-195**:

```javascript
const fetchUserData = useCallback(
	signal => {
		setLoading(true)

		const params = {
			filter: tableProps.filter,
			recruiterId: tableProps.recruiterId, // ⚠️ Always included
			onlyBookmarked: tableProps.OnlyBookmarked, // ⚠️ Always included
		}

		if (sortBy && sortOrder) {
			params.sortBy = sortBy
			params.sortOrder = sortOrder
		}
		// ...sends to API
	},
	[tableProps.filter, tableProps.recruiterId, tableProps.OnlyBookmarked]
)
```

**Issue**: The Table component blindly passes `recruiterId` and `onlyBookmarked` to the API without checking if they're needed for the current user role.

### Backend Code Flow

#### 1. Draft Routes

**File**: `portfolio-server/src/routes/drafts-route.js`

**Line 16**:

```javascript
.get(DraftController.getAllDrafts)
```

This maps `GET /api/draft` to the `getAllDrafts` controller method.

#### 2. Draft Controller

**File**: `portfolio-server/src/controllers/draftController.js`

**Lines 302-331**:

```javascript
static async getAllDrafts(req, res, next) {
    try {
        let filter = {}

        // Handle filter parameter
        if (req.query.filter) {
            // ... parse filter
        }

        console.log('Parsed filter:', filter)

        // ⚠️ PROBLEM: Only uses filter, ignores recruiterId and onlyBookmarked
        const students = await DraftService.getAll(filter)
        return res.status(200).json(students)
    } catch (error) {
        console.error('getAllDrafts error:', error)
        next(error)
    }
}
```

**Critical Finding**:

- The `getAllDrafts` method **completely ignores** `recruiterId` and `onlyBookmarked` parameters
- It only extracts and uses the `filter` parameter
- The parameters are being sent but **never used**!

#### 3. Draft Service

**File**: `portfolio-server/src/services/draftService.js`

**Lines 29-318**:

```javascript
static async getAll(filter) {
    // Only receives filter parameter
    // No recruiterId or onlyBookmarked handling
    // ...
}
```

**Confirmed**: The service method signature doesn't even accept `recruiterId` or `onlyBookmarked`.

### Comparison: Student Search (/api/students)

For contrast, let's look at how `/api/students` endpoint handles these parameters:

**File**: `portfolio-server/src/controllers/studentController.js`

**Lines 180-191**:

```javascript
const recruiterId = req.query.recruiterId
const onlyBookmarked = req.query.onlyBookmarked

const { sortBy, sortOrder } = req.query
const sortOptions = { sortBy, sortOrder }

if (userType === 'Recruiter' && !recruiterId) {
	console.log('Recruiter user but no recruiterId provided, returning empty result')
	return res.status(200).json([])
}

const students = await StudentService.getAllStudents(filter, recruiterId, onlyBookmarked, userType, sortOptions)
```

**Key Difference**:

- `/api/students` **actually uses** `recruiterId` and `onlyBookmarked`
- It has recruiter-specific logic (bookmark filtering)
- For recruiters, it shows bookmark status for each student
- For admins/staff, these parameters are harmless (just ignored in the logic)

## Root Cause Summary

### Why are these parameters being sent?

1. **Code Reuse**: The `ChekProfile.jsx` component reuses the same `Table` component that was originally designed for the recruiter student search functionality

2. **Generic Implementation**: The Table component was built to handle both recruiter views (with bookmarks) and staff/admin views (without bookmarks) by accepting these props

3. **Frontend Always Sends Them**: The frontend doesn't conditionally send these parameters based on user role - it always includes them

### Why doesn't it cause problems?

1. **Backend Ignores Them**: The `/api/draft` endpoint (`DraftController.getAllDrafts`) completely ignores `recruiterId` and `onlyBookmarked` parameters

2. **Filter-Only Logic**: The draft endpoint only cares about the `filter` parameter for finding pending drafts

3. **No Bookmark Feature for Drafts**: Unlike the student search, the draft review page doesn't have bookmark functionality, so these parameters are irrelevant

## Conclusion

**These parameters are UNNECESSARY and HARMLESS for the Admin user on the draft review page because:**

1. ✅ The backend `/api/draft` endpoint doesn't use them
2. ✅ They don't affect the query results
3. ✅ They're just ignored URL parameters
4. ✅ The draft service doesn't implement bookmark filtering

**However, they ARE used on other pages:**

- On `/api/students` endpoint (student search for recruiters)
- Shows bookmark status for recruiters
- Filters bookmarked students when `onlyBookmarked=true`

## Recommendation

### Option 1: Keep As-Is (Recommended)

- **Pros**: No changes needed, backward compatible, harmless
- **Cons**: Slightly confusing URL parameters

### Option 2: Conditional Parameter Sending

Modify `ChekProfile.jsx` to only send these parameters for recruiters:

```javascript
const tableProps = {
	headers: headers,
	dataLink: '/api/draft',
	filter: filterState,
	...(role === 'Recruiter' && {
		recruiterId: userId,
		OnlyBookmarked: OnlyBookmarked,
	}),
	updateDraftStatusWithComments: updateDraftStatusWithComments,
	userRole: role,
}
```

**Pros**: Cleaner URLs, more explicit intent
**Cons**: Requires testing, might break if Table component expects these props

### Option 3: Backend Validation

Add validation in `DraftController.getAllDrafts` to warn if recruiter-specific parameters are sent:

```javascript
static async getAllDrafts(req, res, next) {
    try {
        // Log if unnecessary parameters are sent
        if (req.query.recruiterId || req.query.onlyBookmarked) {
            console.warn('[Draft] Ignoring recruiter-specific parameters:', {
                recruiterId: req.query.recruiterId,
                onlyBookmarked: req.query.onlyBookmarked
            })
        }

        let filter = {}
        // ... rest of implementation
    }
}
```

**Pros**: Documents the behavior, helps future developers
**Cons**: Just logging, doesn't change functionality

## Files Involved

### Frontend

1. `portfolio-client/src/pages/ChekProfile/ChekProfile.jsx`

   - Lines 32, 381-382: Where `userId` and `OnlyBookmarked` are set

2. `portfolio-client/src/components/Table/Table.jsx`
   - Lines 181-195: Where parameters are sent to API

### Backend

1. `portfolio-server/src/routes/drafts-route.js`

   - Line 16: Route definition

2. `portfolio-server/src/controllers/draftController.js`

   - Lines 302-331: Controller that ignores these parameters

3. `portfolio-server/src/services/draftService.js`
   - Line 29: Service method signature (no recruiterId/onlyBookmarked)

## Diagram

```
┌─────────────────┐
│  ChekProfile    │
│  (Admin user)   │
└────────┬────────┘
         │
         │ userId = 1 (admin's ID)
         │ OnlyBookmarked = false
         │
         v
┌─────────────────┐
│  Table.jsx      │
│  Component      │
└────────┬────────┘
         │
         │ GET /api/draft?
         │   filter={...}&
         │   recruiterId=1&        ← Unnecessary
         │   onlyBookmarked=false  ← Unnecessary
         │
         v
┌─────────────────────┐
│  DraftController    │
│  .getAllDrafts()    │
└─────────┬───────────┘
          │
          │ Only extracts:
          │ - req.query.filter ✓
          │
          │ Ignores:
          │ - req.query.recruiterId ✗
          │ - req.query.onlyBookmarked ✗
          │
          v
┌─────────────────────┐
│  DraftService       │
│  .getAll(filter)    │
└─────────────────────┘
```

---

**Status**: ✅ Analyzed - Parameters are harmless but unnecessary
**Impact**: None - Backend ignores them
**Priority**: Low - Optional cleanup, not a bug
