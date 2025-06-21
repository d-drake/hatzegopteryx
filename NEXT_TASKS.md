# Next Development Tasks

## 📊 Data Dashboard Sub-App (Next Session)

### Overview
Create a comprehensive data dashboard sub-app within the Next.js frontend featuring D3.js chart components for visualizing CD data analytics.

### Primary Goals
- **Main Feature**: 2D chart rendering of CD Data using D3.js
- **Architecture**: Sub-app structure within Next.js app router
- **Data Source**: Existing CD data (14,600+ records) from PostgreSQL/FastAPI backend

### Technical Requirements
- **D3.js Integration**: Add D3.js to Next.js project
- **Chart Components**: Reusable D3 chart components in TypeScript
- **Data Visualization**: Focus on CD measurement data relationships
- **Responsive Design**: Charts that work across device sizes
- **Interactive Features**: Hover, zoom, filtering capabilities

### Initial Chart Focus
- **2D Scatter Plot**: CD_ATT vs other measurement parameters
- **Correlations**: Visualize relationships between bias, cd_att, properties
- **Filtering**: Entity-based and date-range filtering
- **Color Coding**: Different entities or measurement ranges

### Implementation Notes
- Build as separate route/page: `/dashboard`
- Use existing API endpoints: `/api/cd-data/`
- Maintain current tabbed interface + add dashboard tab
- Consider chart performance with large datasets

### Current State
✅ Next.js 15 + TypeScript frontend ready
✅ CD data API endpoints functional (stats, entities, filtered data)
✅ 14,600 sample CD data records available
✅ Modern UI foundation with Tailwind CSS
✅ CI/CD pipeline working with Docker deployment

Ready to begin D3.js dashboard development in next session.