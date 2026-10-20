#!/bin/bash
# Permanently ensure Let's Encrypt cert for shuleplus.rw covers ALL module hosts
# (including materials.shuleplus.rw / materials-api.shuleplus.rw), then point nginx at it.
#
# Why SSL "gets lost":
#   generate-nginx-modules.sh always writes ssl_certificate → /etc/letsencrypt/live/shuleplus.rw/
#   If that cert's SAN list omits a new host (e.g. materials*), browsers show
#   NET::ERR_CERT_COMMON_NAME_INVALID. Expanding a *different* cert or only
#   fixing one vhost does not survive the next nginx regenerate.
#
# Usage (on server as root):
#   cd /root/apps/shuleplus/ShulePlus
#   bash scripts/ensure-shuleplus-tls.sh
set -uo pipefail

CERT_NAME="${CERT_NAME:-shuleplus.rw}"
CERT_DIR="/etc/letsencrypt/live/${CERT_NAME}"
REPO="${REPO:-/root/apps/shuleplus/ShulePlus}"

# Every host nginx module configs may serve (keep in sync with generate-nginx-modules.sh)
HOSTS=(
  shuleplus.rw
  www.shuleplus.rw
  app.shuleplus.rw
  api.shuleplus.rw
  academic.shuleplus.rw academic-api.shuleplus.rw
  teachers.shuleplus.rw teachers-api.shuleplus.rw
  ticha.shuleplus.rw ticha-api.shuleplus.rw
  fees.shuleplus.rw fees-api.shuleplus.rw
  finance.shuleplus.rw finance-api.shuleplus.rw
  budget.shuleplus.rw budget-api.shuleplus.rw
  payroll.shuleplus.rw payroll-api.shuleplus.rw
  hr.shuleplus.rw hr-api.shuleplus.rw
  attendance.shuleplus.rw attendance-api.shuleplus.rw
  action-plan.shuleplus.rw action-plan-api.shuleplus.rw
  procurement.shuleplus.rw procurement-api.shuleplus.rw
  inventory.shuleplus.rw inventory-api.shuleplus.rw
  assets.shuleplus.rw assets-api.shuleplus.rw
  canteen.shuleplus.rw canteen-api.shuleplus.rw
  timetable.shuleplus.rw timetable-api.shuleplus.rw
  website.shuleplus.rw website-api.shuleplus.rw
  parents.shuleplus.rw parents-api.shuleplus.rw
  nesa.shuleplus.rw nesa-api.shuleplus.rw
  babyeyi.shuleplus.rw babyeyi-api.shuleplus.rw
  kazi.shuleplus.rw kazi-api.shuleplus.rw
  discipline.shuleplus.rw discipline-api.shuleplus.rw
  demo.shuleplus.rw demo-api.shuleplus.rw
  materials.shuleplus.rw materials-api.shuleplus.rw
  tasks.shuleplus.rw tasks-api.shuleplus.rw
  uniform.shuleplus.rw uniform-api.shuleplus.rw
  studentmanagement.shuleplus.rw studentmanagement-api.shuleplus.rw
  library.shuleplus.rw library-api.shuleplus.rw
  printcard.shuleplus.rw printcard-api.shuleplus.rw
  notifications-api.shuleplus.rw
)

echo "===== Current cert SANs ($CERT_DIR) ====="
if [ -f "$CERT_DIR/fullchain.pem" ]; then
  openssl x509 -in "$CERT_DIR/fullchain.pem" -noout -ext subjectAltName 2>/dev/null \
    | tr ',' '\n' | sed 's/^ *//' | grep -i DNS || true
else
  echo "WARN: $CERT_DIR/fullchain.pem missing — certbot will issue/create"
fi

# Require a real A/AAAA answer — CNAME-to-NXDOMAIN fools local resolvers.
host_has_public_dns() {
  local h="$1"
  dig +short "$h" A 2>/dev/null | grep -E '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$' | grep -q . \
    || dig +short "$h" AAAA 2>/dev/null | grep -E '^[0-9a-fA-F:]+$' | grep -q .
}

