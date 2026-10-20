import { Router } from "express";
import {
  authenticate,
  requireModuleLicense,
  requireServiceAuth,
  type AuthenticatedRequest,
} from "../middleware/auth.middleware";
import { requireTenant } from "../middleware/tenant.middleware";
import { AppError } from "../middleware/error.middleware";
import { createTenant } from "../services/tenant.service";
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from "../services/category.service";
import {
  closeFinancialYear,
  createFinancialYear,
  deleteFinancialYear,
  getActiveFinancialYear,
  getCategoryOpening,
  getOpeningPreview,
  listFinancialYears,
  reopenFinancialYear,
  updateFinancialYear,
} from "../services/year.service";
import {
  bulkDeleteAssets,
  deleteAllRegisterAssets,
  getRegisterMeta,
  getRegisterStats,
  importRegisterRows,
  listRegister,
  previewImportRegisterRows,
  purgeImportTemplateSampleAssets,
  recalcAll,
  recalcRegisterChainInCategory,
  registerAssetWithLedger,
  resolveCategoryOpeningContext,
  scanLookup,
  softDeleteAsset,
  updateRegisterAsset,
  checkRegisterIdentifiers,
  getRegisterAsset,
  recalcCategoryRegisterFromYear,
} from "../services/register.service";
import {
  canCreateAssetAdjustments,
  createAssetAdjustment,
  getAssetFinancialDetails,
  listAssetAdjustments,
} from "../services/adjustment.service";
import { getAnalytics, getDashboard } from "../services/dashboard.service";
import { getReport, listReportTypes } from "../services/reports.service";
import {
  approveReplacement,
  createAssignment,
  createMaintenance,
  createReplacement,
  createTransfer,
  deleteAssignment,
  deleteMaintenance,
  deleteReplacement,
  deleteTransfer,
  extendMaintenance,
  listAssignments,
  listMaintenance,
  listReplacements,
  listTransfers,
  rejectReplacement,
  returnAssignment,
  updateAssignment,
  updateMaintenance,
  updateReplacement,
  updateTransfer,
} from "../services/operations.service";
const router = Router();

function orgId(req: AuthenticatedRequest) {
  const id = req.organizationRef ?? req.user?.organizationId;
  if (!id) throw new AppError(401, "Missing organization context");
  return id;
}

function paramId(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

function ok(data: unknown, message?: string) {
  return { success: true, data, ...(message ? { message } : {}) };
}

router.get("/health", (_req, res) => {
  res.json({ ok: true, service: "assets-portal" });
});

router.post("/tenant/create", requireServiceAuth, async (req, res, next) => {
  try {
    const body = req.body as {
      organizationId?: string;
      organizationName?: string;
      organizationCode?: string;
    };
    if (!body.organizationId || !body.organizationName) {
      throw new AppError(400, "organizationId and organizationName are required");
    }
    const tenant = await createTenant({
      organizationId: body.organizationId,
      organizationName: body.organizationName,
      organizationCode: body.organizationCode,
    });
    return res.status(201).json(ok(tenant));
  } catch (e) {
    return next(e);
  }
});

/** Public QR scan */
router.get("/public/assets/scan", async (req, res, next) => {
  try {
    const code = typeof req.query.code === "string" ? req.query.code : undefined;
    const id = typeof req.query.id === "string" ? req.query.id : undefined;
    if (!code && !id) throw new AppError(400, "code or id is required");
    const asset = await scanLookup(null, code, id);
    return res.json(ok(asset));
  } catch (e) {
    return next(e);
  }
});

/** Authed but tenant may not exist yet */
router.post("/tenant/ensure", authenticate, requireModuleLicense, async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = req.user!;
    const tenant = await createTenant({
      organizationId: user.organizationId,
      organizationName: String(req.body?.organizationName ?? "Organization"),
      organizationCode: req.body?.organizationCode,
    });
    return res.json(ok(tenant));
  } catch (e) {
    return next(e);
  }
});

const protectedRouter = Router();
protectedRouter.use(authenticate, requireModuleLicense, requireTenant);

protectedRouter.get("/meta", async (req: AuthenticatedRequest, res, next) => {
  try {
    const organizationId = orgId(req);
    const [categories, years, active] = await Promise.all([
      listCategories(organizationId),
      listFinancialYears(organizationId),
      getActiveFinancialYear(organizationId),
    ]);
    return res.json(ok({ categories, years, activeYear: active?.year ?? null }));
  } catch (e) {
    return next(e);
  }
});

