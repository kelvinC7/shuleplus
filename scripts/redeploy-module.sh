#!/bin/bash
# Redeploy a single ShulePlus module if its paths-filter flag is "true".
# Usage:
#   bash scripts/redeploy-module.sh <true|false> <ModuleDir> <pm_backend> <pm_frontend>
#   bash scripts/redeploy-module.sh KaziAvance
#   bash scripts/redeploy-module.sh TichaPortal
#
# Relies on production port/subdomain maps below (same as deploy-all-modules.sh).
set -uo pipefail

CHANGED="${1:-false}"
MOD="${2:-}"
PMBACK="${3:-}"
PMFRONT="${4:-}"

declare -A PM_BACK=(
  [Authentication]=auth-api
  [Academic]=academic-api [TichaPortal]=ticha-api [TeacherPortal]=ticha-api [SchoolFeesPortal]=fees-api
  [Budget]=budget-api [Payroll]=payroll-api [HR]=hr-api [Attendance]=attendance-api
  [ActionPlanMIS]=action-plan-api [ProcurementMIS]=procurement-api
  [InventoryMIS]=inventory-api [AssetsPortal]=assets-api [Cafeteria]=canteen-api
  [Timetable]=timetable-api [ParentMIS]=parents-api [NesaDashboard]=nesa-api
  [BabyeyiWizard]=babyeyi-api [KaziAvance]=kazi-api [StudentDiscpline]=discipline-api
  [SampleModule]=demo-api [ShuleKitMIS]=materials-api [TaskMIS]=tasks-api
  [SchoolUniformMIS]=uniform-api [StudentManagement]=student-management-api
  [Library]=library-api
  [MiniWebsite]=mini-website-api
  [PrintCardMIS]=print-card-api
)
declare -A PM_FRONT=(
  [Authentication]=auth-web
  [Academic]=academic-web [TichaPortal]=ticha-web [TeacherPortal]=ticha-web [SchoolFeesPortal]=fees-web
  [Budget]=budget-web [Payroll]=payroll-web [HR]=hr-web [Attendance]=attendance-web
  [ActionPlanMIS]=action-plan-web [ProcurementMIS]=procurement-web
  [InventoryMIS]=inventory-web [AssetsPortal]=assets-web [Cafeteria]=canteen-web
  [Timetable]=timetable-web [ParentMIS]=parents-web [NesaDashboard]=nesa-web
  [BabyeyiWizard]=babyeyi-web [KaziAvance]=kazi-web [StudentDiscpline]=discipline-web
  [SampleModule]=demo-web [ShuleKitMIS]=materials-web [TaskMIS]=tasks-web
  [SchoolUniformMIS]=uniform-web [StudentManagement]=student-management-web
  [Library]=library-web
  [MiniWebsite]=mini-website-web
  [PrintCardMIS]=print-card-web
)

# `bash scripts/redeploy-module.sh KaziAvance` used to print skip (unchanged)
# because $1 was treated as the true/false flag.
if [ "$CHANGED" != "true" ] && [ "$CHANGED" != "false" ] && [ -n "$CHANGED" ] && [ -z "$MOD" ]; then
  MOD="$CHANGED"
  CHANGED="true"
fi

if [ "$CHANGED" != "true" ]; then
  echo "  skip $MOD (unchanged)"
  exit 0
fi

PMBACK="${PMBACK:-${PM_BACK[$MOD]:-}}"
PMFRONT="${PMFRONT:-${PM_FRONT[$MOD]:-}}"

if [ -z "$MOD" ] || [ -z "$PMBACK" ]; then
  echo "Usage: $0 <true|false> <ModuleDir> <pm_backend> <pm_frontend>" >&2
  echo "   or: $0 <ModuleDir>" >&2
  exit 1
fi

REPO="${REPO:-/root/apps/shuleplus/ShulePlus}"
LOG="${LOG:-/tmp/deploy-changed.log}"

declare -A BACKEND_PORT=(
  [Authentication]=4001
  [Academic]=4002 [TeacherPortal]=4003 [TichaPortal]=4003 [SchoolFeesPortal]=4004 [Budget]=4005
  [Payroll]=4006 [HR]=4007 [Attendance]=4008 [ActionPlanMIS]=4009 [ProcurementMIS]=4010
  [InventoryMIS]=4011 [AssetsPortal]=4012 [Cafeteria]=4013 [Timetable]=4014 [ParentMIS]=4015
  [NesaDashboard]=4016 [BabyeyiWizard]=4017 [KaziAvance]=4018 [StudentDiscpline]=4019 [SampleModule]=4020
  [ShuleKitMIS]=4021 [TaskMIS]=4022 [SchoolUniformMIS]=4023 [StudentManagement]=4024
  [Library]=4025
  [MiniWebsite]=4026
  [PrintCardMIS]=4028
)
declare -A FRONTEND_PORT=(
  [Authentication]=6100
  [Academic]=6101 [TeacherPortal]=6102 [TichaPortal]=6102 [SchoolFeesPortal]=6103 [Budget]=6104
  [Payroll]=6105 [HR]=6106 [Attendance]=6107 [ActionPlanMIS]=6108 [ProcurementMIS]=6109
  [InventoryMIS]=6110 [AssetsPortal]=6111 [Cafeteria]=6112 [Timetable]=6113 [ParentMIS]=6114
  [NesaDashboard]=6115 [BabyeyiWizard]=6116 [KaziAvance]=6117 [StudentDiscpline]=6118 [SampleModule]=6119
  [ShuleKitMIS]=6120 [TaskMIS]=6121 [SchoolUniformMIS]=6122 [StudentManagement]=6123
  [Library]=6124
  [MiniWebsite]=6127
  [PrintCardMIS]=6128
)
# API host used in frontend .env.production (without scheme)
declare -A API_HOST=(
  [Authentication]=api.shuleplus.rw
  [Academic]=academic-api.shuleplus.rw [TeacherPortal]=ticha-api.shuleplus.rw [TichaPortal]=ticha-api.shuleplus.rw
  [SchoolFeesPortal]=fees-api.shuleplus.rw [Budget]=budget-api.shuleplus.rw
  [Payroll]=payroll-api.shuleplus.rw [HR]=hr-api.shuleplus.rw
  [Attendance]=attendance-api.shuleplus.rw [ActionPlanMIS]=action-plan-api.shuleplus.rw
  [ProcurementMIS]=procurement-api.shuleplus.rw [InventoryMIS]=inventory-api.shuleplus.rw
  [AssetsPortal]=assets-api.shuleplus.rw [Cafeteria]=canteen-api.shuleplus.rw
  [Timetable]=timetable-api.shuleplus.rw [ParentMIS]=parents-api.shuleplus.rw
  [NesaDashboard]=nesa-api.shuleplus.rw [BabyeyiWizard]=babyeyi-api.shuleplus.rw
  [KaziAvance]=kazi-api.shuleplus.rw [StudentDiscpline]=discipline-api.shuleplus.rw
  [SampleModule]=demo-api.shuleplus.rw [ShuleKitMIS]=materials-api.shuleplus.rw
  [TaskMIS]=tasks-api.shuleplus.rw [SchoolUniformMIS]=uniform-api.shuleplus.rw
  [StudentManagement]=studentmanagement-api.shuleplus.rw
  [Library]=library-api.shuleplus.rw
  [MiniWebsite]=website-api.shuleplus.rw
  [PrintCardMIS]=printcard-api.shuleplus.rw
)
declare -A FE_HOST=(
  [Authentication]=app.shuleplus.rw
  [Academic]=academic.shuleplus.rw [TeacherPortal]=ticha.shuleplus.rw [TichaPortal]=ticha.shuleplus.rw
  [SchoolFeesPortal]=fees.shuleplus.rw [Budget]=budget.shuleplus.rw
  [Payroll]=payroll.shuleplus.rw [HR]=hr.shuleplus.rw
  [Attendance]=attendance.shuleplus.rw [ActionPlanMIS]=action-plan.shuleplus.rw
  [ProcurementMIS]=procurement.shuleplus.rw [InventoryMIS]=inventory.shuleplus.rw
  [AssetsPortal]=assets.shuleplus.rw [Cafeteria]=canteen.shuleplus.rw
  [Timetable]=timetable.shuleplus.rw [ParentMIS]=parents.shuleplus.rw
  [NesaDashboard]=nesa.shuleplus.rw [BabyeyiWizard]=babyeyi.shuleplus.rw
  [KaziAvance]=kazi.shuleplus.rw [StudentDiscpline]=discipline.shuleplus.rw
  [SampleModule]=demo.shuleplus.rw [ShuleKitMIS]=materials.shuleplus.rw
  [TaskMIS]=tasks.shuleplus.rw [SchoolUniformMIS]=uniform.shuleplus.rw
  [StudentManagement]=studentmanagement.shuleplus.rw
  [Library]=library.shuleplus.rw
  [MiniWebsite]=website.shuleplus.rw
  [PrintCardMIS]=printcard.shuleplus.rw
)
declare -A FRONTEND_DIR=(
  [Academic]=Frontend_react
  [StudentManagement]=Frontend_react
)

