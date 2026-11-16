---
description: 找出所有尚未查找到候選人回覆的質疑，嘗試補上回應
---
1. 在 data/candidates/*.json 搜尋 "response": null，列成清單（候選人、議題、質疑摘要）。
2. 逐筆用 WebSearch 查詢候選人本人或其競辦是否回應過該質疑（支持者、同黨人士的說法不算）。
3. 找到就登錄來源並填入 response；找不到就維持 null，不要猜測或代為回答。
4. 更新 updated 日期，執行 python3 scripts/validate.py，回報補上幾筆、仍缺幾筆。
