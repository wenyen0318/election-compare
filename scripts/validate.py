#!/usr/bin/env python3
"""資料檢查器：確認 data/ 內的檔案符合 AGENTS.md 的規則。
用法：python3 scripts/validate.py
AI 或人類每次新增、修改資料後都必須執行，看到「✅ 全部通過」才可以 commit。
"""
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
errors, warnings = [], []

def load(p):
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception as e:
        errors.append(f"{p.relative_to(ROOT)}：JSON 格式錯誤（{e}）")
        return None

issues = load(DATA / "issues.json") or []
regions = load(DATA / "regions.json") or []
sources = load(DATA / "sources.json") or {}
issue_ids = {i["id"] for i in issues}
region_ids = {r["id"] for r in regions}
used_sources = set()

DATE_RE = re.compile(r"^\d{4}(-\d{2}(-\d{2})?)?$")
ID_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")

for sid, s in sources.items():
    for k in ("publisher", "title", "date", "url"):
        if not s.get(k):
            errors.append(f"sources.json → {sid} 缺少 {k}")
    if s.get("url") and not s["url"].startswith("https://"):
        errors.append(f"sources.json → {sid} 的網址必須是 https://")
    if s.get("date") and not DATE_RE.match(s["date"]):
        errors.append(f"sources.json → {sid} 日期格式應為 YYYY、YYYY-MM 或 YYYY-MM-DD")

def check_sources(ids, where, required=True):
    if required and not ids:
        errors.append(f"{where}：至少需要 1 個來源")
    for sid in ids or []:
        used_sources.add(sid)
        if sid not in sources:
            errors.append(f"{where}：來源 {sid} 未登錄在 sources.json")

def check_qa(item, where, need_title=False):
    for k in ("by", "byType", "content", "sources"):
        if k not in item:
            errors.append(f"{where}：缺少 {k}")
    if need_title and not item.get("title"):
        errors.append(f"{where}：爭議需要 title")
    if item.get("byType") not in ("opponent", "public", "media"):
        errors.append(f"{where}：byType 只能是 opponent / public / media")
    check_sources(item.get("sources"), where)
    if "response" not in item:
        errors.append(f"{where}：必須有 response 欄位（查不到回應請填 null，網頁會顯示「尚未查找到該候選人回覆」）")
    elif item["response"] is not None:
        r = item["response"]
        if not r.get("content"):
            errors.append(f"{where}.response：缺少 content")
        check_sources(r.get("sources"), f"{where}.response")

seen_candidates = set()
for r in regions:
    if not ID_RE.match(r["id"]):
        errors.append(f"regions.json → {r['id']}：id 須為小寫英文與連字號")
    check_sources(r.get("sources"), f"regions.json → {r['id']}")
    for cid in r["candidates"]:
        p = DATA / "candidates" / f"{cid}.json"
        if not p.exists():
            errors.append(f"regions.json → {r['id']} 列出的 {cid} 找不到 data/candidates/{cid}.json")
            continue
        seen_candidates.add(cid)
        c = load(p)
        if c is None:
            continue
        w = f"candidates/{cid}.json"
        if c.get("id") != cid:
            errors.append(f"{w}：id 必須與檔名相同")
        if c.get("region") != r["id"]:
            errors.append(f"{w}：region 應為 {r['id']}")
        for k in ("name", "party", "status", "experience", "highlights", "policies", "controversies", "updated"):
            if k not in c:
                errors.append(f"{w}：缺少欄位 {k}")
        if c.get("status") not in ("full", "stub"):
            errors.append(f"{w}：status 只能是 full 或 stub")
        check_sources(c.get("taglineSources"), f"{w} tagline", required=bool(c.get("tagline")))
        for i, e in enumerate(c.get("experience", [])):
            check_sources(e.get("sources"), f"{w} experience[{i}]", required=False)
            if not e.get("sources"):
                warnings.append(f"{w}：經歷「{e.get('title')}」尚無來源（網頁會標示待核對）")
        for h in c.get("highlights", []):
            if h not in c.get("policies", {}):
                errors.append(f"{w}：highlights 的 {h} 沒有對應的 policies")
        if len(c.get("highlights", [])) > 3:
            errors.append(f"{w}：主打政見 highlights 最多 3 個")
        for iid, pol in c.get("policies", {}).items():
            pw = f"{w} policies.{iid}"
            if iid not in issue_ids:
                errors.append(f"{pw}：議題 {iid} 不在 issues.json")
            if not pol.get("summary") or len(pol["summary"]) > 60:
                errors.append(f"{pw}：summary 必填且不超過 60 字")
            if not pol.get("points"):
                errors.append(f"{pw}：points 至少 1 點")
            check_sources(pol.get("sources"), pw)
            for j, q in enumerate(pol.get("challenges", [])):
                check_qa(q, f"{pw}.challenges[{j}]")
        for j, q in enumerate(c.get("controversies", [])):
            check_qa(q, f"{w} controversies[{j}]", need_title=True)
        if c.get("status") == "full" and not c.get("policies"):
            errors.append(f"{w}：status=full 但沒有任何政見")

for p in (DATA / "candidates").glob("*.json"):
    if p.stem not in seen_candidates:
        warnings.append(f"candidates/{p.name} 沒有被任何 regions.json 地區引用")
for sid in sources:
    if sid not in used_sources:
        warnings.append(f"sources.json → {sid} 沒有被使用")

for w in warnings:
    print("⚠️ ", w)
for e in errors:
    print("❌", e)
if errors:
    print(f"\n共 {len(errors)} 個錯誤，請修正後再 commit。")
    sys.exit(1)
print(f"\n✅ 全部通過：{len(regions)} 個地區、{len(seen_candidates)} 位候選人、{len(sources)} 筆來源（{len(warnings)} 則提醒）")
