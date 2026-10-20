#!/bin/bash
# ShulePlus — generate Nginx configs for confirmed modules using the wildcard cert
# Usage: sudo bash scripts/generate-nginx-modules.sh
set -uo pipefail

REPO=/root/apps/shuleplus/ShulePlus
CERT_DIR=/etc/letsencrypt/live/shuleplus.rw
MAINT_DIR=/var/www/shuleplus/maintenance

# Served when Root Admin enables edge maintenance (flag file ON)
read -r -d '' MAINT_BLOCK <<'MAINT_EOF' || true
    if (-f MAINT_DIR_PLACEHOLDER/ON) {
        return 503;
    }
    error_page 503 @maintenance;
    location @maintenance {
        root MAINT_DIR_PLACEHOLDER;
        rewrite ^ /index.html break;
    }

MAINT_EOF
MAINT_BLOCK="${MAINT_BLOCK//MAINT_DIR_PLACEHOLDER/$MAINT_DIR}"

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
# server_name for the UI (Authentication uses platform hosts)
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

STATIC_MODULES=(Academic ShuleKitMIS StudentManagement TichaPortal TeacherPortal)
declare -A STATIC_ROOT=(
  [Academic]="$REPO/Academic/Frontend_react/dist"
  [ShuleKitMIS]="$REPO/ShuleKitMIS/Frontend/dist"
  [StudentManagement]="$REPO/StudentManagement/Frontend_react/dist"
  [TichaPortal]="$REPO/TichaPortal/dist"
  [TeacherPortal]="$REPO/TichaPortal/dist"
  [MiniWebsite]="$REPO/MiniWebsite/Frontend/dist"
)
declare -A CONF_NAME=(
  [Authentication]=app
  [Academic]=academic [TeacherPortal]=ticha [TichaPortal]=ticha [SchoolFeesPortal]=fees [Budget]=budget
  [Payroll]=payroll [HR]=hr [Attendance]=attendance [ActionPlanMIS]=action-plan
  [ProcurementMIS]=procurement [InventoryMIS]=inventory [AssetsPortal]=assets
  [Cafeteria]=canteen [Timetable]=timetable [ParentMIS]=parents
  [NesaDashboard]=nesa [BabyeyiWizard]=babyeyi [KaziAvance]=kazi
  [StudentDiscpline]=discipline [SampleModule]=demo [ShuleKitMIS]=materials
  [TaskMIS]=tasks [SchoolUniformMIS]=uniform [StudentManagement]=studentmanagement
  [Library]=library
  [MiniWebsite]=website
  [PrintCardMIS]=printcard
)

MODULES=(
  Authentication Academic TichaPortal SchoolFeesPortal Budget Payroll HR Attendance
  ActionPlanMIS ProcurementMIS InventoryMIS AssetsPortal Cafeteria Timetable
  ParentMIS NesaDashboard BabyeyiWizard KaziAvance StudentDiscpline SampleModule
  ShuleKitMIS TaskMIS SchoolUniformMIS StudentManagement Library MiniWebsite PrintCardMIS
)

is_static() {
  local mod="$1"
  for s in "${STATIC_MODULES[@]}"; do
    [ "$s" == "$mod" ] && return 0
  done
  return 1
}

for MOD in "${MODULES[@]}"; do
  FEH=${FE_HOST[$MOD]}
  APIH=${API_HOST[$MOD]}
  BPORT=${BACKEND_PORT[$MOD]}
  FPORT=${FRONTEND_PORT[$MOD]}
  NAME=${CONF_NAME[$MOD]}
  CONF="/etc/nginx/sites-available/${NAME}.conf"
  FRONT_NEXT_BLOCK=""
  EXTRA_FE=""

  if [ "$MOD" = "MiniWebsite" ]; then
    # Admin SPA (dist) + public school HTML at /<slug> served by backend :4026
    MW_ROOT="${STATIC_ROOT[MiniWebsite]}"
    FRONT_LOCATION="        root ${MW_ROOT};
        index index.html;
        try_files \$uri \$uri/ /index.html;"
    EXTRA_FE="
    location /uploads/ {
        proxy_pass http://localhost:$BPORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        client_max_body_size 12m;
    }
    location /api/ {
        proxy_pass http://localhost:$BPORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        client_max_body_size 12m;
    }
    location ~ ^/(?!home|dashboard|schools|assets|login|health|api|uploads)[a-z0-9][a-z0-9-]*\$ {
        proxy_pass http://localhost:$BPORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }"
  elif is_static "$MOD"; then
    FRONT_LOCATION="        root ${STATIC_ROOT[$MOD]};
        index index.html;
        try_files \$uri /index.html;"
  else
    FRONT_NEXT_BLOCK="    location ^~ /_next/ {
        proxy_pass http://localhost:$FPORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        add_header Cache-Control \"public, max-age=31536000, immutable\";
    }
