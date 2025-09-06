// Navigation components
export { AppNav } from './navigation/AppNav';
export { TopBar } from './navigation/TopBar';

// Card components
export { StatCard } from './cards/StatCard';
export { ListCard } from './cards/ListCard';
export { ChartCard } from './cards/ChartCard';

// UI components
export { ActionMenu } from './ui/ActionMenu';

// Provider components
export { ThemeProvider, useTheme } from './providers/ThemeProvider';

// Layout components
export { Layout } from './Layout';
export { OfflineBanner } from './OfflineBanner';
export { SyncStatusIndicator } from './SyncStatusIndicator';
export { PerformanceMonitor } from './PerformanceMonitor';
export { PersistenceDebugger } from './PersistenceDebugger';

// Core UI Primitives (Design System)
export { Button } from './Button';
export { Input } from './Input';
export { Select } from './Select';
export { Label } from './Label';
export { Textarea } from './Textarea';
export { Checkbox } from './Checkbox';
export { FormField } from './FormField';
export { Badge } from './Badge';
export { Modal } from './Modal';
export { Sheet } from './Sheet';
export { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from './DropdownMenu';
export { Toast, ToastContainer } from './ToastNew';
export { EmptyState } from './EmptyState';
export { Skeleton, SkeletonCard, SkeletonTable } from './Skeleton';
export { Drawer } from './Drawer';
export { PasswordInput } from './PasswordInput';
export { Collapsible } from './Collapsible';
export { PhoneInputEG } from './PhoneInputEG';

// Card components
export { Card, CardHeader, CardTitle, CardContent } from './Card';
export { default as Tabs } from './Tabs';

// Business components
export { CategoryManagement } from './CategoryManagement';
export { RecipeManagement } from './RecipeManagement';
export { MenuManagement } from './MenuManagement';

// RBAC components
export { RBACAdminPanel } from './rbac';

// Form components (existing)
export { SmartForm } from './forms/SmartForm';
export type { FormField as SmartFormField } from './forms/SmartForm';

// Feedback components (existing)
export { LoadingOverlay } from './feedback/LoadingSpinner';

// Notification system - actual implementation
export { useNotifications, NotificationProvider } from './feedback/NotificationSystem';

// Provider components
import type { ReactNode } from 'react';
export const UpdateManager = ({ children }: { children: ReactNode }) => children;

// Re-export default components
export { default as AppNavDefault } from './navigation/AppNav';
export { default as TopBarDefault } from './navigation/TopBar';
export { default as StatCardDefault } from './cards/StatCard';
export { default as ListCardDefault } from './cards/ListCard';
export { default as ChartCardDefault } from './cards/ChartCard';
export { default as ActionMenuDefault } from './ui/ActionMenu';
export { default as ThemeProviderDefault } from './providers/ThemeProvider';
export { default as LayoutDefault } from './Layout';

// Type exports
export type { InputProps } from './Input';
export type { SelectProps, SelectOption } from './Select';
export type { TextareaProps } from './Textarea';
export type { CheckboxProps } from './Checkbox';
export type { ModalProps } from './Modal';
export type { SheetProps } from './Sheet';
export type { DropdownMenuProps, DropdownMenuItemProps } from './DropdownMenu';
