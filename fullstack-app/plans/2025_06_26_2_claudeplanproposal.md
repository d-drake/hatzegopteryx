# Claude Plan Proposal - 2025-06-26

## Fix Zoom Controls Overlap and Data Margins

### Issues to Fix:
1. **Zoom Controls Overlapping Left Axis**: Move controls above SVG but below tabs
2. **Remove 30px Top/Bottom Data Margins**: Keep left/right margins, remove top/bottom

### Implementation Steps:

**Phase 1: Reposition Zoom Controls**
- Move `ZoomControls` from inside SVG to above SVG but below tabs
- Update `SPCChartWrapper.tsx` to provide dedicated space for controls
- Modify positioning from absolute within chart to relative to container

**Phase 2: Fix Data Margins**
- Update `yDataScale` and `y2DataScale` from `[innerHeight - 30, 30]` to `[innerHeight, 0]`
- Update clipping path from `y={30} height={innerHeight - 60}` to `y={0} height={innerHeight}`
- Keep left/right 30px margins unchanged

**Phase 3: Implement Hybrid Testing**
- **Visibility Test**: Force controls visible with CSS injection, test positioning
- **Functional Test**: Test zoom interactions and control appearance
- **Integration Test**: Complete workflow testing

### Files to Modify:
- `ZoomControls.tsx` - Reposition controls
- `SPCChartWrapper.tsx` - Add controls space
- `Timeline.tsx` - Update data scales and clipping
- New test: `zoom-controls-hybrid-test.js`

### Expected Results:
- Zoom controls appear above chart, below tabs (no axis overlap)
- Data elements extend to axis edges (no top/bottom dead space)
- All functionality preserved with comprehensive testing

### Detailed Implementation Plan

#### 1. Fix Zoom Controls Positioning
- **Current Issue**: Zoom controls positioned at `top: 10px` within chart SVG, overlapping left axis
- **Solution**: Move zoom controls to be positioned above SVG but below tabs
- **Implementation**: 
  - Modify `ZoomControls.tsx` to position relative to container instead of absolute within SVG
  - Update `SPCChartWrapper.tsx` to provide dedicated space between tabs and chart content
  - Position controls at `top: -30px` or similar to place above chart but below tabs

#### 2. Remove 30px Top/Bottom Data Margins
- **Current Issue**: Data elements have 30px margins on all sides
- **Solution**: Remove top/bottom margins, keep left/right margins
- **Implementation**:
  - Update `yDataScale` from `[innerHeight - 30, 30]` to `[innerHeight, 0]`
  - Update `y2DataScale` similarly
  - Update clipping path from `<rect x={30} y={30} width={innerWidth - 60} height={innerHeight - 60} />` to `<rect x={30} y={0} width={innerWidth - 60} height={innerHeight} />` (Option A)
  - This affects all data elements (circles, symbols, lines) automatically

#### 3. Implement Hybrid Testing Strategy
- **Phase 1**: Visibility Override Test
  - Force zoom controls to be visible using CSS injection
  - Test positioning, spacing, non-overlap with axis
  - Verify controls are above SVG but below tabs
- **Phase 2**: Functional Zoom Test  
  - Test actual zoom interactions (wheel events)
  - Verify controls appear/disappear correctly
  - Test reset functionality
- **Phase 3**: Integration Test
  - Test complete workflow: no controls → zoom → controls appear → reset → controls hide
  - Test across multiple viewport sizes
  - Verify no regression in other functionality

#### 4. Testing Verification
- Zoom controls positioned correctly (above SVG, below tabs)
- No overlap with left axis labels
- Data elements now extend to axis edges (no top/bottom margins)
- All existing functionality preserved
- Responsive behavior maintained