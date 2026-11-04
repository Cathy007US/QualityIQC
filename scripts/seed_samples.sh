#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://localhost:8088}"
ADMIN_USERNAME="${ADMIN_USERNAME:-admin}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-Admin@123456}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

TOKEN="$(curl -fsS -X POST "${BASE_URL}/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d "$(python3 -c 'import json,sys; print(json.dumps({"username":sys.argv[1],"password":sys.argv[2]}))' "$ADMIN_USERNAME" "$ADMIN_PASSWORD")" \
  | python3 -c 'import json,sys; print(json.load(sys.stdin)["access_token"])')"

CATEGORIES="$(curl -fsS "${BASE_URL}/api/categories")"
category_id() {
  python3 -c 'import json,sys; d=json.loads(sys.argv[1]); print(next(c["id"] for c in d if c["slug"]==sys.argv[2]))' "$CATEGORIES" "$1"
}

upload() {
  local locale="$1" file="$2" title="$3" cat_slug="$4" doc_type="$5" doc_no="$6" revision="$7" tags="$8" summary="$9" effective="${10:-}"
  local cat_id code body
  cat_id="$(category_id "${cat_slug}")"
  body="$(mktemp)"
  code="$(curl -sS -o "${body}" -w '%{http_code}' -X POST "${BASE_URL}/api/admin/documents" \
    -H "Authorization: Bearer ${TOKEN}" \
    -F "file=@${ROOT}/samples/${file}" \
    -F "title=${title}" \
    -F "category_id=${cat_id}" \
    -F "doc_type=${doc_type}" \
    -F "locale=${locale}" \
    -F "document_no=${doc_no}" \
    -F "revision=${revision}" \
    -F "tags=${tags}" \
    -F "summary=${summary}" \
    -F "effective_date=${effective}")"
  if [[ "${code}" == "201" ]]; then
    python3 -c 'import json,sys; d=json.load(open(sys.argv[1])); print("  +",d["document_no"],d["title"],"blocks:",len(d["content_blocks"]))' "${body}"
  elif [[ "${code}" == "409" ]]; then
    echo "  = skip (already exists): ${doc_no}"
  else
    echo "  ! upload failed (${code}): $(cat "${body}")" >&2
    rm -f "${body}"
    return 1
  fi
  rm -f "${body}"
}

echo "==> Seeding solar PV demo documents into ${BASE_URL}"
upload "zh-CN" "PV-IQC-WI-001_单晶电池片来料检验规范.docx" "单晶电池片来料检验规范" "solar-cell" "work_instruction" "PV-IQC-WI-001" "A2" "电池片,EL,隐裂,崩边,尺寸" "规定 182mm / 210mm 单晶电池片的外观、EL、尺寸与电性能检验要求。" "2026-10-01"
upload "zh-CN" "PV-IQC-WI-004_EVA_POE封装胶膜检验指导书.docx" "EVA / POE 封装胶膜检验指导书" "encapsulation-film" "work_instruction" "PV-IQC-WI-004" "B0" "EVA,POE,交联度,剥离强度" "规范光伏封装胶膜的克重、厚度、交联度、剥离强度与存储要求。" "2026-09-20"
upload "zh-CN" "PV-IQC-WI-005_太阳能铝边框来料检验规范.docx" "太阳能铝边框来料检验规范" "aluminum-frame" "inspection_spec" "PV-IQC-WI-005" "A1" "铝边框,膜厚,盐雾,尺寸" "覆盖铝边框型材尺寸、氧化膜厚、盐雾、冲孔与角码装配检验。" "2026-08-15"
upload "zh-CN" "PV-IQC-WI-006_焊带与汇流条来料检验规范.docx" "焊带与汇流条来料检验规范" "ribbon-material" "inspection_spec" "PV-IQC-WI-006" "A0" "焊带,汇流条,剥离力,可焊性" "规定互连焊带、汇流条的尺寸、镀层、可焊性与剥离力要求。" "2026-07-01"
upload "zh-CN" "PV-IQC-SP-002_光伏玻璃AQL抽样检验计划.xlsx" "光伏玻璃 AQL 抽样检验计划" "pv-glass" "sampling_plan" "PV-IQC-SP-002" "B1" "光伏玻璃,AQL,透光率,气泡" "按批量检索光伏玻璃样本量，明确透光率、厚度与外观缺陷判定。" "2026-09-15"
upload "zh-CN" "PV-IQC-FM-003_接线盒来料检验记录表.pdf" "光伏接线盒来料检验记录表" "junction-box" "form" "PV-IQC-FM-003" "A1" "接线盒,二极管,端子拉力,IP68" "记录接线盒外观、二极管、端子拉力、绝缘耐压与批次判定结果。" "2026-10-01"
upload "en-US" "PV-IQC-WI-001_Solar_Cell_Incoming_Inspection_Specification.docx" "Mono Solar Cell Incoming Inspection Specification" "solar-cell" "work_instruction" "PV-IQC-WI-001" "A2" "Solar Cell,EL,Micro-crack,Edge Chip" "Incoming visual, EL, dimensional and electrical inspection requirements for 182 mm / 210 mm mono PERC and TOPCon cells." "2026-10-01"
upload "en-US" "PV-IQC-WI-004_EVA_POE_Encapsulation_Film_Inspection_Guideline.docx" "EVA / POE Encapsulation Film Inspection Guideline" "encapsulation-film" "work_instruction" "PV-IQC-WI-004" "B0" "EVA,POE,Gel Content,Peel Strength" "Inspection and storage requirements for EVA / POE encapsulants covering gram weight, gel content and peel strength." "2026-09-20"
upload "en-US" "PV-IQC-WI-005_Solar_Aluminum_Frame_Incoming_Inspection_Specification.docx" "Solar Aluminum Frame Incoming Inspection Specification" "aluminum-frame" "inspection_spec" "PV-IQC-WI-005" "A1" "Aluminum Frame,Coating Thickness,Salt Spray" "Incoming inspection requirements for aluminum frame profiles, anodizing thickness, salt spray and assembly." "2026-08-15"
upload "en-US" "PV-IQC-WI-006_Ribbon_and_Busbar_Incoming_Inspection_Specification.docx" "Ribbon and Busbar Incoming Inspection Specification" "ribbon-material" "inspection_spec" "PV-IQC-WI-006" "A0" "Ribbon,Busbar,Peel Force,Solderability" "Incoming inspection requirements for interconnection ribbons and busbars covering dimensions, coating and solderability." "2026-07-01"
upload "en-US" "PV-IQC-SP-002_PV_Glass_AQL_Sampling_Plan.xlsx" "PV Glass AQL Sampling and Inspection Plan" "pv-glass" "sampling_plan" "PV-IQC-SP-002" "B1" "PV Glass,AQL,Transmittance,Bubble" "AQL sampling plan for photovoltaic glass with transmittance, thickness and visual acceptance criteria." "2026-09-15"
upload "en-US" "PV-IQC-FM-003_PV_Junction_Box_Incoming_Inspection_Record.pdf" "PV Junction Box Incoming Inspection Record" "junction-box" "form" "PV-IQC-FM-003" "A1" "Junction Box,Diode,Terminal Pull Force,IP68" "Inspection record for junction box appearance, diode, terminal pull force, dielectric withstand and lot disposition." "2026-10-01"
echo "==> Done"
