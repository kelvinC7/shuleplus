import { Router, Request, Response } from 'express';
import { tenantController } from '../controllers/tenant.controller';
import { dashboardController } from '../controllers/dashboard.controller';
import { menuItemController } from '../controllers/menu-item.controller';
import { recipeController } from '../controllers/recipe.controller';
import { mealPlanController } from '../controllers/meal-plan.controller';
import { mealProductionController } from '../controllers/meal-production.controller';
import { foodWasteController } from '../controllers/food-waste.controller';
import { kitchenRequestController } from '../controllers/kitchen-request.controller';
import { kitchenStaffController } from '../controllers/kitchen-staff.controller';
import { dutyRosterController } from '../controllers/duty-roster.controller';
import { hygieneController } from '../controllers/hygiene.controller';
import { coldStorageController } from '../controllers/cold-storage.controller';
import { supplierDeliveryController } from '../controllers/supplier-delivery.controller';
import { nutritionController } from '../controllers/nutrition.controller';
import { notificationController } from '../controllers/notification.controller';
import { settingController } from '../controllers/setting.controller';
import { analyticsController } from '../controllers/analytics.controller';
import { reportController } from '../controllers/report.controller';
import {
  authenticate,
  requireModuleLicense,
  requireServiceAuth,
} from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'cafeteria-service',
    module: 'cafeteria',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

router.post('/tenant/create', requireServiceAuth, (req, res, next) =>
  tenantController.create(req, res, next)
);

router.post('/tenant/ensure', authenticate, requireModuleLicense, (req, res, next) =>
  tenantController.ensure(req, res, next)
);

const p = Router();
p.use(authenticate, requireModuleLicense, requireTenant);

// Dashboard
p.get('/dashboard', (req, res, next) => dashboardController.summary(req, res, next));

// Menu Items
p.get('/menu-items', (req, res, next) => menuItemController.list(req, res, next));
p.get('/menu-items/:id', (req, res, next) => menuItemController.getById(req, res, next));
p.post('/menu-items', (req, res, next) => menuItemController.create(req, res, next));
p.put('/menu-items/:id', (req, res, next) => menuItemController.update(req, res, next));
p.delete('/menu-items/:id', (req, res, next) => menuItemController.remove(req, res, next));

// Recipes
p.get('/recipes', (req, res, next) => recipeController.list(req, res, next));
p.get('/recipes/:id', (req, res, next) => recipeController.getById(req, res, next));
p.post('/recipes', (req, res, next) => recipeController.create(req, res, next));
p.put('/recipes/:id', (req, res, next) => recipeController.update(req, res, next));
p.delete('/recipes/:id', (req, res, next) => recipeController.remove(req, res, next));

// Meal Plans
p.get('/meal-plans', (req, res, next) => mealPlanController.list(req, res, next));
p.get('/meal-plans/:id', (req, res, next) => mealPlanController.getById(req, res, next));
p.post('/meal-plans', (req, res, next) => mealPlanController.create(req, res, next));
p.put('/meal-plans/:id', (req, res, next) => mealPlanController.update(req, res, next));
p.delete('/meal-plans/:id', (req, res, next) => mealPlanController.remove(req, res, next));

// Meal Production
p.get('/meal-productions', (req, res, next) => mealProductionController.list(req, res, next));
p.get('/meal-productions/:id', (req, res, next) => mealProductionController.getById(req, res, next));
p.post('/meal-productions', (req, res, next) => mealProductionController.create(req, res, next));
p.put('/meal-productions/:id', (req, res, next) => mealProductionController.update(req, res, next));
p.post('/meal-productions/:id/complete', (req, res, next) => mealProductionController.complete(req, res, next));
p.post('/meal-productions/:id/cancel', (req, res, next) => mealProductionController.cancel(req, res, next));
p.delete('/meal-productions/:id', (req, res, next) => mealProductionController.remove(req, res, next));

// Food Waste
p.get('/food-waste', (req, res, next) => foodWasteController.list(req, res, next));
p.get('/food-waste/:id', (req, res, next) => foodWasteController.getById(req, res, next));
p.post('/food-waste', (req, res, next) => foodWasteController.create(req, res, next));
p.put('/food-waste/:id', (req, res, next) => foodWasteController.update(req, res, next));
p.delete('/food-waste/:id', (req, res, next) => foodWasteController.remove(req, res, next));

// Kitchen Requests
p.get('/kitchen-requests', (req, res, next) => kitchenRequestController.list(req, res, next));
p.get('/kitchen-requests/:id', (req, res, next) => kitchenRequestController.getById(req, res, next));
p.post('/kitchen-requests', (req, res, next) => kitchenRequestController.create(req, res, next));
p.post('/kitchen-requests/:id/forward', (req, res, next) => kitchenRequestController.forward(req, res, next));
p.post('/kitchen-requests/:id/receive', (req, res, next) => kitchenRequestController.receive(req, res, next));
p.post('/kitchen-requests/:id/sync', (req, res, next) => kitchenRequestController.syncStatus(req, res, next));
p.post('/kitchen-requests/sync-all', (req, res, next) => kitchenRequestController.syncAllPending(req, res, next));
p.get('/kitchen-requests/:id/inventory-details', (req, res, next) => kitchenRequestController.getInventoryDetails(req, res, next));
p.post('/kitchen-requests/:id/grn', (req, res, next) => kitchenRequestController.createGrn(req, res, next));
p.delete('/kitchen-requests/:id', (req, res, next) => kitchenRequestController.remove(req, res, next));
p.get('/inventory-products', (req, res, next) => kitchenRequestController.listProducts(req, res, next));

