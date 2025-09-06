/**
 * Inventory Transfer System
 * Simplified transfer system with Draft → Completed/Cancelled flow
 */

// Core service and business logic
export {
  InventoryTransferService,
  createInventoryTransferService,
  getInventoryTransferService,
  initializeInventoryTransferService
} from './service';

// API layer and MSW handlers
export { inventoryTransferApiHandlers, transferApiService } from './api';

// React components
export { TransferStatusBadge } from '../../components/inventory/transfers/TransferStatusBadge';
export { TransfersList } from '../../components/inventory/transfers/TransfersList';
export { default as NewTransferModal } from '../../components/inventory/transfers/NewTransferModal';
export { default as CompleteTransferDrawer } from '../../components/inventory/transfers/CompleteTransferDrawer';
export { default as TransfersPage } from '../../pages/inventory/Transfers';
export { default as TransferDetailPage } from '../../pages/inventory/TransferDetail';
export { default as EditTransferPage } from '../../pages/inventory/EditTransfer';

// TypeScript types and utilities
export type {
  Transfer,
  TransferLine,
  TransferStatus,
  TransferQuery,
  TransfersResponse,
  CreateTransferRequest,
  CompleteTransferRequest,
  CancelTransferRequest,
  Location,
  TransferValidation,
  TransferCreatedEvent,
  TransferCompletedEvent,
  TransferCancelledEvent,
  TransferError,
  TransferValidationError
} from './types';

export { TransferUtils, TRANSFER_CONFIG } from './types';
