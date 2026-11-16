/* 選前看清楚 — 共用程式。
 * 所有頁面都是「資料驅動」：內容只來自 data/*.json，HTML 只放骨架。
 * 新增候選人／縣市／議題時「不需要改這支程式」，請照 AGENTS.md 修改 data/。
 */
const NO_RESPONSE = "尚未查找到該候選人回覆";
const NO_POLICY = "尚未查找到此候選人在本議題的具體政見";
const NEUTRAL_THEME = { primary: "#8a94a8", secondary: "#c9d3e0" };

const $ = (sel) => document.querySelector(sel);
const qs = (k) => new URLSearchParams(location.search).get(k);
const esc = (s = "") => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const cache = {};
async function getJSON(path) {
  if (!cache[path]) cache[path] = fetch(path).then((r) => { if (!r.ok) throw new Error(path); return r.json(); });
  return cache[path];
}
const loadIssues = () => getJSON("data/issues.json");
const loadRegions = () => getJSON("data/regions.json");
const loadSources = () => getJSON("data/sources.json");
const loadSite = () => getJSON("data/site.json");
const loadCandidate = (id) => getJSON(`data/candidates/${id}.json`);

/* 排序：有號次依號次；否則資料完整者在前，再依姓名筆畫（避免偏好任何陣營） */
function sortCandidates(list) {
  return [...list].sort((a, b) => {
    if (a.ballotNo && b.ballotNo) return a.ballotNo - b.ballotNo;
    if ((a.status === "full") !== (b.status === "full")) return a.status === "full" ? -1 : 1;
    return a.name.localeCompare(b.name, "zh-Hant-TW-u-co-stroke");
  });
}
async function loadRegionCandidates(region) {
  return sortCandidates(await Promise.all(region.candidates.map(loadCandidate)));
}

/* 候選人頁背景圖樣：依 theme.pattern 產生 SVG，顏色取自候選人主題色。新增圖樣時在這裡加一個函式。 */
const svgURI = (svg) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
const PATTERNS = {
  stars: (c, op) => `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><g fill='${c}' opacity='${op}'><text x='12' y='34' font-size='26'>★</text><text x='96' y='22' font-size='14'>★</text><text x='118' y='92' font-size='30'>★</text><text x='40' y='118' font-size='16'>✦</text><text x='70' y='70' font-size='12'>✦</text><text x='10' y='150' font-size='20'>★</text><text x='130' y='150' font-size='12'>✦</text></g></svg>`,
  waves: (c, op) => `<svg xmlns='http://www.w3.org/2000/svg' width='240' height='80'><g fill='none' stroke='${c}' stroke-width='3' stroke-linecap='round' opacity='${op}'><path d='M0 20 Q30 4 60 20 T120 20 T180 20 T240 20'/><path d='M0 46 Q30 30 60 46 T120 46 T180 46 T240 46' stroke-width='2'/><path d='M-30 70 Q0 56 30 70 T90 70 T150 70 T210 70 T270 70' stroke-width='1.5'/></g></svg>`,
  encore: (c, op) => `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='150'><g fill='${c}' opacity='${op}' font-family='sans-serif' font-weight='900'><text x='10' y='50' font-size='34' transform='rotate(-10 10 50)'>安可！</text><text x='160' y='120' font-size='24' transform='rotate(-10 160 120)'>ENCORE</text><text x='200' y='40' font-size='18'>👏</text><text x='40' y='130' font-size='18'>✨</text></g></svg>`,
};
function applyPattern(c) {
  const t = theme(c), make = PATTERNS[t.pattern];
  if (!make) return;
  document.body.style.backgroundImage = `${svgURI(make(t.primary, 0.10))}, radial-gradient(circle at 8% 0%, ${t.secondary}55 0, transparent 35%)`;
  document.body.style.backgroundAttachment = "fixed";
  $("#profile").style.setProperty("--pattern", svgURI(make("#ffffff", 0.16)));
  $("#profile").classList.add("has-pattern");
}
const theme = (c) => c.theme || NEUTRAL_THEME;
const themeVars = (c) => `--a1:${theme(c).primary};--a2:${theme(c).secondary}`;
/* 有照片就顯示照片；照片檔不存在時自動退回姓氏頭像 */
function avatar(c, cls = "") {
  const initial = esc(c.name.slice(0, 1));
  const inner = c.photo ? `<img src="${esc(c.photo)}" alt="${esc(c.name)}" onerror="this.replaceWith(document.createTextNode('${initial}'))">` : initial;
  return `<span class="avatar ${cls}" style="${themeVars(c)}" aria-label="${esc(c.name)}">${inner}</span>`;
}

