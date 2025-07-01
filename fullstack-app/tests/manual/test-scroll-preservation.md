# Manual Test: Scroll Position Preservation

## Test Steps

### SPC Dashboard (/spc-dashboard/SPC_CD_L1/1000-BNT44)

1. Navigate to http://localhost:3000/spc-dashboard/SPC_CD_L1/1000-BNT44
2. Wait for data to load
3. Scroll down to see the charts (approximately halfway down the page)
4. Change the entity filter dropdown
5. **Expected**: Page should maintain the same scroll position after data loads

### SPC Analytics (/spc-analytics/SPC_CD_L1/1000-BNT44)

1. Navigate to http://localhost:3000/spc-analytics/SPC_CD_L1/1000-BNT44
2. Wait for data to load  
3. Scroll down to see the data table
4. Change the entity filter dropdown
5. **Expected**: Page should maintain the same scroll position after data loads

### Date Filter Test

1. On either page, scroll to a specific position
2. Use the date picker to select a new date
3. **Expected**: Page should maintain the same scroll position after data loads

## Technical Details

The implementation uses Next.js router's `scroll: false` option when updating URLs:
- CDDataContext: `router.replace(newUrl, { scroll: false })` for filter updates
- SPC Analytics: `router.replace(newUrl, { scroll: false })` for entity filter updates

This prevents the default behavior of scrolling to top when the URL changes.