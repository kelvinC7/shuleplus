import fs from "node:fs";
import path from "node:path";

const DATA_DIR = path.resolve(process.cwd(), "data");
const POLICY_PATH = path.join(DATA_DIR, "platform-policy.json");
const FEES_PATH = path.join(DATA_DIR, "request-fees.json");

export type ProfitPolicy = { profitPercent: number };
type FeeRecord = { profitPercent: number; income: number; amount: number };

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJson<T>(file: string, fallback: T): T {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function writeJson(file: string, value: unknown) {
  ensureDir();
  fs.writeFileSync(file, JSON.stringify(value, null, 2), "utf8");
}

export function getProfitPolicy(): ProfitPolicy {
  const stored = readJson<ProfitPolicy>(POLICY_PATH, { profitPercent: 0.2 });
  const n = Number(stored.profitPercent);
  return { profitPercent: Number.isFinite(n) ? n : 0.2 };
}

export function setProfitPolicy(profitPercent: number): ProfitPolicy {
  const n = Number(profitPercent);
  if (!Number.isFinite(n) || n < 0 || n > 100) {
    throw new Error("Profit percent must be between 0 and 100");
  }
  const policy = { profitPercent: n };
  writeJson(POLICY_PATH, policy);
  return policy;
}

export function calcPlatformIncome(amount: number, percent = getProfitPolicy().profitPercent) {
  return Math.round((Number(amount) || 0) * (percent / 100));
}

export function recordRequestFee(requestId: string, amount: number) {
  const policy = getProfitPolicy();
  const income = calcPlatformIncome(amount, policy.profitPercent);
  const all = readJson<Record<string, FeeRecord>>(FEES_PATH, {});
  all[requestId] = { profitPercent: policy.profitPercent, income, amount };
  writeJson(FEES_PATH, all);
  return all[requestId];
}

export function getRequestFee(requestId: string, amount?: number): FeeRecord {
  const all = readJson<Record<string, FeeRecord>>(FEES_PATH, {});
  if (all[requestId]) return all[requestId];
  const policy = getProfitPolicy();
  const base = Number(amount) || 0;
  return { profitPercent: policy.profitPercent, income: calcPlatformIncome(base, policy.profitPercent), amount: base };
}