# Vite modules: Nginx serves dist/ — no PM2 frontend process
STATIC_MODULES=(Academic ShuleKitMIS StudentManagement TichaPortal TeacherPortal MiniWebsite)

is_static() {
  local m="$1"
  for s in "${STATIC_MODULES[@]}"; do
    [ "$s" == "$m" ] && return 0
  done
  return 1
}

BDIR="$REPO/$MOD/Backend"
FDIRNAME="${FRONTEND_DIR[$MOD]:-Frontend}"
FDIR="$REPO/$MOD/$FDIRNAME"
BPORT="${BACKEND_PORT[$MOD]:-}"
FPORT="${FRONTEND_PORT[$MOD]:-}"
APIHOST="${API_HOST[$MOD]:-}"
FEHOST="${FE_HOST[$MOD]:-}"

# TichaPortal: Vite app at TichaPortal/ + Express BFF at TichaPortal/backend
if [ "$MOD" = "TichaPortal" ] || [ "$MOD" = "TeacherPortal" ]; then
  BDIR="$REPO/TichaPortal/backend"
  FDIR="$REPO/TichaPortal"
  BPORT="${BACKEND_PORT[TichaPortal]:-${BACKEND_PORT[TeacherPortal]:-$BPORT}}"
  FPORT="${FRONTEND_PORT[TichaPortal]:-${FRONTEND_PORT[TeacherPortal]:-$FPORT}}"
  APIHOST="${API_HOST[TichaPortal]:-${API_HOST[TeacherPortal]:-$APIHOST}}"
  FEHOST="${FE_HOST[TichaPortal]:-${FE_HOST[TeacherPortal]:-$FEHOST}}"
fi

echo "" | tee -a "$LOG"
echo "===== REDEPLOY $MOD =====" | tee -a "$LOG"

