# Bug Fix: "cleanup is not a function" Error

## Problem

After implementing the initial fix, the application crashed with:

```
Uncaught TypeError: cleanup is not a function at Table.jsx:186:17
```

## Root Cause

The issue was with how we implemented the AbortController pattern in an async function:

### ❌ Incorrect Implementation (Caused the Error):

```javascript
const fetchUserData = useCallback(async () => {
	setLoading(true)
	const controller = new AbortController()

	try {
		const response = await axios.get(tableProps.dataLink, {
			params,
			signal: controller.signal,
		})
		setRows(response.data)
	} catch (error) {
		// handle error
	}

	// ❌ PROBLEM: This returns a Promise, not the cleanup function!
	return () => controller.abort()
}, [...])

useEffect(() => {
	const cleanup = fetchUserData() // ❌ cleanup is a Promise, not a function!

	return () => {
		if (cleanup) cleanup() // ❌ Trying to call a Promise as a function
	}
}, [fetchUserData])
```

**Why it failed:**

- `async` functions **always** return a Promise
- Even if you return a function from an async function, it's wrapped in a Promise
- `const cleanup = fetchUserData()` assigns a Promise, not the cleanup function
- Calling `cleanup()` tries to invoke a Promise as a function → Error!

## Solution

Move the AbortController creation to the useEffect, not inside the async callback:

### ✅ Correct Implementation:

```javascript
const fetchUserData = useCallback(
	signal => {
		// ✅ Accept signal as parameter
		setLoading(true)

		const params = {
			filter: tableProps.filter,
			recruiterId: tableProps.recruiterId,
			onlyBookmarked: tableProps.OnlyBookmarked,
		}

		if (sortBy && sortOrder) {
			params.sortBy = sortBy
			params.sortOrder = sortOrder
		}

		// ✅ Use the signal passed from useEffect
		axios
			.get(tableProps.dataLink, {
				params,
				signal,
			})
			.then(response => {
				setRows(response.data)
			})
			.catch(error => {
				if (error.name !== 'AbortError' && error.code !== 'ERR_CANCELED') {
					console.error('Error fetching students:', error)
				}
			})
			.finally(() => {
				setLoading(false)
			})
	},
	[tableProps.dataLink, tableProps.filter, tableProps.recruiterId, tableProps.OnlyBookmarked, sortBy, sortOrder]
)

useEffect(() => {
	// ✅ Create AbortController HERE, in the useEffect
	const controller = new AbortController()

	// ✅ Pass the signal to fetchUserData
	fetchUserData(controller.signal)

	// ✅ Return cleanup function directly
	return () => {
		controller.abort()
	}
}, [fetchUserData, tableProps.refreshTrigger])
```

**Why this works:**

- `AbortController` is created in `useEffect`, not in the callback
- `fetchUserData` is a regular (non-async) function that accepts a signal
- `useEffect` directly returns the cleanup function (no Promise involved)
- When dependencies change or component unmounts, `controller.abort()` is called

## Key Differences

| Aspect                   | ❌ Broken Version     | ✅ Fixed Version     |
| ------------------------ | --------------------- | -------------------- |
| fetchUserData type       | async function        | regular function     |
| fetchUserData return     | Promise\<cleanup\>    | void (nothing)       |
| AbortController location | Inside fetchUserData  | Inside useEffect     |
| Signal passing           | Created internally    | Passed as parameter  |
| Cleanup                  | Tries to call Promise | Calls abort directly |

## Technical Explanation

### JavaScript Promises and Async Functions

```javascript
// Async functions ALWAYS return Promises:
async function example() {
	return 42
}
example() // Returns: Promise<42>, not 42

async function example2() {
	return () => console.log('cleanup')
}
example2() // Returns: Promise<Function>, not Function
const cleanup = example2() // cleanup is a Promise
cleanup() // ❌ Error: cleanup is not a function
```

### Correct Pattern for AbortController in React

```javascript
useEffect(() => {
	// 1. Create controller
	const controller = new AbortController()

	// 2. Start async operation with signal
	fetch(url, { signal: controller.signal })
		.then(...)
		.catch(...)

	// 3. Return cleanup function
	return () => controller.abort()
}, [dependencies])
```

## Files Modified

- `portfolio-client/src/components/Table/Table.jsx` (Lines 143-180)

## Status

✅ **FIXED** - Application now runs without errors

## Testing

1. Open application in browser
2. Navigate to Students page
3. Type in search field
4. ✅ No console errors
5. ✅ Search works correctly
6. ✅ Request cancellation works

---

**Fix Date**: January 16, 2026  
**Error**: `TypeError: cleanup is not a function`  
**Status**: ✅ RESOLVED
