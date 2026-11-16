# CLAUDE.md

本專案的完整規則寫在 AGENTS.md（讓 Claude 與其他 AI 工具共用同一份規則），Claude Code 會透過下面這行自動載入：

@AGENTS.md

## Claude Code 專用補充

- 常用流程已做成斜線指令，放在 `.claude/commands/`：
  - `/add-region <縣市>`：新增一個地區與所有候選人（先 stub 再補完整）
  - `/add-candidate <地區id> <姓名>`：新增或補完一位候選人
  - `/fill-responses`：找出所有「尚未查找到該候選人回覆」的項目並嘗試補上
- 查資料時用 WebSearch／WebFetch，**每找到一則可用報導就先登錄到 `data/sources.json`**，再寫進候選人檔。
- 修改完一定執行 `python3 scripts/validate.py`；有 ❌ 就修到沒有為止，⚠️ 要在回報中列出。
- 回報給使用者時，列出：改了哪些檔案、新增幾筆政見／質疑／回應、還有哪些 `response: null` 待補。
- 選舉相關內容保持中立：不要替使用者判斷該投給誰，也不要在網站上加入民調或選情預測。