// Kitchen Staff
p.get('/kitchen-staff', (req, res, next) => kitchenStaffController.list(req, res, next));
p.get('/kitchen-staff/:id', (req, res, next) => kitchenStaffController.getById(req, res, next));
p.post('/kitchen-staff', (req, res, next) => kitchenStaffController.create(req, res, next));
p.put('/kitchen-staff/:id', (req, res, next) => kitchenStaffController.update(req, res, next));
p.delete('/kitchen-staff/:id', (req, res, next) => kitchenStaffController.remove(req, res, next));

// Duty Roster
p.get('/duty-roster', (req, res, next) => dutyRosterController.list(req, res, next));
p.get('/duty-roster/:id', (req, res, next) => dutyRosterController.getById(req, res, next));
p.post('/duty-roster', (req, res, next) => dutyRosterController.create(req, res, next));
p.put('/duty-roster/:id', (req, res, next) => dutyRosterController.update(req, res, next));
p.delete('/duty-roster/:id', (req, res, next) => dutyRosterController.remove(req, res, next));

// Hygiene & Safety
p.get('/hygiene', (req, res, next) => hygieneController.list(req, res, next));
p.get('/hygiene/:id', (req, res, next) => hygieneController.getById(req, res, next));
p.post('/hygiene', (req, res, next) => hygieneController.create(req, res, next));
p.put('/hygiene/:id', (req, res, next) => hygieneController.update(req, res, next));
p.delete('/hygiene/:id', (req, res, next) => hygieneController.remove(req, res, next));

// Cold Storage
p.get('/cold-storage', (req, res, next) => coldStorageController.list(req, res, next));
p.get('/cold-storage/:id', (req, res, next) => coldStorageController.getById(req, res, next));
p.post('/cold-storage', (req, res, next) => coldStorageController.create(req, res, next));
p.put('/cold-storage/:id', (req, res, next) => coldStorageController.update(req, res, next));
p.delete('/cold-storage/:id', (req, res, next) => coldStorageController.remove(req, res, next));

// Supplier Deliveries
p.get('/supplier-deliveries', (req, res, next) => supplierDeliveryController.list(req, res, next));
p.get('/supplier-deliveries/:id', (req, res, next) => supplierDeliveryController.getById(req, res, next));
p.post('/supplier-deliveries', (req, res, next) => supplierDeliveryController.create(req, res, next));
p.put('/supplier-deliveries/:id', (req, res, next) => supplierDeliveryController.update(req, res, next));
p.delete('/supplier-deliveries/:id', (req, res, next) => supplierDeliveryController.remove(req, res, next));

// Nutrition & Allergies
p.get('/nutrition', (req, res, next) => nutritionController.listNutrition(req, res, next));
p.post('/nutrition', (req, res, next) => nutritionController.createNutrition(req, res, next));
p.get('/allergies', (req, res, next) => nutritionController.listAllergies(req, res, next));
p.post('/allergies', (req, res, next) => nutritionController.createAllergy(req, res, next));
p.put('/allergies/:id', (req, res, next) => nutritionController.updateAllergy(req, res, next));
p.delete('/allergies/:id', (req, res, next) => nutritionController.removeAllergy(req, res, next));

// Notifications
p.get('/notifications', (req, res, next) => notificationController.list(req, res, next));
p.post('/notifications/:id/read', (req, res, next) => notificationController.markRead(req, res, next));
p.post('/notifications/read-all', (req, res, next) => notificationController.markAllRead(req, res, next));

// Analytics
p.get('/analytics/costs', (req, res, next) => analyticsController.getCostAnalytics(req, res, next));
p.get('/analytics/consumption', (req, res, next) => analyticsController.getConsumptionAnalytics(req, res, next));
p.get('/analytics/waste', (req, res, next) => analyticsController.getWasteAnalytics(req, res, next));
p.get('/analytics/popular-meals', (req, res, next) => analyticsController.getPopularMeals(req, res, next));

// Reports
p.get('/reports/production', (req, res, next) => reportController.getProductionReport(req, res, next));
p.get('/reports/waste', (req, res, next) => reportController.getWasteReport(req, res, next));
p.get('/reports/staff', (req, res, next) => reportController.getStaffReport(req, res, next));
p.get('/reports/budget', (req, res, next) => reportController.getBudgetReport(req, res, next));

// Settings
p.get('/settings', (req, res, next) => settingController.list(req, res, next));
p.get('/settings/:key', (req, res, next) => settingController.get(req, res, next));
p.put('/settings', (req, res, next) => settingController.set(req, res, next));
p.put('/settings/bulk', (req, res, next) => settingController.setBulk(req, res, next));

router.use(p);

export default router;
