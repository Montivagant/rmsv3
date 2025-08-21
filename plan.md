# **RMS v3 — UI-First Product & Build Plan (Timeless, Agent-Ready)**

**Intent:** Deliver a **clickable UI prototype first** (routes, navigation, screens you can try), then layer in domain logic. Keep the system **flexible** so UI/UX changes don’t cause rework. Platform stance: **PWA first** (fastest iteration). If hardware/kiosk constraints demand it, **wrap in Electron later** with shared modules—no rewrite.

---

## **1\) Non-Negotiable Principles**

* **UI-first:** build routes, navigation, layouts, and mock flows **before** deep logic.

* **Flexibility:** feature flags, layout prefs, thin adapters, and fixtures to pivot quickly.

* **Deterministic money:** **discount before tax**, **per-line** tax on discounted base, **half-up** rounding to **2 decimals**.

* **Idempotency:** all write flows accept an **Idempotency-Key**; repeat → same result.

* **Offline-first (later phase):** local DB \+ background replication (PouchDB ↔ CouchDB). No homegrown sync.

* **Security/PCI:** **hosted/redirect** payments only (no PAN handling).

* **A11y:** every interactive element has a visible label or `aria-label`; tests query **ByRole / name**.

* **Observability:** structured logs \+ error codes; no silent failures.

---

## **2\) Roles & Universal Control**

**Two universal controllers in addition to normal staff:**

| Role | Core control areas (keywords) |
| ----- | ----- |
| **Admin** | Branch setup, taxes, menus, prices, discounts, users/roles, reports, policies |
| **Technical Admin** | Environments, replication, backups, kiosk/Electron policy, device/driver config, payment provider keys, feature flag defaults, schema/versioning |

**Rules**

* **Admin** governs business behavior; **Technical Admin** governs platform & ops.

* Universal settings are visible in **Settings → Admin Console** (business) and **Settings → Technical Console** (platform), with audit logs.

* RBAC: Technical Admin ⊃ Admin ⊃ Staff. Least privilege by default.

---

## **3\) Screens (UI Map)**

* `/login`

* `/` **Dashboard**

* `/pos` **Ticketing workspace** (menu list, cart/ticket panel)

* `/kds` **Kitchen Display** (lanes: New → InPrep → Ready → Served)

* `/inventory` **Items & adjustments**

* `/customers` **Search & profile** (loyalty view)

* `/reports` **Daily summary / Z-report placeholder**

* `/settings`

  * **Admin Console:** branch, taxes, menus, roles, policies

  * **Technical Console:** env, DB/replication, kiosk/Electron, payments, feature defaults, backups, telemetry

  * **Layout & Flags:** density, sidebar, date/number formats; **flags:** KDS, Loyalty, Payments

**Note:** For the prototype, all screens are **clickable with mocks**; data realness comes later.

---

## **4\) Agent Operating Rules (applies to every milestone)**

1. **PLAN**: list files to add/modify and why (≤ 10 lines).

2. **IMPLEMENT**: production TS/React code; small, composable modules.

3. **TEST**: deterministic tests (Vitest \+ Testing Library). Focus on routes, a11y names, and critical flows.

4. **RUN & FIX**: show failing tests → fix → re-run to green.

5. **DOC**: brief “Manual Demo Guide” (steps to click).

6. **COMMIT**: one conventional commit message.

**Do not start the next milestone until tests pass.**

---

## **5\) Milestones (UI-first → then logic)**

### **M0 — App Shell & Design System**

* **Deliver:** Global layout (sidebar \+ topbar \+ content), dark mode, design tokens, base components (Button/Input/Select/Card/Modal/Table/Badge/Tabs/Toast).

* **Tests:** app renders; nav landmark; theme toggle accessible.

* **Demo:** navigate UI shell; toggle dark/light.

### **M1 — Routing & Navigation**

* **Deliver:** React Router routes above (lazy-loaded), active nav state, breadcrumbs, 404 fallback, minimal RBAC guard (role in localStorage).

* **Tests:** route smoke tests; 404 for unknown.