protectedRouter.get("/dashboard", async (req: AuthenticatedRequest, res, next) => {
  try {
    const rawYear = req.query.register_year ?? req.query.year;
    const parsedYear = rawYear !== undefined && rawYear !== "" ? Number(rawYear) : undefined;
    const registerYear =
      parsedYear !== undefined && Number.isFinite(parsedYear) ? parsedYear : undefined;
    const category =
      typeof req.query.category === "string" && req.query.category !== "all"
        ? req.query.category
        : undefined;
    const location =
      typeof req.query.location === "string" && req.query.location !== "all"
        ? req.query.location
        : undefined;
    return res.json(
      ok(await getDashboard(orgId(req), { registerYear, category, location }))
    );
  } catch (e) {
    return next(e);
  }
});

protectedRouter.get("/analytics", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await getAnalytics(orgId(req))));
  } catch (e) {
    return next(e);
  }
});

// Categories
protectedRouter.get("/categories", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await listCategories(orgId(req))));
  } catch (e) {
    return next(e);
  }
});

protectedRouter.post("/categories", async (req: AuthenticatedRequest, res, next) => {
  try {
    const body = req.body as {
      name?: string;
      icon?: string;
      description?: string;
      depreciation_rate?: number;
      depreciationRate?: number;
    };
    const created = await createCategory(orgId(req), {
      name: String(body.name ?? ""),
      icon: body.icon,
      description: body.description,
      depreciationRate: Number(body.depreciation_rate ?? body.depreciationRate ?? 0),
    });
    return res.status(201).json(ok(created));
  } catch (e) {
    return next(e);
  }
});

protectedRouter.patch("/categories/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    const body = req.body as Record<string, unknown>;
    const updated = await updateCategory(orgId(req), paramId(req.params.id), {
      name: body.name as string | undefined,
      icon: body.icon as string | undefined,
      description: body.description as string | undefined,
      depreciationRate: (body.depreciation_rate ?? body.depreciationRate) as number | undefined,
    });
    return res.json(ok(updated));
  } catch (e) {
    return next(e);
  }
});

protectedRouter.delete("/categories/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await deleteCategory(orgId(req), paramId(req.params.id))));
  } catch (e) {
    return next(e);
  }
});

// Financial years
protectedRouter.get("/financial-years", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await listFinancialYears(orgId(req))));
  } catch (e) {
    return next(e);
  }
});

protectedRouter.get("/financial-years/active", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await getActiveFinancialYear(orgId(req))));
  } catch (e) {
    return next(e);
  }
});

protectedRouter.get("/financial-years/opening-preview", async (req: AuthenticatedRequest, res, next) => {
  try {
    const year = Number(req.query.year);
    if (!year) throw new AppError(400, "year is required");
    return res.json(ok(await getOpeningPreview(orgId(req), year)));
  } catch (e) {
    return next(e);
  }
});

protectedRouter.get("/financial-years/category-opening", async (req: AuthenticatedRequest, res, next) => {
  try {
    const year = Number(req.query.year);
    const category = String(req.query.category ?? "");
    if (!year || !category) throw new AppError(400, "year and category are required");
    return res.json(ok(await getCategoryOpening(orgId(req), year, category)));
  } catch (e) {
    return next(e);
  }
});

protectedRouter.post("/financial-years", async (req: AuthenticatedRequest, res, next) => {
  try {
    const body = req.body as {
      year: number;
      start_date?: string;
      startDate?: string;
      end_date?: string;
      endDate?: string;
      description?: string;
      dep_method?: string;
      auto_carry_forward?: boolean;
      lock_previous_year?: boolean;
      status?: "Draft" | "Active" | "Closed";
      category_balances?: Array<{
        category: string;
        opening_balance: number;
        accumulated_depreciation?: number;
        depreciation_rate: number;
      }>;
      categoryBalances?: Array<{
        category: string;
        openingBalance: number;
        accumulatedDepreciation?: number;
        depreciationRate: number;
      }>;
    };

    const balances =
      body.categoryBalances ??
      (body.category_balances ?? []).map((b) => ({
        category: b.category,
        openingBalance: b.opening_balance,
        accumulatedDepreciation: b.accumulated_depreciation,
        depreciationRate: b.depreciation_rate,
      }));

    const created = await createFinancialYear(orgId(req), {
      year: body.year,
      startDate: body.start_date ?? body.startDate ?? `${body.year}-01-01`,
      endDate: body.end_date ?? body.endDate ?? `${body.year}-12-31`,
      description: body.description,
      depMethod: body.dep_method,
      autoCarryForward: body.auto_carry_forward,
      lockPreviousYear: body.lock_previous_year,
      status: body.status,
      categoryBalances: balances,
    });
    return res.status(201).json(ok(created));
  } catch (e) {
    return next(e);
  }
});