"
    FRONT_LOCATION="        proxy_pass http://localhost:$FPORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;"
  fi

  if [ "$MOD" = "TichaPortal" ] || [ "$MOD" = "TeacherPortal" ] || [ "$MOD" = "StudentManagement" ] || [ "$MOD" = "Academic" ] || [ "$MOD" = "ParentMIS" ] || [ "$MOD" = "ActionPlanMIS" ]; then
    EXTRA_FE="
    location /uploads/ {
        proxy_pass http://localhost:$BPORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        client_max_body_size 12m;
    }
    location /api/ {
        proxy_pass http://localhost:$BPORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        client_max_body_size 12m;
    }"
  fi

  BODY_SIZE=12m
  PROXY_TIMEOUT=60s
  if [ "$MOD" = "PrintCardMIS" ]; then
    BODY_SIZE=512m
    PROXY_TIMEOUT=600s
  fi

  cat > "$CONF" <<EOF
server {
    listen 80;
    server_name ${FEH};
    return 301 https://\$host\$request_uri;
}
server {
    listen 443 ssl;
    server_name ${FEH};
    ssl_certificate $CERT_DIR/fullchain.pem;
    ssl_certificate_key $CERT_DIR/privkey.pem;
${MAINT_BLOCK}
${FRONT_NEXT_BLOCK}    location / {
${FRONT_LOCATION}
    }
${EXTRA_FE}
}

server {
    listen 80;
    server_name ${APIH};
    return 301 https://\$host\$request_uri;
}
server {
    listen 443 ssl;
    server_name ${APIH};
    ssl_certificate $CERT_DIR/fullchain.pem;
    ssl_certificate_key $CERT_DIR/privkey.pem;
${MAINT_BLOCK}
    location / {
        proxy_pass http://localhost:$BPORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        client_max_body_size ${BODY_SIZE};
        proxy_read_timeout ${PROXY_TIMEOUT};
        proxy_send_timeout ${PROXY_TIMEOUT};
        proxy_connect_timeout 60s;
    }
}
EOF

  ln -sf "$CONF" "/etc/nginx/sites-enabled/${NAME}.conf"
  echo "Wrote $CONF ($FEH, $APIH)"
done

# Old Teacher Portal hosts → TichaPortal
cat > /etc/nginx/sites-available/teachers-redirect.conf <<EOF
server {
    listen 80;
    server_name teachers.shuleplus.rw teachers-api.shuleplus.rw;
    return 301 https://\$host\$request_uri;
}
server {
    listen 443 ssl;
    server_name teachers.shuleplus.rw;
    ssl_certificate $CERT_DIR/fullchain.pem;
    ssl_certificate_key $CERT_DIR/privkey.pem;
    return 301 https://ticha.shuleplus.rw\$request_uri;
}
server {
    listen 443 ssl;
    server_name teachers-api.shuleplus.rw;
    ssl_certificate $CERT_DIR/fullchain.pem;
    ssl_certificate_key $CERT_DIR/privkey.pem;
    return 301 https://ticha-api.shuleplus.rw\$request_uri;
}
EOF
ln -sf /etc/nginx/sites-available/teachers-redirect.conf /etc/nginx/sites-enabled/teachers-redirect.conf
# Drop the old teachers vhost if it still points at Next.js TeacherPortal
rm -f /etc/nginx/sites-enabled/teachers.conf

echo ""
echo "Testing Nginx config..."
nginx -t && systemctl reload nginx && echo "Nginx reloaded successfully."

echo ""
echo "NOTE: All vhosts use $CERT_DIR. If a new host (e.g. materials*) is missing from that"
echo "cert SAN, browsers show ERR_CERT_COMMON_NAME_INVALID. Fix permanently with:"
echo "  bash $REPO/scripts/ensure-shuleplus-tls.sh"
