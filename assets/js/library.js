// Full video library (videos.html): every public lesson on the channel from the
// Worker (/videos/library, refreshed daily from YouTube), searchable and filterable
// by topic and level. Topic/level rules live in assets/data/video-topics.json and
// are shared with the static build (site-audit/build_library.py).
(function () {
  const API = "https://soft-wave-c3e8-masterenglish-fulfillment.masterenglishtube.workers.dev";
  const PAGE = 48;
  const AR = "٠١٢٣٤٥٦٧٨٩";
  const ar = (n) => String(n).replace(/[0-9]/g, (d) => AR[d]);
  const arNum = (n) => ar(Number(n).toLocaleString("en-US").replace(/,/g, "٬"));
  const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

  const root = document.getElementById("library");
  if (!root) return;
  const grid = root.querySelector("#libGrid");
  const more = root.querySelector("#libMore");
  const countEl = root.querySelector("#libCount");
  const search = root.querySelector("#libSearch");
  const topicBar = root.querySelector("#libTopics");
  const levelSel = root.querySelector("#libLevel");
  const sortSel = root.querySelector("#libSort");

  let rules = null, all = [], shown = PAGE;
  const state = { q: "", topic: "", level: "", sort: "new" };

  function views(n) {
    if (n >= 1e6) return ar((n / 1e6).toFixed(1).replace(/\.0$/, "")).replace(".", "٫") + " مليون";
    if (n >= 1000) return ar(Math.round(n / 1000)) + " ألف";
    return ar(n);
  }
  function date(d) {
    const [y, m, day] = d.split("-");
    return `${ar(+day)} ${MONTHS[+m - 1]} ${ar(y)}`;
  }
  function dur(s) {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    const p = (n) => String(n).padStart(2, "0");
    return h ? `${h}:${p(m)}:${p(sec)}` : `${m}:${p(sec)}`;
  }
  const norm = (t) => t.toLowerCase().replace(/[ً-ْـ]/g, "").replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي");

  function classify(v) {
    const t = v.t.toLowerCase();
    v.topics = rules.topics.filter((r) => r.words.some((w) => t.includes(w.toLowerCase()))).map((r) => r.id);
    const lv = rules.levels.find((l) => l.words.some((w) => t.includes(w.toLowerCase())));
    v.level = lv ? lv.id : "";
    v.n = norm(v.t);
  }

  function filtered() {
    const q = norm(state.q.trim());
    const words = q.split(/\s+/).filter(Boolean);
    let list = all.filter((v) =>
      (!state.topic || v.topics.includes(state.topic)) &&
      (!state.level || v.level === state.level) &&
      words.every((w) => v.n.includes(w)));
    if (state.sort === "views") list = list.slice().sort((a, b) => b.v - a.v);
    else if (state.sort === "short") list = list.slice().sort((a, b) => a.s - b.s);
    return list;
  }

  function card(v) {
    const a = document.createElement("a");
    a.className = "lib-card";
    a.href = "https://www.youtube.com/watch?v=" + v.id;
    a.target = "_blank";
    a.rel = "noopener";
    a.innerHTML = `<img src="https://i.ytimg.com/vi/${v.id}/mqdefault.jpg" alt="" loading="lazy" width="320" height="180"><span class="lib-dur"></span><strong></strong><small></small>`;
    a.querySelector(".lib-dur").textContent = dur(v.s);
    a.querySelector("strong").textContent = v.t;
    a.querySelector("small").textContent = `${views(v.v)} مشاهدة · ${date(v.d)}`;
    return a;
  }

  function render() {
    const list = filtered();
    grid.innerHTML = "";
    list.slice(0, shown).forEach((v) => grid.appendChild(card(v)));
    countEl.textContent = list.length ? `${arNum(list.length)} درساً` : "لا توجد دروس مطابقة. جرّب كلمة أخرى أو موضوعاً آخر.";
    more.hidden = list.length <= shown;
    topicBar.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.topic === state.topic)));
  }

  function buildTopics() {
    const counts = {};
    all.forEach((v) => v.topics.forEach((t) => { counts[t] = (counts[t] || 0) + 1; }));
    const mk = (id, label) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "lib-chip";
      b.dataset.topic = id;
      b.textContent = label;
      b.addEventListener("click", () => {
        state.topic = state.topic === id ? "" : id;
        shown = PAGE;
        history.replaceState(null, "", state.topic ? "#topic-" + state.topic : location.pathname);
        render();
      });
      return b;
    };
    topicBar.innerHTML = "";
    topicBar.appendChild(mk("", `الكل (${arNum(all.length)})`));
    rules.topics.forEach((r) => topicBar.appendChild(mk(r.id, `${r.icon} ${r.label} (${arNum(counts[r.id] || 0)})`)));
  }

  let searchTimer = null;
  search.addEventListener("input", () => {
    state.q = search.value;
    shown = PAGE;
    render();
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { if (state.q.trim().length > 2 && window.MELearner) window.MELearner.track("library_search", state.q.trim().slice(0, 100)); }, 1500);
  });
  levelSel.addEventListener("change", () => { state.level = levelSel.value; shown = PAGE; render(); });
  sortSel.addEventListener("change", () => { state.sort = sortSel.value; render(); });
  more.addEventListener("click", () => { shown += PAGE; render(); });

  Promise.all([
    fetch(root.dataset.rules).then((r) => r.json()),
    fetch(API + "/videos/library").then((r) => r.json()),
  ]).then(([r, data]) => {
    rules = r;
    all = data.videos || [];
    all.forEach(classify);
    const m = location.hash.match(/^#topic-([a-z]+)/);
    if (m && rules.topics.some((t) => t.id === m[1])) state.topic = m[1];
    const q = new URLSearchParams(location.search).get("q");
    if (q) { state.q = q; search.value = q; }
    buildTopics();
    root.classList.add("lib-ready");
    render();
    if (state.topic || q) root.scrollIntoView({ block: "start" });
  }).catch(() => {
    countEl.textContent = "تعذّر تحميل المكتبة الآن. تصفّح المختارات أدناه أو القناة مباشرة على يوتيوب.";
  });
})();
