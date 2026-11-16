# AGENTS.md — 「選前看清楚」候選人政見比較網站

> 給 AI 協作者（Claude Code、Codex、Cursor…）與人類維護者的專案規則。
> **動手前請完整讀完本檔。** 本檔與 `CLAUDE.md` 衝突時，以本檔為準。

---

## 1. 專案目的

幫助選民在投票前，**用同一套格式**比較不同候選人的：

1. 個人經歷
2. 主打政見（最多 3 個議題）
3. 各議題政見（育兒、長照、交通、經濟、觀光、教育、都更、綠化、治安）
4. 對手、民眾或媒體提出的質疑，以及**候選人本人的回應**

網站的核心價值是**可查證、可比較、不偏袒**。任何修改都不能犧牲這三點。

## 2. 網站結構（使用者動線）

```
index.html                      首頁：選擇地區
 └─ region.html?r=<地區id>      地區頁：候選人的臉＋議題方塊
     ├─ candidate.html?id=<候選人id>   候選人頁：經歷、主打政見、各議題政見、爭議與回應
     └─ issue.html?r=<地區id>&i=<議題id>  議題比較頁：同地區所有候選人並排
```

- 地區頁點**臉** → 候選人頁；點**議題** → 議題比較頁。
- 候選人頁每張政見卡都有「和其他候選人比較」連結 → 議題比較頁，並用 `#候選人id` 捲到該欄。
- 議題比較頁每一欄固定順序：**政見摘要 → 詳細說明 → 資料來源整理 → 質疑與回應**。

## 3. 檔案結構與命名

```
/
├── AGENTS.md / CLAUDE.md        專案規則（本檔）
├── README.md                    給人看的專案介紹
├── index.html  region.html  candidate.html  issue.html   頁面骨架（不放內容）
├── assets/
│   ├── style.css                唯一的樣式表
│   ├── photos/<候選人id>.jpg     候選人照片（見 7.2）
│   └── app.js                   唯一的程式，讀 data/ 後渲染
├── data/
│   ├── regions.json             地區清單（每個地區列出候選人 id）
│   ├── issues.json              議題清單（id、名稱、icon、說明）
│   ├── sources.json             來源登錄表（所有引用都要先登錄在這裡）
│   ├── site.json                全站設定（標語、投票開始／結束時間）
│   └── candidates/<候選人id>.json  每位候選人一個檔案
├── templates/
│   ├── candidate.template.json  新增候選人時複製這份
│   └── region.template.json     新增地區時參考這份
├── scripts/validate.py          資料檢查器
└── .claude/commands/            常用工作流程（新增地區、新增候選人、補回應）
```

命名規則：

| 東西 | 規則 | 例子 |
|---|---|---|
| 地區 id | 小寫英文＋連字號 | `taipei`、`new-taipei`、`hsinchu-city`、`hsinchu-county`（目前收錄這 4 個） |
| 候選人 id | 姓名常用英文拼法，小寫＋連字號 | `chiang-wan-an`、`puma-shen` |
| 候選人檔名 | `data/candidates/<候選人id>.json`，**檔名必須等於 id** | `kao-hung-an.json` |
| 來源 id | `<媒體簡稱>-<文章編號或主題>` | `pts-834975`、`udn-9390741`、`cna-202609160107` |
| 議題 id | 只能用 `issues.json` 已有的 9 個 | `childcare`、`renewal` |

## 4. 黃金規則：內容只放在 data/

- **新增縣市、候選人、政見、爭議時，只改 `data/`，不改 HTML、CSS、JS。**
- HTML 只放骨架與 `id` 容器；所有文字內容都由 `assets/app.js` 從 JSON 渲染。
- 只有在「所有頁面都需要的新功能」時才改 `app.js` / `style.css`，且要同步更新本檔第 2 節或第 8 節。

## 5. 資料格式（Schema）

### 5.1 `sources.json`（先登錄來源，再引用）

```json
"pts-834975": {
  "publisher": "公視新聞網",
  "title": "報導標題（原文標題，可稍微縮短）",
  "date": "2026-11-09",
  "url": "https://..."
}
```

### 5.2 候選人檔 `data/candidates/<id>.json`