protectedRouter.patch("/financial-years/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await updateFinancialYear(orgId(req), paramId(req.params.id), req.body)));
  } catch (e) {
    return next(e);
  }
});

protectedRouter.patch("/financial-years/:id/close", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await closeFinancialYear(orgId(req), paramId(req.params.id))));
  } catch (e) {
    return next(e);
  }
});

protectedRouter.patch("/financial-years/:id/reopen", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await reopenFinancialYear(orgId(req), paramId(req.params.id))));
  } catch (e) {
    return next(e);
  }
});

protectedRouter.delete("/financial-years/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await deleteFinancialYear(orgId(req), paramId(req.params.id))));
  } catch (e) {
    return next(e);
  }
});

// Register (test API — source of truth)
protectedRouter.get("/register/stats", async (req: AuthenticatedRequest, res, next) => {
  try {
    const year = req.query.register_year ? Number(req.query.register_year) : undefined;
    return res.json(ok(await getRegisterStats(orgId(req), year)));
  } catch (e) {
    return next(e);
  }
});

protectedRouter.get("/register/meta", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await getRegisterMeta(orgId(req))));
  } catch (e) {
    return next(e);
  }
});

protectedRouter.get("/register/opening", async (req: AuthenticatedRequest, res, next) => {
  try {
    const year = Number(req.query.year);
    const category = String(req.query.category ?? "");
    if (!year || !category) throw new AppError(400, "year and category are required");
    const data = await resolveCategoryOpeningContext(orgId(req), {
      year,
      category,
      entryMode: req.query.entry_mode === "legacy" ? "legacy" : "year_setup",
      editAssetId: typeof req.query.edit_asset_id === "string" ? req.query.edit_asset_id : undefined,
    });
    return res.json(ok(data));
  } catch (e) {
    return next(e);
  }
});

protectedRouter.get("/register", async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = await listRegister(orgId(req), {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 30,
      registerYear: req.query.register_year ? Number(req.query.register_year) : undefined,
      category: typeof req.query.category === "string" ? req.query.category : undefined,
      assetHealthStatus:
        typeof req.query.asset_health_status === "string"
          ? req.query.asset_health_status
          : undefined,
      q: typeof req.query.q === "string" ? req.query.q : undefined,
    });
    return res.json({ success: true, ...data });
  } catch (e) {
    return next(e);
  }
});

protectedRouter.post("/register", async (req: AuthenticatedRequest, res, next) => {
  try {
    const body = req.body as Record<string, unknown>;
    const created = await registerAssetWithLedger(orgId(req), {
      assetName: String(body.asset_name ?? body.assetName ?? ""),
      category: String(body.category ?? ""),
      registerYear: Number(body.register_year ?? body.registerYear),
      location: body.location as string | undefined,
      locationLabel: (body.location_label ?? body.locationLabel) as string | undefined,
      purchasePrice: Number(body.purchase_price ?? body.purchasePrice ?? body.unit_price ?? 0),
      buildingStatus: (body.building_status ?? body.buildingStatus) as string | undefined,
      entryMode: body.entry_mode === "legacy" || body.entryMode === "legacy" ? "legacy" : "year_setup",
      firstTime: (body.first_time ?? body.firstTime) as boolean | undefined,
      skuMode: (body.sku_mode ?? body.skuMode) as "auto" | "manual" | undefined,
      sku: body.sku as string | undefined,
      assetCode: (body.asset_code ?? body.assetCode) as string | undefined,
      applyTax:
        body.apply_tax !== undefined || body.applyTax !== undefined
          ? Boolean(body.apply_tax ?? body.applyTax)
          : undefined,
      assetHealthStatus: (body.asset_health_status ?? body.assetHealthStatus) as string | undefined,
      quantity: Number(body.quantity ?? 1),
      serialNumber: (body.serial_number ?? body.serialNumber) as string | undefined,
      labelTag: (body.label_tag ?? body.labelTag) as string | undefined,
      purchaseDate: (body.purchase_date ?? body.purchaseDate) as string | undefined,
      supplier: body.supplier as string | undefined,
      conditionCode: (body.condition_code ?? body.conditionCode ?? body.condition) as string | undefined,
      receiptRefs: (body.receipt_refs ?? body.receiptRefs ?? body.sd_number) as string | undefined,
      saleBalance: Number(body.sale_balance ?? body.saleBalance ?? 0),
      applySaleBalance: Boolean(body.apply_sale_balance ?? body.applySaleBalance),
      landProvince: (body.land_province ?? body.landProvince) as string | undefined,
      landDistrict: (body.land_district ?? body.landDistrict) as string | undefined,
      landSector: (body.land_sector ?? body.landSector) as string | undefined,
      landCellule: (body.land_cellule ?? body.landCellule) as string | undefined,
      landVillage: (body.land_village ?? body.landVillage) as string | undefined,
      landUpi: (body.land_upi ?? body.landUpi) as string | undefined,
    });
    return res.status(201).json(ok(created));
  } catch (e) {
    return next(e);
  }
});

