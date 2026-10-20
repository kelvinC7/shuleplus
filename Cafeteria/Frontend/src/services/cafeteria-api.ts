import { api } from './api';
import type {
  ApiResponse, DashboardData, MenuItem, Recipe, RecipeIngredient,
  MealPlan, MealPlanItem, MealProduction, MealProductionItem, MealServing,
  FoodWaste, KitchenRequest, KitchenRequestItem, KitchenStaff, DutyRoster,
  HygieneChecklist, ColdStorageLog, SupplierDelivery, SupplierDeliveryItem,
  NutritionProfile, AllergyProfile, MealBudget, Setting, Notification,
} from '@/types';

async function get<T>(url: string): Promise<T> {
  const { data } = await api.get<ApiResponse<T>>(url);
  return data.data;
}

async function post<T>(url: string, body?: any): Promise<T> {
  const { data } = await api.post<ApiResponse<T>>(url, body);
  return data.data;
}

async function put<T>(url: string, body?: any): Promise<T> {
  const { data } = await api.put<ApiResponse<T>>(url, body);
  return data.data;
}

async function del(url: string): Promise<void> {
  await api.delete(url);
}

export const cafeteriaApi = {
  dashboard: {
    get: () => get<DashboardData>('/dashboard'),
  },
  analytics: {
    dashboard: () => get<DashboardData>('/analytics/dashboard'),
    mealCost: () => get<any>('/analytics/meal-cost'),
    consumption: () => get<any>('/analytics/consumption'),
    waste: () => get<any>('/analytics/waste'),
  },
  menuItems: {
    list: (params?: { mealType?: string; category?: string; search?: string }) =>
      get<MenuItem[]>(`/menu-items?${new URLSearchParams(params as any).toString()}`),
    getById: (id: string) => get<MenuItem>(`/menu-items/${id}`),
    create: (body: any) => post<MenuItem>('/menu-items', body),
    update: (id: string, body: any) => put<MenuItem>(`/menu-items/${id}`, body),
    remove: (id: string) => del(`/menu-items/${id}`),
  },
  recipes: {
    list: () => get<Recipe[]>('/recipes'),
    getById: (id: string) => get<Recipe>(`/recipes/${id}`),
    create: (body: any) => post<Recipe>('/recipes', body),
    update: (id: string, body: any) => put<Recipe>(`/recipes/${id}`, body),
    remove: (id: string) => del(`/recipes/${id}`),
    getIngredients: (id: string) => get<RecipeIngredient[]>(`/recipes/${id}/ingredients`),
    addIngredient: (id: string, body: any) => post<RecipeIngredient>(`/recipes/${id}/ingredients`, body),
    updateIngredient: (id: string, ingredientId: string, body: any) =>
      put<RecipeIngredient>(`/recipes/${id}/ingredients/${ingredientId}`, body),
    removeIngredient: (id: string, ingredientId: string) =>
      del(`/recipes/${id}/ingredients/${ingredientId}`),
  },
  mealPlans: {
    list: (params?: { date?: string; mealType?: string; status?: string }) =>
      get<MealPlan[]>(`/meal-plans?${new URLSearchParams(params as any).toString()}`),
    getById: (id: string) => get<MealPlan>(`/meal-plans/${id}`),
    create: (body: any) => post<MealPlan>('/meal-plans', body),
    update: (id: string, body: any) => put<MealPlan>(`/meal-plans/${id}`, body),
    remove: (id: string) => del(`/meal-plans/${id}`),
    activate: (id: string) => post<MealPlan>(`/meal-plans/${id}/activate`),
  },
  mealProductions: {
    list: (params?: { date?: string; mealType?: string; status?: string }) =>
      get<MealProduction[]>(`/meal-productions?${new URLSearchParams(params as any).toString()}`),
    getById: (id: string) => get<MealProduction>(`/meal-productions/${id}`),
    create: (body: any) => post<MealProduction>('/meal-productions', body),
    update: (id: string, body: any) => put<MealProduction>(`/meal-productions/${id}`, body),
    complete: (id: string) => post<MealProduction>(`/meal-productions/${id}/complete`),
    cancel: (id: string) => post<MealProduction>(`/meal-productions/${id}/cancel`),
  },
  mealServings: {
    list: (params?: { productionId?: string; beneficiaryType?: string; date?: string }) =>
      get<MealServing[]>(`/meal-servings?${new URLSearchParams(params as any).toString()}`),
    create: (body: any) => post<MealServing>('/meal-servings', body),
    createBulk: (body: any) => post<MealServing[]>('/meal-servings/bulk', body),
  },
  foodWaste: {
    list: (params?: { date?: string; wasteType?: string }) =>
      get<FoodWaste[]>(`/food-waste?${new URLSearchParams(params as any).toString()}`),
    getById: (id: string) => get<FoodWaste>(`/food-waste/${id}`),
    create: (body: any) => post<FoodWaste>('/food-waste', body),
  },
  kitchenRequests: {
    list: (status?: string) =>
      get<KitchenRequest[]>(`/kitchen-requests${status ? `?status=${status}` : ''}`),
    getById: (id: string) => get<KitchenRequest>(`/kitchen-requests/${id}`),
    create: (body: any) => post<KitchenRequest>('/kitchen-requests', body),
    update: (id: string, body: any) => put<KitchenRequest>(`/kitchen-requests/${id}`, body),
    remove: (id: string) => del(`/kitchen-requests/${id}`),
    receive: (id: string) => post<KitchenRequest>(`/kitchen-requests/${id}/receive`),
    forward: (id: string) => post<KitchenRequest>(`/kitchen-requests/${id}/forward`),
    syncStatus: (id: string) => post<KitchenRequest>(`/kitchen-requests/${id}/sync`),
    syncAll: () => post<KitchenRequest[]>('/kitchen-requests/sync-all'),
    getInventoryDetails: (id: string) => get<any>(`/kitchen-requests/${id}/inventory-details`),
    createGrn: (id: string, body: any) => post<any>(`/kitchen-requests/${id}/grn`, body),
  },
  inventoryProducts: {
    list: (search?: string) =>
      get<Array<{ id: string; name: string; sku: string; unitOfMeasure?: string }>>(
        `/inventory-products${search ? `?search=${encodeURIComponent(search)}` : ''}`
      ),
  },
  kitchenStaff: {
    list: () => get<KitchenStaff[]>('/kitchen-staff'),
    getById: (id: string) => get<KitchenStaff>(`/kitchen-staff/${id}`),
    create: (body: any) => post<KitchenStaff>('/kitchen-staff', body),
    update: (id: string, body: any) => put<KitchenStaff>(`/kitchen-staff/${id}`, body),
    remove: (id: string) => del(`/kitchen-staff/${id}`),
  },
  dutyRoster: {
    list: (params?: { date?: string; staffId?: string }) =>
      get<DutyRoster[]>(`/duty-roster?${new URLSearchParams(params as any).toString()}`),
    create: (body: any) => post<DutyRoster>('/duty-roster', body),
    update: (id: string, body: any) => put<DutyRoster>(`/duty-roster/${id}`, body),
    remove: (id: string) => del(`/duty-roster/${id}`),
  },
  hygiene: {
    list: (params?: { date?: string; status?: string }) =>
      get<HygieneChecklist[]>(`/hygiene-checklists?${new URLSearchParams(params as any).toString()}`),
    getById: (id: string) => get<HygieneChecklist>(`/hygiene-checklists/${id}`),
    create: (body: any) => post<HygieneChecklist>('/hygiene-checklists', body),
    update: (id: string, body: any) => put<HygieneChecklist>(`/hygiene-checklists/${id}`, body),
  },
  coldStorage: {
    list: (params?: { date?: string }) =>
      get<ColdStorageLog[]>(`/cold-storage-logs?${new URLSearchParams(params as any).toString()}`),
    getById: (id: string) => get<ColdStorageLog>(`/cold-storage-logs/${id}`),
    create: (body: any) => post<ColdStorageLog>('/cold-storage-logs', body),
  },
  supplierDeliveries: {
    list: (params?: { status?: string; supplierId?: string }) =>
      get<SupplierDelivery[]>(`/supplier-deliveries?${new URLSearchParams(params as any).toString()}`),
    getById: (id: string) => get<SupplierDelivery>(`/supplier-deliveries/${id}`),
    create: (body: any) => post<SupplierDelivery>('/supplier-deliveries', body),
    update: (id: string, body: any) => put<SupplierDelivery>(`/supplier-deliveries/${id}`, body),
    qualityCheck: (id: string, body: any) => put<SupplierDelivery>(`/supplier-deliveries/${id}/quality-check`, body),
  },
  nutrition: {
    list: () => get<NutritionProfile[]>('/nutrition-profiles'),
    getById: (id: string) => get<NutritionProfile>(`/nutrition-profiles/${id}`),
    create: (body: any) => post<NutritionProfile>('/nutrition-profiles', body),
  },
  allergies: {
    list: (params?: { beneficiaryType?: string }) =>
      get<AllergyProfile[]>(`/allergy-profiles?${new URLSearchParams(params as any).toString()}`),
    getById: (id: string) => get<AllergyProfile>(`/allergy-profiles/${id}`),
    create: (body: any) => post<AllergyProfile>('/allergy-profiles', body),
    update: (id: string, body: any) => put<AllergyProfile>(`/allergy-profiles/${id}`, body),
    remove: (id: string) => del(`/allergy-profiles/${id}`),
  },
  budgets: {
    list: (params?: { year?: number }) =>
      get<MealBudget[]>(`/budgets?${new URLSearchParams(params as any).toString()}`),
    getById: (id: string) => get<MealBudget>(`/budgets/${id}`),
    create: (body: any) => post<MealBudget>('/budgets', body),
    update: (id: string, body: any) => put<MealBudget>(`/budgets/${id}`, body),
  },
  notifications: {
    list: () => get<Notification[]>('/notifications'),
    markRead: (id: string) => put<Notification>(`/notifications/${id}/read`),
    markAllRead: () => put<void>('/notifications/read-all'),
  },
  settings: {
    list: () => get<Setting[]>('/settings'),
    update: (key: string, value: string) => put<Setting>('/settings', { key, value }),
  },
  reports: {
    production: (startDate: string, endDate: string) =>
      get<any>(`/reports/production?${new URLSearchParams({ startDate, endDate }).toString()}`),
    waste: (startDate: string, endDate: string) =>
      get<any>(`/reports/waste?${new URLSearchParams({ startDate, endDate }).toString()}`),
    staff: () => get<any>('/reports/staff'),
    budget: (month: number, year: number) =>
      get<any>(`/reports/budget?${new URLSearchParams({ month: String(month), year: String(year) }).toString()}`),
  },
};
