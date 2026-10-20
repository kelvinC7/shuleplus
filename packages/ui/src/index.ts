/**
 * @shuleplus/ui — Shared design system for all ShulePlus microservice frontends
 *
 * Usage in any module:
 *   import { PageHeader, StatCard, ModuleCard, DataTable } from '@shuleplus/ui';
 *   import '@shuleplus/ui/theme';
 */

// Design tokens
export * from './lib/tokens';
export { cn } from './lib/utils';

// shadcn primitives
export { Button, buttonVariants } from './primitives/button';
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  CardAction,
} from './primitives/card';
export { Badge, badgeVariants } from './primitives/badge';
export {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from './primitives/table';

// Shared wrappers
export { PrimaryButton } from './components/shared/primary-button';
export { PageHeader } from './components/shared/page-header';
export { PageContainer } from './components/shared/page-container';
export { SectionHeader } from './components/shared/section-header';
export { EmptyState } from './components/shared/empty-state';
export { StatCard } from './components/shared/stat-card';
export { DashboardCard } from './components/shared/dashboard-card';
export { ModuleCard } from './components/shared/module-card';
export { SearchInput } from './components/shared/search-input';
export { FormCard } from './components/shared/form-card';
export { DataTable, type DataTableColumn } from './components/shared/data-table';

// Layouts
export { DashboardLayout } from './components/layout/dashboard-layout';
export { AdminLayout } from './components/layout/admin-layout';
export { AuthLayoutShell } from './components/layout/auth-layout-shell';
