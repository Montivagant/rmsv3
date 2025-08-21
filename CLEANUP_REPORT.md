# RMS v3 Hygiene Pass Report

## Executive Summary

**Status**: Phase 2 (Tier-0 Safe Fixes) - In Progress  
**Date**: Current  
**Scope**: Full repository hygiene pass with zero hallucination  

### Progress Summary
- ✅ **Dependencies**: Fixed missing `pouchdb-browser`, removed unused `pouchdb-replication`
- ✅ **ESLint**: Added `eslint-plugin-unused-imports` with autofix rules
- ✅ **Types**: Fixed explicit `any` in `src/test/renderWithProviders.tsx:12`
- 🔄 **In Progress**: Remaining ESLint errors and test failures
- ⏳ **Pending**: Dead code removal, documentation creation

## Findings by Category

### 1. Dependencies (RESOLVED)
| Issue | File | Status | Evidence |
|-------|------|--------|----------|
| Missing dependency | `src/events/context.tsx` | ✅ Fixed | `pnpm dlx depcheck` reported missing `pouchdb-browser` |
| Unused dependency | `package.json` | ✅ Fixed | `pnpm dlx depcheck` reported unused `pouchdb-replication` |

### 2. ESLint Issues (PARTIALLY RESOLVED)
| Issue | File:Line | Severity | Status | Evidence |
|-------|-----------|----------|--------|----------|
| Explicit any | `src/test/renderWithProviders.tsx:12` | Error | ✅ Fixed | `@typescript-eslint/no-explicit-any` |
| Explicit any | `src/settings/AdminConsole.tsx:63` | Error | 🔄 Pending | `@typescript-eslint/no-explicit-any` |
| Explicit any | `src/settings/TechnicalConsole.tsx:20` | Error | 🔄 Pending | `@typescript-eslint/no-explicit-any` |
| Conditional Hook | `src/settings/TechnicalConsole.tsx:50` | Error | 🔄 Pending | `react-hooks/rules-of-hooks` |
| Constants export | `src/rbac/guard.tsx:26` | Error | 🔄 Pending | `react-refresh/only-export-components` |

### 3. Dead Code Analysis
| Tool | Findings | Status |
|------|----------|--------|
| `knip` | 27 unused types, 13 unused functions | 🔄 Pending |
| `madge` | No circular dependencies | ✅ Clean |
| `depcheck` | 4 unused devDependencies | 🔄 Pending |

### 4. Test Status
| Metric | Current | Target |
|--------|---------|--------|
| Test Files | 11 failed, 21 passed | All passing |
| Individual Tests | 68 failed, 157 passed | All passing |
| TypeScript | ✅ Passing | ✅ Passing |

### 5. PWA/MSW Configuration
| Component | Status | Evidence |
|-----------|--------|----------|
| Service Worker | ✅ Prod-only | `src/main.tsx` conditional import |
| MSW | ✅ Dev-only | `.env.development` `VITE_USE_MSW=1` |
| Environment Split | ✅ Correct | `VITE_DISABLE_SW=1` in dev |

## Tier Classification

### Tier-0 (Safe - Auto-Applied)
- ✅ Add missing `pouchdb-browser` dependency
- ✅ Remove unused `pouchdb-replication` dependency  
- ✅ Install and configure `eslint-plugin-unused-imports`
- ✅ Fix explicit `any` in `src/test/renderWithProviders.tsx:12`

### Tier-1 (Medium Risk - Review Required)
- 🔄 Fix explicit `any` types in AdminConsole and TechnicalConsole
- 🔄 Fix conditional React Hook in TechnicalConsole
- 🔄 Separate constants from components in RBAC guard
- 🔄 Remove unused devDependencies (autoprefixer, postcss, pouchdb-adapter-memory, tailwindcss)

### Tier-2 (High Risk - Backlog)
- Remove 27 unused exported types (requires careful analysis)
- Remove 13 unused exported functions (requires test coverage verification)
- Major dependency updates (requires compatibility testing)
- Test suite refactoring (68 failing tests need investigation)

## System Architecture Insights

### Core Patterns
1. **Event Sourcing**: PouchDB-based event store with offline sync
2. **Context Providers**: EventStore, InventoryEngine, Toast providers
3. **RBAC**: Admin vs Technical Admin role separation
4. **PWA**: Service Worker for production, MSW for development

### Key Dependencies
- **React 19.1.1**: Latest React with concurrent features
- **PouchDB 9.0.0**: Offline-first database with IndexedDB adapter
- **Vite 7.1.2**: Build tool with PWA plugin
- **TypeScript 5.8.3**: Type safety with strict configuration

### Test Infrastructure
- **Vitest 3.2.4**: Test runner with JSdom environment
- **Testing Library**: React testing utilities
- **MSW 2.10.5**: API mocking for development and testing

## Next Steps

### Immediate (Phase 2 Continuation)
1. Fix remaining ESLint errors in AdminConsole and TechnicalConsole
2. Resolve conditional React Hook issue
3. Separate constants from components in RBAC guard
4. Run full test suite to identify root causes of failures

### Short Term (Phase 3)
1. Remove unused devDependencies after verification
2. Clean up unused exports identified by knip
3. Update test suite to use proper async patterns
4. Verify PWA offline functionality

### Long Term (Phase 4)
1. Investigate and fix 68 failing tests
2. Consider major dependency updates
3. Implement comprehensive dead code removal
4. Enhance test coverage and reliability

## Risk Assessment

### Low Risk
- Dependency management changes (completed)
- TypeScript type improvements (in progress)
- ESLint configuration updates (completed)

### Medium Risk  
- Unused code removal (requires careful verification)
- Test suite modifications (may affect CI/CD)
- Component refactoring (may impact UX)

### High Risk
- Major dependency updates (breaking changes possible)
- Large-scale dead code removal (may break runtime dependencies)
- Test infrastructure overhaul (may destabilize development workflow)

## Acceptance Criteria Progress

| Criteria | Status | Notes |
|----------|--------|-------|
| `pnpm typecheck` passes | ✅ | Clean TypeScript compilation |
| `pnpm lint` passes | 🔄 | 59 errors remaining, 14 warnings |
| `pnpm test` passes | ❌ | 68 tests failing, needs investigation |
| No circular dependencies | ✅ | Verified with madge |
| No unused imports/exports | 🔄 | ESLint plugin configured, knip analysis pending |
| PWA/MSW split intact | ✅ | Environment-based configuration working |
| No regressions | 🔄 | Requires test suite fixes to verify |