* **Demo:** click through all routes.

### **M2 — Mock Data & Clickable Screens**

* **Deliver:** MSW fixtures (products, categories, tickets, inventory, users, loyalty).  
   POS: searchable menu \+ add-to-cart (local state).  
   KDS: lane columns \+ status chips (local state).  
   Inventory/Customers/Reports: basic tables & drawers (mock).

* **Tests:** controls present & operable; queries by role/name.

* **Demo:** POS add, KDS advance, open drawers.

### **M3 — Interaction & Flex Settings**

* **Deliver:** **Layout settings** (density, sidebar toggle, formats), **Feature Flags UI** (KDS/Loyalty/Payments), **shortcuts** (e.g., `/` focus search, `n` new ticket).

* **Tests:** flags persist; layout settings persist; UI adapts.

* **Demo:** toggle flags; display hides/shows modules.

### **M4 — Offline UX Basics**

* **Deliver:** PWA manifest, service worker pre-cache, **Offline Banner**, sync placeholders.

* **Tests:** simulate offline (navigator.onLine \= false) → banner shows; screens still render.

* **Demo:** devtools offline → still navigable shell.

**Stop for review.** Adjust routes/navigation/layout per feedback. Then proceed to logic.

---

## **6\) Logic Phases (after UI approval)**

### **L1 — Money (deterministic)**

* **Rules:**

  * Apply **discount** to subtotal; cap discount at subtotal.

  * Apply **per-line tax** on the **discounted** base.

  * **Round half-up** to 2 decimals for tax and totals.

  * For mixed tax rates, **prorate** discount by line value.

* **Deliver:** pure helpers `round2`, `computeTotals(items, discount)`; **golden tests**.

* **Demo:** totals preview in POS (now calculated for real).

### **L2 — Event Store & Idempotency**

* **Rules:** append-only log; writes require **Idempotency-Key**; replay-safe handlers.

* **Deliver:** in-memory store now; interface for PouchDB adapter later; duplicate key returns first result; tests for replay & mismatch rejection.

### **L3 — Inventory & Recipes**

* **Rules:** finalize ticket → decrement BOM; **policy:** block oversell vs allow negative (alert). Refund restock per product toggle.

* **Deliver:** inventory engine, recipe evaluation, policy flags, tests.

### **L4 — Loyalty**

* **Rules:** accrual (e.g., points \= floor(total / unitValue)), redemption as discount; logged as events.

* **Deliver:** loyalty service \+ tests.

### **L5 — Payments (hosted/redirect)**

* **Rules:** never handle PAN; redirect/hosted UI; webhook verifies & dedupes via idempotency; retries safe.

* **Deliver:** thin payment wrapper \+ webhook handler (can be Cloud/Worker); MSW tests for success, timeout, duplicate webhook.

### **L6 — Offline-First Sync**

* **Rules:** all reads/writes go to local DB; background replication to server DB; clear conflict policy; operator tools for conflicts (Technical Admin).

* **Deliver:** PouchDB local; CouchDB remote config; replication start/stop; contract tests (fake remote).

### **L7 — RBAC, EOD, Observability**

* **Deliver:** enforce role checks (Admin, Technical Admin, Staff), Z-report math skeleton, structured logs & error taxonomy; tests.

---

## **7\) Data & Contracts (concise)**

**Entities (keywords only)**

* **Branch** (id, name, timezone, tax profile), **Product** (id, name, price, taxRate, category, recipe?),  
   **InventoryItem** (sku, qty, uom), **Customer** (id, name, phone, points),  
   **Ticket** (id, items\[\], status, totals, payments), **Payment** (id, provider, amount, status),  
   **SaleEvent / InventoryAdjusted / LoyaltyEvent** (id, type, payload, **idempotencyKey**, createdAt).

**Totals helpers (reference)**

