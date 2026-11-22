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

// ---------------------------------------------------------------------------
// Independent Land module
// ---------------------------------------------------------------------------

export interface LandSetupYear {
  id: string;
  year: number;
  startDate: string;
  endDate: string;
  status: string;
  setup: { id: string; openingAmount: number; updatedAt?: string } | null;
  importCount: number;
}

export interface LandMeta {
  years: LandSetupYear[];
  activeYear: number | null;
  provinces: string[];
  districts: string[];
  sectors: string[];
  categories: string[];
  suppliers: string[];
}

export interface LandRecord {
  id: string;
  organizationId: string;
  financialYearId: string;
  year: number;
  sequence: number;
  province?: string | null;
  district?: string | null;
  sector?: string | null;
  cellule?: string | null;
  village?: string | null;
  landType?: string | null;
  category?: string | null;
  supplier?: string | null;
  tax?: string | null;
  upi?: string | null;
  sku?: string | null;
  size?: string | null;
  sizeValue?: number | null;
  material?: string | null;
  purchaseYear?: number | null;
  purchaseMonth?: number | null;
  purchaseDay?: number | null;
  purchaseDate?: string | null;
  purchaseUnitPrice: number;
  openingAmount: number;
  totalBalance: number;
  importBatchId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface LandRecordDetail extends LandRecord {
  previous?: { id: string; sequence: number; upi?: string | null; totalBalance: number } | null;
  next?: { id: string; sequence: number; upi?: string | null; openingAmount: number } | null;
  calculation: {
    previousBalance: number;
    purchaseUnitPrice: number;
    totalBalance: number;
  };
}

export interface LandSetupSummary {
  id: string | null;
  organizationId: string;
  financialYearId: string;
  year: number;
  configured: boolean;
  openingAmount: number;
  recordCount: number;
  totalPurchaseValue: number;
  totalSize: number;
  closingBalance: number;
  updatedAt?: string | null;
}

export interface LandPaginated {
  success: boolean;
  data: LandRecord[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  summary: { totalPurchaseValue: number; totalSize: number };
}

export interface LandDashboard {
  financialYear: {
    year: number;
    status: string;
    startDate?: string | null;
    endDate?: string | null;
    configured: boolean;
    openingAmount: number;
  };
  stats: {
    totalRecords: number;
    openingAmount: number;
    totalPurchaseValue: number;
    totalLandBalance: number;
    totalSize: number;
    closingBalance: number;
  };
  charts: {
    byProvince: LandChartPoint[];
    byDistrict: LandChartPoint[];
    byCategory: LandChartPoint[];
    byType: LandChartPoint[];
    purchaseTrend: { year: number; value: number; count: number }[];
  };
  filters: {
    provinces: string[];
    districts: string[];
    sectors: string[];
    categories: string[];
    suppliers: string[];
  };
}

export interface LandChartPoint {
  label: string;
  count: number;
  value: number;
  size: number;
}

export interface LandImportPreviewRow {
  row: number;
  status: 'valid' | 'invalid' | 'duplicate';
  errors: string[];
  data: Record<string, unknown> | null;
  openingAmount: number | null;
  purchaseUnitPrice: number | null;
  totalBalance: number | null;
}

export interface LandImportPreview {
  summary: {
    total: number;
    valid: number;
    invalid: number;
    duplicates: number;
    year: number;
    openingAmount: number;
    totalPurchaseValue: number;
    expectedTotalBalance: number;
    canImport: boolean;
  };
  rows: LandImportPreviewRow[];
}

export interface LandReportColumn {
  key: string;
  label: string;
  type: 'text' | 'money' | 'number' | 'date' | string;
}

export interface LandReport {
  type: string;
  title: string;
  subtitle: string;
  generatedAt: string;
  organization: { name: string; code?: string | null };
  financialYear: { year: number; status: string; startDate?: string | null; endDate?: string | null };
  filters: Record<string, unknown>;
  summary: Array<{ label: string; value: number | string; type?: string }>;
  columns: LandReportColumn[];
  rows: Record<string, string | number | null>[];
}

export interface LandReportType {
  type: string;
  label: string;
}

// ---------------------------------------------------------------------------
// Independent Vehicle module
// ---------------------------------------------------------------------------

export interface VehicleSetupYear {
  id: string;
  year: number;
  startDate: string;
  endDate: string;
  status: string;
  setup: {
    id: string;
    openingAmount: number;
    accumulatedDepreciation: number;
    depreciationMode: string;
    depreciationRate: number;
    usefulYears: number;
    updatedAt?: string;
  } | null;
  importCount: number;
}

export interface VehicleMeta {
  organizationName: string;
  years: VehicleSetupYear[];
  activeYear: number | null;
  locations: string[];
  names: string[];
  labels: string[];
  types: string[];
  categories: string[];
  suppliers: string[];
  purchaseYears: number[];
}

export interface VehicleRecord {
  id: string;
  organizationId: string;
  financialYearId: string;
  year: number;
  sequence: number;
  location?: string | null;
  name?: string | null;
  label?: string | null;
  vehicleType?: string | null;
  type?: string | null;
  category?: string | null;
  supplier?: string | null;
  tax?: string | null;
  upi?: string | null;
  sku?: string | null;
  size?: string | null;
  material?: string | null;
  purchaseYear?: number | null;
  purchaseMonth?: number | null;
  purchaseDay?: number | null;
  purchaseDate?: string | null;
  purchaseUnitPrice: number;
  saleBalance: number;
  openingAmount: number;
  totalBalance: number;
  accumulatedDepreciation: number;
  annualDep: number;
  totalDep: number;
  netBookValue: number;
  depRate: number;
  depMode: string;
  usefulYears: number;
  useSetupDepreciation: boolean;
  quantity: number;
  decimalDepreciation?: number;
  importBatchId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface VehicleRecordDetail extends VehicleRecord {
  previous?: {
    id: string;
    sequence: number;
    name?: string | null;
    upi?: string | null;
    totalBalance: number;
  } | null;
  next?: {
    id: string;
    sequence: number;
    name?: string | null;
    upi?: string | null;
    openingAmount: number;
  } | null;
  calculation: {
    previousBalance: number;
    purchaseUnitPrice: number;
    saleBalance: number;
    totalBalance: number;
    accumulatedDepreciation: number;
    annualDep: number;
    totalDep: number;
    netBookValue: number;
    formula: string;
  };
  lastCalculatedAt?: string;
}

export interface VehicleSetupSummary {
  id: string | null;
  organizationId: string;
  financialYearId: string;
  year: number;
  configured: boolean;
  openingAmount: number;
  accumulatedDepreciation: number;
  depreciationMode: string;
  depreciationRate: number;
  usefulYears: number;
  recordCount: number;
  totalPurchaseValue: number;
  totalSaleBalance: number;
  totalQuantity: number;
  totalAnnualDepreciation: number;
  totalAccumulatedDepreciation: number;
  totalDepreciation: number;
  totalNetBookValue: number;
  closingBalance: number;
  updatedAt?: string | null;
}

export interface VehiclePaginated {
  success: boolean;
  data: VehicleRecord[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  summary: {
    totalPurchaseValue: number;
    totalSaleBalance: number;
    totalQuantity: number;
    totalAnnualDepreciation: number;
    totalDepreciation: number;
    totalNetBookValue: number;
  };
}

export interface VehicleChartPoint {
  label: string;
  count: number;
  purchaseValue: number;
  saleBalance: number;
  totalBalance: number;
  quantity: number;
}

export interface VehicleDashboard {
  financialYear: {
    year: number;
    status: string;
    startDate?: string | null;
    endDate?: string | null;
    configured: boolean;
    openingAmount: number;
    depreciationMode: string;
    depreciationRate: number;
    usefulYears: number;
    accumulatedDepreciation: number;
  };
  stats: {
    totalVehicles: number;
    openingAmount: number;
    totalPurchaseValue: number;
    totalSaleBalance: number;
    totalBalance: number;
    accumulatedDepreciation: number;
    annualDepreciation: number;
    totalDepreciation: number;
    netBookValue: number;
    totalQuantity: number;
    closingBalance: number;
  };
  charts: {
    byLocation: VehicleChartPoint[];
    byType: VehicleChartPoint[];
    byCategory: VehicleChartPoint[];
    purchaseValueByYear: { year: number; value: number; count: number }[];
    saleBalanceByYear: { year: number; value: number; count: number }[];
    totalBalanceByFY: { year: number; value: number; count: number }[];
    depreciationTrends: {
      year: number;
      annualDepreciation: number;
      totalDepreciation: number;
      accumulatedDepreciation: number;
    }[];
    netBookValueTrends: { year: number; netBookValue: number; totalBalance: number }[];
  };
  filters: {
    locations: string[];
    types: string[];
    categories: string[];
    suppliers: string[];
    purchaseYears: number[];
  };
}

export interface VehicleImportPreviewRow {
  row: number;
  status: 'valid' | 'invalid' | 'duplicate';
  errors: string[];
  data: Record<string, unknown> | null;
  openingAmount: number | null;
  purchaseUnitPrice: number | null;
  saleBalance: number | null;
  totalBalance: number | null;
  accumulatedDepreciation: number | null;
  annualDep: number | null;
  totalDep: number | null;
  netBookValue: number | null;
}

export interface VehicleImportPreview {
  summary: {
    total: number;
    valid: number;
    invalid: number;
    duplicates: number;
    year: number;
    openingAmount: number;
    startingOpeningAmount: number;
    totalPurchaseValue: number;
    totalSaleBalance: number;
    expectedTotalBalance: number;
    expectedAnnualDepreciation: number;
    expectedTotalDepreciation: number;
    expectedAccumulatedDepreciation: number;
    expectedNetBookValue: number;
    depreciationMode: string;
    depreciationRate: number;
    usefulYears: number;
    canImport: boolean;
  };
  rows: VehicleImportPreviewRow[];
}

export interface VehicleReportColumn {
  key: string;
  label: string;
  type: 'text' | 'money' | 'number' | 'date' | string;
}

export interface VehicleReport {
  type: string;
  title: string;
  subtitle: string;
  generatedAt: string;
  organization: { name: string; code?: string | null };
  financialYear: { year: number; status: string; startDate?: string | null; endDate?: string | null };
  filters: Record<string, unknown>;
  summary: Array<{ label: string; value: number | string; type?: string }>;
  columns: VehicleReportColumn[];
  rows: Record<string, string | number | null>[];
}

export interface VehicleReportType {
  type: string;
  label: string;
}

export interface VehicleAuditLog {
  id: string;
  organizationId: string;
  vehicleRecordId?: string | null;
  financialYearId?: string | null;
  year?: number | null;
  action: string;
  detail?: string | null;
  metadata?: Record<string, unknown> | null;
  actorUserId?: string | null;
  actorEmail?: string | null;
  createdAt: string;
}
