#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://localhost:8088}"
ADMIN_USERNAME="${ADMIN_USERNAME:-admin}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-Admin@123456}"

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

echo "==> Health: ${BASE_URL}/api/health"
HEALTH="$(curl -fsS "${BASE_URL}/api/health")"
python3 -c 'import json,sys; d=json.loads(sys.argv[1]); assert d["database"]=="ok", d; print("    ok, version", d["version"])' "$HEALTH"

echo "==> Public stats"
STATS="$(curl -fsS "${BASE_URL}/api/stats")"
python3 -c 'import json,sys; d=json.loads(sys.argv[1]); print("    documents:",d["document_count"],"categories:",d["category_count"])' "$STATS"

echo "==> Public document search"
curl -fsS "${BASE_URL}/api/documents?page=1&page_size=5" >/dev/null || fail "document list failed"

echo "==> Unauthorized upload must return 401"
CODE="$(curl -sS -o /dev/null -w '%{http_code}' -X POST "${BASE_URL}/api/admin/documents")"
[ "$CODE" = "401" ] || fail "expected 401, got ${CODE}"

echo "==> Admin login"
TOKEN="$(curl -fsS -X POST "${BASE_URL}/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d "$(python3 -c 'import json,sys; print(json.dumps({"username":sys.argv[1],"password":sys.argv[2]}))' "$ADMIN_USERNAME" "$ADMIN_PASSWORD")" \
  | python3 -c 'import json,sys; print(json.load(sys.stdin)["access_token"])')"
[ -n "$TOKEN" ] || fail "empty token"

echo "==> Admin overview"
curl -fsS "${BASE_URL}/api/admin/overview" -H "Authorization: Bearer ${TOKEN}" >/dev/null || fail "overview failed"

echo "==> Admin categories"
curl -fsS "${BASE_URL}/api/admin/categories" -H "Authorization: Bearer ${TOKEN}" >/dev/null || fail "categories failed"

echo "PASS: smoke test completed"