```json
{
  "id": "chiang-wan-an",
  "name": "蔣萬安",
  "region": "taipei",
  "party": "中國國民黨",            // 無黨籍寫「無黨籍」，政黨表態支持可加括號說明
  "ballotNo": null,                // 中選會公告號次；未公告填 null
  "incumbent": true,               // 是否為現任
  "status": "full",                // full＝資料完整；stub＝只有登記資訊、政見整理中
  "photo": null,                   // 見第 7 節「照片規則」
  "tagline": "一句話定位（必須有來源）",
  "taglineSources": ["pts-834975"],
  "experience": [
    { "period": "2022–", "title": "臺北市長（現任）", "sources": ["pts-834975"] }
  ],
  "highlights": ["economy", "renewal"],   // 主打政見，最多 3 個，必須在 policies 裡
  "policies": {
    "<議題id>": {
      "summary": "一句話摘要，≤ 60 字",
      "points": ["具體做法 1", "具體做法 2"],
      "sources": ["來源id"],
      "challenges": [ /* 見 5.3 */ ]
    }
  },
  "controversies": [ /* 見 5.3，另需 title */ ],
  "updated": "2026-11-16"
}
```

### 5.3 質疑／爭議與回應

```json
{
  "title": "只有 controversies 需要",
  "by": "沈伯洋（對手）",           // 誰提出：姓名＋身分
  "byType": "opponent",            // opponent 對手｜public 民眾/外界｜media 媒體/司法
  "date": "2026-10-31",
  "content": "質疑內容（改寫，不直接長段引用）",
  "sources": ["pts-debate-tpe"],
  "response": {                    // ⚠️ 查不到回應 → 填 null
    "date": "2026-10-31",
    "content": "候選人本人或其競辦的回應",
    "sources": ["pts-debate-tpe"]
  }
}
```

- `response: null` 時，網頁**自動**顯示「**尚未查找到該候選人回覆**」。不要自己寫這句字串進資料。
- 回應只算「候選人本人或其競選辦公室／發言人」的說法；支持者、同黨人士的說法不算回應。
- 若候選人有回話但沒回答到重點，照實寫出他說了什麼，並在句尾補「（未直接回應○○）」。

## 6. 內容撰寫規則（中立與查證）

1. **每一句事實都要有來源**。沒有來源的政見、質疑、回應一律不放。經歷暫無來源時可以放，但網頁會標「待核對來源」，之後要用中選會選舉公報補上。
2. **只寫「誰說了什麼」**，不寫「誰比較好」。禁止評價性形容詞（如「完美」「荒謬」「空泛」），除非是引述某人的說法並標明是誰說的。
3. **對等處理**：每位候選人用一樣的欄位、一樣的查找力度。若某人某議題查不到，就留空，網頁會顯示「尚未查找到此候選人在本議題的具體政見」，**不要為了版面平衡而硬湊**。
4. **用自己的話改寫**，不整段複製報導；直接引用時加「」且少於 15 字。
5. **數字照來源寫**，不自行換算、加總或推估。
6. **優先來源順序**：中選會公報／候選人官方網站與臉書 ＞ 公辦政見發表會、辯論會紀錄 ＞ 中央社、公視等通訊社與公共媒體 ＞ 其他主流媒體。避免只用單一立場媒體；PTT、Dcard、內容農場不可當來源。
7. **司法案件**用 `byType: "media"`，寫清楚目前審級與結果（例如「二審改判…，可上訴」），不可寫成已定讞。
8. 每次修改候選人檔，都要把 `updated` 改成當天日期。

## 7. 視覺規範

**整體風格：活潑、清新、鼓勵投票。**

- 共用頁（首頁、地區頁、議題比較頁）使用站台色：紫羅蘭 `--brand #6c5ce7`＋薄荷 `--mint #2ec4a6`＋陽光黃 `--sun`，淡薄荷底色＋柔和光暈。站台色**不得**改成任何政黨或候選人的顏色。
- 字體：標題用圓體（`--round`），內文用 Noto Sans TC；卡片大圓角（22px）、按鈕膠囊形。
- 首頁封面：標語與投票時間讀取 `data/site.json`（`slogan`、`voteStart`、`voteEnd`），倒數計時由 `app.js` 的 `startCountdown()` 處理：投票前倒數、投票中提示、結束後致謝。換一次選舉只改 `site.json`。

### 7.1 候選人主題色 `theme`

每位候選人檔都要有：