function srcList(ids, sources) {
  if (!ids || !ids.length) return "";
  return ids.map((id) => {
    const s = sources[id];
    if (!s) return `<span class="src">[來源 ${esc(id)} 未登錄]</span>`;
    return `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.publisher)}｜${esc(s.title)}（${esc(s.date)}）</a>`;
  });
}
function srcInline(ids, sources) {
  const l = srcList(ids, sources);
  return l ? `<div class="src">來源：${l.join("；")}</div>` : "";
}
function srcDetails(ids, sources, label = "資料來源整理") {
  const l = srcList(ids, sources);
  return l ? `<details class="sources"><summary>📑 ${label}（${l.length}）</summary><ol>${l.map((x) => `<li>${x}</li>`).join("")}</ol></details>` : "";
}

const BY_TYPE = { opponent: "對手質疑", public: "民眾／外界質疑", media: "媒體／司法" };
function qaBlock(item, sources, candidateName) {
  const resp = item.response
    ? `<div class="a"><span class="who">${esc(candidateName)} 的回應${item.response.date ? `（${esc(item.response.date)}）` : ""}</span>${esc(item.response.content)}${srcInline(item.response.sources, sources)}</div>`
    : `<div class="a none">${esc(candidateName)}：${NO_RESPONSE}</div>`;
  return `<div class="q"><span class="who">${BY_TYPE[item.byType] || "質疑"}｜${esc(item.by)}${item.date ? `（${esc(item.date)}）` : ""}</span>${esc(item.content)}${srcInline(item.sources, sources)}</div>${resp}`;
}

function issueById(issues, id) { return issues.find((i) => i.id === id) || { id, name: id, icon: "•" }; }

/* ---------- 頁面：首頁 ---------- */
function startCountdown(site) {
  const box = $("#countdown"), start = new Date(site.voteStart), end = new Date(site.voteEnd);
  const tick = () => {
    const now = new Date();
    if (now >= end) { box.innerHTML = `<div class="msg">🗳️ 投票已結束，感謝每一位投下選票的你！</div>`; return; }
    if (now >= start) { box.innerHTML = `<div class="msg">🗳️ 投票進行中！16:00 前帶著身分證、印章、投票通知單去投票！</div>`; return; }
    let t = Math.floor((start - now) / 1000);
    const d = Math.floor(t / 86400); t %= 86400; const h = Math.floor(t / 3600); t %= 3600; const m = Math.floor(t / 60), sec = t % 60;
    box.innerHTML = [[d, "天"], [h, "時"], [m, "分"], [sec, "秒"]].map(([n, l]) => `<div class="unit"><div class="num">${String(n).padStart(2, "0")}</div><div class="lbl">${l}</div></div>`).join("");
  };
  tick(); setInterval(tick, 1000);
}

async function pageHome() {
  const site = await loadSite();
  $("#slogan").textContent = site.slogan;
  $("#slogan-sub").textContent = `（${site.sloganNote}）距離 ${site.electionName} 投票開始還有`;
  startCountdown(site);
  const regions = await loadRegions();
  const html = await Promise.all(regions.map(async (r) => {
    const cs = await loadRegionCandidates(r);
    return `<a class="card region-card" href="region.html?r=${r.id}">
      <div class="meta">${esc(r.election)}</div>
      <h3>${esc(r.office)}</h3>
      <div class="meta">${esc(r.intro)}｜${cs.length} 位候選人</div>
      <div class="faces-mini">${cs.map((c) => avatar(c)).join("")}</div>
      <span class="go">看候選人 →</span>
    </a>`;
  }));
  $("#regions").innerHTML = html.join("");
}

