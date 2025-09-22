npm# RMSv3 Comprehensive TODO List

## Phase 0: Cleanup & Guardrails

- [ ] **Project Structure Cleanup**
  - [ ] Move all audit/*.md files to docs/archive/
  - [ ] Delete pnpm-lock.backup.yaml file
  - [ ] Move markdown files from project root to docs/ directory
  - [ ] Organize documentation files logically

- [ ] **TypeScript Configuration**
  - [ ] Add `noUncheckedIndexedAccess: true` to tsconfig.app.json
  - [ ] Run type check to identify broken code from stricter rules
  - [ ] Fix all type errors resulting from stricter settings

- [ ] **Logging Centralization**
  - [ ] Identify all direct console.log usage with grep
  - [ ] Replace console.log with logger.info/debug/error as appropriate
  - [ ] Update Vite configuration to drop console statements in production
  - [ ] Configure logger severity levels based on environment

- [ ] **React Router Migration**
  - [ ] Replace BrowserRouter with createBrowserRouter
  - [ ] Set up proper route objects with nested structure
  - [ ] Configure data loading and error boundaries
  - [ ] Implement lazy loading for all routes
  - [ ] Fix useUnsavedGuard to work with data router

## Phase 1: Data & Sync Foundations

- [ ] **Data Layer Reorganization**
  - [ ] Create `src/data/local` directory for local database operations
  - [ ] Create `src/data/sync` directory for sync mechanisms
  - [ ] Create `src/data/remote` directory for remote API integration
  - [ ] Create `src/data/outbox` directory for offline-first outbox pattern
  - [ ] Move existing data code to appropriate locations

- [ ] **Outbox Pattern Implementation**
  - [ ] Design outbox queue data structure
  - [ ] Create outbox store for offline operations
  - [ ] Implement queue processing mechanism
  - [ ] Add retry logic for failed operations

- [ ] **Online Triggers**
  - [ ] Add listeners for online/offline events
  - [ ] Process outbox queue on network restoration
  - [ ] Implement exponential backoff for retries
  - [ ] Add network status indicators in UI

- [ ] **PouchDB Optimization**
  - [ ] Review and enhance existing PouchDB indexes
  - [ ] Create indexes for aggregateId, type, and timestamp
  - [ ] Implement compound indexes for common queries
  - [ ] Add performance monitoring for queries

- [ ] **Conflict Resolution**
  - [ ] Define conflict policy for each domain object
  - [ ] Implement resolver functions for each domain
  - [ ] Add conflict detection mechanism
  - [ ] Create conflict resolution UI where needed

- [ ] **Database Compaction**
  - [ ] Implement periodic compaction strategy
  - [ ] Add compaction trigger after successful sync
  - [ ] Add compaction trigger on application startup
  - [ ] Add compaction trigger after threshold of changes

- [ ] **Event Schema & Validation**
  - [ ] Create zod schemas for all event types
  - [ ] Implement runtime validation before event processing
  - [ ] Add error handling for validation failures
  - [ ] Create test cases for schema validation

- [ ] **Event Versioning**
  - [ ] Add version field to all event types
  - [ ] Create migration functions between versions
  - [ ] Implement version detection and migration at runtime
  - [ ] Add event version tests

## Phase 2: Dashboard Fixes

- [ ] **Analytics Cards & Charts**
  - [ ] Identify and remove redundant dashboard cards
  - [ ] Connect remaining cards to real event data
  - [ ] Replace dummy chart data with actual metrics
  - [ ] Implement data refresh mechanism with indicators
  - [ ] Add loading states for data fetching

- [ ] **Dashboard Filtering**
  - [ ] Fix Compare functionality between time periods
  - [ ] Implement date range filters with validation
  - [ ] Fix sorting functionality on dashboard tables
  - [ ] Add filter persistence between sessions

- [ ] **Status Bar Under Header**
  - [ ] Evaluate if status bar is needed
  - [ ] Either remove `<div class="bg-surface border-b border-border-primary...">` entirely
  - [ ] Fix unrecognized icons in the bar under Header (cache hit rate, sync ready)
  - [ ] Fix broken icon and "0%" display with real metrics
  - [ ] If kept, document meaning of all indicators

- [ ] **Dashboard Links**
  - [ ] Review all dashboard card links
  - [ ] Connect links to appropriate routes
  - [ ] Add state passing between routes where needed
  - [ ] Test all navigation paths

## Phase 3: Navigation & Header Cleanup

- [ ] **Collapse Sidebar Button**
  - [ ] Identify duplicate button implementations
  - [ ] Remove `<button class="hidden lg:flex p-2 text-text-secondary...">` or alternate version
  - [ ] Test sidebar collapse functionality
  - [ ] Ensure responsive behavior works correctly

- [ ] **Search Bar**
  - [ ] Reposition search bar in header
  - [ ] Apply correct styling consistent with design system
  - [ ] Implement search indexing for inventory, customers, etc.
  - [ ] Create search results component
  - [ ] Add keyboard navigation for results

- [ ] **Notifications**
  - [ ] Create notification store connected to events
  - [ ] Replace dummy notification data with real events
  - [ ] Make notifications clickable with appropriate actions
  - [ ] Fix "See all notifications" navigation
  - [ ] Add notification read/unread state

- [ ] **Settings vs Account Navigation**
  - [ ] Move Settings section to side navigation
  - [ ] Keep Account section in user dropdown
  - [ ] Clarify purpose of each section in UI
  - [ ] Ensure consistent routing patterns
  - [ ] Test navigation flows between sections

## Phase 4: Roles & Multi-tenant (Owner Model)

- [ ] **Business Owner Model**
  - [ ] Implement one-owner-per-business validation
  - [ ] Configure owner permissions (full except module toggles)
  - [ ] Update signup flow to business-owner-only
  - [ ] Add tenant identifier to all relevant data

- [ ] **Role Cleanup**
  - [ ] Audit existing roles in the system
  - [ ] Remove deprecated or unused roles
  - [ ] Document core role types and their permissions
  - [ ] Update role management UI

- [ ] **Custom Role Management**
  - [ ] Create role creation interface
  - [ ] Implement permission assignment UI
  - [ ] Add module toggle capability for roles
  - [ ] Implement role editing and deletion
  - [ ] Add role assignment to users

- [ ] **Permission System**
  - [ ] Enhance DynamicRoleGuard with tenant isolation
  - [ ] Implement permission checks throughout the application
  - [ ] Create permission testing utilities
  - [ ] Add audit logging for permission changes

## Phase 5: Technical Admin Dashboard

- [ ] **Admin Dashboard Creation**
  - [ ] Design admin layout and navigation
  - [ ] Create tenant listing view with filters
  - [ ] Implement tenant detail view
  - [ ] Add admin-specific navigation

- [ ] **Module Management**
  - [ ] Create module toggle UI for tenants
  - [ ] Implement module state persistence
  - [ ] Add effect handlers for module state changes
  - [ ] Implement module dependency management

- [ ] **Tenant Management**
  - [ ] Add tenant suspension functionality
  - [ ] Implement tenant termination with safeguards
  - [ ] Create data export/backup features
  - [ ] Add owner password reset functionality
  - [ ] Implement signup approval workflow
  - [ ] Create business metadata viewer
  - [ ] Add audit log access and filtering

## Phase 6: Inventory & Menu Structure

- [ ] **Item Types Relocation**
  - [ ] Move Item Types from `/Manage` to `/Inventory/Items`
  - [ ] Update all references and navigation
  - [ ] Test item type management in new location
  - [ ] Remove duplicate Item Types route at `/settings/item-types`

- [ ] **Category Creation**
  - [ ] Create separate form for category creation
  - [ ] Remove category creation from item creation form
  - [ ] Create standalone category management form in `/inventory`
  - [ ] Make category selectable when adding new items
  - [ ] Implement category management interface
  - [ ] Add validation for category fields

- [ ] **UI Cleanup**
  - [ ] Remove duplicate "Add Item" button in `/Inventory/Items`
  - [ ] Test item creation workflow
  - [ ] Fix styling inconsistencies

- [ ] **Item Table Functionality**
  - [ ] Implement item editing functionality
  - [ ] Add item deletion with confirmation
  - [ ] Replace dummy columns/data with real inventory data
  - [ ] Add sorting and filtering to item table

- [ ] **Inventory Audit**
  - [ ] Fix error when starting new count
  - [ ] Connect audit to real inventory data
  - [ ] Implement variance calculation
  - [ ] Add audit completion workflow
  - [ ] Create audit history view

- [ ] **History & Reports**
  - [ ] Connect Inventory History to real data
  - [ ] Replace dummy data in Order History
  - [ ] Connect KDS Reports to actual kitchen data
  - [ ] Implement live Activity Log from events
  - [ ] Add filtering and export for all reports

## Phase 7: Menu Item Model

- [ ] **Data Model Updates**
  - [ ] Update Menu Item schema to reference Inventory Item
  - [ ] Keep SKU field only on Inventory Item
  - [ ] Implement bill of materials data structure
  - [ ] Create schema migrations for existing data

- [ ] **UI Form Updates**
  - [ ] Modify Menu Item forms to reference inventory items
  - [ ] Remove duplicate SKU field from Menu Item UI
  - [ ] Create inventory item selector component
  - [ ] Add bill of materials selection interface
  - [ ] Implement quantity inputs for BoM items

- [ ] **Integration Testing**
  - [ ] Verify Menu changes reflect in Inventory
  - [ ] Test Inventory updates reflect in Menu
  - [ ] Verify Menu properly integrates with POS
  - [ ] Test integration with KDS

- [ ] **Data Migration**
  - [ ] Create script to update existing Menu Items
  - [ ] Establish references between Menu and Inventory items
  - [ ] Test data integrity after migration
  - [ ] Create rollback plan

## Phase 8: POS & Customers

- [ ] **PIN Validation**
  - [ ] Implement secure PIN validation for Return/Void
  - [ ] Create PIN request modal with proper validation
  - [ ] Add timeout and retry limits for PIN entry
  - [ ] Test PIN validation flows

- [ ] **Order Submission**
  - [ ] Connect POS order submission to KDS
  - [ ] Implement real-time order status updates
  - [ ] Add order event handling in KDS
  - [ ] Test end-to-end order flow

- [ ] **Notification System**
  - [ ] Create order status notification events
  - [ ] Implement notification display in UI
  - [ ] Add notification sounds or alerts
  - [ ] Test notification delivery and display

- [ ] **Order History**
  - [ ] Create order history projection from events
  - [ ] Build order history interface with filtering
  - [ ] Add order detail view
  - [ ] Implement order history search

- [ ] **Customer Management**
  - [ ] Fix customer create functionality
  - [ ] Implement customer update operations
  - [ ] Add customer delete with confirmation
  - [ ] Ensure customers appear in listing after creation
  - [ ] Fix customer View/Edit functionality
  - [ ] Connect POS customer dropdown to customer database
  - [ ] Add customer search functionality
  - [ ] Fix customers table column alignment and sizing
  - [ ] Standardize page title and header styling

- [ ] **Clock In Feature**
  - [ ] Move Clock In feature to standalone tab outside POS
  - [ ] Test Clock In functionality
  - [ ] Fix any issues with time tracking
  - [ ] Ensure proper user association with clock events

## Phase 9: Remove Loyalty

- [ ] **Remove UI Components**
  - [ ] Identify all Loyalty-related components
  - [ ] Remove components from codebase
  - [ ] Update affected layouts
  - [ ] Remove loyalty points from Customer Profile UI
  - [ ] Purge all mentions of loyalty points from customer-related components

- [ ] **Remove Routes**
  - [ ] Remove Loyalty routes from App.tsx
  - [ ] Update route tests
  - [ ] Fix any broken navigation paths

- [ ] **Clean Database**
  - [ ] Identify Loyalty database tables/documents
  - [ ] Create data export functionality if needed
  - [ ] Remove Loyalty data structures
  - [ ] Update database schemas

- [ ] **Update Navigation**
  - [ ] Remove Loyalty options from navigation
  - [ ] Fix any layout issues resulting from removal

- [ ] **Clean Event Types**
  - [ ] Remove Loyalty events from event types
  - [ ] Update event handling code
  - [ ] Fix any broken event subscribers

- [ ] **Document Migration**
  - [ ] Document data migration strategy for existing loyalty data
  - [ ] Create archiving plan if data must be preserved
  - [ ] Document feature removal in changelog

## Phase 10: Business/Settings Cleanup

- [ ] **Branch Form Fixes**
  - [ ] Update Branch form in `/Manage/Branches` to use global styling
  - [ ] Implement consistent form validation
  - [ ] Simplify inputs to essential fields
  - [ ] Apply same improvements to edit form
  - [ ] Test form submission and validation

- [ ] **Business Account Settings**
  - [ ] Add branch location/address fields
  - [ ] Implement Google Maps link integration
  - [ ] Remove rating field from UI and database
  - [ ] Replace dummy data with real persistence
  - [ ] Test settings save and load functionality

## Phase 11: Tests & CI Hardening

- [ ] **Test Organization**
  - [ ] Choose single test pattern (colocated or \_\_tests\_\_)
  - [ ] Refactor existing tests to follow chosen pattern
  - [ ] Create test utilities for common operations
  - [ ] Document testing standards

- [ ] **Unit Tests**
  - [ ] Add tests for event handlers
  - [ ] Create tests for business logic functions
  - [ ] Test UI components with mock data
  - [ ] Test utility functions

- [ ] **Integration Tests**
  - [ ] Test event flow (append → project → query)
  - [ ] Create form submission integration tests
  - [ ] Test API interaction with mock server
  - [ ] Test offline functionality

- [ ] **E2E Tests**
  - [ ] Create POS order flow test
  - [ ] Implement Inventory count process test
  - [ ] Test Customer management workflow
  - [ ] Add authentication flow testing

- [ ] **CI Configuration**
  - [ ] Configure automatic test runs on changes
  - [ ] Add linting to CI pipeline
  - [ ] Implement build verification
  - [ ] Add type checking to CI

- [ ] **Electron Hardening**
  - [ ] Verify contextIsolation, nodeIntegration, sandbox settings
  - [ ] Create preload script with narrow API
  - [ ] Improve CSP for production
  - [ ] Implement secure IPC communication
  - [ ] Test Electron security with audit tools
