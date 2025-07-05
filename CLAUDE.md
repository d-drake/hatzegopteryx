# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## User Preferences

**Feedback Style**: Please provide honest, critical feedback over positive reinforcement. Point out flaws, inefficiencies, and better alternatives. Avoid unnecessary praise or sugar-coating issues.

## Project Overview

Cloud Critical Dimension Hub is a sophisticated fullstack SPC (Statistical Process Control) data visualization application designed for manufacturing analytics. The application features advanced interactive charts, real-time filtering, and comprehensive control limits integration.

**Core Technologies:**
- **Backend**: FastAPI (Python 3.13) with SQLAlchemy ORM
- **Frontend**: Next.js 15.3.4 with React 19, TypeScript, and Tailwind CSS
- **Database**: PostgreSQL 16 with comprehensive data seeding
- **Infrastructure**: Docker Compose orchestration with hot reload capabilities
- **Visualization**: D3.js-based chart system with advanced interactivity

## Essential Commands

### Development Environment
```bash
# Start all services (PostgreSQL, Backend, Frontend) with hot reload
docker compose -f docker-compose.dev.yml --env-file .env.dev up

# Stop all services
docker compose -f docker-compose.dev.yml --env-file .env.dev down

# Rebuild containers after dependency changes
docker compose -f docker-compose.dev.yml --env-file .env.dev build

# View logs
docker compose -f docker-compose.dev.yml --env-file .env.dev logs -f [service_name]

# Execute commands in running containers
docker compose -f docker-compose.dev.yml --env-file .env.dev exec backend python -m scripts.script_name
docker compose -f docker-compose.dev.yml --env-file .env.dev exec frontend npm run test
```

### Production Environment (Local Testing)
```bash
# Start services with production config
docker compose -f docker-compose.prod.yml --env-file .env.prod up

# Stop all services
docker compose -f docker-compose.prod.yml --env-file .env.prod down

# Note: Requires RDS endpoint in .env.prod
```

### Frontend Development
```bash
cd fullstack-app/frontend

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run linting
npm run lint

# Type check (manual)
npx tsc --noEmit
```

### Service URLs

#### Development
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation (Swagger): http://localhost:8000/docs
- Database Admin (Adminer): http://localhost:8080

#### Production (AWS)
- Frontend: https://ccdh.me (DNS → CloudFront → ALB → ECS)
- Backend API: https://t3f3cvzjv4.execute-api.us-west-1.amazonaws.com (API Gateway → Lambda)
- API Documentation: https://t3f3cvzjv4.execute-api.us-west-1.amazonaws.com/docs
- Database: Aurora Serverless v2 PostgreSQL (private VPC access only)

**Important**: Always access the production frontend via https://ccdh.me, NOT via the CloudFront URL directly. The API CORS configuration only allows requests from https://ccdh.me.

### Production Infrastructure Notes
- **CloudFront Configuration**: Uses ALB as origin (not S3), configured in Terraform
- **Domain & SSL**: ccdh.me alias and SSL certificate properly configured in `main.tf`
- **Infrastructure as Code**: No manual CloudFront updates needed after running Terraform
- **Authentication**: Superuser credentials configured via environment variables in terraform.tfvars
- **CORS Handling**: Custom Lambda handler manages OPTIONS preflight requests
- **Deployment**: Lambda function updates via `deploy_lambda.sh` script

## Architecture

### Backend Structure
- **Entry Point**: `backend/main.py` - FastAPI application with CORS middleware
- **Models**: `backend/models.py` - SQLAlchemy models (Item, CDData, SPCLimits)
- **Database**: `backend/database.py` - PostgreSQL connection with automatic seeding
- **Routers**: `backend/routers/` - API endpoints organized by domain
  - `items.py` - Items CRUD operations (demo functionality)
  - `cd_data.py` - CD data queries, statistics, and filtering
  - `spc_limits.py` - SPC control limits management and querying
