import { TenantStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';

export class TenantService {
  async createTenant(input: {
    organizationId: string;
    organizationName: string;
    organizationCode?: string;
  }) {
    const existing = await prisma.tenant.findFirst({
      where: {
        OR: [
          { organizationId: input.organizationId },
          ...(input.organizationCode ? [{ organizationCode: input.organizationCode }] : []),
        ],
      },
    });

    if (existing) {
      return existing;
    }

    const tenant = await prisma.tenant.create({
      data: {
        organizationId: input.organizationId,
        organizationCode: input.organizationCode,
        organizationName: input.organizationName,
        status: TenantStatus.ACTIVE,
      },
    });

    // Auto-seed demo data for the new tenant
    await this.seedTenantData(input.organizationId);

    return tenant;
  }

  async getTenant(organizationRef: string) {
    const tenant = await prisma.tenant.findFirst({
      where: {
        OR: [{ organizationId: organizationRef }, { organizationCode: organizationRef }],
      },
    });
    if (!tenant) throw new AppError(404, 'Tenant not found');
    return tenant;
  }

  private async seedTenantData(organizationId: string) {
    // 1. Default settings
    await prisma.setting.createMany({
      data: [
        { organizationId, key: 'breakfast_start_time', value: '06:30' },
        { organizationId, key: 'breakfast_end_time', value: '08:30' },
        { organizationId, key: 'lunch_start_time', value: '12:00' },
        { organizationId, key: 'lunch_end_time', value: '14:00' },
        { organizationId, key: 'dinner_start_time', value: '18:00' },
        { organizationId, key: 'dinner_end_time', value: '20:00' },
        { organizationId, key: 'serving_mode', value: 'BUFFET' },
        { organizationId, key: 'waste_tracking_enabled', value: 'true' },
        { organizationId, key: 'auto_deduct_inventory', value: 'true' },
        { organizationId, key: 'max_portions_per_student', value: '1' },
      ],
      skipDuplicates: true,
    });

    // 2. Sample menu items
    const menuItems = await Promise.all([
      prisma.menuItem.create({
        data: {
          organizationId,
          name: 'Ugali with Beans',
          category: 'Main Course',
          mealType: 'LUNCH',
          description: 'Traditional ugali served with simmered beans',
          isVegetarian: true,
          isVegan: true,
          isHalal: true,
          isGlutenFree: false,
        },
      }),
      prisma.menuItem.create({
        data: {
          organizationId,
          name: 'Chicken Stew with Rice',
          category: 'Main Course',
          mealType: 'LUNCH',
          description: 'Braised chicken in tomato sauce served with steamed rice',
          isVegetarian: false,
          isVegan: false,
          isHalal: true,
          isGlutenFree: true,
        },
      }),
      prisma.menuItem.create({
        data: {
          organizationId,
          name: 'Porridge with Milk',
          category: 'Breakfast',
          mealType: 'BREAKFAST',
          description: 'Warm maize porridge with fresh milk',
          isVegetarian: true,
          isVegan: false,
          isHalal: true,
          isGlutenFree: false,
        },
      }),
      prisma.menuItem.create({
        data: {
          organizationId,
          name: 'Chapati with Vegetable Soup',
          category: 'Main Course',
          mealType: 'LUNCH',
          description: 'Fresh chapati with mixed vegetable soup',
          isVegetarian: true,
          isVegan: true,
          isHalal: true,
          isGlutenFree: false,
        },
      }),
      prisma.menuItem.create({
        data: {
          organizationId,
          name: 'Mandazi with Tea',
          category: 'Snack',
          mealType: 'MORNING_TEA',
          description: 'Fried dough pastry with spiced tea',
          isVegetarian: true,
          isVegan: true,
          isHalal: true,
          isGlutenFree: false,
        },
      }),
      prisma.menuItem.create({
        data: {
          organizationId,
          name: 'Fish with Vegetables',
          category: 'Main Course',
          mealType: 'DINNER',
          description: 'Grilled tilapia with sautéed vegetables',
          isVegetarian: false,
          isVegan: false,
          isHalal: true,
          isGlutenFree: true,
        },
      }),
      prisma.menuItem.create({
        data: {
          organizationId,
          name: 'Fruit Salad',
          category: 'Dessert',
          mealType: 'AFTERNOON_SNACK',
          description: 'Mixed seasonal fruits',
          isVegetarian: true,
          isVegan: true,
          isHalal: true,
          isGlutenFree: true,
        },
      }),
      prisma.menuItem.create({
        data: {
          organizationId,
          name: 'Rice and Beans',
          category: 'Main Course',
          mealType: 'LUNCH',
          description: 'Rice paired with seasoned beans',
          isVegetarian: true,
          isVegan: true,
          isHalal: true,
          isGlutenFree: true,
        },
      }),
    ]);

    // 3. Recipes for menu items
    for (const mi of menuItems) {
      await prisma.recipe.create({
        data: {
          menuItemId: mi.id,
          organizationId,
          name: mi.name,
          description: `Recipe for ${mi.name}`,
          instructions: `Prepare ${mi.name} following standard kitchen procedures.`,
          prepTimeMinutes: 15,
          cookTimeMinutes: 45,
          servings: 100,
          calories: 350,
          protein: 20,
          carbohydrates: 45,
          fat: 10,
          allergens: mi.isGlutenFree ? undefined : 'Gluten',
        },
      });
    }

    // 4. Sample kitchen staff
    await prisma.kitchenStaff.createMany({
      data: [
        {
          organizationId,
          name: 'Marie Claire',
          role: 'CHEF',
          phone: '+250788100001',
          email: 'marie.claire@demoschool.com',
          qualification: 'Certificate in Culinary Arts',
        },
        {
          organizationId,
          name: 'Jean Baptiste',
          role: 'KITCHEN_ASSISTANT',
          phone: '+250788100002',
          qualification: 'On-the-job training',
        },
        {
          organizationId,
          name: 'Aline Uwimana',
          role: 'STOREKEEPER',
          phone: '+250788100003',
          email: 'aline.uwimana@demoschool.com',
          qualification: 'Diploma in Supply Chain',
        },
        {
          organizationId,
          name: 'Emmanuel Ndayisaba',
          role: 'CLEANER',
          phone: '+250788100004',
        },
        {
          organizationId,
          name: 'Patrick Habimana',
          role: 'SUPERVISOR',
          phone: '+250788100005',
          email: 'patrick.habimana@demoschool.com',
          qualification: 'Bachelor in Hotel Management',
        },
      ],
    });

    // 5. Default monthly budget for current month
    const now = new Date();
    await prisma.mealBudget.create({
      data: {
        organizationId,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        allocatedAmount: 5000000,
        spentAmount: 0,
        notes: 'Default monthly budget — adjust as needed',
      },
    });

    console.log(`[TenantService] Demo data seeded for org: ${organizationId}`);
  }
}

export const tenantService = new TenantService();