/* ---------- 頁面：地區（候選人臉 + 議題） ---------- */
async function pageRegion() {
  const [regions, issues, sources] = await Promise.all([loadRegions(), loadIssues(), loadSources()]);
  const r = regions.find((x) => x.id === qs("r")) || regions[0];
  document.title = `${r.office}候選人｜選前看清楚`;
  const cs = await loadRegionCandidates(r);
  $("#crumbs").innerHTML = `<a href="index.html">首頁</a> › ${esc(r.name)}`;
  $("#title").textContent = `${r.office}候選人`;
  $("#lead").innerHTML = `${esc(r.intro)}點候選人的臉看個人經歷、主打政見與爭議；點下方議題，直接比較所有候選人在同一議題的政策。${srcInline(r.sources, sources)}`;
  $("#faces").innerHTML = cs.map((c) => `
    <a class="card face-card" style="${themeVars(c)}" href="candidate.html?id=${c.id}">
      <div class="band"></div>${avatar(c)}
      <h3>${esc(c.name)}</h3>
      <div><span class="badge">${esc(c.party)}</span>${c.incumbent ? '<span class="badge inc">現任</span>' : ""}${c.status === "stub" ? '<span class="badge stub">資料整理中</span>' : ""}</div>
      <div class="tagline">${esc(c.tagline || "")}</div>
      <div class="chips">${(c.highlights || []).map((id) => { const i = issueById(issues, id); return `<span class="chip">${i.icon} ${esc(i.name)}</span>`; }).join("")}</div>
    </a>`).join("");
  $("#issues").innerHTML = issues.map((i) => {
    const n = cs.filter((c) => c.policies && c.policies[i.id]).length;
    return `<a class="issue-tile" href="issue.html?r=${r.id}&i=${i.id}"><span class="ic">${i.icon}</span><b>${esc(i.name)}</b><small>${n} 位候選人有提出政見</small></a>`;
  }).join("");
}

/* ---------- 頁面：候選人 ---------- */
async function pageCandidate() {
  const [regions, issues, sources] = await Promise.all([loadRegions(), loadIssues(), loadSources()]);
  const c = await loadCandidate(qs("id"));
  const r = regions.find((x) => x.id === c.region);
  document.title = `${c.name}｜${r.office}候選人｜選前看清楚`;
  const t = theme(c);
  document.documentElement.style.setProperty("--c1", t.primary);
  document.documentElement.style.setProperty("--c2", t.secondary);
  document.body.classList.add("page-cand");
  applyPattern(c);
  $("#crumbs").innerHTML = `<a href="index.html">首頁</a> › <a href="region.html?r=${r.id}">${esc(r.name)}</a> › ${esc(c.name)}`;
  $("#profile").innerHTML = `${avatar(c, "lg")}<div>
    <div class="meta">${esc(r.office)}候選人</div><h1>${esc(c.name)}</h1>
    <span class="badge">${esc(c.party)}</span>${c.incumbent ? '<span class="badge inc">現任</span>' : ""}
    <p class="lead">${esc(c.tagline || "")}</p>${srcInline(c.taglineSources, sources)}
    ${c.theme ? `<div class="theme-note">🎨 頁面主題色：${esc(c.theme.note)}${srcList(c.theme.sources, sources).length ? "（" + srcList(c.theme.sources, sources).join("；") + "）" : ""}</div>` : ""}</div>`;

  $("#experience").innerHTML = c.experience.length
    ? `<ul class="timeline">${c.experience.map((e) => `<li><span class="period">${esc(e.period || "")}</span>${esc(e.title)}${e.sources.length ? "" : '<span class="unverified">待核對來源</span>'}${srcInline(e.sources, sources)}</li>`).join("")}</ul>`
    : `<p class="empty">經歷資料整理中。</p>`;

  const ordered = [...(c.highlights || []), ...issues.map((i) => i.id).filter((id) => !(c.highlights || []).includes(id))];
  const cards = ordered.filter((id) => c.policies[id]).map((id) => {
    const i = issueById(issues, id), p = c.policies[id], hi = (c.highlights || []).includes(id);
    return `<div class="card policy-card"><h3>${i.icon} ${esc(i.name)}${hi ? '<span class="star">主打</span>' : ""}</h3>
      <p class="summary">${esc(p.summary)}</p><ul>${p.points.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
      ${p.challenges.length ? `<div class="meta">💬 ${p.challenges.length} 則質疑與回應</div>` : ""}
      <a class="compare-link" href="issue.html?r=${r.id}&i=${id}#${c.id}">和其他候選人比較「${esc(i.name)}」→</a></div>`;
  });
  $("#policies").innerHTML = cards.length ? cards.join("") : `<p class="empty">${NO_POLICY}（各議題）。</p>`;
  const missing = issues.filter((i) => !c.policies[i.id]);
  $("#missing").innerHTML = missing.length && cards.length ? `尚未查找到政見的議題：${missing.map((i) => `<a href="issue.html?r=${r.id}&i=${i.id}">${esc(i.name)}</a>`).join("、")}` : "";

  $("#controversies").innerHTML = c.controversies.length
    ? c.controversies.map((x) => `<div class="card controversy"><h3>${esc(x.title)}</h3>${qaBlock(x, sources, c.name)}</div>`).join("")
    : `<p class="empty">目前尚未整理到相關爭議（不代表沒有，歡迎提供有來源的資料）。</p>`;
}

