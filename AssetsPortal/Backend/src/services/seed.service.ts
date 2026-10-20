import { prisma } from "../config/database";

export const DEFAULT_CATEGORIES = [
  { name: "Computer", depreciationRate: 50, icon: "Laptop" },
  { name: "IT Equipment", depreciationRate: 25, icon: "Monitor" },
  { name: "Electronics", depreciationRate: 25, icon: "Cpu" },
  { name: "Office Equipment", depreciationRate: 20, icon: "Printer" },
  { name: "Vehicles", depreciationRate: 20, icon: "Car" },
  { name: "Machinery / Lab", depreciationRate: 15, icon: "FlaskConical" },
  { name: "Furniture", depreciationRate: 10, icon: "Armchair" },
  { name: "Buildings", depreciationRate: 5, icon: "Building2" },
  { name: "Land", depreciationRate: 0, icon: "Map" },
];

export async function seedTenantData(organizationId: string) {
  for (const cat of DEFAULT_CATEGORIES) {
    await prisma.assetCategory.upsert({
      where: {
        organizationId_name: { organizationId, name: cat.name },
      },
      update: {},
      create: {
        organizationId,
        name: cat.name,
        depreciationRate: cat.depreciationRate,
        icon: cat.icon,
        description: `${cat.name} assets`,
      },
    });
  }
}