# ---------------- Backend ----------------
if [ -d "$BDIR" ]; then
  cd "$BDIR" || exit 1

  if [ ! -f .env ] && [ -f .env.example ]; then
    echo "  [backend] bootstrapping .env from .env.example" | tee -a "$LOG"
    cp .env.example .env
  fi

  if [ "$MOD" = "Library" ] && [ -f "$REPO/scripts/fix-library-db.sh" ]; then
    echo "  [backend] ensure Library database + DATABASE_URL..." | tee -a "$LOG"
    bash "$REPO/scripts/fix-library-db.sh" --prepare-only >> "$LOG" 2>&1 || true
  fi

  if [ "$MOD" = "PrintCardMIS" ] && [ -f "$REPO/scripts/fix-print-card-db.sh" ]; then
    echo "  [backend] ensure Print Card database + DATABASE_URL..." | tee -a "$LOG"
    bash "$REPO/scripts/fix-print-card-db.sh" --prepare-only >> "$LOG" 2>&1 || true
  fi

  if [ "$MOD" = "MiniWebsite" ] && [ -f "$REPO/scripts/fix-miniwebsite-db.sh" ]; then
    echo "  [backend] ensure MiniWebsite database + schema..." | tee -a "$LOG"
    bash "$REPO/scripts/fix-miniwebsite-db.sh" --prepare-only >> "$LOG" 2>&1 || true
  fi

  if [ "$MOD" = "BabyeyiWizard" ] && [ -f "$REPO/scripts/fix-babyeyi-db.sh" ]; then
    echo "  [backend] ensure BabyeyiWizard database + schema (tenants)..." | tee -a "$LOG"
    bash "$REPO/scripts/fix-babyeyi-db.sh" --prepare-only >> "$LOG" 2>&1 || {
      echo "  [backend] ERROR: fix-babyeyi-db failed — tenants table missing" | tee -a "$LOG"
      tail -n 30 "$LOG" | tee -a "$LOG" || true
      exit 1
    }
  fi

  echo "  [backend] npm install..." | tee -a "$LOG"
  npm install >> "$LOG" 2>&1
  find node_modules/.bin -type f -exec chmod +x {} \; 2>/dev/null || true

  if [ -n "$BPORT" ] && [ -f .env ]; then
    if grep -q "^PORT=" .env; then
      sed -i "s/^PORT=.*/PORT=$BPORT/" .env
    else
      echo "PORT=$BPORT" >> .env
    fi
  fi

  # Production: align JWT with IAM + allow module UI origin (code also allows *.shuleplus.rw)
  if [ -f .env ] && [ "$MOD" != "Authentication" ]; then
    AUTH_ENV="$REPO/Authentication/Backend/.env"
    if [ -f "$AUTH_ENV" ]; then
      AUTH_JWT=$(grep '^JWT_ACCESS_SECRET=' "$AUTH_ENV" | head -1 | cut -d= -f2- || true)
      AUTH_KEY=$(grep -E '^(MODULE_PROVISIONING_KEY|PLATFORM_SERVICE_KEY)=' "$AUTH_ENV" | head -1 | cut -d= -f2- || true)
      if [ -n "$AUTH_JWT" ]; then
        if grep -q '^JWT_ACCESS_SECRET=' .env; then
          sed -i "s|^JWT_ACCESS_SECRET=.*|JWT_ACCESS_SECRET=$AUTH_JWT|" .env
        else
          echo "JWT_ACCESS_SECRET=$AUTH_JWT" >> .env
        fi
      fi
      if [ -n "$AUTH_KEY" ]; then
        if grep -q '^PLATFORM_SERVICE_KEY=' .env; then
          sed -i "s|^PLATFORM_SERVICE_KEY=.*|PLATFORM_SERVICE_KEY=$AUTH_KEY|" .env
        else
          echo "PLATFORM_SERVICE_KEY=$AUTH_KEY" >> .env
        fi
        if grep -q '^SERVICE_API_KEY=' .env; then
          sed -i "s|^SERVICE_API_KEY=.*|SERVICE_API_KEY=$AUTH_KEY|" .env
        else
          echo "SERVICE_API_KEY=$AUTH_KEY" >> .env
        fi
      fi
    fi
    if [ -n "$FEHOST" ]; then
      CORS_VAL="https://${FEHOST},https://${APIHOST},https://shuleplus.rw,https://app.shuleplus.rw,https://www.shuleplus.rw"
      if grep -q '^CORS_ORIGIN=' .env; then
        sed -i "s|^CORS_ORIGIN=.*|CORS_ORIGIN=$CORS_VAL|" .env
      else
        echo "CORS_ORIGIN=$CORS_VAL" >> .env
      fi
      if grep -q '^FRONTEND_URL=' .env; then
        sed -i "s|^FRONTEND_URL=.*|FRONTEND_URL=https://${FEHOST}|" .env
      else
        echo "FRONTEND_URL=https://${FEHOST}" >> .env
      fi
    fi
    # ── Universal cross-service URL patching ──
    # Maps every known dev-port default to the correct production port.
    # Only patches vars that already exist in .env (avoids adding unused vars).
    declare -A SVC_URL=(
      [IAM_API_URL]="http://localhost:4001/api/v1"
      [STUDENT_MANAGEMENT_API_URL]="http://localhost:4024/api"
      [STUDENT_MANAGEMENT_URL]="http://localhost:4024/api"
      [ACADEMIC_API_URL]="http://localhost:4002/api"
      [HR_API_URL]="http://localhost:4007/api"
      [ATTENDANCE_API_URL]="http://localhost:4008/api"
      [PAYROLL_API_URL]="http://localhost:4006/api"
      [TIMETABLE_API_URL]="http://localhost:4014/api"
      [STUDENT_DISCIPLINE_API_URL]="http://localhost:4019/api"
      [BABYEYI_API_URL]="http://localhost:4017/api"
      [NESA_API_URL]="http://localhost:4016/api"
      [CANTEEN_API_URL]="http://localhost:4013/api"
      [INVENTORY_API_URL]="http://localhost:4011/api"
      [SCHOOL_FEES_API_URL]="http://localhost:4004/api"
      [PARENTMIS_WEBHOOK_URL]="http://localhost:4015/api/webhooks/discipline"
      [NOTIFICATION_SERVICE_URL]="http://localhost:4001/api/v1/notifications"
      [SHULEKIT_API_URL]="http://localhost:4021/api"
      [TEACHER_PORTAL_URL]="http://localhost:4003/api"
      [TICHA_PORTAL_API_URL]="http://localhost:4003/api"
      [KAZI_API_URL]="http://localhost:4018"
      [PUBLIC_API_URL]="http://localhost:${BPORT}/api"
      # Fees → ParentMIS in-app reminders (webhook). Default localhost:3048 only works in dev.
      [PARENT_MIS_API_URL]="http://localhost:4015/api"
    )
    for KEY in "${!SVC_URL[@]}"; do
      VAL="${SVC_URL[$KEY]}"
      if grep -q "^${KEY}=" .env; then
        sed -i "s|^${KEY}=.*|${KEY}=${VAL}|" .env
      fi
    done
    # PUBLIC_BASE_URL must be the public API host (browser-reachable), not localhost
    if grep -q '^PUBLIC_BASE_URL=' .env; then
      if [ -n "$APIHOST" ]; then
        sed -i "s|^PUBLIC_BASE_URL=.*|PUBLIC_BASE_URL=https://${APIHOST}|" .env
      else
        sed -i "s|^PUBLIC_BASE_URL=.*|PUBLIC_BASE_URL=http://localhost:${BPORT}|" .env
      fi
    elif [ -n "$APIHOST" ]; then
      echo "PUBLIC_BASE_URL=https://${APIHOST}" >> .env
    fi
    # Fees cross-service URLs MUST exist in .env — older files lack them and env.ts
    # falls back to dead dev ports, so every cross-module call fails silently.
    if [ "$MOD" = "SchoolFeesPortal" ] && [ -f .env ]; then
      while IFS='|' read -r KEY VAL WHY; do
        [ -z "$KEY" ] && continue
        if ! grep -q "^${KEY}=" .env; then
          echo "${KEY}=${VAL}" >> .env
          echo "  [backend] added ${KEY} (was missing — ${WHY})" | tee -a "$LOG"
        fi
      done <<'EOF'
PARENT_MIS_API_URL|http://localhost:4015/api|in-app reminders were silently dropped
STUDENT_MANAGEMENT_API_URL|http://localhost:4024/api|student/class/parent lookups silently failed
BABYEYI_API_URL|http://localhost:4017/api|Babyeyi fee-structure items failed to load
NOTIFICATION_SERVICE_URL|http://localhost:4001/api/v1/notifications|notification dispatch failed
IAM_API_URL|http://localhost:4001/api/v1|IAM service calls failed
EOF
    fi
    # Academic exam planning reads Config Class courses from Timetable — missing/wrong
    # TIMETABLE_API_URL falls back to dead dev port 3010 and shows "fetch failed" in UI.
    if [ "$MOD" = "Academic" ] && [ -f .env ]; then
      while IFS='|' read -r KEY VAL WHY; do
        [ -z "$KEY" ] && continue
        if grep -q "^${KEY}=" .env; then
          sed -i "s|^${KEY}=.*|${KEY}=${VAL}|" .env
        else
          echo "${KEY}=${VAL}" >> .env
          echo "  [backend] added ${KEY} (was missing — ${WHY})" | tee -a "$LOG"
        fi
      done <<'EOF'
