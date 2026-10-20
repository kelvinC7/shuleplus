export interface JwtUser {
  sub: string;
  email: string;
  organizationId: string;
  roles: string[];
  modules: string[];
}

export interface DashboardKpis {
  totalAssets: number;
  totalCategories: number;
  financialYears: number;
  activeAssignments: number;
  openMaintenance: number;
  totalNetBook: number;
  totalAnnualDep: number;
  totalPurchase: number;
  totalValue?: number;
  assigned?: number;
  available?: number;
  maintenance?: number;
  damaged?: number;
  missing?: number;
  retired?: number;
  assignedPercent?: number;
  availablePercent?: number;
}

export interface DashboardActivity {
  id: string;
  type: 'assignment' | 'transfer' | 'maintenance' | 'return';
  title: string;
  detail?: string;
  at: string;
  relative: string;
}

export interface DashboardSummary {
  organizationName: string;
  activeYear: number | null;
  kpis: DashboardKpis;
  byCategory: { label: string; value: number }[];
  valueByCategory?: { label: string; value: number }[];
  statusBreakdown?: {
    available: number;
    assigned: number;
    maintenance: number;
    damaged: number;
    missing: number;
    retired: number;
  };
  maintenanceStats?: {
    open: number;
    inProgress: number;
    completed: number;
    overdue: number;
  };
  recentActivities?: DashboardActivity[];
  filters?: {
    years: number[];
    categories: string[];
    locations: string[];
  };
  years: {
    id?: string;
    year: number;
    status: string;
    totalOpening: number;
    totalPurchases: number;
    totalClosing: number;
  }[];
}

export interface AnalyticsData {
  byYear: { year: number; purchase: number; nbv: number; dep: number; count: number }[];
  health: { used: number; notUsedOld: number };
  topLocations: { label: string; value: number }[];
  byCategory?: { label: string; value: number }[];
  valueByCategory?: { label: string; value: number }[];
  totals?: {
    assets: number;
    purchase: number;
    nbv: number;
    depreciation: number;
  };
}

