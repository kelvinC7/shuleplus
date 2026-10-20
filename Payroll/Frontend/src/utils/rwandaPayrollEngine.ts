export const DEFAULT_STATUTORY = {
  rssbEmployee: 6,
  rssbEmployer: 6,
  occupationalHazard: 2,
  maternityEmployee: 0.3,
  maternityEmployer: 0.3,
  ramaEmployee: 7.5,
  ramaEmployer: 7.5,
  cbhi: 0.5,
};

export const DEFAULT_PAYE_BRACKETS = [
  { upTo: 60000, rate: 0 },
  { upTo: 100000, rate: 0.1 },
  { upTo: 200000, rate: 0.2 },
  { upTo: null as number | null, rate: 0.3 },
];

export const DEFAULT_ALLOWANCE_RULES = {
  enabled: true,
  totalPercentOfGross: 30,
  columnPercentEach: 10,
};

export interface PayeBracket {
  upTo: number | null;
  rate: number;
}

export type RegisterAllowanceKey = 'others' | 'housing' | 'transport';

export interface PayrollLineItem {
  name: string;
  amount: number;
  amountType?: string;
  channel?: string;
  registerKey?: RegisterAllowanceKey;
  category?: string;
}

export const DEFAULT_REGISTER_ALLOWANCE_ROWS: PayrollLineItem[] = [
  { name: 'Others', category: 'Register', registerKey: 'others', amountType: 'percent_gross', amount: 10, channel: 'tax' },
  { name: 'Housing (H/A)', category: 'Register', registerKey: 'housing', amountType: 'percent_gross', amount: 10, channel: 'tax' },
  { name: 'Transport (T/A)', category: 'Register', registerKey: 'transport', amountType: 'percent_gross', amount: 10, channel: 'tax' },
];

export interface PayrollCalcInput {
  basicSalary: number;
  transport?: number;
  housing?: number;
  others?: number;
  meal?: number;
  extraAllowances?: PayrollLineItem[];
  templateAllowances?: PayrollLineItem[];
  templateDeductions?: PayrollLineItem[];
  employeeDeductions?: PayrollLineItem[];
  statutory?: Partial<typeof DEFAULT_STATUTORY>;
  payeRates?: PayeBracket[];
  autoAllowances?: boolean;
  allowanceRules?: typeof DEFAULT_ALLOWANCE_RULES;
}

export interface PayrollCalcResult {
  basicSalary: number;
  others: number;
  housing: number;
  transport: number;
  meal: number;
  base: number;
  gross: number;
  paye: number;
  rssbEmployee: number;
  rssbEmployer: number;
  ramaEmployee: number;
  ramaEmployer: number;
  cbhi: number;
  maternityEmployee: number;
  maternityEmployer: number;
  occupationalHazardEmployer: number;
  incomeSalary: number;
  templateDeductionTotal: number;
  employeeDeductionTotal: number;
  netSalary: number;
  bankNetAdjust: number;
  finalPayable: number;
  employerCost: number;
}

export function calcProgressivePAYE(gross: number, brackets = DEFAULT_PAYE_BRACKETS): number {
  let remaining = gross;
  let prev = 0;
  let paye = 0;
  for (const band of brackets) {
    const ceiling = band.upTo ?? Infinity;
    const slice = Math.min(Math.max(remaining, 0), ceiling - prev);
    if (slice <= 0) break;
    paye += slice * band.rate;
    remaining -= slice;
    prev = ceiling;
    if (band.upTo == null) break;
  }
  return Math.round(paye);
}

export function calcSchoolAllowancesFromBasic(
  basic: number,
  rules: typeof DEFAULT_ALLOWANCE_RULES = DEFAULT_ALLOWANCE_RULES
) {
  if (!rules.enabled) {
    return { gross: basic, others: 0, housing: 0, transport: 0, totalAllowances: 0 };
  }
  const gross = basic / (1 - rules.totalPercentOfGross / 100);
  const each = (gross * rules.columnPercentEach) / 100;
  return {
    gross: Math.round(gross),
    others: Math.round(each),
    housing: Math.round(each),
    transport: Math.round(each),
    totalAllowances: Math.round(each * 3),
  };
}