protectedRouter.get("/register/identifiers", async (req: AuthenticatedRequest, res, next) => {
  try {
    const year = Number(req.query.register_year ?? req.query.year);
    if (!year) throw new AppError(400, "register_year is required");
    return res.json(
      ok(
        await checkRegisterIdentifiers(orgId(req), {
          registerYear: year,
          sku: typeof req.query.sku === "string" ? req.query.sku : undefined,
          assetCode: typeof req.query.asset_code === "string" ? req.query.asset_code : undefined,
          excludeId: typeof req.query.exclude_id === "string" ? req.query.exclude_id : undefined,
        })
      )
    );
  } catch (e) {
    return next(e);
  }
});

protectedRouter.get("/register/adjustments/can-create", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok({ allowed: canCreateAssetAdjustments(req.user) }));
  } catch (e) {
    return next(e);
  }
});

protectedRouter.get("/register/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await getRegisterAsset(orgId(req), paramId(req.params.id))));
  } catch (e) {
    return next(e);
  }
});

protectedRouter.get("/register/:id/financials", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await getAssetFinancialDetails(orgId(req), paramId(req.params.id))));
  } catch (e) {
    return next(e);
  }
});

protectedRouter.get("/register/:id/adjustments", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await listAssetAdjustments(orgId(req), paramId(req.params.id))));
  } catch (e) {
    return next(e);
  }
});

protectedRouter.post("/register/:id/adjustments", async (req: AuthenticatedRequest, res, next) => {
  try {
    const body = req.body as Record<string, unknown>;
    const result = await createAssetAdjustment(
      orgId(req),
      paramId(req.params.id),
      {
        adjustmentType: String(body.adjustment_type ?? body.adjustmentType ?? ""),
        amount: Number(body.amount),
        registerYear: body.register_year != null ? Number(body.register_year) : body.registerYear != null ? Number(body.registerYear) : undefined,
        reason: String(body.reason ?? ""),
        note: (body.note as string | undefined) ?? undefined,
        adjustmentDate: (body.adjustment_date ?? body.adjustmentDate) as string | undefined,
      },
      req.user!
    );

    await recalcCategoryRegisterFromYear(
      orgId(req),
      result.categoryName,
      result.registerYear
    );

    return res.status(201).json(
      ok(
        {
          ...result,
          financials: await getAssetFinancialDetails(orgId(req), paramId(req.params.id)),
        },
        "Adjustment recorded"
      )
    );
  } catch (e) {
    return next(e);
  }
});

