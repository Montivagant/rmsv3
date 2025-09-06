# RMS v3 - Critical Paths

This document defines the critical user workflows that must be tested to validate core system functionality.

## Critical Path 1: POS Checkout Flow

**Objective**: Complete a full point-of-sale transaction from item selection to payment

### Steps:
1. **Navigate to POS**: Visit `/pos` route
2. **Browse Menu**: Use search and category filters to find items
3. **Add Items to Cart**: 
   - Click on menu items to add to cart
   - Verify quantity increases and totals update
   - Test quantity modification in cart panel
4. **Apply Discounts**: 
   - Enter discount amount in cart panel
   - Verify discount is applied before tax calculation
5. **Select Customer** (Optional):
   - Choose customer for loyalty points
   - Verify customer selection affects tax calculation if applicable
6. **Calculate Totals**:
   - Verify subtotal = sum of (item price × quantity)
   - Verify discount is capped at subtotal amount
   - Verify tax calculated on discounted amount
   - Verify total = subtotal - discount + tax
7. **Open Payment Modal**:
   - Click "Place Order" or "Proceed to Payment"
   - Verify payment modal opens with correct amount
8. **Process Payment**:
   - Select payment method (cash/card/loyalty)
   - For cash: enter amount ≥ total
   - For card: verify redirect workflow
   - For loyalty: enter points to redeem
9. **Complete Transaction**:
   - Verify payment success message
   - Verify cart clears automatically
   - Verify inventory decrements (if applicable)
10. **Generate New Ticket**:
    - Verify new ticket ID generated
    - Verify clean state for next transaction

### Expected Outcomes:
- Transaction recorded as `sale.recorded` event
- Payment recorded as `payment.processed` event  
- Inventory adjusted based on recipes/BOM
- Customer loyalty points accrued (if customer selected)
- Cart cleared and ready for next transaction
- All monetary calculations follow rounding rules (half-up to 2 decimals)

---

## Critical Path 2: KDS Order Flow

**Objective**: Process an order through the kitchen workflow

### Prerequisites:
- KDS feature flag enabled (`/settings` → Feature Flags → KDS)
- At least one order in "preparing" status

### Steps:
1. **Navigate to KDS**: Visit `/kds` route
2. **View Order Queue**:
   - Verify orders displayed in columns: Preparing → Ready → Served
   - Verify order details show items, quantities, customer info
   - Verify time tracking displays for each order
3. **Advance Order Status**:
   - Click order in "Preparing" column
   - Mark as "Ready"
   - Verify order moves to "Ready" column
4. **Complete Order**:
   - Click order in "Ready" column  
   - Mark as "Served"
   - Verify order moves to "Served" column
5. **Undo Status Change** (Optional):
   - Use undo function to revert status
   - Verify order returns to previous column
6. **Auto-refresh**:
   - Wait 30 seconds
   - Verify data refreshes automatically
7. **Role-based Access**:
   - Test with Staff role: should allow ready/served transitions
   - Test with higher roles: should have full access

### Expected Outcomes:
- Order status updates persist across page refreshes
- Time tracking updates correctly for each status change
- Role permissions enforced correctly
- Auto-refresh maintains current view state
- Status changes trigger appropriate events

---

## Critical Path 3: Inventory Management

**Objective**: Add inventory item and manage stock levels

### Steps:
1. **Navigate to Inventory**: Visit `/inventory` route
2. **View Inventory Overview**:
   - Verify KPI cards show: total items, low stock, stock value
   - Check for inventory alerts and status indicators
3. **Add New Item**:
   - Click "Add Item" button (if available in current tab)
   - Fill required fields:
     - SKU (unique identifier)
     - Name
     - Category
     - Unit of measure
     - Quantity
     - Cost
     - Reorder point
   - Validate form prevents submission with missing required fields
   - Submit form and verify success message
4. **Verify Item Addition**:
   - Item appears in inventory list
   - Search functionality finds the new item
   - Item details are correct
5. **Edit Item**:
   - Click on item to open edit drawer/modal
   - Modify quantity or other fields
   - Save changes and verify updates
6. **Check Stock Alerts**:
   - Set item quantity below reorder point
   - Verify low-stock alert appears
   - Check alert notifications in UI
7. **Filter and Search**:
   - Use category filters
   - Search by item name or SKU
   - Verify results update correctly

### Expected Outcomes:
- New items successfully added with validation
- Inventory updates trigger appropriate events
- Stock level alerts function correctly
- Search and filtering work as expected
- Changes persist across page refreshes
- Inventory engine applies BOM rules during sales

---

## Critical Path 4: Customer Management

**Objective**: Add customer and manage loyalty profile

### Steps:
1. **Navigate to Customers**: Visit `/customers` route
2. **View Customer Table**:
   - Verify pagination works with large datasets
   - Test sorting by different columns
   - Verify virtualization handles scrolling smoothly
3. **Add New Customer**:
   - Click "Add Customer" button
   - Fill customer form:
     - Name (required)
     - Email (required, validated)
     - Phone (optional, validated if provided)
   - Test form validation with invalid data
   - Submit valid form and verify success
4. **Search and Filter**:
   - Use search to find customers by name/email
   - Apply filters (status, tags, spend range, etc.)
   - Verify URL state updates with search/filter parameters
   - Test filter chips and reset functionality