- **Scripts**: `backend/scripts/` - Utility scripts and data generation
  - `generate_cd_data.py` - 43,800 CD data records with correlation modeling
  - `generate_spc_limits.py` - 144 SPC limits records for process control
  - `check_syntax.py` - Python syntax checker for backend files
  - `create_blacklist_table.py` - Database migration for blacklisted tokens
  - **Note**: All backend scripts should be placed in `/backend/scripts/` and run with `python -m scripts.script_name` from the backend directory
  - **Important**: Delete temporary one-time scripts (like analysis or cleanup scripts) after they've served their purpose to keep the scripts directory clean
- **Deployment**: `backend/deployment/` - Lambda deployment configuration
  - `lambda/lambda_handler.py` - AWS Lambda entry point with Mangum adapter
  - `scripts/build_lambda.sh` - Builds deployment package for AWS Lambda
  - `scripts/deploy_lambda.sh` - Updates Lambda function code
- **API Pattern**: RESTful endpoints with automatic OpenAPI documentation

### Frontend Structure
- **App Router**: Next.js 15 app directory with dynamic routing
- **Main Layout**: `frontend/src/app/layout.tsx` - Root layout with Geist font
- **Pages**: 
  - `/` - Main page with Items and CD Data sections
  - `/spc-dashboard/[spcMonitor]/[processProduct]` - Dynamic SPC visualization dashboard
- **Component Architecture**: Hierarchical organization for maximum reusability

#### Chart Components (`/components/charts/`)
- **Timeline.tsx** - Advanced generic timeline with zoom, dual-axis, legend support
- **ChartContainer.tsx** - Responsive wrapper with dimension management
- **Axis.tsx** - D3-based axis rendering with custom formatting
- **Legend.tsx** - Interactive legend with clickable panels and selection filtering
- **ZoomControls.tsx** - Zoom level display and reset functionality
- **Circles.tsx, Symbols.tsx** - Data point rendering with shape/color mapping
- **Line.tsx** - Entity-grouped line connections for trend analysis
- **Tooltip.tsx** - Rich tooltip system with SPC metadata support

#### SPC Dashboard Components (`/components/spc-dashboard/`)
- **SPCTimeline.tsx** - SPC-specific Timeline wrapper with control limits
- **LimitLine.tsx** - SPC control limit rendering (CL, LCL, UCL) with step changes
- **FilterControls.tsx** - Advanced filtering interface with URL synchronization

#### Core Application Components
- **AppTabs.tsx** - Main application navigation
- **ItemsSection.tsx** - CRUD operations for demo items
- **CDDataSection.tsx** - CD data display with comprehensive statistics

### Advanced Chart System

#### Multi-Axis Zoom Functionality
- **Independent zoom**: Separate zoom for X, Y, and secondary Y2 axes
- **Scroll-based interaction**: Zoom by scrolling over specific axis regions
- **Visual cursor feedback**: `ew-resize` and `ns-resize` cursors for axis-specific zoom
- **Domain management**: Real-time scale domain updates with zoom state preservation
- **Reset controls**: Zoom level display and one-click reset functionality

#### Interactive Legend System
- **Clickable panels**: Seamless selection areas spanning from marker to text
- **Multi-legend support**: Independent legends for color and shape mappings
- **Selection state management**: Cross-legend selection with proper opacity handling
- **Visual feedback**: Hover highlighting and selection state indication
- **Fixed-width panels**: Calculated based on longest text for consistent interaction

#### Dual-Axis Visualization
- **Primary Y-axis**: Main measurement data (left side) - cd_att, cd_x_y
- **Secondary Y2-axis**: Additional data overlay (right side) - bias data
- **Independent scaling**: Separate zoom and domain management per axis
- **Visual differentiation**: Color-coded axes labels and data points

### Database Schema

