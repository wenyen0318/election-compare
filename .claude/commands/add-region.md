---
description: 新增一個縣市地區與其所有候選人
argument-hint: <縣市名稱，例如 新竹縣>
---
請依照 AGENTS.md 第 8 節「新增一個地區」為「$ARGUMENTS」建立資料：

1. 用 WebSearch 查詢中選會或主流媒體的「$ARGUMENTS 長候選人登記名單」，把來源登錄到 data/sources.json。
2. 依 templates/region.template.json 在 data/regions.json 新增地區，列出**所有**登記者。
3. 為每位候選人建立 stub 檔（templates/candidate.template.json）。
4. 依登記名單順序，逐一為每位候選人查詢：經歷、各議題政見、對手或民眾的質疑、候選人的回應；查到就改成 status: "full"。每位候選人花相同的查找力度。
5. 查不到回應的質疑一律 response: null。
6. 執行 python3 scripts/validate.py 直到通過，最後回報新增的候選人、政見數量與待補回應清單。