export function splitGrossSchoolRegister(gross: number) {
  return {
    basic: Math.round(gross * 0.7),
    others: Math.round(gross * 0.1),
    housing: Math.round(gross * 0.1),
    transport: Math.round(gross * 0.1),
  };
}

export function resolveLineItemAmount(
  item: { amount: number; amountType?: string },
  basic: number,
  gross: number
): number {
  const type = String(item.amountType ?? 'fixed').toLowerCase().replace(/\s+/g, '_');
  if (type === 'percent_basic' || type === 'percentage_basic' || type === 'percent_of_basic') {
    return Math.round((basic * item.amount) / 100);
  }
  if (type === 'percent_gross' || type === 'percentage_gross' || type === 'percent_of_gross') {
    return Math.round((gross * item.amount) / 100);
  }
  return Math.round(item.amount);
}

export function resolveLineItems(
  items: PayrollLineItem[] | undefined,
  basic: number,
  gross: number
): PayrollLineItem[] {
  return (items ?? []).map((item) => ({
    ...item,
    amount: resolveLineItemAmount(item, basic, gross),
  }));
}

export function inferRegisterKey(name: string, explicit?: string): RegisterAllowanceKey | null {
  if (explicit === 'others' || explicit === 'housing' || explicit === 'transport') return explicit;
  const n = name.trim().toLowerCase();
  if (n === 'others' || n.includes('other')) return 'others';
  if (n.includes('housing') || n.includes('h/a')) return 'housing';
  if (n.includes('transport') || n.includes('t/a')) return 'transport';
  return null;
}

export function splitTemplateAllowances(items: PayrollLineItem[] | undefined) {
  const registerRows: PayrollLineItem[] = [];
  const supplementalRows: PayrollLineItem[] = [];
  for (const item of items ?? []) {
    const key = inferRegisterKey(item.name, item.registerKey);
    if (key) registerRows.push({ ...item, registerKey: key });
    else supplementalRows.push(item);
  }
  return { registerRows, supplementalRows };
}

export function normalizeTemplateAllowances(rows: PayrollLineItem[] | null | undefined): PayrollLineItem[] {
  const existing = [...(rows ?? [])];

  for (const def of DEFAULT_REGISTER_ALLOWANCE_ROWS) {
    const idx = existing.findIndex((r) => inferRegisterKey(r.name, r.registerKey) === def.registerKey);
    if (idx < 0) {
      existing.unshift({ ...def });
      continue;
    }

    const row = existing[idx];
    const amountType = String(row.amountType ?? 'fixed').toLowerCase();
    const isFixed = amountType === 'fixed';
    const isPercentGross = amountType.includes('gross');
    const isZero = Number(row.amount) === 0;
    const isStaleRegisterDefault =
      isZero && def.amountType === 'percent_gross' && def.amount > 0 && (isFixed || isPercentGross);

    if (isStaleRegisterDefault) {
      existing[idx] = {
        ...def,
        ...row,
        name: row.name?.trim() ? row.name : def.name,
        amount: def.amount,
        amountType: def.amountType,
        registerKey: def.registerKey,
        channel: row.channel ?? def.channel,
      };
    }
  }

  return existing.map((r) => ({
    ...r,
    registerKey: inferRegisterKey(r.name, r.registerKey) ?? r.registerKey,
  }));
}

function pickRegisterAmount(resolved: PayrollLineItem[], key: RegisterAllowanceKey): number {
  const row = resolved.find((r) => inferRegisterKey(r.name, r.registerKey) === key);
  return row ? row.amount : 0;
}