#### SPC CD L1 Table (`spc_cd_l1`) - 43,800 records
**IMPORTANT**: This table was formerly named `cd_data` but has been renamed to `spc_cd_l1`
- **Core measurements**: `cd_att`, `cd_x_y`, `cd_6sig` (Critical Dimension data)
- **Bias measurements**: `bias`, `bias_x_y` (Process bias indicators)
- **Process metadata**: `process_type` (1000-3000), `product_type` (BNT44, BNT45, etc.)
- **SPC context**: `spc_monitor_name` (SPC_CD_L1, SPC_CD_L2, etc.)
- **Manufacturing data**: `entity` (FAKE_TOOL1-6), `lot`, `date_process`
- **Process duration**: `duration_subseq_process_step` (1500-2200s, correlated with CD quality)
- **Properties**: `fake_property1`, `fake_property2` for shape/grouping visualization

#### SPC Limits Table (`spc_limits`) - 144 records
- **Control limits**: `cl` (center line), `lcl` (lower), `ucl` (upper control limits)
- **Chart identification**: `spc_chart_name` (cd_att, cd_x_y, cd_6sig), `spc_monitor_name`
- **Process context**: `process_type`, `product_type` for manufacturing alignment
- **Temporal tracking**: `effective_date` for control limit evolution over time

#### Items Table (`items`) - Demo functionality
- Basic CRUD operations for application demonstration
- Timestamp tracking with `created_at`, `updated_at`

#### User Tables (Production-Only - Preserve During Migration)
- **`users`** - User accounts with authentication data
- **`registration_requests`** - User registration workflow
- **`refresh_tokens`** - JWT refresh token management
- **`audit_logs`** - Security audit trails
- **`blacklisted_tokens`** - Token revocation list

## Current Development Status

### Recently Completed Major Features

#### SPC Dashboard (v2.0)
- **Dynamic URL routing**: `/spc-dashboard/[spcMonitor]/[processProduct]` with parameter encoding
- **Real-time filtering**: Entity, date range, and process filtering with URL synchronization
- **Control limits integration**: Dynamic CL/LCL/UCL overlay with chart-specific limits
- **Advanced chart interactions**: Zoom, legend selection, tooltip enhancements

#### Timeline Chart System (v3.0)
- **Multi-axis zoom**: Independent X, Y, Y2 axis zoom with visual feedback cursors
- **Enhanced legends**: Clickable panels with seamless marker-to-text interaction
- **Data filtering**: Visible data optimization with clipping boundary management
- **Correlation visualization**: Duration field integration with manufacturing context

#### Infrastructure Improvements
- **Docker hot reload**: Both frontend and backend development environments
- **CI/CD optimization**: Separate startup scripts for CI vs development environments
- **Performance tuning**: Chart rendering optimization and efficient data querying

### Active Development Areas

#### Chart Enhancement Pipeline
- **Responsive design**: Mobile-friendly chart interactions and touch support
- **Export functionality**: Chart data export and image generation capabilities
- **Animation system**: Smooth transitions for data updates and zoom operations

#### SPC Analytics Expansion
- **Statistical overlays**: Process capability indices (Cp, Cpk) calculation and display
- **Trend analysis**: Statistical trend detection and alert systems
- **Historical comparison**: Time-based process performance comparison tools

#### Data Integration
- **Real-time updates**: WebSocket integration for live manufacturing data
- **Data validation**: Enhanced input validation and error handling
- **Performance monitoring**: Query optimization and caching strategies

## Infrastructure and Database Access

### **CRITICAL**: Database Table Name Change
The main data table was renamed from `cd_data` to `spc_cd_l1` to better reflect SPC naming conventions.

### Production Database Access
For production database access and migration procedures, refer to:
- **Main Guide**: `/docs/infrastructure/serverless_deployment_guide.md`
- **Bastion Setup**: `/docs/infrastructure/aws_bastion_host_setup.md`  
- **Management Script**: `/infrastructure/scripts/manage-bastion.sh`

## Environment Configuration

### Docker Compose Environment Setup:
The project uses environment-specific Docker Compose files:
- **Development**: `docker compose -f docker-compose.dev.yml --env-file .env.dev`
- **Production**: `docker compose -f docker-compose.prod.yml --env-file .env.prod`

