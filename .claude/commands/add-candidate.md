---
description: 新增或補完一位候選人的資料
argument-hint: <地區id> <候選人姓名>
---
目標：$ARGUMENTS

1. 若 data/candidates/ 已有此人，讀取後補完；否則用 templates/candidate.template.json 建立，並加到 data/regions.json 對應地區。
2. 依 AGENTS.md 第 5、6 節，補齊：經歷、最多 3 個主打政見（highlights）、9 個議題中查得到的政見、質疑與回應、爭議。
3. 每個新來源先登錄到 data/sources.json。
4. 執行 python3 scripts/validate.py，回報新增內容與仍為 null 的回應。