export function resolveGrossWithAllowanceFormulas(
  basic: number,
  meal: number,
  extraAllowances: PayrollLineItem[] | undefined,
  registerRows: PayrollLineItem[],
  supplementalRows: PayrollLineItem[]
) {
  const extrasFixed = (extraAllowances ?? []).reduce((s, a) => s + a.amount, 0);
  let gross = basic + meal + extrasFixed;
  let others = 0;
  let housing = 0;
  let transport = 0;

  for (let i = 0; i < 25; i++) {
    const resolvedRegister = resolveLineItems(registerRows, basic, gross);
    others = pickRegisterAmount(resolvedRegister, 'others');
    housing = pickRegisterAmount(resolvedRegister, 'housing');
    transport = pickRegisterAmount(resolvedRegister, 'transport');

    const resolvedSupplemental = resolveLineItems(supplementalRows, basic, gross);
    const supplementalSum = resolvedSupplemental.reduce((s, a) => s + a.amount, 0);
    const newGross = basic + others + housing + transport + meal + extrasFixed + supplementalSum;

    if (Math.abs(newGross - gross) <= 1) {
      return {
        gross: Math.round(newGross),
        others,
        housing,
        transport,
        resolvedRegister,
        resolvedSupplemental,
      };
    }
    gross = newGross;
  }

  const resolvedRegister = resolveLineItems(registerRows, basic, gross);
  const resolvedSupplemental = resolveLineItems(supplementalRows, basic, gross);
  return {
    gross: Math.round(gross),
    others: pickRegisterAmount(resolvedRegister, 'others'),
    housing: pickRegisterAmount(resolvedRegister, 'housing'),
    transport: pickRegisterAmount(resolvedRegister, 'transport'),
    resolvedRegister,
    resolvedSupplemental,
  };
}

export function mergeRegisterAllowanceAmounts(
  basic: number,
  stored: { others?: number; housing?: number; transport?: number },
  rules: typeof DEFAULT_ALLOWANCE_RULES = DEFAULT_ALLOWANCE_RULES,
  registerTemplateRows?: PayrollLineItem[]
) {
  const hasManual = Boolean(stored.others || stored.housing || stored.transport);
  if (hasManual) {
    return {
      others: stored.others ?? 0,
      housing: stored.housing ?? 0,
      transport: stored.transport ?? 0,
      source: 'manual' as const,
    };
  }
  if (registerTemplateRows?.length) {
    const resolved = resolveGrossWithAllowanceFormulas(basic, 0, [], registerTemplateRows, []);
    return {
      others: resolved.others,
      housing: resolved.housing,
      transport: resolved.transport,
      source: 'template' as const,
    };
  }
  if (rules.enabled) {
    const auto = calcSchoolAllowancesFromBasic(basic, rules);
    return {
      others: auto.others,
      housing: auto.housing,
      transport: auto.transport,
      source: 'auto' as const,
    };
  }
  return { others: 0, housing: 0, transport: 0, source: 'manual' as const };
}

function sumByChannel(items: { amount: number; channel?: string }[], channel: 'tax' | 'bank') {
  return items
    .filter((i) => {
      const ch = (i.channel ?? 'tax').toLowerCase();
      if (channel === 'tax') return ch === 'tax' || ch === 'both';
      return ch === 'bank' || ch === 'both';
    })
    .reduce((s, i) => s + i.amount, 0);
}