### Environment Files:
- **`.env.dev`** - Development environment (committed to Git)
- **`.env.prod`** - Production environment (gitignored for security)
- **`.env`** - Legacy/default file

### Key Environment Variables:
```env
# Database
POSTGRES_USER=appuser
POSTGRES_PASSWORD=<environment-specific>
POSTGRES_DB=appdb

# Superuser
SUPERUSER_EMAIL=admin@ccdh.me
SUPERUSER_USERNAME=admin
SUPERUSER_PASSWORD=<environment-specific>

# JWT
SECRET_KEY=<environment-specific>
ALGORITHM=HS256

# Frontend
NEXT_PUBLIC_API_URL=<environment-specific>
```

### Docker Configuration Features:
- **Hot reload**: Volume mounts for live code updates
- **Health checks**: Comprehensive service monitoring
- **Service dependencies**: Proper startup orchestration
- **Development optimization**: `CHOKIDAR_USEPOLLING=true` for reliable file watching

## CI/CD Pipeline

### GitHub Actions Workflow
The project uses optimized CI/CD with environment-specific configurations:

#### Production Environment Strategy
- **Full data seeding**: 43,800+ records for realistic testing environment
- **Performance optimization**: Database indexing and query optimization
- **Container health monitoring**: Comprehensive service validation

#### CI Environment Strategy  
- **Minimal seeding**: Fast container validation without heavy data generation
- **Optimized startup**: `startup-ci.sh` for rapid testing cycles
- **Service connectivity**: Basic API endpoint validation

#### Key Performance Metrics
- **Pipeline Duration**: ~2m40s (optimized from 8-15m failures)
- **Container Startup**: <30s in CI environment
- **Service Health**: All containers healthy with proper dependency management

## Development Guidelines

### Documentation Conventions

#### Documentation Organization
The `/docs/` directory follows a structured organization for better discoverability:

```
/docs/
├── architecture/      # System design principles and patterns
├── infrastructure/    # AWS, Docker, deployment guides
├── security/         # Security implementation and guidelines
├── testing/          # Testing best practices and organization
├── development/      # Development guides (responsive design, etc.)
├── performance/      # Performance optimization guides
└── archive/          # Completed feature implementations
    ├── features/     # Historical feature documentation
    └── code-quality/ # Code quality audit reports and improvements
```

#### Documentation Guidelines
1. **File Naming**: Use lowercase with hyphens for all markdown files (e.g., `security-implementation-guide.md`)
2. **Organization**: Documentation must be organized extremely well with care in the `/docs/` folder
   - Choose the most appropriate subfolder based on content type
   - Create new subfolders only when necessary for clear categorization
3. **Temporary Documentation**: 
   - Temporary markdown files should go in `/tmp/` folders within the proper organized location
   - Example: `/docs/development/tmp/` for temporary development notes
   - Clean up temporary files regularly
4. **Active vs Archive**: 
   - Keep operational guides in main folders
   - Move completed feature implementations to `/archive/features/`
   - Move code quality audits to `/archive/code-quality/`
5. **Consolidation**: Merge related documents to avoid redundancy
6. **Git Policy**: The `/docs/` directory is gitignored - do not commit documentation

#### Creating New Documentation
- **Architecture**: MUST READ FIRST - Design principles, patterns, anti-patterns → `/docs/architecture/`
- **Infrastructure**: AWS setup, deployment guides, Docker configs → `/docs/infrastructure/`
- **Security**: Security features, compliance, incident response → `/docs/security/`
- **Testing**: Test strategies, best practices, coverage reports → `/docs/testing/`
- **Development**: Coding guides, responsive design → `/docs/development/`
- **Performance**: Optimization guides, benchmarks → `/docs/performance/`
- **Features**: Once implemented, move design docs to → `/docs/archive/features/`
- **Code Quality**: Audit reports, linting results, quality improvements → `/docs/archive/code-quality/`

