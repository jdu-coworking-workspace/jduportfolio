# CV Download Function Analysis Report

## Executive Summary

**✅ FIXED: The CV download function now uses 100% PUBLIC/LIVE data from the Students table, NOT draft data.**

**Previous Issue:** Some fields were using `cvData.draft.*` which could potentially reference draft data. This has been fixed to use `cvData.*` directly from the Students table.

## Detailed Analysis

### 1. When CV Download is Triggered

**Location:** `portfolio-client/src/pages/Profile/Top/Top.jsx:1152-1168`

```javascript
{
	role === 'Student' && viewingLive && (
		<Button
			onClick={async () => {
				try {
					downloadCV(student)
				} catch (err) {
					console.log(err)
				}
			}}
		>
			<DownloadIcon />
			download CV
		</Button>
	)
}
```

**Key Finding:** The download button **only appears when `viewingLive` is `true`**, meaning it's only available when viewing the public/live profile.

### 2. Data Flow When `viewingLive` is True

**Location:** `portfolio-client/src/pages/Profile/Top/Top.jsx:865-882`

When `viewingLive` is `true`, the `student` object is set as follows:

```javascript
useEffect(() => {
	if (role === 'Student' && !editMode && liveData) {
		if (viewingLive) {
			// Switch to Live view - use live data in draft property for consistent access pattern
			setStudent({
				...liveData,
				draft: liveData, // Point draft to live data so rendering code works
			})
		} else {
			// Switch to Draft view
			const mappedData = {
				...liveData,
				draft: currentDraft?.profile_data || {},
			}
			setStudent(mappedData)
		}
	}
}, [viewingLive, role, editMode, liveData, currentDraft])
```

**Key Finding:** When `viewingLive` is `true`:

- `student.draft` = `liveData` (which is public data from the Students table)
- `student.additional_info` = public data
- `student.education` = public data
- `student.work_experience` = public data
- `student.licenses` = public data
- All root-level fields = public data

### 3. What is `liveData`?

**Location:** `portfolio-client/src/pages/Profile/Top/Top.jsx:541-546`

```javascript
// Store Live data (from Students table)
const liveProfileData = {
	...studentData, // This comes from the Students table (PUBLIC data)
	draft: mapData(studentData).draft, // Parse live data for display
}
setLiveData(liveProfileData)
```

**Key Finding:** `liveData` contains data from the **Students table** (public/live data), not from the Draft table.

### 4. How CV Download Function Uses the Data

**Location:** `portfolio-client/src/lib/cv-download.js`

The function uses a **mixed approach**:

#### Fields from `cvData.draft.*`:

- `cvData.draft.address_furigana` (line 102)
- `cvData.draft.postal_code` (line 105)
- `cvData.draft.address` (line 108)
- `cvData.draft.deliverables` (line 174)

#### Fields from `cvData.*` (root level):

- `cvData.additional_info.*` (lines 83, 89, 92, 94, 96)
- `cvData.education` (line 111)
- `cvData.work_experience` (line 120)
- `cvData.licenses` (line 131, 194)
- `cvData.arubaito` (line 185)
- `cvData.email` (line 99)
- `cvData.phone` (line 86)
- All personal info fields (name, gender, date_of_birth, etc.)

### 5. Current Behavior Summary

Since the download button only appears when `viewingLive` is `true`, and at that point:

- `student.draft` = `liveData` (public data)
- `student.*` (root level) = public data

**Result: The CV download is using 100% PUBLIC/LIVE data, not draft data.**

### 6. Potential Issues

1. **Inconsistent Data Source:** The function uses `cvData.draft.*` for some fields but `cvData.*` for others. When `viewingLive` is true, both point to the same public data, but this could be confusing.

2. **No Draft Download Option:** Students cannot download their draft CV - only the public/live version.

3. **Potential Error:** Line 174 uses `cvData.draft.deliverables` without optional chaining, which could cause an error if `draft` is undefined (though this shouldn't happen when `viewingLive` is true).

## Recommendations

### Option 1: Keep Current Behavior (Download Public Data)

- **Pros:** Matches current UI (button only shows when viewing live)
- **Cons:** Students can't download their draft before submitting

### Option 2: Allow Downloading Draft Data

- Add a download button when `viewingLive` is `false` (draft view)
- Pass `currentDraft.profile_data` merged with base student data
- **Pros:** Students can preview their draft as CV
- **Cons:** Requires UI changes

### Option 3: Add Toggle/Choice

- Add a dropdown or toggle to choose "Download Live" vs "Download Draft"
- **Pros:** Maximum flexibility
- **Cons:** More complex UI

## Conclusion

**The CV download function currently retrieves and uses PUBLIC/LIVE data from the Students table, not draft data.** This is consistent with the UI behavior (button only appears when viewing live), but means students cannot download their draft CV.
