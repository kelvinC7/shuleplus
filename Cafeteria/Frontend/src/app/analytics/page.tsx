'use client';

import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/layouts/main-layout';
import { cafeteriaApi } from '@/services/cafeteria-api';
import { toast } from 'sonner';
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Users, UtensilsCrossed, Trash2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function AnalyticsPage() {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [mealCostData, setMealCostData] = useState<any>(null);
  const [consumptionData, setConsumptionData] = useState<any>(null);
  const [wasteData, setWasteData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [dashboard, mealCost, consumption, waste] = await Promise.all([
        cafeteriaApi.analytics.dashboard(),
        cafeteriaApi.analytics.mealCost(),
        cafeteriaApi.analytics.consumption(),
        cafeteriaApi.analytics.waste(),
      ]);
      setDashboardData(dashboard);
      setMealCostData(mealCost);
      setConsumptionData(consumption);
      setWasteData(waste);
    } catch {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <MainLayout><div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Loading analytics...</p></div></MainLayout>;
  }

  const mealCostChart = mealCostData?.monthlyCosts || [];
  const consumptionChart = consumptionData?.dailyConsumption || [];
  const wasteByTypeChart = wasteData?.byType || [];
  const popularMealsChart = consumptionData?.popularMeals || [];

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Kitchen Analytics</h1>
          <p className="text-sm text-muted-foreground">Visualize meal data, costs, consumption trends, and waste analysis</p>
        </div>

        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Avg Cost/Student</p>
                <p className="text-2xl font-bold">${mealCostData?.avgCostPerStudent?.toFixed(2) || '0.00'}</p>
              </div>
              <div className="rounded-lg bg-primary p-2 text-white"><DollarSign className="h-4 w-4" /></div>
            </div>
          </div>
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Avg Cost/Meal</p>
                <p className="text-2xl font-bold">${mealCostData?.avgCostPerMeal?.toFixed(2) || '0.00'}</p>
              </div>
              <div className="rounded-lg bg-green-500 p-2 text-white"><UtensilsCrossed className="h-4 w-4" /></div>
            </div>
          </div>
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Served</p>
                <p className="text-2xl font-bold">{consumptionData?.totalServed || 0}</p>
              </div>
              <div className="rounded-lg bg-purple-500 p-2 text-white"><Users className="h-4 w-4" /></div>
            </div>
          </div>
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Waste Rate</p>
                <p className="text-2xl font-bold">{wasteData?.wasteRate?.toFixed(1) || 0}%</p>
              </div>
              <div className="rounded-lg bg-red-500 p-2 text-white"><Trash2 className="h-4 w-4" /></div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="font-semibold mb-4">Monthly Food Cost</h2>
            {mealCostChart.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={mealCostChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="cost" fill="#0088FE" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-12">No data available</p>
            )}
          </div>

          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="font-semibold mb-4">Meals Served (Last 7 Days)</h2>
            {consumptionChart.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={consumptionChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="students" stroke="#0088FE" strokeWidth={2} />
                  <Line type="monotone" dataKey="staff" stroke="#00C49F" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-12">No data available</p>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="font-semibold mb-4">Food Waste by Type</h2>
            {wasteByTypeChart.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={wasteByTypeChart} cx="50%" cy="50%" outerRadius={100} dataKey="quantity" nameKey="type" label={({ name, percent }: any) => `${name.replace(/_/g, ' ')} (${(percent * 100).toFixed(0)}%)`}>
                    {wasteByTypeChart.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-12">No waste data available</p>
            )}
          </div>

          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="font-semibold mb-4">Popular Meals</h2>
            {popularMealsChart.length > 0 ? (
              <div className="space-y-3">
                {popularMealsChart.map((meal: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{meal.name}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.min((meal.count / Math.max(...popularMealsChart.map((m: any) => m.count))) * 100, 100)}px` }} />
                      <span className="text-sm font-semibold w-12 text-right">{meal.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-12">No data available</p>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
