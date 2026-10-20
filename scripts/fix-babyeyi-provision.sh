#!/bin/bash
# Repair Babyeyi API so Super Admin "Provision" for Circular (Babyeyi) Wizard works.
# Usage (on server):
#   cd /root/apps/shuleplus/ShulePlus && bash scripts/fix-babyeyi-provision.sh
set -uo pipefail

REPO="${REPO:-/root/apps/shuleplus/ShulePlus}"
BDIR="$REPO/BabyeyiWizard/Backend"
AUTH_ENV="$REPO/Authentication/Backend/.env"

cd "$REPO" || exit 1

if [ ! -d "$BDIR" ]; then
  echo "ERROR: missing $BDIR"
  exit 1
fi

cd "$BDIR" || exit 1

# Unquote / sanitize DATABASE_URL (Prisma CLI does not strip quotes; runtime env.ts does)
if [ -f .env ]; then
  python3 - <<'PY'
from pathlib import Path
p = Path(".env")
out = []
changed = False
for line in p.read_text(encoding="utf-8", errors="replace").splitlines():
    if line.lstrip().startswith("DATABASE_URL="):
        key, _, raw = line.partition("=")
        v = raw.strip()
        for _ in range(4):
            nxt = v.strip(" \t\"'`“”‘’")
            if nxt == v:
                break
            v = nxt
        for proto in ("postgresql://", "postgres://"):
            i = v.find(proto)
            if i > 0:
                v = v[i:]
                break
        import re
        if "connection_limit=" in v:
            v = re.sub(r"connection_limit=\d+", "connection_limit=2", v, flags=re.I)
        else:
            v = f"{v}{'&' if '?' in v else '?'}connection_limit=2"
        new = f"{key}={v}"
        changed = changed or new != line.strip()
        out.append(new)
        print(f"DATABASE_URL prefix: {v[:28]}… ok={v.startswith('postgres')}")
    else:
        out.append(line)