IAM_API_URL|http://localhost:4001/api/v1|IAM users and org context
IAM_PUBLIC_ORIGIN|https://shuleplus.rw|browser-loadable school logos on report cards
STUDENT_MANAGEMENT_API_URL|http://localhost:4024/api|classes and students for exam catalog
STUDENT_MANAGEMENT_PUBLIC_URL|https://studentmanagement-api.shuleplus.rw|student photos on report cards
TIMETABLE_API_URL|http://localhost:4014/api|Smart Timetable Config Class courses
SCHOOL_FEES_API_URL|http://localhost:4004/api|exam fee eligibility lookups
TICHA_PORTAL_API_URL|http://localhost:4003/api|teacher permissions and round roll call via Ticha BFF
EOF
      if ! curl -sf --max-time 3 http://localhost:4014/api/health >/dev/null 2>&1; then
        echo "  [warn] timetable-api (:4014) not reachable — exam catalog needs Timetable running" | tee -a "$LOG"
      fi
    fi
    if [ "$MOD" = "PrintCardMIS" ] && [ -f .env ]; then
      while IFS='|' read -r KEY VAL WHY; do
        [ -z "$KEY" ] && continue
        if grep -q "^${KEY}=" .env; then
          sed -i "s|^${KEY}=.*|${KEY}=${VAL}|" .env
        else
          echo "${KEY}=${VAL}" >> .env
          echo "  [backend] added ${KEY} (was missing — ${WHY})" | tee -a "$LOG"
        fi
      done <<'EOF'
IAM_API_URL|http://localhost:4001/api/v1|school list and org profile
STUDENT_MANAGEMENT_API_URL|http://localhost:4024/api|student cards and photos
HR_API_URL|http://localhost:4007/api|staff cards and photos
TIMETABLE_API_URL|http://localhost:4014/api|education level labels
EOF
    fi
    if [ "$MOD" = "ParentMIS" ] && [ -f .env ]; then
      while IFS='|' read -r KEY VAL WHY; do
        [ -z "$KEY" ] && continue
        if grep -q "^${KEY}=" .env; then
          sed -i "s|^${KEY}=.*|${KEY}=${VAL}|" .env
        else
          echo "${KEY}=${VAL}" >> .env
          echo "  [backend] added ${KEY} (was missing — ${WHY})" | tee -a "$LOG"
        fi
      done <<'EOF'
STUDENT_MANAGEMENT_API_URL|http://localhost:4024/api|parent login and student profiles
STUDENT_MANAGEMENT_PUBLIC_URL|https://studentmanagement-api.shuleplus.rw|browser-facing student photos
SCHOOL_FEES_API_URL|http://localhost:4004/api|fee statements and payments
ATTENDANCE_API_URL|http://localhost:4008/api|attendance records
TIMETABLE_API_URL|http://localhost:4014/api|class timetable and period attendance
DISCIPLINE_API_URL|http://localhost:4019/api|discipline incidents
TRANSPORT_API_URL|http://localhost:3064/api|bus tracking
SHULEKIT_API_URL|http://localhost:4021/api|store catalog and orders
CANTEEN_API_URL|http://localhost:4013/api|canteen wallet
PUBLIC_SITE_URL|https://shuleplus.rw|smart-card QR links
EOF
      if grep -q '^MODULE_SLUG=' .env; then
        sed -i 's|^MODULE_SLUG=.*|MODULE_SLUG=parent-mis|' .env
      else
        echo 'MODULE_SLUG=parent-mis' >> .env
      fi
    fi
    if [ "$MOD" = "ActionPlanMIS" ] && [ -f .env ]; then
      while IFS='|' read -r KEY VAL WHY; do
        [ -z "$KEY" ] && continue
        if grep -q "^${KEY}=" .env; then
          sed -i "s|^${KEY}=.*|${KEY}=${VAL}|" .env
        else
          echo "${KEY}=${VAL}" >> .env
          echo "  [backend] added ${KEY} (was missing — ${WHY})" | tee -a "$LOG"
        fi
      done <<'EOF'
BUDGET_API_URL|http://localhost:4004/api|School Budget module for expense lines
IAM_API_URL|http://localhost:4001/api/v1|school profile and logo from Authentication
UPLOAD_DIR|uploads|evidence file storage
EOF
      mkdir -p uploads
    fi
    if [ "$MOD" = "KaziAvance" ] && [ -f .env ]; then
      while IFS='|' read -r KEY VAL WHY; do
        [ -z "$KEY" ] && continue
        if grep -q "^${KEY}=" .env; then
          sed -i "s|^${KEY}=.*|${KEY}=${VAL}|" .env
        else
          echo "${KEY}=${VAL}" >> .env
          echo "  [backend] added ${KEY} (was missing — ${WHY})" | tee -a "$LOG"
        fi
      done <<'EOF'
IAM_API_URL|http://localhost:4001/api/v1|IAM users for eligibility
HR_API_URL|http://localhost:4007/api|HR staff directory
PAYROLL_API_URL|http://localhost:4006/api|salary sync for advances
TIMETABLE_API_URL|http://localhost:4014/api|teacher profiles
STUDENT_MANAGEMENT_API_URL|http://localhost:4024/api|student lookups
ACADEMIC_API_URL|http://localhost:4002/api|academic lookups
ATTENDANCE_API_URL|http://localhost:4008/api|attendance lookups
TEACHER_PORTAL_URL|http://localhost:4003/api|TichaPortal BFF
NOTIFICATION_SERVICE_URL|http://localhost:4001/api/v1/notifications|push/notify
EOF
    fi
    if [ "$MOD" = "TichaPortal" ] || [ "$MOD" = "TeacherPortal" ]; then
      if [ -f .env ]; then
        while IFS='|' read -r KEY VAL WHY; do
          [ -z "$KEY" ] && continue
          if grep -q "^${KEY}=" .env; then
            sed -i "s|^${KEY}=.*|${KEY}=${VAL}|" .env
          else
            echo "${KEY}=${VAL}" >> .env
            echo "  [backend] added ${KEY} (was missing — ${WHY})" | tee -a "$LOG"
          fi
        done <<'EOF'
IAM_API_URL|http://localhost:4001/api/v1|IAM users and academic settings
TIMETABLE_API_URL|http://localhost:4014/api|teacher timetable and lessons
ACADEMIC_API_URL|http://localhost:4002/api|assessments and marks
STUDENT_MANAGEMENT_API_URL|http://localhost:4024/api|classes and students
ATTENDANCE_API_URL|http://localhost:4008/api|teacher and class attendance
KAZI_API_URL|http://localhost:4018|Shule Avance / Ticha Deals
HR_API_URL|http://localhost:4007/api|staff directory for payroll page
PAYROLL_API_URL|http://localhost:4006/api|teacher payslip / salary
STUDENT_DISCIPLINE_API_URL|http://localhost:4019/api|discipline lookups
BABYEYI_API_URL|http://localhost:4017/api|legacy babyeyi resources
NOTIFICATION_SERVICE_URL|http://localhost:4001/api/v1/notifications|push/notify
EOF
      fi
    fi
    if [ "$MOD" = "Timetable" ] && [ -f .env ]; then
      while IFS='|' read -r KEY VAL WHY; do
        [ -z "$KEY" ] && continue
        if grep -q "^${KEY}=" .env; then
          sed -i "s|^${KEY}=.*|${KEY}=${VAL}|" .env
        else
          echo "${KEY}=${VAL}" >> .env
          echo "  [backend] added ${KEY} (was missing — ${WHY})" | tee -a "$LOG"
        fi
      done <<'EOF'
