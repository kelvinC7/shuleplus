'use client';

import { MainLayout } from '@/layouts/main-layout';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import {
  UtensilsCrossed, Users, UserCheck, DollarSign, TrendingUp, Package,
  AlertTriangle, Clock, ChefHat, Trash2, Truck, Heart, AlertCircle,
  ArrowUp, Star, ClipboardList,
} from 'lucide-react';

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

function describeActivity(action: string, metadata: any): string {
  switch (action) {
    case 'MEAL_PRODUCED':
      return `Produced ${metadata?.servings || 0} servings of ${metadata?.mealType || 'meal'}`;
    case 'MEAL_SERVED':
      return `Served ${metadata?.beneficiaryType || 'beneficiary'}: ${metadata?.beneficiaryName || ''}`;
    case 'FOOD_WASTE_RECORDED':
      return `Waste recorded: ${metadata?.itemName || 'item'} (${metadata?.quantity || 0} ${metadata?.unit || ''})`;
    case 'KITCHEN_REQUEST_CREATED':
      return `Kitchen request #${metadata?.requestNumber || ''} created`;
    case 'KITCHEN_REQUEST_APPROVED':
      return `Kitchen request #${metadata?.requestNumber || ''} approved`;
    case 'KITCHEN_REQUEST_ISSUED':
      return `Kitchen request #${metadata?.requestNumber || ''} issued`;
    case 'DELIVERY_RECEIVED':
      return `Delivery received from ${metadata?.supplierName || 'supplier'}`;
    case 'MENU_PLAN_CREATED':
      return `Menu plan created for ${metadata?.planDate || 'date'}`;
    case 'HYGIENE_CHECK_COMPLETED':
      return `Hygiene check completed (Score: ${metadata?.score || 'N/A'})`;
    case 'STAFF_ADDED':
      return `Kitchen staff added: ${metadata?.name || ''}`;
    default:
      return action?.replace(/_/g, ' ').toLowerCase() || 'Unknown activity';
  }
}