p.write_text("\n".join(out) + "\n", encoding="utf-8")
print("DATABASE_URL sanitized" if changed else "DATABASE_URL already clean")
PY
  if grep -q '^PORT=' .env; then
    sed -i 's/^PORT=.*/PORT=4017/' .env
  else
    echo 'PORT=4017' >> .env
  fi
  # Align service key + JWT with IAM
  if [ -f "$AUTH_ENV" ]; then
    AUTH_JWT=$(grep '^JWT_ACCESS_SECRET=' "$AUTH_ENV" | head -1 | cut -d= -f2- | sed -E 's/^["'\''“”‘’]+|["'\''“”‘’]+$//g')
    AUTH_KEY=$(grep -E '^(MODULE_PROVISIONING_KEY|PLATFORM_SERVICE_KEY)=' "$AUTH_ENV" | head -1 | cut -d= -f2- | sed -E 's/^["'\''“”‘’]+|["'\''“”‘’]+$//g')
    if [ -n "$AUTH_JWT" ]; then
      grep -q '^JWT_ACCESS_SECRET=' .env && sed -i "s|^JWT_ACCESS_SECRET=.*|JWT_ACCESS_SECRET=$AUTH_JWT|" .env \
        || echo "JWT_ACCESS_SECRET=$AUTH_JWT" >> .env
    fi
    if [ -n "$AUTH_KEY" ]; then
      for k in SERVICE_API_KEY PLATFORM_SERVICE_KEY; do
        grep -q "^${k}=" .env && sed -i "s|^${k}=.*|${k}=$AUTH_KEY|" .env \
          || echo "${k}=$AUTH_KEY" >> .env
      done
    fi
    grep -q '^IAM_API_URL=' .env && sed -i 's|^IAM_API_URL=.*|IAM_API_URL=http://127.0.0.1:4001/api/v1|' .env \
      || echo 'IAM_API_URL=http://127.0.0.1:4001/api/v1' >> .env
    grep -q '^STUDENT_MANAGEMENT_API_URL=' .env \
      || echo 'STUDENT_MANAGEMENT_API_URL=http://127.0.0.1:4024/api' >> .env
    grep -q '^CORS_ORIGIN=' .env && sed -i 's|^CORS_ORIGIN=.*|CORS_ORIGIN=https://babyeyi.shuleplus.rw,https://shuleplus.rw|' .env \
      || echo 'CORS_ORIGIN=https://babyeyi.shuleplus.rw,https://shuleplus.rw' >> .env
    # QR / parent verify links must be public subdomain (not localhost:3013)
    if grep -q '^VERIFY_PUBLIC_URL=' .env; then
      sed -i 's|^VERIFY_PUBLIC_URL=.*|VERIFY_PUBLIC_URL=https://babyeyi.shuleplus.rw/verify|' .env
    else
      echo 'VERIFY_PUBLIC_URL=https://babyeyi.shuleplus.rw/verify' >> .env
    fi
  fi
else
  echo "ERROR: missing $BDIR/.env"
  exit 1
fi

# Export cleaned URL for this shell so prisma CLI cannot inherit a quoted PM2/shell value
export DATABASE_URL="$(python3 - <<'PY'
from pathlib import Path
for line in Path(".env").read_text(encoding="utf-8", errors="replace").splitlines():
    if line.lstrip().startswith("DATABASE_URL="):
        v = line.split("=", 1)[1].strip().strip("\"'`“”‘’")
        print(v)
        break
PY
)"
if [[ ! "$DATABASE_URL" =~ ^postgres ]]; then
  echo "ERROR: DATABASE_URL still invalid after sanitize: '${DATABASE_URL:0:40}…'"
  echo "Edit $BDIR/.env and set: DATABASE_URL=postgresql://user:pass@host:5432/dbname"
  exit 1
fi

echo "== stop babyeyi processes (free DB connections before migrate) =="
pm2 delete babyeyi-api babyeyi-backend >/dev/null 2>&1 || true
sleep 2

echo "== prisma generate + migrate =="
npx prisma generate || true
# Prefer migrate; always db push afterward so schema drift (new columns) is applied
npx prisma migrate deploy || true
npx prisma db push --accept-data-loss || true

echo "== build =="
if ! npm run build; then
  echo "ERROR: TypeScript build failed — babyeyi-api not started."
  exit 1
fi

echo "== pm2 restart babyeyi-api =="
pm2 delete babyeyi-api >/dev/null 2>&1 || true
if [ -f dist/server.js ]; then
  pm2 start dist/server.js --name babyeyi-api --cwd "$BDIR" --env NODE_ENV=production
else
  pm2 start "npx tsx src/server.ts" --name babyeyi-api --interpreter none --cwd "$BDIR" \
    --env NODE_ENV=production
fi
echo "DATABASE_URL limit: $(grep '^DATABASE_URL=' .env | grep -o 'connection_limit=[0-9]*' || echo '(missing)')"
pm2 save >/dev/null 2>&1 || true
sleep 2

echo "== health =="
curl -sS -m 5 http://127.0.0.1:4017/api/health || echo "HEALTH FAIL"
echo
curl -sk -m 5 https://babyeyi-api.shuleplus.rw/api/health || echo "PUBLIC HEALTH FAIL"
echo

KEY=$(grep -E '^(SERVICE_API_KEY|PLATFORM_SERVICE_KEY)=' .env | head -1 | cut -d= -f2- | sed -E 's/^["'\'']|["'\'']$//g')
echo "== dry provision probe (expect success:true or already exists) =="
curl -sS -m 15 -X POST http://127.0.0.1:4017/api/tenant/create \
  -H "Content-Type: application/json" \
  -H "x-service-key: ${KEY}" \
  -d '{"organizationId":"aa270518-c3c8-402e-a7f8-4ceb05e22e09","organizationName":"GS TEST SCHOOL 04002","organizationCode":"04002"}' \
  | head -c 400
echo
echo
echo "If probe OK → Super Admin → Module Provisioning → Provision Circular (Babyeyi) Wizard"
echo "Logs: pm2 logs babyeyi-api --lines 50 --nostream"