protectedRouter.patch("/register/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    const body = req.body as Record<string, unknown>;
    const updated = await updateRegisterAsset(orgId(req), paramId(req.params.id), {
      assetName: (body.asset_name ?? body.assetName) as string | undefined,
      location: body.location as string | undefined,
      locationLabel: (body.location_label ?? body.locationLabel) as string | undefined,
      purchasePrice: (body.purchase_price ?? body.purchasePrice) as number | undefined,
      buildingStatus: (body.building_status ?? body.buildingStatus) as string | undefined,
      assetHealthStatus: (body.asset_health_status ?? body.assetHealthStatus) as string | undefined,
      supplier: body.supplier as string | undefined,
      serialNumber: (body.serial_number ?? body.serialNumber) as string | undefined,
      labelTag: (body.label_tag ?? body.labelTag) as string | undefined,
      conditionCode: (body.condition_code ?? body.conditionCode ?? body.condition) as string | undefined,
      receiptRefs: (body.receipt_refs ?? body.receiptRefs) as string | undefined,
      applyTax: (body.apply_tax ?? body.applyTax) as boolean | undefined,
      purchaseDate: (body.purchase_date ?? body.purchaseDate) as string | undefined,
      sku: body.sku as string | undefined,
      saleBalance:
        body.sale_balance !== undefined || body.saleBalance !== undefined
          ? Number(body.sale_balance ?? body.saleBalance)
          : undefined,
      applySaleBalance:
        body.apply_sale_balance !== undefined || body.applySaleBalance !== undefined
          ? Boolean(body.apply_sale_balance ?? body.applySaleBalance)
          : undefined,
      landProvince: (body.land_province ?? body.landProvince) as string | undefined,
      landDistrict: (body.land_district ?? body.landDistrict) as string | undefined,
      landSector: (body.land_sector ?? body.landSector) as string | undefined,
      landCellule: (body.land_cellule ?? body.landCellule) as string | undefined,
      landVillage: (body.land_village ?? body.landVillage) as string | undefined,
      landUpi: (body.land_upi ?? body.landUpi) as string | undefined,
    });
    return res.json(ok(updated));
  } catch (e) {
    return next(e);
  }
});

protectedRouter.delete("/register/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await softDeleteAsset(orgId(req), paramId(req.params.id))));
  } catch (e) {
    return next(e);
  }
});

protectedRouter.post("/register/import/preview", async (req: AuthenticatedRequest, res, next) => {
  try {
    const body = req.body as {
      rows?: Array<Record<string, unknown>>;
      register_year?: number;
      registerYear?: number;
      entry_mode?: string;
      entryMode?: string;
      first_time?: boolean;
      firstTime?: boolean;
    };
    const rows = body.rows ?? [];
    if (!rows.length) throw new AppError(400, "rows are required");
    const registerYear = Number(body.register_year ?? body.registerYear);
    if (!registerYear) throw new AppError(400, "register_year is required");
    const entryMode =
      body.entry_mode === "legacy" || body.entryMode === "legacy" ? "legacy" : "year_setup";
    return res.json(
      ok(
        await previewImportRegisterRows(orgId(req), {
          registerYear,
          entryMode,
          firstTime: body.first_time ?? body.firstTime,
          rows,
        })
      )
    );
  } catch (e) {
    return next(e);
  }
});

protectedRouter.post("/register/import", async (req: AuthenticatedRequest, res, next) => {
  try {
    const body = req.body as Record<string, unknown>;
    const rawRows = (body.rows ?? body.data ?? []) as Array<Record<string, unknown>>;
    const registerYear = Number(body.register_year ?? body.registerYear);
    const entryMode =
      body.entry_mode === "legacy" || body.entryMode === "legacy" ? "legacy" : "year_setup";
    const firstTime = Boolean(body.first_time ?? body.firstTime ?? entryMode !== "legacy");
    const skipDuplicates = body.skip_duplicates ?? body.skipDuplicates;
    const autoGenerateSku = body.auto_generate_sku ?? body.autoGenerateSku;

    // Prefer already-normalized preview rows when status is present
    const isPreviewRows = rawRows.some((r) => typeof r.status === "string");
    let mapped: Array<{
      assetName: string;
      category: string;
      registerYear: number;
      purchasePrice: number;
      location?: string;
      locationLabel?: string;
      buildingStatus?: string;
      assetHealthStatus?: string;
      sku?: string;
      supplier?: string;
    }>;

    if (isPreviewRows) {
      const ready = rawRows.filter((r) => r.status === "ready");
      mapped = ready.map((r) => ({
        assetName: String(r.assetName ?? r.asset_name ?? r.name ?? ""),
        category: String(r.category ?? ""),
        registerYear: Number(r.registerYear ?? r.register_year ?? registerYear),
        purchasePrice: Number(r.purchasePrice ?? r.purchase_price ?? r.purchase_unit_price ?? 0),
        location: (r.location as string) || undefined,
        locationLabel: (r.locationLabel ?? r.location_label ?? r.label) as string | undefined,
        buildingStatus: (r.buildingStatus ?? r.building_status) as string | undefined,
        assetHealthStatus: (r.assetHealthStatus ?? r.asset_health_status) as string | undefined,
        sku: (r.sku as string) || undefined,
        supplier: (r.supplier as string) || undefined,
        depRate: r.depRate != null ? Number(r.depRate) : undefined,
      }));
    } else {
      const preview = await previewImportRegisterRows(orgId(req), {
        registerYear: registerYear || new Date().getFullYear(),
        entryMode,
        firstTime,
        rows: rawRows,
      });
      mapped = preview.rows
        .filter((r) => r.status === "ready")
        .map((r) => ({
          assetName: r.assetName,
          category: r.category,
          registerYear: r.registerYear,
          purchasePrice: r.purchasePrice,
          location: r.location,
          locationLabel: r.locationLabel,
          buildingStatus: r.buildingStatus || undefined,
          sku: r.sku || undefined,
          supplier: r.supplier || undefined,
          depRate: r.depRate != null ? Number(r.depRate) : undefined,
        }));
    }

    if (!mapped.length) throw new AppError(400, "No ready rows to import");

    return res.status(201).json(
      ok(
        await importRegisterRows(orgId(req), mapped, {
          registerYear: registerYear || undefined,
          entryMode,
          firstTime,
          skipDuplicates: skipDuplicates !== false && skipDuplicates !== "false",
          autoGenerateSku: autoGenerateSku !== false && autoGenerateSku !== "false",
        })
      )
    );
  } catch (e) {
    return next(e);
  }
});

