# CV Download Data Source Verification Report

## Current Status: ✅ ALL FIELDS COME FROM STUDENTS TABLE

### Verification Summary

**Result:** All fields in the CV download function are correctly retrieved from the Students table (public/live data), NOT from draft data.

## Field-by-Field Analysis

### Personal Information Fields

| Field                 | Source                       | Status            |
| --------------------- | ---------------------------- | ----------------- |
| `first_name_furigana` | `cvData.first_name_furigana` | ✅ Students table |
| `last_name_furigana`  | `cvData.last_name_furigana`  | ✅ Students table |
| `first_name`          | `cvData.first_name`          | ✅ Students table |
| `last_name`           | `cvData.last_name`           | ✅ Students table |
| `gender`              | `cvData.gender`              | ✅ Students table |
| `date_of_birth`       | `cvData.date_of_birth`       | ✅ Students table |
| `photo`               | `cvData.photo`               | ✅ Students table |

### Contact Information Fields

| Field   | Source         | Status            |
| ------- | -------------- | ----------------- |
| `phone` | `cvData.phone` | ✅ Students table |
| `email` | `cvData.email` | ✅ Students table |

### Additional Information Fields

| Field                                       | Source                                              | Status            |
| ------------------------------------------- | --------------------------------------------------- | ----------------- |
| `additional_info.additionalAddressFurigana` | `cvData.additional_info?.additionalAddressFurigana` | ✅ Students table |
| `additional_info.additionalEmail`           | `cvData.additional_info?.additionalEmail`           | ✅ Students table |
| `additional_info.indeks`                    | `cvData.additional_info?.indeks`                    | ✅ Students table |
| `additional_info.additionalAddress`         | `cvData.additional_info?.additionalAddress`         | ✅ Students table |
| `additional_info.additionalPhone`           | `cvData.additional_info?.additionalPhone`           | ✅ Students table |

### Address Fields (出身地 - Place of Birth)

| Field              | Source                    | Status            |
| ------------------ | ------------------------- | ----------------- |
| `address_furigana` | `cvData.address_furigana` | ✅ Students table |
| `postal_code`      | `cvData.postal_code`      | ✅ Students table |
| `address`          | `cvData.address`          | ✅ Students table |

**Note:** These fields were previously using `cvData.draft.*` but have been correctly changed to use root-level `cvData.*` fields.

### Education & Experience Fields

| Field             | Source                   | Status            |
| ----------------- | ------------------------ | ----------------- |
| `education`       | `cvData.education`       | ✅ Students table |
| `work_experience` | `cvData.work_experience` | ✅ Students table |
| `licenses`        | `cvData.licenses`        | ✅ Students table |
| `arubaito`        | `cvData.arubaito`        | ✅ Students table |

### Other Profile Fields

| Field               | Source                     | Status            |
| ------------------- | -------------------------- | ----------------- |
| `self_introduction` | `cvData.self_introduction` | ✅ Students table |
| `deliverables`      | `cvData.deliverables`      | ✅ Students table |

**Note:** The `deliverables` field was previously using `cvData.draft.deliverables` but has been correctly changed to `cvData.deliverables`.

## Data Flow Verification

### When `viewingLive` is `true`:

1. **API Call:** `/api/draft/student/${studentId}`

   - Returns student data from Students table
   - Also includes `draft` and `pendingDraft` objects (which are removed)

2. **liveData Creation:**

   ```javascript
   const liveProfileData = {
   	...studentData, // All fields from Students table
   	draft: mapData(studentData).draft, // Parsed for display
   }
   setLiveData(liveProfileData)
   ```

3. **student Object When viewingLive = true:**

   ```javascript
   setStudent({
   	...liveData, // All fields from Students table
   	draft: liveData, // Points to same Students table data
   })
   ```

4. **CV Download:**
   - `downloadCV(student)` is called
   - All fields accessed via `cvData.*` (root level)
   - All fields come from Students table ✅

## Conclusion

✅ **ALL fields in the CV download function are correctly retrieved from the Students table (public/live data).**

✅ **NO fields are retrieved from draft data.**

✅ **The implementation correctly ensures that only approved/public data is used in the CV download.**

## Code Verification

- ✅ No references to `cvData.draft.*` in the CV download function
- ✅ All fields use `cvData.*` (root level) which comes from Students table
- ✅ Download button only appears when `viewingLive` is `true`
- ✅ When `viewingLive` is `true`, `student` object contains only Students table data

## Recommendation

The current implementation is **correct** and meets the requirement that all data should come from the Students table (approved/public data), not from draft data.
