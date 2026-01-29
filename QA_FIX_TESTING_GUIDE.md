# Q&A Fix Testing Guide

## Overview

This guide tests the fix for the Q&A required field issue where students couldn't submit drafts after admin added new required questions.

## Prerequisites

- Backend server running with debug logs enabled
- Frontend dev server running
- Browser console open (F12)
- Test student account: TEST00 / password
- Admin account access

## Test Scenarios

### Scenario 1: Admin Adds New Required Questions

**Steps:**

1. **As Admin:**

   - Login to admin account
   - Navigate to Settings → Student Q&A (学生Q&A)
   - Add 2 new required questions:
     - Category: 学生成績 (Student Grades)
     - Question 1: "What is your favorite programming language?"
     - Required: ON (toggle switch)
     - Question 2: "Describe your best academic achievement"
     - Required: ON (toggle switch)
   - Click Save
   - Verify success message

2. **As Student (TEST00):**

   - Login to TEST00 account
   - Navigate to Profile → Q&A tab
   - Click "Edit Draft" button
   - **VERIFY:** New questions appear in the form
   - Fill in ALL required fields (including the 2 new questions)
   - Click "Submit" (提出・同意) button

3. **Check Browser Console:**
   Should see:

   ```
   === Q&A VALIDATION DEBUG ===
   Latest questions from settings: { 学生成績: { ... new questions ... }, ... }
   Current editData: { ... }
   Updated editData: { ... includes new questions ... }
   Missing required answers: []
   === END DEBUG ===
   Saving updated Q&A data to draft before submission...
   Saving draft with Q&A data: { student_id: "TEST00", profile_data: { qa: {...} } }
   Draft saved successfully: { ... }
   ```

4. **Confirmation Dialog:**

   - Verify confirmation dialog appears
   - Click "OK" to confirm

5. **Check Backend Console:**
   Should see:

   ```
   === BACKEND Q&A VALIDATION DEBUG ===
   Settings from database: { ... }
   Draft profile_data.qa: { ... includes new questions with answers ... }
   Checking category: 学生成績
   Questions in settings: [ ... list includes new questions ... ]
   Answers from draft: { ... }
   Question new_q1: required=true, answer="Python"
   Question new_q2: required=true, answer="I built a web app..."
   Missing required answers: []
   === END BACKEND DEBUG ===
   ```

6. **Expected Result:**

   - ✅ Success message: "プロフィールが確認されました" (Profile confirmed)
   - ✅ Draft status changes to "submitted"
   - ✅ No errors in console

7. **Verify as Admin:**
   - Go to Staff dashboard
   - Open pending approvals
   - Find TEST00's draft
   - Open Q&A section
   - **VERIFY:** All questions including new ones have answers

---

### Scenario 2: Student Leaves Required Field Empty

**Steps:**

1. **As Student (TEST00):**

   - Navigate to Profile → Q&A
   - Click "Edit Draft"
   - Fill most fields but **leave one required field empty**
   - Click "Submit"

2. **Check Browser Console:**

   ```
   === Q&A VALIDATION DEBUG ===
   Missing required answers: [ { category: "学生成績", key: "q1", question: "..." } ]
   === END DEBUG ===
   ```

3. **Expected Result:**
   - ⚠️ Warning modal appears: "Please answer all required questions (未回答: 1)"
   - Form scrolls to the category with missing answer
   - Form stays in edit mode
   - Submit is NOT sent to backend

---

### Scenario 3: Admin Changes Required Flag (Required → Optional)

**Steps:**

1. **As Admin:**

   - Go to Settings → Student Q&A
   - Find a question that was previously required
   - Toggle OFF the "Required" switch
   - Save changes