IAM_API_URL|http://localhost:4001/api/v1|IAM academic settings
STUDENT_MANAGEMENT_API_URL|http://localhost:4024/api|classes and students from SM
ACADEMIC_API_URL|http://localhost:4024/api|alias — Timetable reads classes from SM
HR_API_URL|http://localhost:4007/api|HR staff for teacher assignments
EOF
    fi
    if [ "$MOD" = "Attendance" ] && [ -f .env ]; then
      while IFS='|' read -r KEY VAL WHY; do
        [ -z "$KEY" ] && continue
        if grep -q "^${KEY}=" .env; then
          sed -i "s|^${KEY}=.*|${KEY}=${VAL}|" .env
        else
          echo "${KEY}=${VAL}" >> .env
          echo "  [backend] added ${KEY} (was missing — ${WHY})" | tee -a "$LOG"
        fi
      done <<'EOF'
STUDENT_MANAGEMENT_API_URL|http://localhost:4024/api|Smart Access RFID lookup at gate devices
IAM_API_URL|http://localhost:4001/api/v1|org users and teaching staff roster
HR_API_URL|http://localhost:4007/api|HR staff directory and RFID cards
TIMETABLE_API_URL|http://localhost:4014/api|teacher schedules for staff attendance
NOTIFICATION_SERVICE_URL|http://localhost:4001/api/v1/notifications|parent SMS on entry/exit taps
PARENT_MIS_API_URL|http://localhost:4015/api|parent in-app attendance events
EOF
      # Sync SMS key to SERVICE/PLATFORM key — never leave literal "dev-service-key"
      SHARED_KEY=$(grep -E '^(SERVICE_API_KEY|PLATFORM_SERVICE_KEY)=' .env | head -1 | cut -d= -f2- || true)
      if [ -n "$SHARED_KEY" ] && [ "$SHARED_KEY" != "dev-service-key" ]; then
        if grep -q '^NOTIFICATION_SERVICE_API_KEY=' .env; then
          sed -i "s|^NOTIFICATION_SERVICE_API_KEY=.*|NOTIFICATION_SERVICE_API_KEY=${SHARED_KEY}|" .env
        else
          echo "NOTIFICATION_SERVICE_API_KEY=${SHARED_KEY}" >> .env
        fi
        echo "  [backend] NOTIFICATION_SERVICE_API_KEY synced to SERVICE/PLATFORM key" | tee -a "$LOG"
      fi
    fi
    if [ "$MOD" = "Authentication" ] && [ -f .env ]; then
      while IFS='|' read -r KEY VAL WHY; do
        [ -z "$KEY" ] && continue
        if grep -q "^${KEY}=" .env; then
          sed -i "s|^${KEY}=.*|${KEY}=${VAL}|" .env
        else
          echo "${KEY}=${VAL}" >> .env
          echo "  [backend] added ${KEY} (was missing — ${WHY})" | tee -a "$LOG"
        fi
      done <<'EOF'
ATTENDANCE_API_URL|http://localhost:4008/api|Super Admin gate device provisioning
STUDENT_MANAGEMENT_API_URL|http://localhost:4024/api|Smart Access student RFID lookup
EOF
    fi
    # MiniWebsite: server-side IAM/Babyeyi must use loopback (public shuleplus.rw:443 hairpin times out).
    if [ "$MOD" = "MiniWebsite" ] && [ -f .env ]; then
      while IFS='|' read -r KEY VAL WHY; do
        [ -z "$KEY" ] && continue
        if grep -q "^${KEY}=" .env; then
          sed -i "s|^${KEY}=.*|${KEY}=${VAL}|" .env
        else
          echo "${KEY}=${VAL}" >> .env
          echo "  [backend] added ${KEY} (was missing — ${WHY})" | tee -a "$LOG"
        fi
      done <<'EOF'