#### Required Reading Before Development
1. `/docs/architecture/decision-checklist.md` - Complete before writing any code
2. `/docs/architecture/optimization-principles.md` - Core efficiency patterns
3. `/docs/architecture/anti-patterns.md` - Common mistakes to avoid

#### Weekly Architecture Documentation Review
**Reminder**: Once per week, have Claude review `/docs/architecture/` content to:
- Replace generic examples with actual codebase patterns
- Calibrate complexity scoring based on real implementation data
- Add newly discovered anti-patterns
- Update optimization principles with lessons learned
- Propose revisions based on codebase evolution

### Sentry Issue Review Strategy

#### Proper Method to Review Sentry Issues
1. **List Issues by Project**: Use project parameter, not query filters
   ```
   mcp__sentry__find_issues(
     organizationSlug="pdev-zx",
     projectSlug="ccdh-frontend",  # or "ccdh-backend"
     regionUrl="https://us.sentry.io"
   )
   ```

2. **Avoid Unreliable Queries**: The `is:unresolved` query may not work reliably
   - Instead, retrieve all issues and check their status
   - Use `sortBy="last_seen"` to prioritize recent issues

3. **Systematic Resolution Process**:
   - Create a todo list of all issues to track progress
   - Group similar issues (same error type, same file)
   - Investigate root cause before marking as resolved
   - Update issue status using `mcp__sentry__update_issue`

4. **Common Issue Categories**:
   - **Build/Deploy Issues**: Module not found, build errors
   - **Runtime Errors**: Undefined variables, initialization errors
   - **API Issues**: Rate limiting (429), authentication errors
   - **Type Errors**: Cannot read properties, type mismatches

5. **Resolution Best Practices**:
   - Fix the root cause in code when possible
   - For old/stale issues from previous deployments, mark as resolved
   - For rate limiting, implement proper retry logic and request throttling
   - Document any workarounds in relevant code files

### Testing Conventions

#### Test File Organization (Updated 2025-06-28)
- **Primary Test Location**: All tests should be placed under `/fullstack-app/tests/`
  - E2E tests: `/tests/e2e/` (organized by feature)
    - `/tests/e2e/smoke/` - Critical path tests
    - `/tests/e2e/user-journeys/` - Complete workflows
    - `/tests/e2e/spc-dashboard/` - SPC-specific tests
  - Integration tests: `/tests/integration/backend/` or `/tests/integration/frontend/`
  - Unit tests: `/tests/unit/backend/` or `/tests/unit/frontend/`
  - Visual tests: `/tests/visual/`
  - Performance tests: `/tests/performance/`
  - Test helpers: `/tests/helpers/`

#### Test Reorganization Status
- **Completed**: Major test reorganization on 2025-06-28
- **Tests Kept**: ~36 files (down from ~90)
- **Tests Removed**: ~55 outdated files (security tests, duplicates, debug files)
- **Current Structure**: Clean hierarchical organization under `/tests/`

#### File Naming Conventions
- E2E tests: `feature-name.e2e.ts` (e.g., `login-flow.e2e.ts`)
- Integration tests: `feature.integration.test.ts` or `.py`
- Unit tests: `module.test.ts` or `.py`
- Visual tests: `component.visual.ts`
- Performance tests: `scenario.perf.ts`

#### Test Scripts (package.json)
- `npm run test:e2e` - Run all E2E tests
- `npm run test:e2e:smoke` - Run critical path tests only
- `npm run test:e2e:spc` - Run SPC dashboard tests
- `npm run test:visual` - Run visual regression tests
- `npm run test:all` - Run all test suites

#### Test Framework Guidelines
- **E2E Tests**: Use Playwright with TypeScript
- **Frontend Tests**: Use Jest with TypeScript
- **Backend Tests**: Use Pytest with Python
- **Prefer TypeScript** for all new test files (except Python backend tests)

