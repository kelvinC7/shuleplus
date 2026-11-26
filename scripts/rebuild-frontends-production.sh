#!/bin/bash
# Fast fix: rebuild ONLY frontends with production API URLs.
# Removes .env.local (Next.js otherwise bakes localhost → Access Denied).
#
# Usage:
#   cd /root/apps/shuleplus/ShulePlus
#   bash scripts/rebuild-frontends-production.sh
set -uo pipefail

REPO="${REPO:-/root/apps/shuleplus/ShulePlus}"
LOG="${LOG:-/tmp/rebuild-frontends.log}"
cd "$REPO" || exit 1
: >"$LOG"

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
)
declare -A FE_PORT=(
  [Authentication]=6100
  [TeacherPortal]=6102 [TichaPortal]=6102 [SchoolFeesPortal]=6103 [Budget]=6104
  [Payroll]=6105 [HR]=6106 [Attendance]=6107 [ActionPlanMIS]=6108
  [ProcurementMIS]=6109 [InventoryMIS]=6110 [AssetsPortal]=6111
  [Cafeteria]=6112 [Timetable]=6113 [ParentMIS]=6114 [NesaDashboard]=6115
  [BabyeyiWizard]=6116 [KaziAvance]=6117 [StudentDiscpline]=6118
  [SampleModule]=6119 [TaskMIS]=6121 [SchoolUniformMIS]=6122
)
declare -A PM_FRONT=(
  [Authentication]=auth-web
  [TeacherPortal]=ticha-web [TichaPortal]=ticha-web [SchoolFeesPortal]=fees-web [Budget]=budget-web
  [Payroll]=payroll-web [HR]=hr-web [Attendance]=attendance-web
  [ActionPlanMIS]=action-plan-web [ProcurementMIS]=procurement-web
  [InventoryMIS]=inventory-web [AssetsPortal]=assets-web [Cafeteria]=canteen-web
  [Timetable]=timetable-web [ParentMIS]=parents-web [NesaDashboard]=nesa-web
  [BabyeyiWizard]=babyeyi-web [KaziAvance]=kazi-web [StudentDiscpline]=discipline-web
  [SampleModule]=demo-web [TaskMIS]=tasks-web [SchoolUniformMIS]=uniform-web
)
declare -A FRONTEND_DIR=(
  [Academic]=Frontend_react
  [StudentManagement]=Frontend_react
)

STATIC=(Academic ShuleKitMIS StudentManagement TichaPortal TeacherPortal)

MODULES=(
  Authentication Academic TichaPortal SchoolFeesPortal Budget Payroll HR
  Attendance ActionPlanMIS ProcurementMIS InventoryMIS AssetsPortal Cafeteria
  Timetable ParentMIS NesaDashboard BabyeyiWizard KaziAvance SampleModule ShuleKitMIS
  TaskMIS SchoolUniformMIS StudentManagement
)

export NEXT_IGNORE_INCORRECT_LOCKFILE=true

is_static() {
  local m="$1"
  for s in "${STATIC[@]}"; do [ "$s" = "$m" ] && return 0; done
  return 1
}

for MOD in "${MODULES[@]}"; do
  FDIRNAME="${FRONTEND_DIR[$MOD]:-Frontend}"
  FDIR="$REPO/$MOD/$FDIRNAME"
  if [ "$MOD" = "TichaPortal" ] || [ "$MOD" = "TeacherPortal" ]; then
    FDIR="$REPO/TichaPortal"
  fi
  APIHOST="${API_HOST[$MOD]:-}"
  FPORT="${FE_PORT[$MOD]:-}"
  PMFRONT="${PM_FRONT[$MOD]:-}"

  echo "" | tee -a "$LOG"
  echo ">>> FE $MOD" | tee -a "$LOG"
  if [ ! -d "$FDIR" ]; then
    echo "  skip (no frontend)" | tee -a "$LOG"
    continue
  fi
  cd "$FDIR" || continue

  rm -f .env.local .env.development.local

  if [ -f vite.config.ts ] || [ -f vite.config.js ]; then
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
    if ! npm run build >>"$LOG" 2>&1; then
      echo "  WARN: npm run build failed — vite-only" | tee -a "$LOG"
      npx vite build >>"$LOG" 2>&1 || node ./node_modules/vite/bin/vite.js build >>"$LOG" 2>&1 || true
    fi
    [ -n "$PMFRONT" ] && pm2 delete "$PMFRONT" >/dev/null 2>&1 || true
    if [ -f dist/index.html ]; then
      echo "  static → $FDIR/dist" | tee -a "$LOG"
    else
      echo "  ERROR: dist missing" | tee -a "$LOG"
    fi
    continue
  fi

  if [ "$MOD" = "Authentication" ]; then
    cat > .env.production <<EOF
NEXT_PUBLIC_API_URL=https://shuleplus.rw/api/v1
NEXT_PUBLIC_TEACHER_PORTAL_URL=https://ticha.shuleplus.rw/login
NEXT_PUBLIC_PARENT_PORTAL_URL=https://parents.shuleplus.rw/login
NEXT_PUBLIC_SHULEKIT_URL=https://materials.shuleplus.rw
NEXT_PUBLIC_SHULEKIT_API_URL=https://materials-api.shuleplus.rw/api
NEXT_PUBLIC_ACADEMIC_API_URL=https://academic-api.shuleplus.rw/api
NEXT_PUBLIC_BABYEYI_API_URL=https://babyeyi-api.shuleplus.rw/api
EOF
  else
    cat > .env.production <<EOF
NEXT_PUBLIC_API_URL=https://${APIHOST}/api
NEXT_PUBLIC_IAM_URL=https://shuleplus.rw
NEXT_PUBLIC_IAM_API_URL=https://shuleplus.rw/api/v1
EOF
  fi
  cp -f .env.production .env.production.local

  NEXT_IGNORE_INCORRECT_LOCKFILE=true npx next build >>"$LOG" 2>&1 || {
    echo "  ERROR: next build failed" | tee -a "$LOG"
    continue
  }

  if [ ! -f .next/BUILD_ID ]; then
    echo "  ERROR: no BUILD_ID" | tee -a "$LOG"
    continue
  fi

  if [ -n "$PMFRONT" ] && [ -n "$FPORT" ]; then
    pm2 delete "$PMFRONT" >/dev/null 2>&1 || true
    pm2 start "npx next start -p $FPORT" --name "$PMFRONT" --interpreter none \
      --update-env --env NEXT_IGNORE_INCORRECT_LOCKFILE=true >>"$LOG" 2>&1
    echo "  pm2 $PMFRONT :$FPORT" | tee -a "$LOG"
  fi
done

pm2 save | tee -a "$LOG"
echo ""
echo "DONE. Verify a module bundle is not localhost:"
echo "  grep -R \"localhost:3010\" Timetable/Frontend/.next/static 2>/dev/null | head"
echo "  grep -R \"timetable-api.shuleplus.rw\" Timetable/Frontend/.next/static 2>/dev/null | head"
echo "Log: $LOG"
echo "Then re-open modules from Organization Dashboard (hard refresh)."
