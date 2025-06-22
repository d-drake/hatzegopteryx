# Development Plan - Next Tasks

## Overview
This document outlines the development tasks for refactoring the frontend visualization components to create a more modular and SPC-specific charting system.

---

## 🎯 Task 9: Component Refactoring and Reorganization

### ScatterPlot → Timeline Component
- **Objective**: Generalize the ScatterPlot component for broader use cases
- **Actions**:
  - [ ] Rename `ScatterPlot` component to `Timeline`
  - [ ] Move component to `/components/Timeline.tsx`
  - [ ] Generalize props interface to handle various data types
  - [ ] Remove SPC-specific logic and make it data-agnostic
  - [ ] Update all imports throughout the codebase

### Create SPCTimeline Component
- **Objective**: Create SPC-specific implementation of Timeline
- **Actions**:
  - [ ] Create new `SPCTimeline` component in `/components/spc-dashboard/SPCTimeline.tsx`
  - [ ] Implement SPC-specific logic (bias coloring, property shapes, etc.)
  - [ ] Inherit from generic Timeline component
  - [ ] Handle cd_data format specifically

### Dashboard Route Refactoring
- **Objective**: Rename dashboard routes to reflect SPC specificity
- **Actions**:
  - [ ] Rename `/dashboard` route to `/spc-dashboard`
  - [ ] Update `src/app/dashboard/page.tsx` → `src/app/spc-dashboard/page.tsx`
  - [ ] Update all navigation links and references
  - [ ] Update AppTabs component to reflect new route

---

## 🎯 Task 10: Timeline Component Margins

### Chart Margins Enhancement
- **Objective**: Prevent chart elements from colliding with axes
- **Actions**:
  - [ ] Add 30px margin to top and bottom of xScale
  - [ ] Add 30px margin to top and bottom of yScale
  - [ ] Ensure circles, lines, and markers respect these margins
  - [ ] Test with various data ranges to confirm proper spacing

---

## 🎯 Task 11: Line Component Refactoring

### Entity-Based Line Connections
- **Objective**: Connect markers of the same entity with lines
- **Actions**:
  - [ ] Modify Line component to group data by entity
  - [ ] Create continuous lines for each entity across time
  - [ ] Ensure lines respect Timeline margins
  - [ ] Add proper styling for multiple entity lines
  - [ ] Handle cases where entities have missing data points

---

## 🎯 Task 12: Timeline Zoom Functionality

### Axis-Specific Zoom Implementation
- **Objective**: Add intuitive zoom controls for both axes
- **Actions**:
  - [ ] Implement wheel scroll detection over xAxis area
  - [ ] Add xScale zoom in/out functionality
  - [ ] Implement wheel scroll detection over yAxis area
  - [ ] Add yScale zoom in/out functionality
  - [ ] Ensure zoom maintains data integrity and chart bounds
  - [ ] Add zoom reset functionality

### Technical Considerations
- Use D3's zoom behavior for smooth interactions
- Maintain proper event handling for different chart areas
- Ensure zoom state persistence during component re-renders

---

## 🎯 Task 13: LimitLine Component Creation

### Component Specifications
**Location**: `/components/spc/LimitLine.tsx`

### Functionality Requirements
- [ ] **CL (Center Line)**:
  - Gray, dotted horizontal line
  - yValue from spc_limits.cl column
- [ ] **LCL (Lower Control Limit)**:
  - Red, dashed, semi-transparent horizontal line
  - yValue from spc_limits.lcl column
- [ ] **UCL (Upper Control Limit)**:
  - Red, dashed, semi-transparent horizontal line
  - yValue from spc_limits.ucl column

### Technical Requirements
- [ ] Line spans full width of SPCTimeline's xScale domain
- [ ] Lines adapt to xScale domain changes (zoom/pan)
- [ ] Step-function behavior: constant yValue until data change
- [ ] Handle limit value changes over time
- [ ] Efficient rendering for large datasets

### Data Integration
- [ ] Connect to spc_limits table
- [ ] Filter by current SPCTimeline filter state
- [ ] Handle missing limit data gracefully

---

## 🎯 Task 14: SPCTimeline Integration

### LimitLine Integration
- **Objective**: Add LimitLine components as children of SPCTimeline
- **Actions**:
  - [ ] Add optional LimitLine rendering based on available data
  - [ ] Implement conditional rendering logic:
    - Show CL if spc_limits.cl exists for current filters
    - Show LCL if spc_limits.lcl exists for current filters  
    - Show UCL if spc_limits.ucl exists for current filters
  - [ ] Ensure proper layering (limits behind data points)
  - [ ] Add toggle controls for showing/hiding limit lines

### Filter Synchronization
- [ ] Sync LimitLine data with SPCTimeline filters
- [ ] Update limits when entity/process/product selections change
- [ ] Handle date range filtering for time-based limit changes

---

## 🔍 Clarification Questions for LimitLine Component

Before proceeding with Task 13, please clarify:

1. **Data Transition Behavior**: When a limit value changes on a specific date, should there be:
   - An immediate step change at that date?
   - A smooth transition over some time period?
   - Visual indication of the change point?

2. **Multiple Limits**: If there are multiple limit records for the same combination but different effective dates, should we:
   - Show only the most recent limit?
   - Show all historical limits as separate line segments?
   - Provide a time slider to view historical limits?

3. **Missing Data Handling**: When limit data doesn't exist for current filters, should we:
   - Hide the LimitLine entirely?
   - Show a placeholder or default line?
   - Display a message indicating missing limits?

4. **Performance Considerations**: For large datasets with frequent limit changes:
   - Should we implement data aggregation/sampling?
   - Use virtual rendering for performance?
   - Cache limit calculations?

5. **Interactive Features**: Should LimitLine components:
   - Be clickable to show limit details?
   - Have hover tooltips with limit values and effective dates?
   - Be draggable for "what-if" analysis?

---

## 📋 Implementation Priority

1. **High Priority**: Tasks 9-11 (Component restructuring and basic functionality)
2. **Medium Priority**: Task 12 (Zoom functionality)
3. **High Priority**: Tasks 13-14 (SPC limit visualization)

## 🧪 Testing Strategy

- [ ] Unit tests for each new component
- [ ] Integration tests for SPCTimeline with LimitLines
- [ ] Visual regression tests for chart rendering
- [ ] Performance tests with large datasets
- [ ] User interaction testing for zoom functionality

---

## 📝 Notes

- Maintain backward compatibility during refactoring
- Ensure TypeScript strict mode compliance
- Follow existing code style and conventions
- Document all new components with JSDoc comments
- Consider accessibility features for chart interactions