export function calcRwandaPayroll(input: PayrollCalcInput): PayrollCalcResult {
  const statutory = { ...DEFAULT_STATUTORY, ...input.statutory };
  const rules = { ...DEFAULT_ALLOWANCE_RULES, ...input.allowanceRules };
  const basic = input.basicSalary || 0;
  let others = input.others ?? 0;
  let housing = input.housing ?? 0;
  let transport = input.transport ?? 0;
  const meal = input.meal ?? 0;
  const { registerRows, supplementalRows } = splitTemplateAllowances(input.templateAllowances);
  const hasManualRegister = Boolean(others || housing || transport);
  let gross = 0;
  let resolvedRegister: PayrollLineItem[] = [];
  let resolvedSupplemental: PayrollLineItem[] = [];

  if (input.autoAllowances && !hasManualRegister && registerRows.length) {
    const resolved = resolveGrossWithAllowanceFormulas(
      basic,
      meal,
      input.extraAllowances,
      registerRows,
      supplementalRows
    );
    others = resolved.others;
    housing = resolved.housing;
    transport = resolved.transport;
    gross = resolved.gross;
    resolvedRegister = resolved.resolvedRegister;
    resolvedSupplemental = resolved.resolvedSupplemental;
  } else if (input.autoAllowances && !hasManualRegister) {
    const merged = mergeRegisterAllowanceAmounts(basic, { others, housing, transport }, rules);
    others = merged.others;
    housing = merged.housing;
    transport = merged.transport;
    const profileExtra = (input.extraAllowances ?? []).reduce((s, a) => s + a.amount, 0);
    gross = basic + others + housing + transport + meal + profileExtra;
    resolvedSupplemental = resolveLineItems(supplementalRows, basic, gross);
    gross += resolvedSupplemental.reduce((s, a) => s + a.amount, 0);
    gross = Math.round(gross);
  } else {
    const profileExtra = (input.extraAllowances ?? []).reduce((s, a) => s + a.amount, 0);
    gross = basic + others + housing + transport + meal + profileExtra;
    if (!hasManualRegister) {
      resolvedRegister = resolveLineItems(registerRows, basic, gross);
      gross += resolvedRegister.reduce((s, a) => s + a.amount, 0);
    }
    resolvedSupplemental = resolveLineItems(supplementalRows, basic, gross);
    gross += resolvedSupplemental.reduce((s, a) => s + a.amount, 0);
    gross = Math.round(gross);
  }

  const resolvedTemplateAllowances = [...resolvedRegister, ...resolvedSupplemental];

  const base = Math.max(0, gross - transport);

  const paye = calcProgressivePAYE(gross, input.payeRates ?? DEFAULT_PAYE_BRACKETS);
  const rssbEmployee = Math.round((gross * statutory.rssbEmployee) / 100);
  const rssbEmployer = Math.round((gross * statutory.rssbEmployer) / 100);
  const ramaEmployee = Math.round((basic * statutory.ramaEmployee) / 100);
  const ramaEmployer = Math.round((basic * statutory.ramaEmployer) / 100);
  const maternityEmployee = Math.round((base * statutory.maternityEmployee) / 100);
  const maternityEmployer = Math.round((base * statutory.maternityEmployer) / 100);
  const occupationalHazardEmployer = Math.round((base * statutory.occupationalHazard) / 100);

  const resolvedTemplateDeductions = resolveLineItems(input.templateDeductions, basic, gross);
  const resolvedEmployeeDeductions = resolveLineItems(input.employeeDeductions, basic, gross);

  const templateDeductionTotal = sumByChannel(resolvedTemplateDeductions, 'tax');
  const employeeDeductionTotal = sumByChannel(resolvedEmployeeDeductions, 'tax');
  const bankNetAdjust =
    sumByChannel(resolvedTemplateDeductions, 'bank') +
    sumByChannel(resolvedEmployeeDeductions, 'bank') +
    sumByChannel(input.extraAllowances ?? [], 'bank') +
    sumByChannel(resolvedTemplateAllowances, 'bank');

  const incomeSalary =
    gross -
    paye -
    rssbEmployee -
    maternityEmployee -
    ramaEmployee -
    templateDeductionTotal -
    employeeDeductionTotal;

  const cbhi = Math.round(Math.max(0, incomeSalary) * (statutory.cbhi / 100));
  const netSalary = incomeSalary - cbhi;
  const finalPayable = netSalary - bankNetAdjust;
  const employerCost = gross + rssbEmployer + ramaEmployer + maternityEmployer + occupationalHazardEmployer;

  return {
    basicSalary: basic,
    others,
    housing,
    transport,
    meal,
    base,
    gross,
    paye,
    rssbEmployee,
    rssbEmployer,
    ramaEmployee,
    ramaEmployer,
    cbhi,
    maternityEmployee,
    maternityEmployer,
    occupationalHazardEmployer,
    incomeSalary: Math.round(incomeSalary),
    templateDeductionTotal,
    employeeDeductionTotal,
    netSalary: Math.round(netSalary),
    bankNetAdjust: Math.round(bankNetAdjust),
    finalPayable: Math.round(finalPayable),
    employerCost: Math.round(employerCost),
  };
}

