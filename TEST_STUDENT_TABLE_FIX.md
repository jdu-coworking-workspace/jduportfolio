# Manual Testing Guide for Student Table Scroll Fix

## Prerequisites

- Development server running (`npm run dev` in both client and server)
- Test data available (at least 50+ students)
- Browser with DevTools open

## Test Execution

### Test 1: Basic Navigation & Scroll Restoration ✅

**Steps:**

1. Navigate to `/student`
2. Wait for students to load (should see 25 or 50 students)
3. Scroll down to approximately middle of the list
4. Note the student name you're looking at (e.g., "田中太郎")
5. Click on that student's row
6. Wait for detail page to load
7. Click the "戻る" (Back) button

**Expected Result:**

- Returns to `/student` page
- Same student ("田中太郎") should be centered in view
- Order of students should be identical to before
- Smooth scroll to student (within ~100ms)

**Pass/Fail:** [ ]

---

### Test 2: Page 2 Navigation ✅

**Steps:**

1. Navigate to `/student`
2. Use pagination controls to go to page 2
3. Scroll down in page 2
4. Click on a student (e.g., student #35 if 25 per page)
5. Click Back

**Expected Result:**

- Returns to `/student?page=1` (page 2, 0-indexed)
- Shows page 2 students
- Correct student centered in view
- Same order as before

**Pass/Fail:** [ ]

---

### Test 3: Sort by Name ✅

**Steps:**

1. Navigate to `/student`
2. Click on "学生" (Student) column header to sort by name
3. Verify order changes (alphabetically)
4. Click the sort icon again to change ASC/DESC
5. Scroll to middle of list
6. Click on a student
7. Click Back

**Expected Result:**

- URL should have `?sortBy=name&sortOrder=ASC` (or DESC)
- Same sort order maintained
- Correct student centered
- No order change

**DevTools Check:**

- Console should NOT show double sorting
- Network tab should show `sortBy=name` in request

**Pass/Fail:** [ ]

---

### Test 4: Sort by Age ✅

**Steps:**

1. Navigate to `/student`
2. Click on "年齢" (Age) column header
3. Verify students sorted by age
4. Click a student in the middle
5. Click Back

**Expected Result:**

- URL has `?sortBy=age&sortOrder=ASC`
- Same age sorting maintained
- Correct student visible

**Pass/Fail:** [ ]

---

### Test 5: Sort by Graduation Year ✅

**Steps:**

1. Navigate to `/student`
2. Click on "卒業予定年（月）" column header
3. Verify graduation year sorting
4. Change to DESC order
5. Click a student
6. Click Back

**Expected Result:**

- URL has `?sortBy=graduation_year&sortOrder=DESC`
- Same order maintained
- No unexpected reordering

**Pass/Fail:** [ ]

---

### Test 6: Grid View ✅

**Steps:**

1. Navigate to `/student`
2. Switch to Grid view (card view)
3. Scroll down in grid view
4. Click on a student card
5. Click Back

**Expected Result:**

- Returns to Grid view (not Table view)
- Approximately same scroll position
- Same order of cards

**Pass/Fail:** [ ]

---

### Test 7: Change Rows Per Page ✅

**Steps:**

1. Navigate to `/student`
2. Change rows per page to 100
3. Scroll down
4. Click a student near bottom (e.g., student #80)
5. Click Back

**Expected Result:**

- Still shows 100 rows per page
- Correct student visible
- Order unchanged

**Pass/Fail:** [ ]

---

### Test 8: Filter + Sort Combination ✅

**Steps:**

1. Navigate to `/student`
2. Open filter panel
3. Select JLPT: N1, N2
4. Apply sort by Age DESC
5. Click a student
6. Click Back

**Expected Result:**

- Filter still applied (only N1, N2 students)
- Sort still applied (Age DESC)
- Correct student centered

**Pass/Fail:** [ ]

---

### Test 9: Multiple Page Changes ✅

**Steps:**

1. Navigate to `/student` (page 1)
2. Go to page 2
3. Go to page 3
4. Click a student on page 3
5. Click Back

**Expected Result:**

- Returns to page 3 (not page 1 or 2)
- URL shows `?page=2` (0-indexed)
- Correct student visible

**Pass/Fail:** [ ]

---

### Test 10: Next Student Button ✅

**Steps:**

1. Navigate to `/student`
2. Click a student (not last in list)
3. In detail page, click "次へ" (Next) button 2-3 times
4. Click Back

**Expected Result:**

- Returns to original student list position
- Not the last viewed student
- Original list context preserved

**Pass/Fail:** [ ]

---

### Test 11: Direct URL Access ✅

**Steps:**

1. Open new tab
2. Navigate directly to `/student?page=1&sortBy=age&sortOrder=DESC`
3. Verify page 2 loads with age sorting DESC
4. Click a student
5. Click Back

**Expected Result:**

- State correctly restored from URL
- Sort maintained
- Page maintained

**Pass/Fail:** [ ]

---

### Test 12: Browser Back Button ✅

**Steps:**

1. Navigate to `/student`
2. Click a student
3. Use browser's native back button (not the in-app button)

**Expected Result:**

- Same behavior as in-app back button
- Context preserved
- Scroll position restored

**Pass/Fail:** [ ]

---

## DevTools Debugging Checks

### Check 1: Network Requests

**Open Network tab during navigation:**

- [ ] API call to `/api/students` has correct params
- [ ] `sortBy` and `sortOrder` parameters match UI state
- [ ] `page` and `limit` parameters correct
- [ ] No duplicate/redundant requests

### Check 2: Console Logs

**Look for errors or warnings:**

- [ ] No "Invalid filter format" errors
- [ ] No undefined state warnings
- [ ] No infinite loop warnings

### Check 3: React DevTools

**Check component state:**

- [ ] `sortBy`, `sortOrder`, `page` in Table component match URL
- [ ] `visibleRows` array length matches expected count
- [ ] No unnecessary re-renders on navigation

### Check 4: localStorage

**Check browser localStorage:**

```javascript
// In DevTools Console:
localStorage.getItem('visibleRowsStudentIds') // Should show array with isCurrent flags
localStorage.getItem('studentTableViewMode') // Should show 'table' or 'grid'
localStorage.getItem('tableRowsPerPage') // Should show selected value
```

### Check 5: DOM Inspection

**Check table rows:**

- [ ] Each `<tr>` has `data-student-id` attribute
- [ ] `data-student-id` values match `student_id` field
- [ ] Currently selected student's `isCurrent` flag in localStorage matches visible student

---

## Regression Testing

### Previous Issues to Verify Fixed:

1. [ ] Order no longer changes when returning from detail page
2. [ ] Scroll position correctly restored (or better, student centered)
3. [ ] Sorting state persisted across navigation
4. [ ] Pagination state persisted
5. [ ] Grid view state persisted
6. [ ] Rows per page setting persisted

### Edge Cases:

1. [ ] First student on page 1 - can navigate and return
2. [ ] Last student on last page - can navigate and return
3. [ ] Empty search results - no errors
4. [ ] Single page of results - navigation works
5. [ ] Rapidly clicking students - no race conditions

---

## Performance Testing

### Timing Checks:

1. Measure time from click to detail page load: **Expected < 500ms**
2. Measure time from Back to student list render: **Expected < 300ms**
3. Measure time for scroll-to-student: **Expected < 200ms**

### Use Performance DevTools:

```javascript
// Add to console:
performance.mark('navigation-start')
// ... click student, click back ...
performance.mark('navigation-end')
performance.measure('navigation', 'navigation-start', 'navigation-end')
console.log(performance.getEntriesByName('navigation')[0].duration)
```

**Expected:** < 1000ms total round-trip

---

## Accessibility Testing

1. [ ] Keyboard navigation works (Tab through students)
2. [ ] Enter key opens student detail
3. [ ] Back button accessible via keyboard
4. [ ] Screen reader announces student when scrolled into view
5. [ ] Focus restored to correct student on back navigation

---

## Browser Compatibility

Test on:

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Chrome
- [ ] Mobile Safari

---

## Known Limitations

1. **100ms timeout**: Scroll animation has 100ms delay (acceptable tradeoff)
2. **localStorage dependency**: If localStorage is disabled, scroll position may not restore
3. **Grid view**: Uses scroll position, not student-based scrolling (less precise)

---

## Success Criteria

**All tests must pass for this fix to be considered complete:**

- ✅ No order changes on navigation back
- ✅ Correct student always centered in view
- ✅ All sorting states persisted
- ✅ All pagination states persisted
- ✅ No performance degradation
- ✅ No new console errors
- ✅ Works in all major browsers

---

## Reporting Issues

If any test fails, document:

1. Test number and name
2. Steps to reproduce
3. Expected vs actual result
4. Browser and version
5. Console errors (if any)
6. Network request details
7. localStorage state

---

## Quick Smoke Test (5 minutes)

If time is limited, run this minimal test:

1. Load /student → Sort by Name → Click middle student → Back
2. Load /student → Go to page 2 → Click student → Back
3. Load /student → Grid view → Click student → Back

**All three must work correctly.**
