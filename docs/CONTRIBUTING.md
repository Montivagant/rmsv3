# Contributing to RMS v3

We welcome contributions to RMS v3! This guide will help you get started with contributing to the project.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Code Style](#code-style)
- [Event System Guidelines](#event-system-guidelines)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)
- [Architecture Decisions](#architecture-decisions)

## Getting Started

### Prerequisites

- Node.js 18 or higher
- pnpm (recommended) or npm
- Git
- Basic understanding of TypeScript and React
- Familiarity with event-driven architecture (helpful)

### Development Setup

1. **Fork the repository**
   ```bash
   # Fork on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/rmsv3.git
   cd rmsv3
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Start development server**
   ```bash
   pnpm dev
   ```

4. **Run tests**
   ```bash
   pnpm test
   ```

5. **Check TypeScript**
   ```bash
   pnpm type-check
   ```

## Code Style

### TypeScript Guidelines

- **Strict Mode**: All code must pass strict TypeScript checks
- **Type Safety**: Avoid `any` types; use proper type definitions
- **Interfaces**: Prefer interfaces over types for object shapes
- **Imports**: Use type-only imports where appropriate

```typescript
// Good
import type { EventType } from './types';
import { eventStore } from './store';

// Avoid
import { EventType, eventStore } from './index';
```

### Code Formatting

- **ESLint**: Follow ESLint rules (run `pnpm lint`)
- **Prettier**: Code is automatically formatted (run `pnpm format`)
- **Naming**: Use camelCase for variables, PascalCase for components

### File Organization

```
src/
├── components/          # Reusable UI components
│   ├── ComponentName/
│   │   ├── index.tsx
│   │   ├── ComponentName.test.tsx
│   │   └── types.ts
├── events/             # Event system
│   ├── store.ts
│   ├── types.ts
│   └── __tests__/
├── pages/              # Page components
└── utils/              # Utility functions
```

## Event System Guidelines

### Event Naming

- Use lowercase dot notation: `sale.recorded`, `loyalty.accrued`
- Be descriptive and business-focused
- Use past tense (events describe what happened)

```typescript
// Good
'sale.recorded'
'loyalty.redeemed'
'inventory.updated'

// Avoid
'SaleRecorded'
'recordSale'
'sale_recorded'
```

### Event Structure

All events must follow the standard structure:

```typescript
interface KnownEvent {
  id: string;           // evt_timestamp_random
  seq: number;          // Sequence within aggregate
  type: EventType;      // Lowercase dot notation
  at: number;           // Timestamp
  aggregate: {
    id: string;         // Aggregate identifier
    type: string;       // Aggregate type
  };
  payload?: any;        // Event-specific data
}
```

### Adding New Events

1. **Define the event type** in `src/events/types.ts`:
   ```typescript
   type EventType = 
     | 'existing.events'
     | 'new.event.type';  // Add your new event
   ```

2. **Add to EventTypeMap** for payload typing:
   ```typescript
   interface EventTypeMap {
     'new.event.type': NewEventPayload;
   }
   ```

3. **Create payload interface**:
   ```typescript
   interface NewEventPayload {
     field1: string;
     field2: number;
   }
   ```

4. **Write comprehensive tests**:
   ```typescript
   describe('New Event Type', () => {
     it('should create event with correct structure', async () => {
       const event = await eventStore.append('new.event.type', {
         field1: 'value',
         field2: 42
       }, {
         aggregate: { id: 'test-id', type: 'test-type' }
       });
       
       expect(event.type).toBe('new.event.type');
       expect(event.payload.field1).toBe('value');
     });
   });
   ```

5. **Update documentation** in `docs/EVENTS.md`

### Event Store Usage

- **Always use the store API**: Don't access storage directly
- **Handle errors gracefully**: Wrap store operations in try-catch
- **Use proper aggregates**: Group related events logically
- **Maintain idempotency**: Events should be safe to retry

```typescript
// Good
try {
  const event = await eventStore.append('sale.recorded', payload, {
    aggregate: { id: ticketId, type: 'ticket' }
  });
  // Handle success
} catch (error) {
  // Handle error appropriately
  console.error('Failed to record sale:', error);
}

// Avoid
const event = eventStore.append('sale.recorded', payload); // Missing error handling
```

## Testing

### Test Categories

1. **Unit Tests**: Test individual functions and components
2. **Integration Tests**: Test event system integration
3. **Component Tests**: Test React component behavior
4. **E2E Tests**: Test complete user workflows

### Writing Tests

#### Event System Tests

```typescript
describe('Event Store', () => {
  beforeEach(async () => {
    await eventStore.reset();
  });
  
  it('should append events correctly', async () => {
    const event = await eventStore.append('test.event', { data: 'test' }, {
      aggregate: { id: 'test', type: 'test' }
    });
    
    expect(event.type).toBe('test.event');
    expect(eventStore.getAll()).toHaveLength(1);
  });
});
```

#### Component Tests

```typescript
describe('ComponentName', () => {
  it('should render correctly', () => {
    render(<ComponentName prop="value" />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
  
  it('should handle user interactions', async () => {
    const mockFn = vi.fn();
    render(<ComponentName onAction={mockFn} />);
    
    await user.click(screen.getByRole('button'));
    expect(mockFn).toHaveBeenCalled();
  });
});
```

### Test Requirements

- **Coverage**: Maintain high test coverage (aim for >90%)
- **Isolation**: Tests should not depend on each other
- **Clarity**: Test names should clearly describe what they test
- **Performance**: Tests should run quickly

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run specific test file
pnpm test src/events/__tests__/store.test.ts

# Run tests with coverage
pnpm test:coverage
```

## Pull Request Process

### Before Submitting

1. **Run the full test suite**:
   ```bash
   pnpm test
   pnpm type-check
   pnpm lint
   ```

2. **Update documentation** if needed
3. **Add tests** for new functionality
4. **Follow commit message conventions**

### Commit Messages

Use conventional commit format:

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Build/tooling changes

**Examples:**
```
feat(events): add inventory.updated event type

fix(pos): resolve loyalty discount calculation issue

docs(events): update event system documentation

test(loyalty): add comprehensive loyalty system tests
```

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests pass locally
- [ ] New tests added for new functionality
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or properly documented)
```

### Review Process

1. **Automated Checks**: CI must pass
2. **Code Review**: At least one approval required
3. **Testing**: Verify tests cover new functionality
4. **Documentation**: Ensure docs are updated

## Issue Reporting

### Bug Reports

Include:
- **Description**: Clear description of the issue
- **Steps to Reproduce**: Detailed reproduction steps
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happens
- **Environment**: Browser, OS, Node version
- **Screenshots**: If applicable

### Feature Requests

Include:
- **Problem**: What problem does this solve?
- **Solution**: Proposed solution
- **Alternatives**: Alternative solutions considered
- **Impact**: Who would benefit from this feature?

### Issue Labels

- `bug`: Something isn't working
- `enhancement`: New feature or request
- `documentation`: Documentation improvements
- `good first issue`: Good for newcomers
- `help wanted`: Extra attention needed
- `priority:high`: High priority issue

## Architecture Decisions

### When to Create an ADR

Create an Architecture Decision Record (ADR) for:
- Significant architectural changes
- Technology choices
- Design pattern decisions
- Breaking changes

### ADR Template

```markdown
# ADR-XXX: Title

## Status
Proposed | Accepted | Deprecated | Superseded

## Context
What is the issue that we're seeing?

## Decision
What is the change that we're proposing?

## Consequences
What becomes easier or more difficult?
```

## Getting Help

- **Documentation**: Check existing docs first
- **Issues**: Search existing issues
- **Discussions**: Use GitHub Discussions for questions
- **Code**: Look at existing code for patterns

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Follow the project's coding standards

## Recognition

Contributors are recognized in:
- Release notes
- Contributors section
- Special thanks for significant contributions

Thank you for contributing to RMS v3! 🎉