protectedRouter.post("/register/purge-template-samples", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await purgeImportTemplateSampleAssets(orgId(req))));
  } catch (e) {
    return next(e);
  }
});

protectedRouter.post("/register/recalc-chain", async (req: AuthenticatedRequest, res, next) => {
  try {
    const body = req.body as {
      register_year?: number;
      registerYear?: number;
      category?: string;
      all_years?: boolean;
    };
    if (body.all_years) {
      return res.json(ok(await recalcAll(orgId(req))));
    }
    const year = Number(body.register_year ?? body.registerYear);
    const category = typeof body.category === "string" ? body.category.trim() : "";
    if (year && category) {
      return res.json(ok(await recalcRegisterChainInCategory(orgId(req), year, category)));
    }
    if (year) {
      return res.json(ok(await recalcAll(orgId(req), year)));
    }
    return res.json(ok(await recalcAll(orgId(req))));
  } catch (e) {
    return next(e);
  }
});

protectedRouter.post("/register/bulk-delete", async (req: AuthenticatedRequest, res, next) => {
  try {
    const ids = (req.body?.ids ?? []) as string[];
    if (!ids.length) throw new AppError(400, "ids required");
    return res.json(ok(await bulkDeleteAssets(orgId(req), ids)));
  } catch (e) {
    return next(e);
  }
});

protectedRouter.post("/register/delete-all", async (req: AuthenticatedRequest, res, next) => {
  try {
    const body = req.body as {
      confirm?: boolean;
      register_year?: number;
      registerYear?: number;
      category?: string;
      asset_health_status?: string;
      q?: string;
    };
    if (!body.confirm) throw new AppError(400, "confirm: true is required");
    return res.json(
      ok(
        await deleteAllRegisterAssets(orgId(req), {
          registerYear: body.register_year
            ? Number(body.register_year)
            : body.registerYear
              ? Number(body.registerYear)
              : undefined,
          category: typeof body.category === "string" ? body.category.trim() : undefined,
          assetHealthStatus:
            typeof body.asset_health_status === "string"
              ? body.asset_health_status.trim()
              : undefined,
          q: typeof body.q === "string" ? body.q.trim() : undefined,
        })
      )
    );
  } catch (e) {
    return next(e);
  }
});

// Ops
protectedRouter.get("/assignments", async (req: AuthenticatedRequest, res, next) => {
  try {
    const result = await listAssignments(orgId(req), {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
    });
    return res.json({ success: true, ...result });
  } catch (e) {
    return next(e);
  }
});

protectedRouter.post("/assignments", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.status(201).json(ok(await createAssignment(orgId(req), req.body)));
  } catch (e) {
    return next(e);
  }
});

protectedRouter.patch("/assignments/:id/return", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await returnAssignment(orgId(req), paramId(req.params.id), req.body)));
  } catch (e) {
    return next(e);
  }
});

