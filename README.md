# RMS v3 - Restaurant Management System

A modern, event-driven restaurant management system built with React, TypeScript, and PouchDB.

## 🏗️ Architecture

RMS v3 is built on an **event-driven architecture** that ensures data consistency, auditability, and scalability.

### Core Concepts

- **Event Sourcing**: All state changes are captured as immutable events
- **CQRS**: Command Query Responsibility Segregation for optimal read/write operations
- **Offline-First**: Works seamlessly with or without internet connectivity
- **Type Safety**: Full TypeScript coverage with strict type checking

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd rmsv3

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run specific test file
pnpm test src/events/__tests__/store.test.ts
```

## 📋 Features

### Point of Sale (POS)
- Product catalog management
- Shopping cart functionality
- Tax calculations
- Payment processing
- Receipt generation

### Loyalty System
- Customer management
- Points accrual and redemption
- Discount application
- Balance tracking

### Inventory Management
- Stock tracking
- Low stock alerts
- Automatic inventory updates

### Kitchen Display System (KDS)
- Order queue management
- Preparation time tracking
- Order status updates

## 🎯 Event System

The application uses a sophisticated event system for state management:

### Event Types

- `sale.recorded` - When a sale is completed
- `loyalty.accrued` - When loyalty points are earned
- `loyalty.redeemed` - When loyalty points are used
- `inventory.updated` - When stock levels change
- `payment.processed` - When payment is completed

### Event Structure

All events follow a consistent structure:

```typescript
interface KnownEvent {
  id: string;           // Unique event identifier
  seq: number;          // Sequence number within aggregate
  type: EventType;      // Event type (lowercase.dot.notation)
  at: number;           // Timestamp
  aggregate: {          // Aggregate information
    id: string;         // Aggregate ID
    type: string;       // Aggregate type
  };
  payload?: any;        // Event-specific data
}
```

### Usage Example

```typescript
import { eventStore } from './events/store';

// Record a sale
eventStore.append('sale.recorded', {
  ticketId: 'T-123',
  lines: [{ sku: 'burger', name: 'Classic Burger', qty: 1, price: 12.99, taxRate: 0.15 }],
  totals: { subtotal: 12.99, discount: 0, tax: 1.95, total: 14.94 }
}, {
  aggregate: { id: 'T-123', type: 'ticket' }
});

// Query events
const saleEvents = eventStore.query({
  type: 'sale.recorded',
  aggregate: { id: 'T-123' }
});
```

## 🗂️ Project Structure

```
src/
├── components/          # Reusable UI components
├── events/             # Event system core
│   ├── store.ts        # Event store implementation
│   ├── types.ts        # Event type definitions
│   └── __tests__/      # Event system tests
├── pages/              # Application pages
│   ├── POS.tsx         # Point of Sale interface
│   └── __tests__/      # Page component tests
├── db/                 # Database layer
│   └── pouch.ts        # PouchDB integration
└── utils/              # Utility functions
```

## 🧪 Testing

The project maintains high test coverage with:

- **Unit Tests**: Individual component and function testing
- **Integration Tests**: Event system and database integration
- **E2E Tests**: Complete user workflow testing

### Test Categories

- `src/events/__tests__/` - Event system tests
- `src/pages/__tests__/` - UI component tests
- `src/components/__tests__/` - Reusable component tests

## 🔧 Development

### Code Style

- ESLint + Prettier for code formatting
- Strict TypeScript configuration
- Conventional commit messages

### Event System Guidelines

1. **Event Names**: Use lowercase dot notation (e.g., `sale.recorded`)
2. **Immutability**: Events are immutable once created
3. **Type Safety**: All events must have proper TypeScript types
4. **Testing**: Every event type should have comprehensive tests

### Adding New Events

1. Define the event type in `src/events/types.ts`
2. Add the event to the `EventTypeMap`
3. Create tests for the new event
4. Update documentation

## 📚 Additional Documentation

- [Architecture Guide](./docs/ARCHITECTURE.md) - Detailed system architecture
- [Event System](./docs/EVENTS.md) - Complete event system documentation
- [Contributing](./docs/CONTRIBUTING.md) - Development guidelines

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./docs/CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