IAM_API_URL|http://localhost:4001/api/v1|regenerate/branding must reach auth-api on loopback
IAM_PUBLIC_ORIGIN|https://shuleplus.rw|browser loads school logos from apex /uploads
BABYEYI_API_URL|http://localhost:4017/api|public school circulars
EOF
      if ! grep -qE '[[:space:]]website-api\.shuleplus\.rw([[:space:]]|$)' /etc/hosts 2>/dev/null; then
        echo '127.0.0.1 website-api.shuleplus.rw' >> /etc/hosts
        echo "  [backend] added /etc/hosts hairpin for website-api.shuleplus.rw" | tee -a "$LOG"
      fi
    fi
    # Babyeyi QR verify links for parents (must be public subdomain)
    if [ "$MOD" = "BabyeyiWizard" ]; then
      if grep -q '^VERIFY_PUBLIC_URL=' .env; then
        sed -i 's|^VERIFY_PUBLIC_URL=.*|VERIFY_PUBLIC_URL=https://babyeyi.shuleplus.rw/verify|' .env
      else
        echo 'VERIFY_PUBLIC_URL=https://babyeyi.shuleplus.rw/verify' >> .env
      fi
      if grep -q '^IAM_ORIGIN=' .env; then
        sed -i 's|^IAM_ORIGIN=.*|IAM_ORIGIN=https://shuleplus.rw|' .env
      else
        echo 'IAM_ORIGIN=https://shuleplus.rw' >> .env
      fi
    fi
    if grep -q '^NODE_ENV=' .env; then
      sed -i 's|^NODE_ENV=.*|NODE_ENV=production|' .env
    else
      echo 'NODE_ENV=production' >> .env
    fi
  fi

  # Prisma generate + migrate when present (safe no-op if unused)
  if [ -f prisma/schema.prisma ]; then
    echo "  [backend] prisma generate..." | tee -a "$LOG"
    npx prisma generate >> "$LOG" 2>&1 || true
    echo "  [backend] prisma migrate deploy..." | tee -a "$LOG"
    npx prisma migrate deploy >> "$LOG" 2>&1 || true
    if [ "$MOD" = "KaziAvance" ] || [ "$MOD" = "AssetsPortal" ] || [ "$MOD" = "MiniWebsite" ] || [ "$MOD" = "Attendance" ]; then
      echo "  [backend] prisma db push ($MOD has no migration history)..." | tee -a "$LOG"
      npx prisma db push --skip-generate >> "$LOG" 2>&1 || true
    fi
    if [ "$MOD" = "BabyeyiWizard" ]; then
      echo "  [backend] prisma db push (Babyeyi schema drift fallback)..." | tee -a "$LOG"
      npx prisma db push --skip-generate >> "$LOG" 2>&1 || true
    fi
    if [ "$MOD" = "AssetsPortal" ] && [ -f "$REPO/scripts/patch-assets-portal-db.sh" ]; then
      echo "  [backend] SQL patch for Assets Portal columns..." | tee -a "$LOG"
      bash "$REPO/scripts/patch-assets-portal-db.sh" >> "$LOG" 2>&1 || true
    fi
  fi

  echo "  [backend] npm run build..." | tee -a "$LOG"
  if grep -q '"build"' package.json 2>/dev/null && [ "$MOD" != "TichaPortal" ] && [ "$MOD" != "TeacherPortal" ]; then
    npm run build >> "$LOG" 2>&1
  else
    echo "  [backend] skip npm run build (plain Node)" | tee -a "$LOG"
  fi

  # Prisma custom output (e.g. Academic) lands in src/generated — copy into dist for node
  if [ -d src/generated ]; then
    mkdir -p dist/generated
    cp -a src/generated/. dist/generated/ 2>/dev/null || true
    echo "  [backend] copied src/generated → dist/generated" | tee -a "$LOG"
  fi

  ENTRY=""
  for f in dist/server.js dist/index.js dist/main.js dist/app.js; do
    [ -f "$f" ] && ENTRY="$f" && break
  done

  pm2 delete "$PMBACK" >/dev/null 2>&1 || true
  if [ "$MOD" = "TichaPortal" ] || [ "$MOD" = "TeacherPortal" ]; then
    pm2 delete teachers-api teachers-web >/dev/null 2>&1 || true
  fi

  # Authentication bootstrap imports prisma/seed (TS source paths) — run via tsx
  if [ "$MOD" = "Authentication" ] && [ -f src/server.ts ]; then
    echo "  [backend] prisma generate (required for tsx src/server.ts)..." | tee -a "$LOG"
    npx prisma generate >> "$LOG" 2>&1 || {
      echo "  [backend] ERROR: prisma generate failed" | tee -a "$LOG"
      tail -n 40 "$LOG" | tee -a "$LOG" || true
      exit 1
    }
    echo "  [backend] pm2 start tsx src/server.ts → $PMBACK (NODE_ENV=production)" | tee -a "$LOG"
    # Ensure Auth .env forces production catalog URLs (not localhost:3004)
    if [ -f .env ]; then
      if grep -q '^NODE_ENV=' .env; then
        sed -i 's|^NODE_ENV=.*|NODE_ENV=production|' .env
      else
        echo 'NODE_ENV=production' >> .env
      fi
      if grep -q '^FORCE_LOCAL_MODULE_URLS=' .env; then
        sed -i 's|^FORCE_LOCAL_MODULE_URLS=.*|FORCE_LOCAL_MODULE_URLS=false|' .env
      else
        echo 'FORCE_LOCAL_MODULE_URLS=false' >> .env
      fi
      if grep -q '^FRONTEND_URL=' .env; then
        sed -i 's|^FRONTEND_URL=.*|FRONTEND_URL=https://shuleplus.rw|' .env
      else
        echo 'FRONTEND_URL=https://shuleplus.rw' >> .env
      fi
    fi
    echo "  [backend] apply module subdomains to catalog..." | tee -a "$LOG"
    node "$REPO/scripts/apply-module-subdomains.mjs" >> "$LOG" 2>&1 || true
    pm2 start "npx tsx src/server.ts" --name "$PMBACK" --interpreter none \
      --update-env --env NODE_ENV=production >> "$LOG" 2>&1
    sleep 4
    ATT_CFG=$(grep '^ATTENDANCE_API_URL=' .env 2>/dev/null | head -1 | cut -d= -f2- || true)
    echo "  [backend] ATTENDANCE_API_URL=${ATT_CFG:-<missing>}" | tee -a "$LOG"
    if [ -n "$ATT_CFG" ]; then
      if curl -sf "${ATT_CFG%/}/health" >/dev/null 2>&1; then
        echo "  [backend] attendance upstream ok (${ATT_CFG%/}/health)" | tee -a "$LOG"
      else
        echo "  [backend] WARNING: attendance unreachable at ${ATT_CFG} — Gate Devices will return 503" | tee -a "$LOG"
        echo "  [backend] FIX: ensure attendance-api on :4008, then pm2 restart auth-api --update-env" | tee -a "$LOG"
      fi
    fi
  elif [ -n "$ENTRY" ]; then
    echo "  [backend] pm2 start $ENTRY → $PMBACK" | tee -a "$LOG"
    pm2 start "$ENTRY" --name "$PMBACK" --cwd "$BDIR" --update-env --env NODE_ENV=production >> "$LOG" 2>&1
    if [ -n "$BPORT" ]; then
      if [ "$MOD" = "MiniWebsite" ]; then
        sleep 6
      elif [ "$MOD" = "ActionPlanMIS" ]; then
        sleep 5
      else
        sleep 3
      fi
      HEALTH_PATH="/health"
      if [ -f .env ] && grep -qE '^API_PREFIX=/api' .env; then
        HEALTH_PATH="/api/health"
      fi
      HEALTH_OK=0
      for attempt in $(seq 1 12); do
        if curl -sf "http://127.0.0.1:${BPORT}${HEALTH_PATH}" >/dev/null \
          || curl -sf "http://127.0.0.1:${BPORT}/api/health" >/dev/null \
          || curl -sf "http://127.0.0.1:${BPORT}/health" >/dev/null; then
          HEALTH_OK=1
          echo "  [backend] health ok on :${BPORT}${HEALTH_PATH} (attempt ${attempt})" | tee -a "$LOG"
          break
        fi
        sleep 2
      done
      if [ "$HEALTH_OK" -eq 0 ]; then
        echo "  [backend] HEALTH CHECK FAILED on :${BPORT} after 24s (tried /api/health and /health) — last logs:" | tee -a "$LOG"
        pm2 logs "$PMBACK" --lines 30 --nostream | tee -a "$LOG" || true
      fi
    fi
  elif [ -f server.js ]; then
    echo "  [backend] pm2 start server.js → $PMBACK" | tee -a "$LOG"
    pm2 start server.js --name "$PMBACK" --update-env --env NODE_ENV=production >> "$LOG" 2>&1
  else
    echo "  [backend] no dist entry — fallback tsx src/server.ts" | tee -a "$LOG"
    if [ -f src/server.ts ]; then
      pm2 start "npx tsx src/server.ts" --name "$PMBACK" --interpreter none \
        --update-env --env NODE_ENV=production >> "$LOG" 2>&1
    elif [ -f src/index.ts ]; then
      pm2 start "npx tsx src/index.ts" --name "$PMBACK" --interpreter none \
        --update-env --env NODE_ENV=production >> "$LOG" 2>&1
    else
      echo "  [backend] ERROR: no entry point found" | tee -a "$LOG"
    fi
  fi