/* ---------- 頁面：議題比較 ---------- */
async function pageIssue() {
  const [regions, issues, sources] = await Promise.all([loadRegions(), loadIssues(), loadSources()]);
  const r = regions.find((x) => x.id === qs("r")) || regions[0];
  const issue = issueById(issues, qs("i") || issues[0].id);
  document.title = `${issue.name}政見比較｜${r.office}｜選前看清楚`;
  const cs = await loadRegionCandidates(r);
  $("#crumbs").innerHTML = `<a href="index.html">首頁</a> › <a href="region.html?r=${r.id}">${esc(r.name)}</a> › ${esc(issue.name)}`;
  $("#title").textContent = `${issue.icon} ${issue.name}：${r.office}候選人政見比較`;
  $("#lead").textContent = `${issue.desc}。每欄依「政見摘要 → 詳細說明 → 資料來源 → 質疑與回應」排列。`;
  $("#tabs").innerHTML = issues.map((i) => `<a class="${i.id === issue.id ? "on" : ""}" href="issue.html?r=${r.id}&i=${i.id}">${i.icon} ${esc(i.name)}</a>`).join("");
  const stubs = cs.filter((c) => c.status === "stub");
  const stubCard = stubs.length ? `<div class="card"><b>其他登記參選人</b><p class="meta">以下候選人政見資料整理中，點姓名可看個人頁。</p>
    <div class="chips" style="justify-content:flex-start">${stubs.map((c) => `<a class="chip" href="candidate.html?id=${c.id}">${esc(c.name)}（${esc(c.party)}）</a>`).join("")}</div></div>` : "";
  $("#compare").innerHTML = cs.filter((c) => c.status !== "stub").map((c) => {
    const p = c.policies[issue.id];
    const head = `<a class="col-head" href="candidate.html?id=${c.id}">${avatar(c)}<div><b>${esc(c.name)}</b><div class="meta">${esc(c.party)}${c.incumbent ? "｜現任" : ""}</div></div></a>`;
    if (!p) return `<div class="card" style="${themeVars(c)}" id="${c.id}">${head}<p class="empty">${c.status === "stub" ? "政見資料整理中。" : NO_POLICY + "。"}</p></div>`;
    return `<div class="card" style="${themeVars(c)}" id="${c.id}">${head}
      <p class="summary">${esc(p.summary)}</p><ul>${p.points.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
      ${srcDetails(p.sources, sources)}
      <div class="qa"><h4>💬 質疑與回應</h4>${p.challenges.length ? p.challenges.map((q) => qaBlock(q, sources, c.name)).join("") : '<p class="empty">目前尚未整理到針對此政見的質疑。</p>'}</div>
    </div>`;
  }).join("") + stubCard;
  if (location.hash) document.querySelector(location.hash)?.scrollIntoView();
}

const PAGES = { home: pageHome, region: pageRegion, candidate: pageCandidate, issue: pageIssue };
document.addEventListener("DOMContentLoaded", () => {
  const fn = PAGES[document.body.dataset.page];
  if (fn) fn().catch((e) => { console.error(e); document.querySelector("main").insertAdjacentHTML("beforeend", `<p class="notice">資料載入失敗：${esc(e.message)}。若是直接開啟本機檔案，請改用 GitHub Pages 或本機伺服器（python -m http.server）。</p>`); });
});
