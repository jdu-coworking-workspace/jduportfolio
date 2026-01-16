# Initial Load Issue - Double Requests Analysis

## 🔴 Problem

When navigating to Student page:

1. **2 requests are sent** on initial load
2. **1 request fails/cancelled**
3. **"No data found" appears for 2-3 seconds**
4. **Then data finally loads**

## 🔍 Root Cause Analysis

### The Flow (Current - BROKEN):

```
1. Student.jsx mounts
   ↓
2. filterState initialized from localStorage (line 55)
   filterState = { search: '', it_skills: [], ... }
   ↓
3. Filter.jsx receives filterState prop
   ↓
4. Filter.jsx creates localFilterState from filterState (line 46)
   ↓
5. ❌ Filter.jsx useEffect fires IMMEDIATELY (lines 63-69):
   useEffect(() => {
     if (isInitialMount.current) {
       onFilterChange(localFilterState)  // ❌ FIRST API CALL (NOT DEBOUNCED)
       isInitialMount.current = false
     }
   }, [localFilterState, onFilterChange])  // ❌ BAD: onFilterChange in dependencies
   ↓
6. ❌ onFilterChange called WITHOUT DEBOUNCE
   ↓
7. Student.jsx handleFilterChange updates filterState
   ↓
8. Table.jsx sees filter change
   ↓
9. ❌ FIRST API REQUEST SENT
   ↓
10. ❌ But ANOTHER useEffect in Filter.jsx (lines 119-125) might also fire:
    useEffect(() => {
      if (!isInitialMount.current && userChangedFilter.current) {
        debouncedOnFilterChange(localFilterState)  // ❌ SECOND API CALL (DEBOUNCED)
      }
    }, [localFilterState, debouncedOnFilterChange])
    ↓
11. ❌ After 500ms, SECOND API REQUEST SENT
    ↓
12. AbortController cancels the first request
    ↓
13. User sees "No data found" until second request completes
```

## 🐛 Specific Issues

### Issue 1: Initial Mount Calls onFilterChange Immediately (NO DEBOUNCE)

**File**: `portfolio-client/src/components/Filter/Filter.jsx`  
**Lines**: 63-69

```javascript
useEffect(() => {
	if (isInitialMount.current) {
		// Always call parent with current state (whether empty or with filters)
		onFilterChange(localFilterState) // ❌ NOT DEBOUNCED!
		isInitialMount.current = false
	}
}, [localFilterState, onFilterChange]) // ❌ onFilterChange shouldn't be here
```

**Problem:**

- This fires immediately on mount
- It's NOT debounced (debounce only applies to user changes)
- Triggers API call before component is fully ready
- Having `onFilterChange` in dependencies can cause re-renders

### Issue 2: Dependencies Array includes onFilterChange

**Problem:**

```javascript
}, [localFilterState, onFilterChange])  // ❌ onFilterChange causes re-runs
```

- `onFilterChange` is `handleFilterChange` from Student.jsx
- Even though it's wrapped in `useCallback`, having it in dependencies is risky
- Can cause the effect to re-run unexpectedly
- Should be removed since it should be stable

### Issue 3: Multiple State Updates Cascade

```
Filter.jsx localFilterState → (immediate call) →
  Student.jsx filterState →
    Table.jsx tableProps.filter →
      fetchUserData →
        API CALL #1

Then 500ms later:

Filter.jsx localFilterState → (debounced call) →
  Student.jsx filterState →
    Table.jsx tableProps.filter →
      fetchUserData →
        API CALL #2 (cancels #1)
```

### Issue 4: No Initial Data While Waiting

- Table shows "No data found" during the delay
- User sees empty table for 2-3 seconds
- Poor UX

## ✅ Solution

### Fix 1: Remove Immediate onFilterChange on Mount

The initial mount should NOT trigger an API call immediately. Let the parent component handle initial data loading.

**Change in Filter.jsx (lines 63-69):**

```javascript
// ❌ REMOVE THIS:
useEffect(() => {
	if (isInitialMount.current) {
		onFilterChange(localFilterState) // ❌ Causes immediate API call
		isInitialMount.current = false
	}
}, [localFilterState, onFilterChange])

// ✅ REPLACE WITH:
useEffect(() => {
	if (isInitialMount.current) {
		isInitialMount.current = false
		// ✅ Call parent only once, not in effect dependencies
		onFilterChange(localFilterState)
	}
	// eslint-disable-next-line react-hooks/exhaustive-deps
}, []) // ✅ Empty deps - run only once on mount
```

**Why this works:**

- Runs only once on mount (empty dependency array)
- Doesn't re-run when `onFilterChange` reference changes
- Still notifies parent of initial state
- But only ONE time, not multiple times

### Fix 2: Ensure Table.jsx Only Makes ONE Request on Mount

The Table component should wait for initial state to be set before fetching.

**Current flow:**

```
Table mounts → fetch with empty filter →
Filter sets state → fetch with real filter →
First request cancelled → shows "No data"
```

**Better flow:**

```
Table mounts → waits for filter →
Filter sets state once → fetch once →
Data appears immediately
```

### Fix 3: Add Loading State Handling

Make sure the Table shows a proper loading indicator instead of "No data found" during initial load.

## 📊 Expected Results After Fix

### Before Fix:

- 2 API requests on page load
- 1 cancelled request
- "No data found" for 2-3 seconds
- Poor UX

### After Fix:

- 1 API request on page load
- No cancelled requests
- Data appears immediately (or with loading spinner)
- Good UX

## 🎯 Implementation

1. **Fix Filter.jsx initial mount effect** (remove onFilterChange from deps)
2. **Ensure only one initial call happens**
3. **Remove cascading state updates**
4. **Add proper loading states**

---

**Issue Date**: January 16, 2026  
**Problem**: Double requests on initial load, cancelled requests, delayed data  
**Root Cause**: Immediate onFilterChange on mount + dependency array issues  
**Status**: Analysis complete, ready to implement fix
