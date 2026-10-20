export interface JwtUser {
  sub: string;
  email: string;
  organizationId: string;
  roles: string[];
  modules: string[];
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface DashboardData {
  mealsServedToday: number;
  breakfastServed: number;
  lunchServed: number;
  dinnerServed: number;
  totalStudentsFed: number;
  totalStaffFed: number;
  todaysMenu: TodaysMenuItem[];
  foodCostToday: number;
  monthlyFoodCost: number;
  currentFoodStock: number;
  lowStockIngredients: LowStockIngredient[];
  expiringFoodItems: ExpiringFoodItem[];
  kitchenStaffOnDuty: number;
  pendingKitchenRequests: number;
  foodWasteToday: number;
  budgetUtilization: number;
  budgetAllocated: number;
  budgetSpent: number;
  mealSatisfactionRating: number;
  upcomingDeliveries: UpcomingDelivery[];
  recentActivities: ActivityLog[];
}

export interface TodaysMenuItem {
  mealType: string;
  items: string[];
}

export interface LowStockIngredient {
  id: string;
  name: string;
  currentStock: number;
  reorderLevel: number;
}

export interface ExpiringFoodItem {
  id: string;
  name: string;
  expiryDate: string;
  quantity: number;
}

export interface UpcomingDelivery {
  id: string;
  supplierName: string;
  expectedDate: string;
  itemCount: number;
}

export interface ActivityLog {
  id: string;
  userId: string | null;
  action: string;
  metadata: any;
  createdAt: string;
}

export interface MenuItem {
  id: string;
  organizationId: string;
  name: string;
  category: string;
  mealType: string;
  description: string | null;
  isVegetarian: boolean;
  isVegan: boolean;
  isHalal: boolean;
  isGlutenFree: boolean;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  recipe?: Recipe;
}

export interface Recipe {
  id: string;
  menuItemId: string;
  organizationId: string;
  name: string;
  description: string | null;
  instructions: string | null;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  servings: number | null;
  calories: number | null;
  protein: number | null;
  carbohydrates: number | null;
  fat: number | null;
  vitamins: string | null;
  allergens: string | null;
  createdAt: string;
  updatedAt: string;
  ingredients?: RecipeIngredient[];
}

export interface RecipeIngredient {
  id: string;
  recipeId: string;
  productId: string;
  quantity: number;
  unit: string;
  notes: string | null;
  product?: { id: string; name: string; sku: string; unitOfMeasure: string };
}

export interface MealPlan {
  id: string;
  organizationId: string;
  planDate: string;
  mealType: string;
  planType: string;
  status: string;
  createdBy: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  items?: MealPlanItem[];
  _count?: { items: number };
}

export interface MealPlanItem {
  id: string;
  mealPlanId: string;
  menuItemId: string;
  servingsPlanned: number;
  menuItem?: { id: string; name: string; category: string; mealType: string };
}

export interface MealProduction {
  id: string;
  organizationId: string;
  mealPlanId: string | null;
  productionDate: string;
  mealType: string;
  plannedServings: number;
  actualServings: number;
  status: string;
  preparedBy: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  items?: MealProductionItem[];
  mealPlan?: { id: string; planDate: string };
  _count?: { items: number; servings: number };
}

export interface MealProductionItem {
  id: string;
  productionId: string;
  menuItemId: string;
  recipeId: string | null;
  plannedQuantity: number;
  actualQuantity: number;
  menuItem?: { id: string; name: string; category: string };
  recipe?: { id: string; name: string };
}

export interface MealServing {
  id: string;
  productionId: string;
  beneficiaryType: string;
  beneficiaryId: string | null;
  beneficiaryName: string;
  quantity: number;
  servedAt: string;
  notes: string | null;
}

export interface FoodWaste {
  id: string;
  organizationId: string;
  productionId: string | null;
  wasteDate: string;
  wasteType: string;
  itemName: string;
  quantity: number;
  unit: string;
  cost: number | null;
  reason: string | null;
  reportedBy: string;
  createdAt: string;
  production?: { id: string; mealType: string };
}

export interface KitchenRequest {
  id: string;
  organizationId: string;
  requestNumber: string;
  requestedBy: string;
  status: string;
  stockRequestId: string | null;
  inventoryStatus: string | null;
  storekeeperApproval: string | null;
  approvedBy: string | null;
  issuedBy: string | null;
  receivedBy: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  items?: KitchenRequestItem[];
  _count?: { items: number };
}

export interface KitchenRequestItem {
  id: string;
  requestId: string;
  productId: string;
  quantityRequested: number;
  quantityApproved: number | null;
  quantityIssued: number | null;
  notes: string | null;
  product?: { id: string; name: string; sku: string; unitOfMeasure: string };
}

export interface KitchenStaff {
  id: string;
  organizationId: string;
  name: string;
  role: string;
  phone: string | null;
  email: string | null;
  qualification: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DutyRoster {
  id: string;
  organizationId: string;
  staffId: string;
  rosterDate: string;
  shift: string;
  duty: string;
  status: string;
  notes: string | null;
  createdAt: string;
  staff?: KitchenStaff;
}

export interface HygieneChecklist {
  id: string;
  organizationId: string;
  checkDate: string;
  checkType: string;
  status: string;
  checkedBy: string;
  score: number | null;
  notes: string | null;
  items: HygieneChecklistItem[];
  createdAt: string;
}

export interface HygieneChecklistItem {
  id: string;
  checklistId: string;
  item: string;
  status: string;
  notes: string | null;
}

export interface ColdStorageLog {
  id: string;
  organizationId: string;
  logDate: string;
  freezerTemperature: number;
  refrigeratorTemperature: number;
  storageConditions: string | null;
  alertsTriggered: boolean;
  loggedBy: string;
  notes: string | null;
  createdAt: string;
}

export interface SupplierDelivery {
  id: string;
  organizationId: string;
  supplierId: string;
  deliveryDate: string;
  status: string;
  qualityRating: number | null;
  inspectionNotes: string | null;
  receivedBy: string;
  invoiceNumber: string | null;
  deliveryNoteNumber: string | null;
  createdAt: string;
  supplier?: { id: string; name: string };
  items?: SupplierDeliveryItem[];
  _count?: { items: number };
}

export interface SupplierDeliveryItem {
  id: string;
  deliveryId: string;
  productId: string;
  quantity: number;
  unitCost: number | null;
  qualityStatus: string;
  notes: string | null;
  product?: { id: string; name: string; sku: string; unitOfMeasure: string };
}

export interface NutritionProfile {
  id: string;
  organizationId: string;
  mealPlanId: string;
  calories: number | null;
  protein: number | null;
  carbohydrates: number | null;
  fat: number | null;
  vitamins: string | null;
  notes: string | null;
  createdAt: string;
}

export interface AllergyProfile {
  id: string;
  organizationId: string;
  beneficiaryType: string;
  beneficiaryId: string | null;
  beneficiaryName: string;
  allergyType: string;
  severity: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MealBudget {
  id: string;
  organizationId: string;
  month: number;
  year: number;
  allocatedAmount: number;
  spentAmount: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Attachment {
  id: string;
  organizationId: string;
  referenceType: string;
  referenceId: string;
  fileName: string;
  fileUrl: string;
  fileType: string | null;
  fileSize: number | null;
  uploadedBy: string;
  createdAt: string;
}

export interface Setting {
  id: string;
  organizationId: string;
  key: string;
  value: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}
