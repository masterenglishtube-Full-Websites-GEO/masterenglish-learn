// Personal layer (Noor, 2026-10-02): the site remembers the learner and always shows the next step.
//  1. Phone tab bar: الرئيسية · تعلّم · اختبر مستواك (or قائمتي once known) · الكورسات · حسابي
//  2. "Your next step" at the end of articles, lessons and guides
//  3. Homepage greeting for people we know: name, learner type, streak, "today's 10 minutes"
//  4. On a personal list page (plans/*.html): marks the next lesson to do
// Loaded by learner.js on every public page; reads the progress learner.js keeps (MELearner).
(function () {
  const SCRIPT = document.currentScript && document.currentScript.src;
  const ROOT = SCRIPT ? new URL("../../", SCRIPT).href : "/";
  const API = "https://soft-wave-c3e8-masterenglish-fulfillment.masterenglishtube.workers.dev";
  const PATH = location.pathname.replace(/^\/masterenglish-learn/, "");
  const SKIP = /\/(admin|watch|verify|thank-you|upsell|affiliate|checkout)\.html$/;
  if (SKIP.test(PATH)) return;

  const AR = (n) => String(n).replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);
  const dayWord = (n) => (n === 1 ? "يوم" : n === 2 ? "يومان" : n <= 10 ? "أيام" : "يوماً");
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const TYPES = { builder: "الباني", silent: "الفاهم الصامت", natural: "المتكلّم العفوي", pro: "المحترف الطموح" };
  // Visitors who took the test before learner types existed: the most common type for their level.
  const LEVEL_LIST = { A1: "builder-a1", A2: "builder-a2", B1: "silent-b1", B2: "silent-b2", C1: "pro-c1" };
  const track = (type, target) => window.MELearner && window.MELearner.track(type, target || "");
  const state = () => (window.MELearner && window.MELearner.get()) || {};

  function me() {
    const s = state(), lv = s.level;
    if (!lv || !lv.level) return null;
    const list = lv.list || LEVEL_LIST[lv.level];
    const type = TYPES[lv.avatar] || null;
    return {
      level: lv.level, type, list,
      listTitle: type ? `قائمة ${lv.level} الخاصة بـ«${type}»` : `قائمة دروس مستواك (${lv.level})`,
      listUrl: `${ROOT}plans/${list}.html`,
    };
  }

  // ---- streak: consecutive days with any learning (read, watched, quiz, daily practice) ----
  function dayKey(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
  function streak() {
    const s = state(), days = new Set(Object.keys(s.daily || {}));
    const add = (ts) => { if (ts) days.add(dayKey(new Date(+ts))); };
    Object.values(s.read || {}).forEach(add);
    Object.values(s.watched || {}).forEach(add);
    Object.values(s.quizzes || {}).forEach((q) => add(q && q.ts));
    const d = new Date();
    if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1); // today not done yet: count up to yesterday
    let n = 0;
    while (days.has(dayKey(d))) { n++; d.setDate(d.getDate() - 1); }
    return { n, today: days.has(dayKey(new Date())) };
  }

  // ---- next undone lesson in the learner's list (read from the list page itself) ----
  let nextCache = null;
  function nextInList(info) {
    if (!info) return Promise.resolve(null);
    if (nextCache) return nextCache;
    nextCache = fetch(info.listUrl).then((r) => r.text()).then((html) => {
      const doc = new DOMParser().parseFromString(html, "text/html"), s = state();
      const items = doc.querySelectorAll("[data-stage] [data-article], [data-stage] [data-video]");
      for (const a of items) {
        const done = a.dataset.article
          ? Object.keys(s.read || {}).some((p) => p.endsWith("/articles/" + a.dataset.article + ".html"))
          : !!(s.watched || {})[a.dataset.video];
        if (done) continue;
        const title = (a.querySelector("h3, .lib-title, strong") || a).textContent.trim().replace(/\s+/g, " ").slice(0, 120);
        const href = new URL(a.getAttribute("href"), info.listUrl).href;
        return { title, href, video: a.dataset.video || null };
      }
      return null;
    }).catch(() => null);
    return nextCache;
  }

  // ---- 1. phone tab bar ----
  function tabBar() {
    const info = me();
    const tabs = [
      ["home", "index.html", "الرئيسية", '<path d="M5 12l-2 0l9 -9l9 9l-2 0"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-7"/>'],
      ["learn", "paths/index.html", "تعلّم", '<path d="M3 19a9 9 0 0 1 9 0a9 9 0 0 1 9 0"/><path d="M3 6a9 9 0 0 1 9 0a9 9 0 0 1 9 0"/><path d="M3 6l0 13"/><path d="M12 6l0 13"/><path d="M21 6l0 13"/>'],
      info ? ["list", `plans/${info.list}.html`, "قائمتي", '<path d="M9 6l11 0"/><path d="M9 12l11 0"/><path d="M9 18l11 0"/><path d="M5 6l0 .01"/><path d="M5 12l0 .01"/><path d="M5 18l0 .01"/>']
        : ["test", "placement-test.html", "اختبر مستواك", '<path d="M9 11l3 3l8 -8"/><path d="M20 12v6a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 2 -2h9"/>'],
      ["courses", "courses.html", "الكورسات", '<path d="M3 7m0 2a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v9a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2z"/><path d="M8 7v-2a2 2 0 0 1 2 -2h4a2 2 0 0 1 2 2v2"/>'],
      ["me", "my-learning.html", "حسابي", '<path d="M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0"/><path d="M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2"/>'],
    ];
    const here = (href) => {
      if (href === "index.html") return PATH === "/" || PATH === "/index.html";
      if (href === "paths/index.html") return /^\/(paths|topics|lessons|articles|guides|videos)/.test(PATH) || PATH === "/videos.html";
      return PATH === "/" + href;
    };
    const nav = document.createElement("nav");
    nav.className = "me-tabbar";
    nav.setAttribute("aria-label", "التنقل السريع");
    nav.innerHTML = tabs.map(([id, href, label, icon]) => `<a href="${ROOT}${href}" data-tab="${id}" class="${here(href) ? "on" : ""}${id === "test" || id === "list" ? " star" : ""}"${here(href) ? ' aria-current="page"' : ""}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icon}</svg><span>${label}</span></a>`).join("");
    nav.addEventListener("click", (e) => { const a = e.target.closest("a"); if (a) track("nav_tab", a.dataset.tab); });
    document.body.appendChild(nav);
    document.body.classList.add("has-tabbar");
  }

  // ---- 2. "your next step" at the end of reading pages ----
  function nextStepBlock() {
    if (!/^\/(articles|lessons|guides)\/(?!index\.html)[\w-]+\.html$/.test(PATH)) return;
    const anchor = document.querySelector(".article-body .wrap.prose") || document.querySelector(".article-body .wrap");
    if (!anchor) return;
    const info = me();
    const box = document.createElement("aside");
    box.className = "me-next";
    box.setAttribute("aria-label", "خطوتك التالية");
    if (info) {
      box.innerHTML = `<div class="me-next-label">خطوتك التالية</div>
        <h2>${esc(info.listTitle)}</h2>
        <p class="me-next-item">جارِ تحديد درسك التالي...</p>
        <div class="me-next-actions"><a class="btn btn-primary" href="${info.listUrl}" data-next="list">افتح قائمتك</a></div>`;
      nextInList(info).then((n) => {
        const p = box.querySelector(".me-next-item");
        if (n) p.innerHTML = `درسك التالي: <a href="${esc(n.href)}" data-next="lesson">${esc(n.title)}</a>`;
        else p.textContent = "أنهيت كل دروس قائمتك! حان وقت اختبار جديد لترى تقدّمك.";
      });
    } else {
      box.innerHTML = `<div class="me-next-label">خطوتك التالية</div>
        <h2>لا تعرف ماذا تتعلم بعد هذا؟</h2>
        <p>خذ اختبار تحديد المستوى (١٠ دقائق)، ونرسل لك مستواك، ونوعك كمتعلم، وقائمة دروس مرتبة مصممة لك.</p>
        <div class="me-next-actions"><a class="btn btn-primary" href="${ROOT}placement-test.html" data-next="test">اعرف مستواك الآن</a>
        <a class="btn btn-ghost" href="${ROOT}plans/index.html" data-next="types">أي نوع من المتعلمين أنت؟</a></div>`;
    }
    box.addEventListener("click", (e) => { const a = e.target.closest("a[data-next]"); if (a) track("next_step", a.dataset.next + ":" + PATH); });
    anchor.appendChild(box);
  }

  // ---- 3. homepage greeting + today's 10 minutes ----
  const PHRASES = [
    ["I'm on my way.", "أنا في الطريق."], ["Could you say that again, please?", "هل يمكنك أن تعيد ذلك من فضلك؟"],
    ["It's up to you.", "القرار لك."], ["I'll get back to you.", "سأعود إليك بالرد."],
    ["That makes sense.", "هذا منطقي."], ["I'm looking forward to it.", "أنا متشوق لذلك."],
    ["Let me think about it.", "دعني أفكر في الأمر."], ["What do you mean by that?", "ماذا تقصد بذلك؟"],
    ["I didn't catch that.", "لم ألتقط ما قلته."], ["No worries.", "لا مشكلة."],
    ["I'm running late.", "أنا متأخر قليلاً."], ["It slipped my mind.", "نسيتها تماماً."],
    ["Can I ask you something?", "هل يمكنني أن أسألك شيئاً؟"], ["I couldn't agree more.", "أوافقك تماماً."],
    ["Let's keep in touch.", "لنبقَ على تواصل."], ["I'm not sure yet.", "لست متأكداً بعد."],
    ["That's a good point.", "هذه نقطة جيدة."], ["Let's call it a day.", "لنكتفِ بهذا القدر اليوم."],
    ["It's not a big deal.", "ليس أمراً كبيراً."], ["I'm used to it.", "أنا معتاد على ذلك."],
    ["How's it going?", "كيف تسير الأمور؟"], ["Take your time.", "خذ وقتك."],
    ["I'll figure it out.", "سأجد حلاً."], ["Let me know if you need anything.", "أخبرني إن احتجت أي شيء."],
    ["I see what you mean.", "فهمت ما تقصده."], ["That sounds great.", "يبدو ذلك رائعاً."],
    ["Could you give me a hand?", "هل يمكنك مساعدتي؟"], ["I'm afraid I can't make it.", "للأسف لن أستطيع الحضور."],
    ["Long time no see!", "لم أرك منذ مدة طويلة!"], ["It's on me.", "الحساب عليّ."],
  ];
  function phraseOfDay() {
    const saved = state().phrases || [];
    const i = Math.floor(Date.now() / 86400000);
    if (saved.length && i % 2) { const p = saved[i % saved.length]; return [p.en, "من عباراتك المحفوظة"]; }
    return PHRASES[i % PHRASES.length];
  }
  function homeGreeting() {
    if (!(PATH === "/" || PATH === "/index.html")) return;
    const s = state(), info = me(), st = streak();
    const known = info || (s.last && s.last.path) || Object.keys(s.read || {}).length || localStorage.getItem("me_auth_token");
    if (!known) return;
    const [en, arMeaning] = phraseOfDay();
    const sec = document.createElement("section");
    sec.className = "me-home";
    sec.innerHTML = `<div class="wrap"><div class="me-home-card">
      <div class="me-home-top">
        <div><h2 class="me-home-hello">أهلاً بعودتك<span class="me-home-name"></span>!</h2>
        ${info ? `<p class="me-home-type">${info.type ? `أنت «${esc(info.type)}» · ` : ""}مستوى ${esc(info.level)}</p>` : `<p class="me-home-type">اعرف مستواك ونوعك كمتعلم: <a href="${ROOT}placement-test.html" data-home="test">خذ الاختبار (١٠ دقائق)</a></p>`}</div>
        <div class="me-streak${st.n ? "" : " zero"}" title="أيام متتالية من التعلم"><strong>${AR(st.n)}</strong><span>${dayWord(st.n)} ${st.n === 2 ? "متتاليان" : "متتالية"}</span></div>
      </div>
      <h3>تمرين اليوم (١٠ دقائق)</h3>
      <ol class="me-today">
        <li class="me-today-lesson">${info ? "جارِ تحديد درسك..." : s.last && s.last.path ? `تابع من حيث توقفت: <a href="${ROOT}${esc(s.last.path.replace(/^\//, ""))}" data-home="continue">${esc(s.last.title || "آخر صفحة")}</a>` : `ابدأ من <a href="${ROOT}articles/where-to-start.html" data-home="start">دليل البداية</a>`}</li>
        <li>عبارة اليوم: <bdi lang="en" class="me-phrase">${esc(en)}</bdi> <button type="button" class="me-say-today" aria-label="استمع">🔊</button><br><small>${esc(arMeaning)}</small> <button type="button" class="me-link me-save-today">احفظها</button></li>
        <li>قلها بصوت عالٍ ٣ مرات، ثم استعملها في جملة عن يومك.</li>
      </ol>
      <div class="me-home-actions">
        <button type="button" class="btn btn-primary me-done-today"${st.today && (state().daily || {})[dayKey(new Date())] ? " disabled" : ""}>${(state().daily || {})[dayKey(new Date())] ? "أنهيت تمرين اليوم ✓" : "أنهيت تمرين اليوم"}</button>
        ${info ? `<a class="btn btn-ghost" href="${info.listUrl}" data-home="list">افتح ${esc(info.listTitle)}</a>` : ""}
      </div>
    </div></div>`;
    const hero = document.querySelector("main .hero, .hero");
    // People we know see their card first, above the welcome banner meant for newcomers.
    if (hero) hero.parentNode.insertBefore(sec, hero); else (document.querySelector("main") || document.body).prepend(sec);
    if (info) nextInList(info).then((n) => {
      const li = sec.querySelector(".me-today-lesson");
      li.innerHTML = n ? `درسك التالي في قائمتك: <a href="${esc(n.href)}" data-home="lesson">${esc(n.title)}</a>` : `أنهيت قائمتك! <a href="${ROOT}placement-test.html" data-home="retest">أعد الاختبار وقارن مستواك</a>`;
    });
    sec.querySelector(".me-say-today").addEventListener("click", () => { if (window.MELearner) window.MELearner.speak(en); track("tts_play", en); });
    sec.querySelector(".me-save-today").addEventListener("click", (e) => { if (window.MELearner) window.MELearner.savePhrase(en, "عبارة اليوم"); e.target.textContent = "حُفظت ✓"; e.target.disabled = true; });
    sec.querySelector(".me-done-today").addEventListener("click", (e) => {
      if (window.MELearner) window.MELearner.markDaily();
      e.target.textContent = "أنهيت تمرين اليوم ✓"; e.target.disabled = true;
      const n = streak().n, box = sec.querySelector(".me-streak");
      box.classList.remove("zero"); box.querySelector("strong").textContent = AR(n); box.querySelector("span").textContent = `${dayWord(n)} ${n === 2 ? "متتاليان" : "متتالية"}`;
    });
    sec.addEventListener("click", (e) => { const a = e.target.closest("a[data-home]"); if (a) track("home_continue", a.dataset.home); });
    const token = localStorage.getItem("me_auth_token");
    if (token) fetch(API + "/auth/me", { headers: { Authorization: "Bearer " + token } }).then((r) => r.json()).then((d) => {
      const first = d && d.name ? String(d.name).trim().split(/\s+/)[0] : "";
      if (first) sec.querySelector(".me-home-name").textContent = "، " + first;
    }).catch(() => {});
  }

  // ---- 4. personal list page: point at the next lesson ----
  function markNextOnList() {
    const m = PATH.match(/^\/plans\/([\w-]+)\.html$/);
    if (!m || m[1] === "index") return;
    const s = state();
    for (const a of document.querySelectorAll("[data-stage] [data-article], [data-stage] [data-video]")) {
      const done = a.dataset.article
        ? Object.keys(s.read || {}).some((p) => p.endsWith("/articles/" + a.dataset.article + ".html"))
        : !!(s.watched || {})[a.dataset.video];
      if (done) continue;
      a.classList.add("me-next-here");
      a.insertAdjacentHTML("afterbegin", '<span class="me-next-flag">ابدأ من هنا</span>');
      break;
    }
  }

  function init() {
    tabBar();
    nextStepBlock();
    homeGreeting();
    markNextOnList();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