2. **As Student (TEST00):**

   - Go to Profile → Q&A
   - Click "Edit Draft"
   - **Leave that question empty** (it's now optional)
   - Fill all other required fields
   - Click "Submit"

3. **Expected Result:**

   - ✅ Validation passes (question is now optional)
   - ✅ Draft saves successfully
   - ✅ Confirmation dialog appears
   - ✅ Submit succeeds

4. **Check Console Logs:**
   - Frontend: Question appears with `required: false`
   - Backend: Question is NOT checked (it's optional)

---

### Scenario 4: Admin Removes a Question

**Steps:**

1. **Setup:**

   - As student, answer question Q5
   - Save draft

2. **As Admin:**

   - Remove question Q5 from settings
   - Save

3. **As Student (TEST00):**

   - Edit draft
   - Fill all visible required fields
   - Click Submit

4. **Expected Result:**
   - ✅ Old Q5 answer is ignored (not validated)
   - ✅ Only current questions are validated
   - ✅ Submit succeeds if all current required questions are filled

---

### Scenario 5: Multiple New Questions at Once

**Steps:**

1. **As Admin:**

   - Add 5 new required questions across different categories:
     - 学生成績: 2 questions
     - 専門知識: 1 question
     - 個性: 1 question
     - 実務経験: 1 question
   - Save

2. **As Student (TEST00):**

   - Edit draft
   - Navigate through all tabs
   - **VERIFY:** All 5 new questions appear
   - Fill all 5 new questions
   - Click Submit

3. **Check Console:**

   - Frontend adds all 5 questions to `updatedEditData`
   - Validation checks all 5 questions
   - Draft save includes all 5 questions
   - Backend validates all 5 questions

4. **Expected Result:**
   - ✅ All 5 questions validated correctly
   - ✅ Submit succeeds

---

## Console Logs to Look For

### Frontend (Browser Console)

#### Success Case:

```
=== Q&A VALIDATION DEBUG ===
Latest questions from settings: {...}
Current editData: {...}
Updated editData: {...}
Missing required answers: []
=== END DEBUG ===
Saving updated Q&A data to draft before submission...
Saving draft with Q&A data: {...}
Draft saved successfully: {...}
```

#### Validation Failure:

```
=== Q&A VALIDATION DEBUG ===
Missing required answers: [
  { category: "学生成績", key: "q1", question: "..." }
]
=== END DEBUG ===
```

### Backend (Server Terminal)

#### Success Case:

```
=== BACKEND Q&A VALIDATION DEBUG ===
Settings from database: {...}
Draft profile_data.qa: {...}
Checking category: 学生成績
Questions in settings: [...]
Answers from draft: {...}
Question q1: required=true, answer="My answer"
Question q2: required=true, answer="Another answer"
Missing required answers: []
=== END BACKEND DEBUG ===
```

#### Validation Failure:

```
=== BACKEND Q&A VALIDATION DEBUG ===
...
Question q3: required=true, answer=""
  → MISSING!
Missing required answers: [ { category: "学生成績", key: "q3" } ]
=== END BACKEND DEBUG ===
```

---

## Troubleshooting

### Issue: Frontend validation passes but backend fails

**Check:**

1. Is the draft save succeeding? Look for "Draft saved successfully" in console
2. Did the draft save include Q&A data? Check the `draftData` log
3. Is the backend reading the correct draft? Check `Draft profile_data.qa` log
4. Do the question IDs match between frontend and backend?

### Issue: New questions not appearing

**Check:**

1. Did admin save the settings?
2. Is the frontend fetching latest settings? Check `Latest questions from settings` log
3. Are the questions being added to `updatedEditData`? Check the debug log

### Issue: Draft save fails

**Check:**

1. Backend error message in response
2. Is `student_id` correct?
3. Is `currentDraft.profile_data` defined?
4. Check network tab for request payload

---

## Cleanup After Testing

Once all tests pass:

1. **Remove debug logs from QA.jsx:**

   - Lines ~876-878: Remove initial debug logs
   - Lines ~938-940: Remove validation result logs
   - Lines ~959-982: Remove draft save logs (or reduce to error logging only)

2. **Remove debug logs from draftService.js:**

   - Lines ~524-527: Remove initial debug logs
   - Lines ~540-565: Remove category/question logs

3. **Keep error logging:**

   - Keep the `catch` blocks that log errors
   - Keep user-facing error messages

4. **Update documentation:**
   - Mark this issue as RESOLVED in bug tracking
   - Update CHANGELOG
   - Add to MAINTENANCE_GUIDE.md

---

## Success Criteria

All scenarios should:

- ✅ Frontend validation works correctly
- ✅ Draft saves successfully before submission
- ✅ Backend validation passes
- ✅ No 400 errors in console
- ✅ Appropriate user feedback (success/error messages)
- ✅ Draft status updates correctly
- ✅ Admin can see all submitted answers

---

## Related Files

- `portfolio-client/src/pages/Profile/QA/QA.jsx` - Frontend validation & save
- `portfolio-server/src/services/draftService.js` - Backend validation
- `QA_CRITICAL_ROOT_CAUSE_FIX.md` - Root cause analysis
- `QA_REQUIRED_FIELD_CRITICAL_BUG_ANALYSIS.md` - Previous analysis