else
  echo "  [backend] $BDIR not found — skipping" | tee -a "$LOG"
fi

# ---------------- Frontend ----------------
if [ -d "$FDIR" ]; then
  cd "$FDIR" || exit 1
  echo "  [frontend] npm install..." | tee -a "$LOG"
  # Next.js builds need devDependencies (@tailwindcss/postcss, typescript, etc.)
  # Vite builds need devDependencies (vite, plugins, typescript, etc.)
  if [ -f next.config.js ] || [ -f next.config.ts ] || [ -f next.config.mjs ] || [ -f vite.config.ts ] || [ -f vite.config.js ]; then
    npm install --include=dev >> "$LOG" 2>&1
  else
    npm install >> "$LOG" 2>&1
  fi
  find node_modules/.bin -type f -exec chmod +x {} \; 2>/dev/null || true

  if [ -f vite.config.ts ] || [ -f vite.config.js ]; then
    # Vite: remove local overrides that would poison production bundles
    rm -f .env.local .env.development.local
    cat > .env.production <<EOF
VITE_API_URL=https://${APIHOST}
VITE_TP_API_URL=https://${APIHOST}
VITE_IAM_URL=https://shuleplus.rw
VITE_IAM_API_URL=https://shuleplus.rw/api/v1
VITE_KAZI_API_URL=https://kazi-api.shuleplus.rw
EOF
    if [ "$MOD" != "TichaPortal" ] && [ "$MOD" != "TeacherPortal" ]; then
      cat > .env.production <<EOF
VITE_API_URL=https://${APIHOST}/api
VITE_IAM_URL=https://shuleplus.rw
VITE_IAM_API_URL=https://shuleplus.rw/api/v1
EOF
    fi
    echo "  [frontend] Vite build..." | tee -a "$LOG"
    # Academic (and similar) may fail tsc -b on unused/MUI typings — still emit dist
    if npm run build >> "$LOG" 2>&1; then
      :
    else
      echo "  [frontend] npm run build failed — trying vite-only" | tee -a "$LOG"
      npx vite build >> "$LOG" 2>&1 || node ./node_modules/vite/bin/vite.js build >> "$LOG" 2>&1 || true
    fi
    # Drop any leftover PM2 web process — Nginx serves dist/
    if [ -n "$PMFRONT" ]; then
      pm2 delete "$PMFRONT" >/dev/null 2>&1 || true
    fi
    # Academic is static-only; a stale academic-web on :6116 breaks babyeyi.shuleplus.rw.
    if [ "$MOD" = "Academic" ]; then
      pm2 delete academic-web >/dev/null 2>&1 || true
      fuser -k 6116/tcp 2>/dev/null || true
      if [ -f "$REPO/scripts/generate-nginx-modules.sh" ]; then
        echo "  [frontend] regenerate nginx (Academic static + babyeyi proxy)" | tee -a "$LOG"
        sudo bash "$REPO/scripts/generate-nginx-modules.sh" >> "$LOG" 2>&1 || true
      fi
    fi
    if [ -f dist/index.html ]; then
      echo "  [frontend] static build → $FDIR/dist" | tee -a "$LOG"
    else
      echo "  [frontend] ERROR: dist/index.html missing — build failed. Last 60 log lines:" | tee -a "$LOG"
      tail -n 60 "$LOG" | tee -a "$LOG" || true
      exit 1
    fi
  else
    # CRITICAL: Next.js loads .env.local OVER .env.production — leftover localhost
    # files on the server bake Access Denied (browser calls localhost APIs).
    rm -f .env.local .env.development.local
    # Auth IAM expects /api/v1; apex Nginx proxies /api/ → auth-api
    if [ "$MOD" = "Authentication" ]; then
      cat > .env.production <<EOF
NEXT_PUBLIC_API_URL=https://shuleplus.rw/api/v1
NEXT_PUBLIC_TEACHER_PORTAL_URL=https://ticha.shuleplus.rw/login
NEXT_PUBLIC_PARENT_PORTAL_URL=https://parents.shuleplus.rw/login
NEXT_PUBLIC_SHULEKIT_URL=https://materials.shuleplus.rw
NEXT_PUBLIC_SHULEKIT_API_URL=https://materials-api.shuleplus.rw/api
NEXT_PUBLIC_ACADEMIC_API_URL=https://academic-api.shuleplus.rw/api
NEXT_PUBLIC_BABYEYI_API_URL=https://babyeyi-api.shuleplus.rw/api
NEXT_PUBLIC_MINI_WEBSITE_URL=https://website.shuleplus.rw
EOF
    elif [ "$MOD" = "ParentMIS" ]; then
      # Browser-facing public hosts. Backend still uses localhost:* in Backend/.env.
      # Use *-api hosts for APIs (nginx API_HOST), not the UI hosts.
      cat > .env.production <<EOF
NEXT_PUBLIC_API_URL=https://parents.shuleplus.rw/api
NEXT_PUBLIC_IAM_URL=https://shuleplus.rw
NEXT_PUBLIC_IAM_API_URL=https://shuleplus.rw/api/v1
NEXT_PUBLIC_STUDENT_MGMT_API_URL=https://studentmanagement-api.shuleplus.rw/api
NEXT_PUBLIC_FEES_PORTAL_URL=https://fees.shuleplus.rw
NEXT_PUBLIC_MODULE_NAME=Parent Portal
EOF
    elif [ "$MOD" = "KaziAvance" ]; then
      # Kazi FE reads NEXT_PUBLIC_KAZI_API_URL (paths already include /api)
      cat > .env.production <<EOF
NEXT_PUBLIC_KAZI_API_URL=https://${APIHOST}
NEXT_PUBLIC_API_URL=https://${APIHOST}
NEXT_PUBLIC_IAM_URL=https://shuleplus.rw
NEXT_PUBLIC_IAM_API_URL=https://shuleplus.rw/api/v1
EOF
    elif [ "$MOD" = "Library" ]; then
      cat > .env.production <<EOF
NEXT_PUBLIC_API_URL=https://${APIHOST}/api
NEXT_PUBLIC_IAM_URL=https://shuleplus.rw
NEXT_PUBLIC_IAM_API_URL=https://shuleplus.rw/api/v1
NEXT_PUBLIC_STUDENT_MGMT_API_URL=https://studentmanagement-api.shuleplus.rw/api
NEXT_PUBLIC_MODULE_NAME=Library
EOF
    elif [ "$MOD" = "PrintCardMIS" ]; then
      cat > .env.production <<EOF