5. **Bulk Operations**:
   - Select multiple customers using checkboxes
   - Verify bulk actions bar appears at bottom
   - Test "Export CSV" functionality
   - Test "Add Tag" to selected customers
   - Test "Activate/Deactivate" with confirmation
6. **Customer Profile**:
   - Click on customer row to open profile drawer
   - Verify profile shows: summary, order history, loyalty balance
   - **Loyalty Adjustments**: 
     - Navigate to loyalty section in profile
     - Attempt manual point adjustment (should be RBAC protected)
     - Verify only authorized roles can make adjustments
7. **URL State Persistence**:
   - Apply filters and navigate away
   - Return to customers page
   - Verify filters and page state are restored

### Expected Outcomes:
- Customer data CRUD operations work correctly
- Bulk operations process selected customers only
- CSV export contains correct customer data
- Profile drawer loads customer details accurately
- Loyalty point adjustments restricted to authorized users
- URL state persists across navigation
- Table virtualization handles large datasets (10k+ customers)

---

## Critical Path 5: Settings & Feature Flags

**Objective**: Configure system settings and toggle features

### Steps:
1. **Navigate to Settings**: Visit `/settings` (requires Admin role)
2. **Verify RBAC Protection**:
   - Test access with different roles
   - Staff should be denied access
   - Admin should have access to Admin Console
   - Technical Admin should have access to both consoles
3. **Admin Console Testing**:
   - Navigate to "Feature Flags" section
   - Toggle KDS feature flag off/on
   - Verify KDS route becomes disabled/enabled
   - Toggle Loyalty feature flag
   - Verify loyalty features disappear/appear in POS
   - Toggle Payments feature flag
   - Verify payment modal availability in POS
4. **UI Preferences**:
   - Change density setting (comfortable/compact)
   - Toggle sidebar collapsed/expanded
   - Modify date/number formats
   - Verify changes apply immediately
   - Verify changes persist after page refresh
5. **Inventory Policy**:
   - Configure oversell policy (block vs allow)
   - Test policy in POS by attempting oversell
   - Verify policy enforcement works correctly
6. **Save/Reset Functions**:
   - Make changes to multiple settings
   - Verify save bar appears with unsaved changes
   - Test "Reset to defaults" functionality
   - Verify confirmation dialogs for destructive actions
7. **Technical Console** (if Technical Admin):
   - Access technical settings
   - Verify separation from business settings
   - Test technical configuration options

### Expected Outcomes:
- Role-based access control works correctly
- Feature flags immediately affect application behavior
- UI preferences apply globally and persist
- Inventory policies enforce correctly during sales
- Settings changes are audited and logged
- Reset functionality restores correct defaults

---

## Critical Path 6: Theme & Navigation

**Objective**: Verify consistent theming and navigation behavior

### Steps:
1. **Theme Toggle**:
   - Use theme toggle in top bar
   - Verify dark mode applies globally:
     - Header and navigation
     - Side navigation
     - Search components
     - Content areas
     - Modals and overlays
   - Test theme persistence across page refreshes
2. **Navigation Testing**:
   - Test all navigation links in sidebar
   - Verify active state highlighting
   - Test breadcrumb functionality
   - Verify collapsed/expanded sidebar states
3. **Overlay Behavior**:
   - Open modal dialogs
   - Test outside click dismissal
   - Test ESC key dismissal
   - Test route change dismissal
   - Verify only one overlay open at a time
4. **Menu Interaction**:
   - Open dropdown menus (user profile, actions)
   - Test keyboard navigation (Tab, Enter, Space)
   - Verify menu dismissal works correctly
   - Test ARIA attributes and screen reader support
5. **Focus Management**:
   - Tab through interface elements
   - Verify visible focus indicators
   - Test focus trapping in modals
   - Verify logical tab order
6. **Mobile Responsiveness**:
   - Test on mobile viewport sizes
   - Verify mobile cart drawer in POS
   - Test navigation collapse behavior
   - Verify touch interaction works correctly

### Expected Outcomes:
- Dark mode covers all UI elements consistently
- Theme preference persists across sessions
- All overlays/menus dismiss correctly (outside click, ESC, route change)
- Focus management works for accessibility
- Navigation state persists appropriately
- Mobile interface functions correctly
- ARIA attributes support screen readers

---

## Accessibility Smoke Test

**Objective**: Verify basic accessibility compliance

### Steps:
1. **Keyboard Navigation**:
   - Navigate entire application using only keyboard
   - Verify all interactive elements are reachable
   - Test modal focus trapping
   - Verify logical tab order
2. **Screen Reader Support**:
   - Test with screen reader (if available)
   - Verify all elements have appropriate labels
   - Check ARIA roles and attributes
   - Test form error announcements
3. **Visual Accessibility**:
   - Verify color contrast meets WCAG AA standards
   - Test with high contrast mode
   - Verify focus indicators are visible
   - Check for color-only information (should have alternatives)
4. **Target Sizes**:
   - Verify interactive elements meet minimum 44px target size
   - Test touch interaction on mobile
   - Check button and link spacing

### Expected Outcomes:
- All functionality accessible via keyboard
- Screen readers can navigate and understand content
- Color contrast meets WCAG standards
- Interactive elements are appropriately sized
- Focus indicators are clearly visible