export default function DashboardPage() {
  const { ready, authorized, error, summary } = useAuth();
  const router = useRouter();

  if (!ready) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </MainLayout>
    );
  }

  if (!authorized) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <AlertCircle className="h-10 w-10 text-red-500" />
          <p className="text-red-600 font-medium">Access Denied</p>
          <p className="text-sm text-muted-foreground max-w-md text-center">
            {error || 'Unable to access Cafeteria Management. Please check your network connection and try again.'}
          </p>
        </div>
      </MainLayout>
    );
  }

  const cards = [
    { label: 'Meals Served Today', value: summary?.mealsServedToday ?? 0, icon: UtensilsCrossed, color: 'bg-primary', href: '/meal-production' },
    { label: 'Breakfast Served', value: summary?.breakfastServed ?? 0, icon: UtensilsCrossed, color: 'bg-amber-500', href: '/meal-production' },
    { label: 'Lunch Served', value: summary?.lunchServed ?? 0, icon: UtensilsCrossed, color: 'bg-green-500', href: '/meal-production' },
    { label: 'Dinner Served', value: summary?.dinnerServed ?? 0, icon: UtensilsCrossed, color: 'bg-indigo-500', href: '/meal-production' },
    { label: 'Total Students Fed', value: summary?.totalStudentsFed ?? 0, icon: Users, color: 'bg-teal-500', href: '/beneficiaries' },
    { label: 'Total Staff Fed', value: summary?.totalStaffFed ?? 0, icon: UserCheck, color: 'bg-cyan-500', href: '/beneficiaries' },
    { label: 'Food Cost Today', value: `$${(summary?.foodCostToday ?? 0).toLocaleString()}`, icon: DollarSign, color: 'bg-orange-500', href: '/analytics' },
    { label: 'Monthly Food Cost', value: `$${(summary?.monthlyFoodCost ?? 0).toLocaleString()}`, icon: TrendingUp, color: 'bg-purple-500', href: '/analytics' },
    { label: 'Current Food Stock', value: summary?.currentFoodStock ?? 0, icon: Package, color: 'bg-emerald-500', href: '/kitchen-requests' },
    { label: 'Low Stock Ingredients', value: summary?.lowStockIngredients?.length ?? 0, icon: AlertTriangle, color: 'bg-yellow-500', alert: (summary?.lowStockIngredients?.length ?? 0) > 0, href: '/kitchen-requests' },
    { label: 'Expiring Food Items', value: summary?.expiringFoodItems?.length ?? 0, icon: Clock, color: 'bg-red-500', alert: (summary?.expiringFoodItems?.length ?? 0) > 0, href: '/food-waste' },
    { label: 'Kitchen Staff on Duty', value: summary?.kitchenStaffOnDuty ?? 0, icon: ChefHat, color: 'bg-violet-500', href: '/kitchen-staff' },
    { label: 'Pending Kitchen Requests', value: summary?.pendingKitchenRequests ?? 0, icon: ClipboardList, color: 'bg-rose-500', alert: (summary?.pendingKitchenRequests ?? 0) > 0, href: '/kitchen-requests' },
    { label: 'Food Waste Today', value: `${summary?.foodWasteToday ?? 0} kg`, icon: Trash2, color: 'bg-red-700', href: '/food-waste' },
    { label: 'Budget Utilization', value: `${((summary?.budgetUtilization ?? 0) * 100).toFixed(0)}%`, icon: TrendingUp, color: 'bg-sky-500', href: '/analytics' },
    { label: 'Satisfaction Rating', value: `${(summary?.mealSatisfactionRating ?? 0).toFixed(1)}/5`, icon: Star, color: 'bg-amber-600', href: '/analytics' },
    { label: 'Upcoming Deliveries', value: summary?.upcomingDeliveries?.length ?? 0, icon: Truck, color: 'bg-lime-600', href: '/suppliers' },
    { label: 'Pending Requests', value: summary?.pendingKitchenRequests ?? 0, icon: ClipboardList, color: 'bg-indigo-500', href: '/kitchen-requests' },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {cards.map((card) => (
            <button
              key={card.label}
              onClick={() => router.push(card.href)}
              className="rounded-xl border bg-white p-4 shadow-sm text-left transition-all hover:shadow-md hover:border-amber-200 active:scale-[0.98]"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{card.label}</span>
                <div className={`rounded-lg p-2 ${card.color} text-white`}>
                  <card.icon className="h-4 w-4" />
                </div>
              </div>
              <p className={`mt-3 text-2xl font-bold ${card.alert ? 'text-red-600' : ''}`}>{card.value}</p>
            </button>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="font-semibold mb-4">Today&apos;s Menu</h2>
            {summary?.todaysMenu?.length ? (
              <div className="space-y-4">
                {summary.todaysMenu.map((meal) => (
                  <div key={meal.mealType}>
                    <p className="text-sm font-medium text-muted-foreground uppercase mb-1">{meal.mealType}</p>
                    <div className="flex flex-wrap gap-2">
                      {meal.items.map((item) => (
                        <span key={item} className="inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No menu planned for today</p>
            )}
          </div>

          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="font-semibold mb-4">Budget Utilization</h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Spent: ${(summary?.budgetSpent ?? 0).toLocaleString()}</span>
                  <span>Allocated: ${(summary?.budgetAllocated ?? 0).toLocaleString()}</span>
                </div>
                <div className="h-3 rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${Math.min((summary?.budgetUtilization ?? 0) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {((summary?.budgetUtilization ?? 0) * 100).toFixed(1)}% of budget used
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="font-semibold mb-4">Low Stock Ingredients</h2>
            {summary?.lowStockIngredients?.length ? (
              <div className="space-y-3">
                {summary.lowStockIngredients.map((item) => (
                  <div key={item.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">Reorder level: {item.reorderLevel}</p>
                    </div>
                    <span className="text-sm font-semibold text-red-600">{item.currentStock} left</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">All ingredients are well stocked</p>
            )}
          </div>

          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="font-semibold mb-4">Expiring Food Items</h2>
            {summary?.expiringFoodItems?.length ? (
              <div className="space-y-3">
                {summary.expiringFoodItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                    </div>
                    <span className="text-sm font-semibold text-orange-600">
                      Expires: {new Date(item.expiryDate).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No items expiring soon</p>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="font-semibold mb-4">Upcoming Deliveries</h2>
            {summary?.upcomingDeliveries?.length ? (
              <div className="space-y-3">
                {summary.upcomingDeliveries.map((delivery) => (
                  <div key={delivery.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{delivery.supplierName}</p>
                      <p className="text-xs text-muted-foreground">{delivery.itemCount} items</p>
                    </div>
                    <span className="text-sm font-semibold text-amber-600">
                      {new Date(delivery.expectedDate).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No upcoming deliveries</p>
            )}
          </div>

          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="font-semibold mb-4">Food Waste Today</h2>
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-4xl font-bold text-red-600">{summary?.foodWasteToday ?? 0} kg</p>
                <p className="text-sm text-muted-foreground mt-1">Total waste today</p>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm">
                <Trash2 className="h-4 w-4 text-red-500" />
                <span className="text-muted-foreground">Track waste to reduce costs</span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="font-semibold mb-4">Recent Kitchen Activities</h2>
          {summary?.recentActivities?.length ? (
            <div className="space-y-2">
              {summary.recentActivities.map((log) => (
                <div key={log.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <p className="text-sm text-muted-foreground">{describeActivity(log.action, log.metadata)}</p>
                  <span className="text-xs text-muted-foreground shrink-0 ml-4">{timeAgo(log.createdAt)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No recent activity</p>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