protectedRouter.patch("/assignments/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await updateAssignment(orgId(req), paramId(req.params.id), req.body)));
  } catch (e) {
    return next(e);
  }
});

protectedRouter.delete("/assignments/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await deleteAssignment(orgId(req), paramId(req.params.id))));
  } catch (e) {
    return next(e);
  }
});

protectedRouter.get("/maintenance", async (req: AuthenticatedRequest, res, next) => {
  try {
    const result = await listMaintenance(orgId(req), {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
    });
    return res.json({ success: true, ...result });
  } catch (e) {
    return next(e);
  }
});

protectedRouter.post("/maintenance", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.status(201).json(ok(await createMaintenance(orgId(req), req.body)));
  } catch (e) {
    return next(e);
  }
});

protectedRouter.patch("/maintenance/:id/extend", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await extendMaintenance(orgId(req), paramId(req.params.id), req.body)));
  } catch (e) {
    return next(e);
  }
});

protectedRouter.patch("/maintenance/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await updateMaintenance(orgId(req), paramId(req.params.id), req.body)));
  } catch (e) {
    return next(e);
  }
});

protectedRouter.delete("/maintenance/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await deleteMaintenance(orgId(req), paramId(req.params.id))));
  } catch (e) {
    return next(e);
  }
});

protectedRouter.get("/transfers", async (req: AuthenticatedRequest, res, next) => {
  try {
    const result = await listTransfers(orgId(req), {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
    });
    return res.json({ success: true, ...result });
  } catch (e) {
    return next(e);
  }
});

protectedRouter.post("/transfers", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.status(201).json(ok(await createTransfer(orgId(req), req.body)));
  } catch (e) {
    return next(e);
  }
});

protectedRouter.patch("/transfers/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await updateTransfer(orgId(req), paramId(req.params.id), req.body)));
  } catch (e) {
    return next(e);
  }
});

protectedRouter.delete("/transfers/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await deleteTransfer(orgId(req), paramId(req.params.id))));
  } catch (e) {
    return next(e);
  }
});

protectedRouter.get("/replacements", async (req: AuthenticatedRequest, res, next) => {
  try {
    const result = await listReplacements(orgId(req), {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
    });
    return res.json({ success: true, ...result });
  } catch (e) {
    return next(e);
  }
});

protectedRouter.post("/replacements", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.status(201).json(ok(await createReplacement(orgId(req), req.body)));
  } catch (e) {
    return next(e);
  }
});

protectedRouter.post("/replacements/:id/approve", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await approveReplacement(orgId(req), paramId(req.params.id))));
  } catch (e) {
    return next(e);
  }
});

protectedRouter.post("/replacements/:id/reject", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await rejectReplacement(orgId(req), paramId(req.params.id), req.body?.reason)));
  } catch (e) {
    return next(e);
  }
});

protectedRouter.patch("/replacements/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await updateReplacement(orgId(req), paramId(req.params.id), req.body)));
  } catch (e) {
    return next(e);
  }
});

protectedRouter.delete("/replacements/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await deleteReplacement(orgId(req), paramId(req.params.id))));
  } catch (e) {
    return next(e);
  }
});

protectedRouter.get("/reports", async (_req, res) => {
  res.json(ok(listReportTypes()));
});

protectedRouter.get("/reports/:type", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await getReport(orgId(req), paramId(req.params.type))));
  } catch (e) {
    return next(e);
  }
});

protectedRouter.get("/scan-lookup", async (req: AuthenticatedRequest, res, next) => {
  try {
    const code = typeof req.query.code === "string" ? req.query.code : undefined;
    const id = typeof req.query.id === "string" ? req.query.id : undefined;
    return res.json(ok(await scanLookup(orgId(req), code, id)));
  } catch (e) {
    return next(e);
  }
});

protectedRouter.patch("/assets/:id/health-status", async (req: AuthenticatedRequest, res, next) => {
  try {
    const updated = await updateRegisterAsset(orgId(req), paramId(req.params.id), {
      assetHealthStatus: req.body?.asset_health_status ?? req.body?.assetHealthStatus,
    });
    return res.json(ok(updated));
  } catch (e) {
    return next(e);
  }
});

router.use("/", protectedRouter);

// Docs-compatible alias: /api/school/assets/*
router.use("/school/assets", protectedRouter);

export default router;