# Let's Encrypt uses public DNS — local dig can lie (fees-api etc.).
host_le_dns_ok() {
  local h="$1"
  dig @8.8.8.8 +short "$h" A 2>/dev/null | grep -E '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$' | grep -q .
}

MISSING=()
RESOLVABLE=()
for h in "${HOSTS[@]}"; do
  if host_has_public_dns "$h"; then
    RESOLVABLE+=("$h")
  else
    echo "SKIP (no DNS A/AAAA): $h"
  fi
done

for h in "${RESOLVABLE[@]}"; do
  if [ -f "$CERT_DIR/fullchain.pem" ]; then
    if ! openssl x509 -in "$CERT_DIR/fullchain.pem" -noout -text 2>/dev/null | grep -q "DNS:${h}"; then
      MISSING+=("$h")
    fi
  else
    MISSING+=("$h")
  fi
done

if [ ${#RESOLVABLE[@]} -eq 0 ]; then
  echo "ERROR: no resolvable hosts — fix DNS first"
  exit 1
fi

if [ ${#MISSING[@]} -gt 0 ]; then
  echo ""
  echo "Missing from cert among resolvable hosts (${#MISSING[@]}): ${MISSING[*]}"
else
  echo "All resolvable hosts already on cert."
fi

# Expand: keep every name already on the cert, then add resolvable missing names.
# (Do NOT pass all RESOLVABLE — that re-requests NXDOMAIN leftovers like fees-api.)
DOMAIN_ARGS=()
declare -A DOMAIN_SEEN=()
add_domain_arg() {
  local h="$1"
  [ -z "$h" ] && return
  [ -n "${DOMAIN_SEEN[$h]:-}" ] && return
  DOMAIN_SEEN[$h]=1
  DOMAIN_ARGS+=(-d "$h")
}
if [ -f "$CERT_DIR/fullchain.pem" ]; then
  while read -r h; do
    add_domain_arg "$h"
  done < <(openssl x509 -in "$CERT_DIR/fullchain.pem" -noout -ext subjectAltName 2>/dev/null \
    | tr ',' '\n' | sed 's/^ *//' | sed -n 's/^DNS:\(.*\)/\1/p' || true)
fi
for h in "${MISSING[@]}"; do
  if host_le_dns_ok "$h"; then
    add_domain_arg "$h"
  else
    echo "SKIP certbot (Let's Encrypt NXDOMAIN): $h — add DNS A record at registrar first"
  fi
done

echo ""
echo "===== Expanding/issuing cert: $CERT_NAME (${#RESOLVABLE[@]} DNS-ok hosts) ====="
# --cert-name keeps ONE permanent lineage nginx always references
# --expand adds new names without creating a parallel cert
CERTBOT_EXTRA=(--non-interactive --agree-tos --expand)
if [ -n "${CERTBOT_EMAIL:-}" ]; then
  CERTBOT_EXTRA+=(--email "$CERTBOT_EMAIL")
else
  CERTBOT_EXTRA+=(--register-unsafely-without-email)
fi

run_certbot() {
  certbot certonly --nginx \
    --cert-name "$CERT_NAME" \
    "$@" \
    "${CERTBOT_EXTRA[@]}"
}

if ! run_certbot "${DOMAIN_ARGS[@]}"; then
  echo "Full expand failed — retrying with apex + currently-missing resolvable hosts only…"
  RETRY_ARGS=(-d shuleplus.rw -d www.shuleplus.rw)
  # Keep every name already on the cert that still has DNS
  if [ -f "$CERT_DIR/fullchain.pem" ]; then
    while read -r san; do
      h="${san#DNS:}"
      [ -z "$h" ] && continue
      host_has_public_dns "$h" && RETRY_ARGS+=(-d "$h")
    done < <(openssl x509 -in "$CERT_DIR/fullchain.pem" -noout -ext subjectAltName 2>/dev/null \
      | tr ',' '\n' | sed 's/^ *//' | grep -i '^DNS:' || true)
  fi
  for h in "${MISSING[@]}"; do
    host_le_dns_ok "$h" && RETRY_ARGS+=(-d "$h")
  done
  # de-dupe domain names (keep -d pairs intact)
  declare -A RETRY_SEEN=()
  DEDUPED_RETRY=()
  for ((i = 0; i < ${#RETRY_ARGS[@]}; i++)); do
    if [ "${RETRY_ARGS[$i]}" = "-d" ] && [ $((i + 1)) -lt ${#RETRY_ARGS[@]} ]; then
      h="${RETRY_ARGS[$((i + 1))]}"
      if [ -z "${RETRY_SEEN[$h]:-}" ]; then
        RETRY_SEEN[$h]=1
        DEDUPED_RETRY+=(-d "$h")
      fi
      i=$((i + 1))
    fi
  done
  RETRY_ARGS=("${DEDUPED_RETRY[@]}")
  if ! run_certbot "${RETRY_ARGS[@]}"; then
    echo "certbot failed again. Expand Uniform alone (after DNS A records exist):"
    echo "  certbot certonly --nginx --cert-name $CERT_NAME --expand --non-interactive --agree-tos \\"
    echo "    -d shuleplus.rw -d www.shuleplus.rw \\"
    echo "    -d uniform.shuleplus.rw -d uniform-api.shuleplus.rw \\"
    echo "    \$(openssl x509 -in $CERT_DIR/fullchain.pem -noout -ext subjectAltName | tr ',' '\\n' | sed -n 's/^ *DNS:/ -d /p')"
    exit 1
  fi
fi

echo ""
echo "===== Point module nginx SSL paths at $CERT_DIR (skip babyeyi.rw) ====="
# babyeyi.rw uses a separate cert lineage — never overwrite babyeyi-rw.conf
should_use_shuleplus_cert() {
  local conf="$1"
  local base
  base=$(basename "$conf")
  [ "$base" = "babyeyi-rw.conf" ] && return 1
  grep -q 'letsencrypt/live/babyeyi\.rw' "$conf" 2>/dev/null && return 1
  grep -qE 'server_name[^;]*babyeyi\.rw' "$conf" 2>/dev/null \
    && ! grep -qE 'server_name[^;]*shuleplus\.rw' "$conf" 2>/dev/null && return 1
  return 0
}
# After certbot --nginx, some vhosts may point at a different lineage; normalize.
for conf in /etc/nginx/sites-available/*.conf /etc/nginx/sites-enabled/*.conf; do
  [ -f "$conf" ] || continue
  should_use_shuleplus_cert "$conf" || continue
  if grep -q 'ssl_certificate' "$conf" 2>/dev/null; then
    sed -i "s|ssl_certificate .*;|ssl_certificate ${CERT_DIR}/fullchain.pem;|g" "$conf"
    sed -i "s|ssl_certificate_key .*;|ssl_certificate_key ${CERT_DIR}/privkey.pem;|g" "$conf"
  fi
done

# Ensure materials vhost exists (generate-nginx writes it)
if [ ! -f /etc/nginx/sites-available/materials.conf ]; then
  echo "materials.conf missing — generating nginx module configs…"
  bash "$REPO/scripts/generate-nginx-modules.sh" || true
  # re-normalize cert paths after generate (skip babyeyi.rw)
  for conf in /etc/nginx/sites-available/*.conf /etc/nginx/sites-enabled/*.conf; do
    [ -f "$conf" ] || continue
    should_use_shuleplus_cert "$conf" || continue
    if grep -q 'ssl_certificate' "$conf" 2>/dev/null; then
      sed -i "s|ssl_certificate .*;|ssl_certificate ${CERT_DIR}/fullchain.pem;|g" "$conf"
      sed -i "s|ssl_certificate_key .*;|ssl_certificate_key ${CERT_DIR}/privkey.pem;|g" "$conf"
    fi
  done
fi

echo "===== Install renew deploy hook (permanent) ====="
HOOK_DIR=/etc/letsencrypt/renewal-hooks/deploy
mkdir -p "$HOOK_DIR"
cat > "$HOOK_DIR/reload-nginx-shuleplus.sh" <<'HOOK'
#!/bin/bash
nginx -t && systemctl reload nginx
HOOK
chmod +x "$HOOK_DIR/reload-nginx-shuleplus.sh"

echo "===== nginx test + reload ====="
nginx -t
systemctl reload nginx

echo ""
echo "===== Verify materials SNI ====="
echo | openssl s_client -servername materials.shuleplus.rw -connect 127.0.0.1:443 2>/dev/null \
  | openssl x509 -noout -ext subjectAltName 2>/dev/null \
  | tr ',' '\n' | grep -i materials || echo "FAIL: materials still missing from served cert"

echo | openssl s_client -servername website.shuleplus.rw -connect 127.0.0.1:443 2>/dev/null \
  | openssl x509 -noout -ext subjectAltName 2>/dev/null \
  | tr ',' '\n' | grep -i website || echo "FAIL: website still missing from served cert"

echo | openssl s_client -servername website-api.shuleplus.rw -connect 127.0.0.1:443 2>/dev/null \
  | openssl x509 -noout -ext subjectAltName 2>/dev/null \
  | tr ',' '\n' | grep -i website-api || echo "FAIL: website-api still missing from served cert"

curl -skI https://website.shuleplus.rw/ | head -5
curl -sk https://website-api.shuleplus.rw/api/health | head -c 200; echo

echo | openssl s_client -servername materials-api.shuleplus.rw -connect 127.0.0.1:443 2>/dev/null \
  | openssl x509 -noout -ext subjectAltName 2>/dev/null \
  | tr ',' '\n' | grep -i materials || echo "FAIL: materials-api still missing from served cert"

curl -skI https://materials.shuleplus.rw/ | head -5
curl -sk https://materials-api.shuleplus.rw/api/health | head -c 200; echo

echo | openssl s_client -servername library.shuleplus.rw -connect 127.0.0.1:443 2>/dev/null \
  | openssl x509 -noout -ext subjectAltName 2>/dev/null \
  | tr ',' '\n' | grep -i library || echo "FAIL: library still missing from served cert"

echo | openssl s_client -servername library-api.shuleplus.rw -connect 127.0.0.1:443 2>/dev/null \
  | openssl x509 -noout -ext subjectAltName 2>/dev/null \
  | tr ',' '\n' | grep -i library-api || echo "FAIL: library-api still missing from served cert"

curl -skI https://library.shuleplus.rw/ | head -5
curl -sk https://library-api.shuleplus.rw/api/health | head -c 200; echo

echo | openssl s_client -servername printcard.shuleplus.rw -connect 127.0.0.1:443 2>/dev/null \
  | openssl x509 -noout -ext subjectAltName 2>/dev/null \
  | tr ',' '\n' | grep -i printcard || echo "FAIL: printcard still missing from served cert"

echo | openssl s_client -servername printcard-api.shuleplus.rw -connect 127.0.0.1:443 2>/dev/null \
  | openssl x509 -noout -ext subjectAltName 2>/dev/null \
  | tr ',' '\n' | grep -i printcard-api || echo "FAIL: printcard-api still missing from served cert"

curl -skI https://printcard.shuleplus.rw/ | head -5
curl -sk https://printcard-api.shuleplus.rw/api/health | head -c 200; echo

echo ""
echo "Done. Cert lineage: $CERT_DIR"
echo "After future nginx regenerates, re-run this script OR keep using the same CERT_NAME=shuleplus.rw."
echo "babyeyi.rw uses a separate cert — after this script, run: sudo bash scripts/ensure-babyeyi-rw-tls.sh"
echo "Renewal: certbot renew (hook reloads nginx automatically)."