NEXT_PUBLIC_API_URL=https://${APIHOST}/api
NEXT_PUBLIC_IAM_URL=https://shuleplus.rw
NEXT_PUBLIC_IAM_API_URL=https://shuleplus.rw/api/v1
NEXT_PUBLIC_PUBLIC_SITE_URL=https://shuleplus.rw
NEXT_PUBLIC_STUDENT_MANAGEMENT_API_URL=https://studentmanagement-api.shuleplus.rw/api
NEXT_PUBLIC_HR_API_URL=https://hr-api.shuleplus.rw/api
EOF
    elif [ "$MOD" = "Attendance" ]; then
      cat > .env.production <<EOF
NEXT_PUBLIC_API_URL=https://${APIHOST}/api
NEXT_PUBLIC_IAM_URL=https://shuleplus.rw
NEXT_PUBLIC_IAM_API_URL=https://shuleplus.rw/api/v1
NEXT_PUBLIC_STUDENT_MANAGEMENT_API_URL=https://studentmanagement-api.shuleplus.rw/api
NEXT_PUBLIC_HR_API_URL=https://hr-api.shuleplus.rw/api
NEXT_PUBLIC_MODULE_SLUG=attendance
EOF
    else
      # Module APIs mount under /api; IAM is apex Auth
      cat > .env.production <<EOF
NEXT_PUBLIC_API_URL=https://${APIHOST}/api
NEXT_PUBLIC_IAM_URL=https://shuleplus.rw
NEXT_PUBLIC_IAM_API_URL=https://shuleplus.rw/api/v1
EOF
    fi
    # Highest Next priority — wins even if someone recreates .env.local
    cp -f .env.production .env.production.local
    if [ ! -f next.config.js ] && [ ! -f next.config.ts ] && [ ! -f next.config.mjs ]; then
      cat > next.config.js <<'EOF'
/** @type {import('next').NextConfig} */
module.exports = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
};
EOF
    fi
    # Build into a staging dir while auth-web keeps serving the previous .next (avoids unstyled apex during build).
    STAGING=".next-staging-$$"
    echo "  [frontend] Next.js build → $STAGING (live .next kept until swap)..." | tee -a "$LOG"
    rm -rf "$STAGING"
    export NEXT_IGNORE_INCORRECT_LOCKFILE=true
    export NEXT_DIST_DIR="$STAGING"
    FRONT_BUILD_OK=false
    if NEXT_IGNORE_INCORRECT_LOCKFILE=true NEXT_DIST_DIR="$STAGING" npx next build >> "$LOG" 2>&1; then
      FRONT_BUILD_OK=true
    else
      echo "  [frontend] next build failed — last 60 log lines:" | tee -a "$LOG"
      tail -n 60 "$LOG" | tee -a "$LOG" || true
      rm -rf "$STAGING"
    fi

    if [ -n "$PMFRONT" ] && [ -n "$FPORT" ]; then
      if [ "$FRONT_BUILD_OK" = true ] && [ -f "$STAGING/BUILD_ID" ]; then
        pm2 stop "$PMFRONT" >/dev/null 2>&1 || true
        rm -rf .next
        mv "$STAGING" .next
      fi
      pm2 delete "$PMFRONT" >/dev/null 2>&1 || true
      if [ "$MOD" = "Authentication" ] || [ "$MOD" = "BabyeyiWizard" ] || [ "$MOD" = "ParentMIS" ]; then
        if [ "$MOD" = "BabyeyiWizard" ]; then
          pm2 delete academic-web >/dev/null 2>&1 || true
        fi
        echo "  [frontend] free port :${FPORT} (avoid stale next on :${FPORT} while pm2 is errored)..." | tee -a "$LOG"
        fuser -k "${FPORT}/tcp" 2>/dev/null || true
        sleep 2
      fi
      if [ "$FRONT_BUILD_OK" != true ] || [ ! -f .next/BUILD_ID ]; then
        echo "  [frontend] ERROR: next build failed — not starting $PMFRONT (see $LOG)" | tee -a "$LOG"
        exit 1
      else
        if [ "$MOD" = "Authentication" ]; then
          echo "  [frontend] restart auth-web (kill stale :${FPORT}, nginx apex, verify CSS)..." | tee -a "$LOG"
          bash "$REPO/scripts/restart-auth-web.sh" >> "$LOG" 2>&1 || {
            echo "  [frontend] ERROR: restart-auth-web failed — see $LOG" | tee -a "$LOG"
            exit 1
          }
        else
        echo "  [frontend] pm2 start next start -H 0.0.0.0 -p $FPORT → $PMFRONT" | tee -a "$LOG"
        pm2 start "npx next start -H 0.0.0.0 -p $FPORT" --name "$PMFRONT" --interpreter none \
          --cwd "$FDIR" --update-env \
          --env NEXT_IGNORE_INCORRECT_LOCKFILE=true --env HOSTNAME=0.0.0.0 >> "$LOG" 2>&1
        sleep 4
        if ! pm2 describe "$PMFRONT" 2>/dev/null | grep -qE 'status\s+│\s+online'; then
          echo "  [frontend] ERROR: $PMFRONT failed to stay online (port conflict or bad .next). Last errors:" | tee -a "$LOG"
          pm2 logs "$PMFRONT" --err --lines 35 --nostream | tee -a "$LOG" || true
          exit 1
        fi
        fi
        if [ "$MOD" = "BabyeyiWizard" ]; then
          sleep 3
          BW_HTML=$(curl -sf "http://127.0.0.1:${FPORT}/" 2>/dev/null || true)
          if echo "$BW_HTML" | grep -qi 'Academic Dashboard\|>Academic<\|Subjects.*Examinations'; then
            echo "  [frontend] ERROR: :${FPORT} is serving Academic — wrong app on Babyeyi port" | tee -a "$LOG"
            pm2 describe "$PMFRONT" | tee -a "$LOG" || true
            exit 1
          fi
          if echo "$BW_HTML" | grep -qi 'Babyeyi Wizard\|Create, manage and publish\|Missing access token\|Verifying license'; then
            echo "  [frontend] ok on :${FPORT} (BabyeyiWizard)" | tee -a "$LOG"
          else
            echo "  [frontend] WARNING: :${FPORT} content unexpected — verify manually" | tee -a "$LOG"
          fi
        fi
        if [ "$MOD" = "ParentMIS" ]; then
          sleep 3
          if curl -sf "http://127.0.0.1:${FPORT}/login" >/dev/null 2>&1; then
            echo "  [frontend] ok on :${FPORT}/login (ParentMIS)" | tee -a "$LOG"
          else
            echo "  [frontend] ERROR: :${FPORT}/login not responding — parents.shuleplus.rw will 502" | tee -a "$LOG"
            pm2 logs "$PMFRONT" --err --lines 25 --nostream | tee -a "$LOG" || true
            exit 1
          fi
        fi
      fi
    fi
  fi
else
  echo "  [frontend] $FDIR not found — skipping" | tee -a "$LOG"
fi

echo "===== DONE $MOD =====" | tee -a "$LOG"
