#!/bin/bash
# ShulePlus — bulk build + PM2 start for all confirmed modules
# Run from anywhere; repo root is fixed below.
# Usage: bash scripts/deploy-all-modules.sh
set -uo pipefail

REPO=/root/apps/shuleplus/ShulePlus
LOG=/tmp/deploy-all.log
export REPO LOG
> "$LOG"

MODULES=(
  Authentication
  Academic TichaPortal SchoolFeesPortal Budget Payroll HR Attendance
  ActionPlanMIS ProcurementMIS InventoryMIS AssetsPortal Cafeteria Timetable
  ParentMIS NesaDashboard BabyeyiWizard KaziAvance StudentDiscpline SampleModule
  ShuleKitMIS TaskMIS SchoolUniformMIS StudentManagement Library MiniWebsite PrintCardMIS
)

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

cd "$REPO" || exit 1

for MOD in "${MODULES[@]}"; do
  bash "$REPO/scripts/redeploy-module.sh" true "$MOD" "${PM_BACK[$MOD]}" "${PM_FRONT[$MOD]}"
done

pm2 save
echo "" | tee -a "$LOG"
echo "===== ALL MODULES PROCESSED =====" | tee -a "$LOG"
echo "Check: pm2 status  and  $LOG"