#### Playwright Test Organization
- **Browser**: Use Chromium browser for Playwright testing
- **Headless Mode**: Use headless mode by default for all tests (`headless: true`)
  - Only use `headless: false` when debugging visual issues

#### Test Screenshot Organization (Updated 2025-06-28)
Test-related images should be organized under `/fullstack-app/tests/screenshots/` with the following structure:

```
/fullstack-app/tests/screenshots/
├── baseline/              # Visual regression baseline images
│   ├── desktop/          # Desktop viewport baselines
│   ├── mobile/           # Mobile viewport baselines
│   └── tablet/           # Tablet viewport baselines
├── diff/                 # Visual regression diff images (gitignored)
├── failures/             # Test failure screenshots (gitignored)
│   ├── e2e/             # E2E test failures
│   ├── integration/     # Integration test failures
│   └── visual/          # Visual test failures
├── reports/              # Test report screenshots
│   ├── coverage/        # Coverage report images
│   └── performance/     # Performance test results
└── debug/               # Debug/development screenshots (gitignored)
```

**Important Guidelines:**
- **Baseline images** (`/baseline/`) should be committed to version control
- **Temporary images** (`/diff/`, `/failures/`, `/debug/`) should be gitignored
- **Report images** (`/reports/`) should be selectively committed based on importance
- **External development screenshots** should go to `~/tmp/tests/` (outside project)
- **Playwright config** should output failures to `/tests/screenshots/failures/`
- **Visual regression tools** should use `/tests/screenshots/baseline/` for comparisons

#### Test Organization Principles
1. Group tests by feature/domain, not by page or component type
2. Keep E2E and integration tests in centralized `/tests/` directory
3. Unit tests can be co-located with source code in `__tests__` directories
4. Separate test utilities in `/tests/helpers/` and fixtures in `/tests/fixtures/`

**Note**: See `/docs/testing/test-organization-guidelines.md` for detailed guidelines

### Code Organization Principles
- **Component hierarchy**: Chart components are highly reusable and composable
- **Type safety**: Full TypeScript coverage with strict mode enforcement
- **Performance focus**: Memoized calculations and efficient re-rendering patterns
- **Responsive design**: Mobile-first approach with flexible chart dimensions

### Chart Development Patterns
- **D3.js integration**: Direct DOM manipulation with React lifecycle management
- **Scale management**: Separate scales for axes and data positioning
- **Event handling**: Non-passive wheel events for zoom, pointer events for interaction
- **Memory management**: Proper cleanup of event listeners and D3 selections

### SPC-Specific Considerations
- **Manufacturing context**: All data modeling reflects realistic semiconductor processes
- **Statistical accuracy**: Control limits calculated using proper SPC methodologies
- **Real-time requirements**: Chart updates optimized for live manufacturing data streams
- **Domain expertise**: Field naming and data relationships follow industry standards

## Technical Excellence Features

### Chart System Capabilities
- **Multi-dimensional visualization**: Time, value, color, shape, and grouping dimensions
- **Interactive features**: Zoom, pan, legend filtering, rich tooltips with metadata
- **Performance optimization**: Visible data filtering and efficient scale management
- **Responsive design**: Flexible dimensions with mobile-friendly interactions

### Manufacturing Analytics
- **Process monitoring**: SPC data visualization for quality control
- **Entity tracking**: Tool-based data organization and analysis
- **Temporal analysis**: Time-based process evolution and trend detection
- **Statistical control**: Real-time control limit monitoring and violation detection

### Development Infrastructure
- **Modern stack**: React 19, Next.js 15, TypeScript with latest language features
- **Container orchestration**: Docker Compose with development optimization
- **Database performance**: PostgreSQL with comprehensive indexing strategy
- **API architecture**: FastAPI with automatic documentation and validation

---

**Note**: This application represents a sophisticated manufacturing data visualization platform with enterprise-grade chart capabilities, comprehensive SPC integration, and modern full-stack architecture. The focus is on providing intuitive, powerful tools for semiconductor manufacturing quality control and process analysis.</content>
</invoke>