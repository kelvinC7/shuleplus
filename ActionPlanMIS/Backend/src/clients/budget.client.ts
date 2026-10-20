import { env } from '../config/env';

export interface BudgetLineOption {
  id: string;
  label: string;
  category?: string;
  allocated?: number;
  spent?: number;
  budgetId?: string;
}

/** Fetch budget lines from School Budget module (loopback in production). */
export async function fetchBudgetLines(organizationId: string, accessToken?: string): Promise<BudgetLineOption[]> {
  const base = env.BUDGET_API_URL.replace(/\/$/, '');
  const url = `${base}/budget-lines`;

  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

    const res = await fetch(url, { headers });
    if (!res.ok) return [];

    const body = (await res.json()) as {
      data?: Array<{
        id: string;
        name?: string;
        title?: string;
        category?: string;
        allocated_amount?: number;
        allocatedAmount?: number;
        spent_amount?: number;
        spentAmount?: number;
        budget_id?: string;
        budgetId?: string;
      }>;
    };

    return (body.data ?? []).map((line) => ({
      id: line.id,
      label: line.name ?? line.title ?? line.id,
      category: line.category,
      allocated: Number(line.allocated_amount ?? line.allocatedAmount ?? 0),
      spent: Number(line.spent_amount ?? line.spentAmount ?? 0),
      budgetId: line.budget_id ?? line.budgetId,
    }));
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      // Budget module optional in local dev
    }
    return [];
  }
}

/** Post usage to School Budget when an expense is linked to a budget line. */
export async function recordBudgetLineUsage(input: {
  budgetLineId: string;
  amount: number;
  description: string;
  referenceId: string;
  accessToken?: string;
}): Promise<boolean> {
  const base = env.BUDGET_API_URL.replace(/\/$/, '');
  try {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
    if (input.accessToken) headers.Authorization = `Bearer ${input.accessToken}`;

    const res = await fetch(`${base}/budget-line-usage`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        budget_line_id: input.budgetLineId,
        amount: input.amount,
        description: input.description,
        reference_type: 'action_plan_expense',
        reference_id: input.referenceId,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