export const round2 \= (n:number)=\>Math.round((n+Number.EPSILON)\*100)/100  
export function computeTotals(items:{price:number;qty:number;taxRate:number}\[\], discount=0){  
  const subtotal \= round2(items.reduce((s,i)=\>s+i.price\*i.qty,0))  
  const cap \= Math.min(discount, subtotal)  
  return items.reduce((acc,i)=\>{  
    const lineSub \= round2(i.price\*i.qty)  
    const share \= subtotal ? lineSub/subtotal : 0  
    const lineDiscount \= round2(cap\*share)  
    const taxable \= Math.max(0, lineSub \- lineDiscount)  
    const tax \= round2(taxable \* i.taxRate)  
    return {  
      subtotal,  
      discount: round2(acc.discount \+ lineDiscount),  
      tax: round2(acc.tax \+ tax),  
      total: round2(acc.total \+ taxable \+ tax),  
    }  
  }, {subtotal, discount:0, tax:0, total:0})  
}

**Idempotent write rule (pseudo)**

If Idempotency-Key K is new → validate params → process → persist (result, params, K)  
If K exists with \*\*same params\*\* → return stored result  
If K exists with \*\*different params\*\* → reject (422) "Key parameter mismatch"

---

## **8\) Architecture & Tech (stable choices)**

* **Frontend:** React \+ Vite \+ TypeScript \+ Tailwind. Routing via React Router.

* **State:** lightweight store (e.g., Zustand) \+ TanStack Query (mocked first).

* **Mocks:** MSW fixtures for fast UI iteration.

* **Flags & prefs:** localStorage-backed; defaults set by **Technical Admin**.

* **Offline:** PWA shell now; later add PouchDB (client) ↔ CouchDB (server) replication.

* **Electron (optional, later):** only if kiosk/hardware demands native. Harden: `contextIsolation=true`, no Node in renderer, IPC bridge only.

**Environment (examples)**

* Frontend: `BRANCH_ID`, `TIMEZONE`, `CURRENCY`, `TAX_PROFILE`, `FEATURE_DEFAULTS`

* Technical: `COUCH_URL`, `COUCH_DB_PREFIX`, `PAYMENT_PROVIDER`, `PAYMENT_PUBLIC_KEY`, `WEBHOOK_SECRET`

---

## **9\) Definition of Done (per phase)**

* **UI-first (M0–M4):** routes clickable; controls accessible; smoke tests pass; manual guide updated.

* **Logic phases:** golden tests for money; idempotency tests; inventory policy tests; loyalty math tests; webhook dedupe tests; replication contract tests.

* **RBAC:** Admin and Technical Admin permissions enforced; attempts by lower roles are denied with auditable errors.

* **Docs:** each milestone includes quick run steps \+ change log.

* **No regressions:** once a contract/test is green, it stays green.

---

## **10\) Admin & Technical Admin Flows (when to surface)**

* **From day one:** `/settings` shows **Layout & Flags** (safe, non-destructive).

* **UI-first phase:** add **Admin Console** shell (tabs exist, actions mocked).

* **Logic phases:** wire actual actions:

  * **Admin:** manage branches, taxes, menus, discounts, roles; approve EOD; view reports.

  * **Technical Admin:** set flag defaults, payment provider keys, replication endpoints, kiosk/Electron policy, backup/export, schema migrations, telemetry opt-in/out.

* All universal changes are **evented** (audit trail).

---

## **11\) What the Agent Does Now**

1. **M0 → M4** exactly as written (UI shell, routing, mocks, flags, offline banner).

2. Provide **file list**, **code**, **tests output (green)**, **Manual Demo Guide**, **one commit** per milestone.

3. **Pause** for UI review.

4. Proceed to **L1 → L7** in order, keeping functions pure, adapters thin, and tests deterministic.

---

## **12\) QA & Manual Demo (always include)**

* Start app, toggle theme, navigate all routes.

* POS: add items, inspect ticket (mock totals first, real totals after L1).

* KDS: advance statuses through lanes.

* Settings: flip **KDS/Loyalty/Payments** flags; adjust density & sidebar.

* DevTools offline: offline banner shows; routes still render.

---

**This document is the single source of truth** for the agent: UI-first PWA, flexible by design, with Admin & Technical Admin controlling universal behavior at the right layers.