```json
"theme": {
  "primary": "#F47A20",          // 主色（6 碼 HEX）
  "secondary": "#FFC46B",        // 輔色（漸層用）
  "basis": "campaign",           // campaign＝競選主視覺色｜custom＝網站作者指定｜party＝暫用政黨色｜neutral＝中性色
  "note": "競選主視覺以橘色為主",   // 顯示在候選人頁的說明
  "sources": ["cna-202608040069"], // basis 為 campaign 時必填
  "pattern": "waves"              // 候選人頁背景圖樣：null｜stars 星星｜waves 洋流｜encore 安可
}
```

- 優先使用**競選主視覺色**（需有報導來源）；查不到時才用政黨代表色並寫明「暫用政黨代表色」；無黨籍且查不到用中性灰 `#5B6B82`。
- 主題色只用在：候選人頁（封面漸層、標題圓點、政見卡上緣、時間軸）、地區頁候選人卡上緣色帶、議題比較頁該候選人欄位上緣。
- 不要用主題色改變任何文字內容或排序。
- `basis: "custom"` 代表由網站作者指定（例如蘇巧慧的 `#FF69B4`），`note` 必須寫明「網站作者指定」，不可假裝是競選官方色。
- `pattern` 圖樣由 `app.js` 的 `PATTERNS` 以主題色即時產生 SVG（整頁背景＋封面各一層）。目前有：`stars`（蘇巧慧）、`waves`（沈伯洋「洋流」）、`encore`（蔣萬安「台北安可」）。新增圖樣時：在 `PATTERNS` 加一個函式 → 在 `scripts/validate.py` 的允許清單加上名稱 → 更新本段。圖樣要淡（整頁不透明度約 0.1），不能影響閱讀。

### 7.2 照片 `photo`

- `photo` 填 `assets/photos/<候選人id>.jpg`，照片以**中選會選舉公報照片**或候選人官方提供的公開形象照為限，正方形、至少 400×400。
- 照片檔不存在時，網頁會自動退回「姓氏頭像」，不會出現破圖。
- 同一地區的主要候選人（status: full）應一致：一位有照片，其他人也要補上。

### 7.3 其他

- 排序：中選會公布號次後依 `ballotNo`；未公布時「資料完整者在前，再依姓名筆畫」，由 `app.js` 的 `sortCandidates()` 處理，**不要手動排**。
- 響應式：手機寬度下議題比較改為單欄，不要新增橫向捲動。

## 8. 常見任務 SOP

### 新增一個地區（例：新竹縣）
1. 在 `data/regions.json` 加一筆（參考 `templates/region.template.json`），列出所有已登記候選人的 id。
2. 每位候選人複製 `templates/candidate.template.json` 到 `data/candidates/<id>.json`。
3. 先建立所有人的 `stub`（姓名、政黨、登記來源），**再**逐一補成 `full`，避免只做某一陣營。
4. 新來源先寫入 `data/sources.json`。
5. 執行 `python3 scripts/validate.py`，通過後本機預覽（見第 9 節），再 commit。

### 新增／更新某位候選人的政見
1. 找到來源 → 登錄 `sources.json` → 在 `policies.<議題id>` 新增或修改。
2. 若這個政見有人質疑，同時查該候選人是否回應；沒有就 `response: null`。

### 補上之前「尚未查找到回覆」的回應
1. 搜尋 `"response": null` 找出待補項目。
2. 找到回應來源後填入 `response`，更新 `updated`。

### 新增議題
只有在使用者明確要求時才做。於 `issues.json` 新增 `{id, name, icon, desc}`；不需改程式。

## 9. 開發與部署

- 純靜態網站，不使用框架與建置工具，不引入外部 JS 函式庫。
- 本機預覽：`python3 -m http.server 8000` 後開 `http://localhost:8000`（直接雙擊 HTML 會因 fetch 限制讀不到 JSON）。
- 部署：推送到 GitHub `main` 分支，GitHub Pages 設定為「Deploy from branch → main / root」。
- Commit 訊息格式：`data(<地區>): <做了什麼>`、`feat: …`、`style: …`、`docs: …`。

## 10. AI 完成任務前的檢查清單

- [ ] `python3 scripts/validate.py` 顯示 ✅ 全部通過
- [ ] 沒有改到不該改的 HTML/CSS/JS（只動 data/ 的任務）
- [ ] 每位新候選人都有 `status`；`full` 至少 1 個議題政見
- [ ] 所有質疑都有 `response` 欄位（有回應或 `null`）
- [ ] 沒有評價性用語；共用頁沒有使用政黨或候選人色；每位候選人都有 `theme`
- [ ] 本機預覽首頁 → 地區 → 候選人 → 議題比較，四頁都正常
