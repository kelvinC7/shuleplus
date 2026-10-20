import fs from "node:fs";
import path from "node:path";
import { v4 as uuid } from "uuid";
import { env } from "../config/env";
import { TICHA_DEAL_CATALOG } from "../data/ticha-catalog";

export type PlatformDeal = {
  id: string;
  name: string;
  shortDescription: string;
  description: string;
  imageUrl: string | null;
  price_rwf: number;
  createdAt: string;
  updatedAt?: string;
};

const DATA_DIR = path.resolve(process.cwd(), "data");
const DEALS_PATH = path.join(DATA_DIR, "deals.json");
const IMAGE_DIR = path.resolve(process.cwd(), env.UPLOAD_DIR, "deals");

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function seed(): PlatformDeal[] {
  return TICHA_DEAL_CATALOG.map((d) => ({
    id: d.id,
    name: d.name,
    shortDescription: d.description,
    description: d.description,
    imageUrl: null,
    price_rwf: d.price_rwf,
    createdAt: new Date().toISOString(),
  }));
}

function loadDeals(): PlatformDeal[] {
  ensureDir(DATA_DIR);
  if (!fs.existsSync(DEALS_PATH)) {
    const rows = seed();
    fs.writeFileSync(DEALS_PATH, JSON.stringify(rows, null, 2), "utf8");
    return rows;
  }
  try {
    const rows = JSON.parse(fs.readFileSync(DEALS_PATH, "utf8")) as PlatformDeal[];
    return Array.isArray(rows) ? rows : seed();
  } catch {
    return seed();
  }
}

function saveDeals(rows: PlatformDeal[]) {
  ensureDir(DATA_DIR);
  fs.writeFileSync(DEALS_PATH, JSON.stringify(rows, null, 2), "utf8");
}

export function listDeals() {
  return loadDeals();
}

export function getDeal(id: string) {
  return loadDeals().find((d) => d.id === id) ?? null;
}

function removeDealImages(dealId: string) {
  if (!fs.existsSync(IMAGE_DIR)) return;
  for (const file of fs.readdirSync(IMAGE_DIR)) {
    if (file.startsWith(`${dealId}.`)) {
      fs.unlinkSync(path.join(IMAGE_DIR, file));
    }
  }
}

export function saveDealImage(dealId: string, dataUrl: string) {
  const match = /^data:(image\/[\w+.-]+);base64,(.+)$/.exec(dataUrl);
  if (!match) throw new Error("Invalid image data");
  const mime = match[1];
  const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";
  const raw = Buffer.from(match[2], "base64");
  if (raw.length > 6 * 1024 * 1024) throw new Error("Image must be 6 MB or smaller");
  ensureDir(IMAGE_DIR);
  removeDealImages(dealId);
  const filename = `${dealId}.${ext}`;
  fs.writeFileSync(path.join(IMAGE_DIR, filename), raw);
  return `/uploads/deals/${filename}`;
}

export function createDeal(input: {
  name: string;
  shortDescription?: string;
  description?: string;
  price_rwf?: number;
  imageDataUrl?: string | null;
}) {
  const name = String(input.name || "").trim();
  if (!name) throw new Error("Deal name is required");
  const id = `deal-${uuid().slice(0, 8)}`;
  const imageUrl = input.imageDataUrl ? saveDealImage(id, input.imageDataUrl) : null;
  const row: PlatformDeal = {
    id,
    name,
    shortDescription: String(input.shortDescription || "").trim(),
    description: String(input.description || input.shortDescription || "").trim(),
    imageUrl,
    price_rwf: Math.max(0, Math.round(Number(input.price_rwf) || 0)),
    createdAt: new Date().toISOString(),
  };
  const rows = loadDeals();
  rows.unshift(row);
  saveDeals(rows);
  return row;
}

export function updateDeal(
  id: string,
  input: {
    name?: string;
    shortDescription?: string;
    description?: string;
    price_rwf?: number;
    imageDataUrl?: string | null;
  }
) {
  const rows = loadDeals();
  const idx = rows.findIndex((d) => d.id === id);
  if (idx < 0) return null;
  const current = rows[idx];
  const imageUrl = input.imageDataUrl ? saveDealImage(id, input.imageDataUrl) : current.imageUrl;
  rows[idx] = {
    ...current,
    name: input.name != null ? String(input.name).trim() || current.name : current.name,
    shortDescription:
      input.shortDescription != null ? String(input.shortDescription).trim() : current.shortDescription,
    description: input.description != null ? String(input.description).trim() : current.description,
    price_rwf:
      input.price_rwf != null ? Math.max(0, Math.round(Number(input.price_rwf) || 0)) : current.price_rwf,
    imageUrl,
    updatedAt: new Date().toISOString(),
  };
  saveDeals(rows);
  return rows[idx];
}

export function deleteDeal(id: string) {
  const rows = loadDeals();
  const next = rows.filter((d) => d.id !== id);
  if (next.length === rows.length) return false;
  removeDealImages(id);
  saveDeals(next);
  return true;
}

export function toPublicDeal(d: PlatformDeal) {
  return {
    id: d.id,
    name: d.name,
    title: d.name,
    shortDescription: d.shortDescription,
    description: d.description,
    imageUrl: d.imageUrl,
    image_url: d.imageUrl,
    price_rwf: d.price_rwf,
    category: "deals",
  };
}