export interface Category {
  id: string;
  organizationId: string;
  name: string;
  icon?: string | null;
  description?: string | null;
  depreciationRate: number;
  deletedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface YearCategoryBalance {
  id?: string;
  organizationId?: string;
  financialYearId?: string;
  categoryId?: string | null;
  categoryName: string;
  openingBalance: number;
  lastYearClosing?: number;
  purchases?: number;
  accumulatedDepreciationStart: number;
  annualDepreciation?: number;
  closingBalance?: number;
  depreciationRate: number;
}

export interface FinancialYear {
  id: string;
  organizationId: string;
  year: number;
  startDate: string;
  endDate: string;
  description?: string | null;
  depMethod?: string | null;
  autoCarryForward?: boolean;
  lockPreviousYear?: boolean;
  status: 'Draft' | 'Active' | 'Closed' | string;
  totalOpening: number;
  totalPurchases: number;
  totalClosing: number;
  categoryBalances?: YearCategoryBalance[];
  createdAt?: string;
  updatedAt?: string;
}

export type BuildingStatus = 'Finished' | 'WorkingProgress' | null;
export type AssetHealthStatus = 'Used' | 'NotUsedOld';
export type EntryMode = 'year_setup' | 'legacy';

export type AssetAdjustmentType =
  | 'cost_increase'
  | 'cost_decrease'
  | 'accumulated_dep_increase'
  | 'accumulated_dep_decrease'
  | 'annual_dep_increase'
  | 'annual_dep_decrease'
  | 'total_dep_increase'
  | 'total_dep_decrease';

export interface AssetAdjustmentRow {
  id: string;
  assetId: string;
  assetCode: string;
  registerYear: number;
  adjustmentType: AssetAdjustmentType | string;
  adjustmentTypeLabel: string;
  amount: number;
  signedAmount: string;
  reason: string;
  note?: string | null;
  adjustmentDate: string;
  previousValue?: number | null;
  newValue?: number | null;
  createdByUserId: string;
  createdByEmail?: string | null;
  createdByName?: string | null;
  createdAt: string;
}

export interface AssetFinancialDetails {
  asset: AssetRow;
  hasAdjustments: boolean;
  canAdjust: boolean;
  original: {
    assetCost: number;
    totalBalance: number;
    accumulatedDepreciation: number;
    depreciationRate: number;
  };
  adjustments: {
    costAdjustments: number;
    accumulatedDepAdjustments: number;
    annualDepAdjustments: number;
    totalDepAdjustments: number;
  };
  calculated: {
    adjustedAssetCost: number;
    adjustedTotalBalance: number;
    openingAccumulatedDepreciation: number;
    adjustedOpeningAccumulatedDepreciation: number;
    systemAnnualDepreciation: number;
    manualDepreciationAdjustment: number;
    finalAnnualDepreciation: number;
    systemClosingAccumulatedDepreciation?: number;
    manualTotalDepAdjustment?: number;
    closingAccumulatedDepreciation: number;
    netBookValue: number;
  };
  history: AssetAdjustmentRow[];
}

export interface AssetRow {
  id: string;
  organizationId: string;
  assetCode: string;
  assetName: string;
  sku?: string | null;
  serialNumber?: string | null;
  labelTag?: string | null;
  categoryName: string;
  categoryId?: string | null;
  location?: string | null;
  locationLabel?: string | null;
  buildingStatus?: BuildingStatus;
  registerYear: number;
  openingAmount: number;
  unitPrice: number;
  saleBalance?: number;
  applySaleBalance?: boolean;
  landProvince?: string | null;
  landDistrict?: string | null;
  landSector?: string | null;
  landCellule?: string | null;
  landVillage?: string | null;
  landUpi?: string | null;
  totalBalance: number;
  accumulatedDepreciation: number;
  depRate: number;
  annualDep: number;
  totalDep: number;
  netBookValue: number;
  originalTotalBalance?: number | null;
  originalAccumulatedDep?: number | null;
  originalDepRate?: number | null;
  taxAmount?: number;
  priceInclTax?: number;
  applyTax?: boolean;
  purchaseDate?: string | null;
  conditionCode?: string | null;
  supplier?: string | null;
  receiptRefs?: string | null;
  quantity?: number;
  assetHealthStatus?: AssetHealthStatus | string;
  assetsStatus?: string | null;
  entryMode?: EntryMode | string;
  firstTime?: boolean;
  replacedByAssetId?: string | null;
  replacesAssetId?: string | null;
  deletedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface RegisterStats {
  totalAssets: number;
  totalPurchase: number;
  totalBalance: number;
  totalAnnualDep: number;
  totalNetBook: number;
  registerYears?: number;
  byCategory: { label: string; value: number }[];
}

export interface OpeningContext {
  category: string;
  categoryId?: string | null;
  depreciation_rate: number;
  effective_opening: number;
  effective_accumulated_depreciation: number;
  last_year_total_depreciation?: number;
  prior_asset_net_book?: number | null;
  prior_progress_purchase?: number | null;
  prior_same_asset_net_book?: number | null;
  wip_purchase_prices_in_year?: number[];
  category_total_balance?: number;
  year_start_opening?: number;
  prior_asset_name?: string | null;
  prior_asset_code?: string | null;
  assets_in_year?: number;
  source?: string;
  source_label?: string;
  entry_mode?: string;
}

export interface RegisterMeta {
  categories: Category[];
  years: FinancialYear[];
  /** Distinct years present in the asset register (imported or manually added). */
  registerYears?: number[];
  activeYear: number | null;
}

export interface PaginatedAssets {
  success: boolean;
  data: AssetRow[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedList<T> {
  success: boolean;
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AssetAssignment {
  id: string;
  organizationId: string;
  assetId: string;
  assigneeName?: string | null;
  department?: string | null;
  location?: string | null;
  assignDate?: string | null;
  expectedReturnDate?: string | null;
  returnDate?: string | null;
  returnCondition?: string | null;
  returnNotes?: string | null;
  notes?: string | null;
  status: 'Active' | 'Overdue' | 'Returned' | string;
  asset?: AssetRow;
  createdAt?: string;
  updatedAt?: string;
}

export interface AssetMaintenance {
  id: string;
  organizationId: string;
  assetId: string;
  description: string;
  provider?: string | null;
  priority?: string | null;
  dueDate?: string | null;
  estimatedCost?: number | null;
  status?: string | null;
  asset?: AssetRow;
  createdAt?: string;
  updatedAt?: string;
}

export interface AssetTransfer {
  id: string;
  organizationId: string;
  assetId: string;
  fromLocation?: string | null;
  fromDepartment?: string | null;
  toLocation?: string | null;
  toDepartment?: string | null;
  transferDate?: string | null;
  authorizedBy?: string | null;
  receivedBy?: string | null;
  reason?: string | null;
  asset?: AssetRow;
  createdAt?: string;
  updatedAt?: string;
}

export interface AssetReplacement {
  id: string;
  organizationId: string;
  oldAssetId: string;
  newAssetId?: string | null;
  reason?: string | null;
  rejectReason?: string | null;
  status: 'Pending' | 'AwaitingAsset' | 'Approved' | 'Rejected' | string;
  pendingPayload?: Record<string, unknown> | null;
  oldAsset?: AssetRow;
  newAsset?: AssetRow;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReportListItem {
  type: string;
  label?: string;
}

export type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  message?: string;
};