export function solveNetToGrossPackage(
  desiredNet: number,
  extraInput: Omit<PayrollCalcInput, 'basicSalary' | 'others' | 'housing' | 'transport' | 'meal' | 'autoAllowances'> = {}
) {
  const target = Math.round(desiredNet);
  if (target <= 0) {
    const split = splitGrossSchoolRegister(0);
    const calc = calcRwandaPayroll({
      statutory: extraInput.statutory,
      payeRates: extraInput.payeRates,
      employeeDeductions: extraInput.employeeDeductions,
      basicSalary: 0,
      others: 0,
      housing: 0,
      transport: 0,
      meal: 0,
      extraAllowances: [],
      templateAllowances: [],
      templateDeductions: [],
      autoAllowances: false,
    });
    return { gross: 0, ...split, calc, verified: true, desiredNet: target };
  }

  // Net-to-gross: 70/10/10/10 split only — no template allowances or template deductions
  const baseInput = {
    statutory: extraInput.statutory,
    payeRates: extraInput.payeRates,
    employeeDeductions: extraInput.employeeDeductions,
    meal: 0,
    extraAllowances: [] as PayrollLineItem[],
    templateAllowances: [] as PayrollLineItem[],
    templateDeductions: [] as PayrollLineItem[],
    autoAllowances: false as const,
  };

  const netAtGross = (gross: number) => {
    const split = splitGrossSchoolRegister(gross);
    return calcRwandaPayroll({
      ...baseInput,
      basicSalary: split.basic,
      others: split.others,
      housing: split.housing,
      transport: split.transport,
    }).netSalary;
  };

  let lo = target;
  let hi = Math.max(Math.ceil(target * 1.5), 500_000);
  while (netAtGross(hi) < target && hi < 50_000_000) hi = Math.ceil(hi * 1.5);

  for (let i = 0; i < 64 && lo < hi; i++) {
    const mid = Math.floor((lo + hi) / 2);
    if (netAtGross(mid) < target) lo = mid + 1;
    else hi = mid;
  }

  let bestGross = lo;
  for (const candidate of [lo - 2, lo - 1, lo, lo + 1, lo + 2]) {
    if (candidate < 0) continue;
    if (netAtGross(candidate) === target) {
      bestGross = candidate;
      break;
    }
    if (Math.abs(netAtGross(candidate) - target) < Math.abs(netAtGross(bestGross) - target)) {
      bestGross = candidate;
    }
  }

  for (let g = Math.max(0, bestGross - 200); g <= bestGross + 200; g++) {
    if (netAtGross(g) === target) {
      bestGross = g;
      break;
    }
  }

  const split = splitGrossSchoolRegister(bestGross);
  const calc = calcRwandaPayroll({
    ...baseInput,
    basicSalary: split.basic,
    others: split.others,
    housing: split.housing,
    transport: split.transport,
  });

  return {
    gross: bestGross,
    ...split,
    calc,
    verified: Math.abs(calc.netSalary - target) <= 1,
    desiredNet: target,
  };
}

export function calcNetToGrossFromDesiredNet(
  desiredNet: number,
  extraInput: Pick<PayrollCalcInput, 'employeeDeductions' | 'statutory' | 'payeRates'> = {}
): number {
  return solveNetToGrossPackage(desiredNet, extraInput).basic;
}
