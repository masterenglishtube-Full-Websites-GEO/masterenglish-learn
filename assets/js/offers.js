// Courses as the natural next step (Noor, 2026-10-29): the right course, at the right moment,
// inside the learning, instead of a reminder email.
//  1. Path and list pages: "the faster way to your goal" under the progress bar, and at the end
//     a calm preview of what the full course adds (🔒), stronger once the list is finished
//  2. courses.html and my-learning.html: "suggested for you" with the reason from the test
//  3. Product pages: reassurance under the buy button, and "your test suggested this course"
// Never shows a course the learner already owns (signed-in learners: /learner/courses).
// The suggestion: the course the placement test recommended, else the path's topic, else the
// learner type's usual course.
(function () {
  const SCRIPT = document.currentScript && document.currentScript.src;
  const ROOT = SCRIPT ? new URL("../../", SCRIPT).href : "/";
  const API = "https://soft-wave-c3e8-masterenglish-fulfillment.masterenglishtube.workers.dev";
  const PATH = location.pathname.replace(/^\/masterenglish-learn/, "");
  if (/\/(admin|watch|verify|thank-you|upsell|affiliate|checkout)\.html$/.test(PATH) || document.documentElement.lang === "en") return;
  const L = () => window.MELearner;
  if (!L()) return;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const track = (t, x) => L().track(t, x || "");

  // Facts from the product pages (keep in step with them).
  const COURSES = {
    pronunciation: { name: "أسرار النطق الأمريكي", price: 79, page: "products/pronunciation.html", why: "لتصحيح نطقك حتى يفهمك الناس من أول مرة",
      has: ["٤٤ درساً بالفيديو بالشرح العربي", "تمارين بعد كل درس", "مبني على أخطاء العرب: P وB، الـ R، الـ TH، الربط والتنغيم", "وصول مدى الحياة"] },
    "commuter-challenge": { name: "The Commuter Challenge", price: 27, page: "products/commuter-challenge.html", why: "لتتدرب على الكلام كل يوم في طريقك",
      has: ["٣٠ تمريناً صوتياً للنطق والكلام", "تسمعه وتكرره في السيارة أو المواصلات", "بدون كتب ولا شاشة", "وصول مدى الحياة"] },
    "ramadan-audio-club": { name: "The 30-Day Fluency Challenge", price: 38, page: "products/ramadan-audio-club.html", why: "لتعتاد أذنك على الإنجليزية الطبيعية",
      has: ["٣٠ حلقة صوتية بقصة عمر وسارة", "إنجليزية العمل والحياة اليومية", "النطق الطبيعي المتصل", "وصول مدى الحياة"] },
    "vocabulary-diet": { name: "قائمة دايت المفردات", price: 7, page: "products/vocabulary-diet.html", why: "لتجد الكلمة المناسبة وقت الكلام",
      has: ["٥٠ كلمة بسيطة تغنيك عن ١٠٠٠ كلمة معقدة", "جمل جاهزة للمحادثة", "ملف PDF يصلك فوراً"] },
    interview: { name: "من التوتر إلى التميز", price: 39, page: "products/interview.html", why: "لتدخل مقابلة العمل بالإنجليزية بثقة",
      has: ["دليل كامل لمقابلة العمل بالإنجليزية", "كيف تجيب بقوة وتعرض إنجازاتك", "عبارات التفاوض على الراتب"] },
    presentations: { name: "أتقن العروض التقديمية في ١٠ أيام", price: 39, page: "products/presentations.html", why: "لتقدّم عرضك بالإنجليزية باحتراف",
      has: ["٨ وحدات و٣٠ درساً", "من المقدمة إلى الأسئلة والأجوبة", "عبارات جاهزة لكل جزء من عرضك"] },
  };
  const BY_TYPE = { builder: "vocabulary-diet", silent: "commuter-challenge", natural: "pronunciation", pro: "presentations" };
  const BY_PAGE = [[/^\/paths\/pronunciation/, "pronunciation"], [/^\/paths\/work/, "interview"], [/^\/topics\/pronunciation/, "pronunciation"],
    [/^\/topics\/listening/, "ramadan-audio-club"], [/^\/topics\/conversation/, "commuter-challenge"], [/^\/topics\/vocabulary/, "vocabulary-diet"], [/^\/topics\/work/, "presentations"]];
  const TYPES = { builder: "الباني", silent: "الفاهم الصامت", natural: "المتكلّم العفوي", pro: "المحترف الطموح" };

  // Courses the signed-in learner owns (cached for the visit).
  function owned() {
    const token = (() => { try { return localStorage.getItem("me_auth_token"); } catch (e) { return null; } })();
    if (!token) return Promise.resolve(new Set());
    try {
      const c = sessionStorage.getItem("me_owned");
      if (c) return Promise.resolve(new Set(JSON.parse(c)));
    } catch (e) {}
    return fetch(API + "/learner/courses", { headers: { Authorization: "Bearer " + token } }).then((r) => (r.ok ? r.json() : { courses: [] }))
      .then((d) => {
        const slugs = (d.courses || []).map((c) => c.slug);
        try { sessionStorage.setItem("me_owned", JSON.stringify(slugs)); } catch (e) {}
        return new Set(slugs);
      }).catch(() => new Set());
  }

  function pick(have) {
    const lv = L().get().level || {};
    const fromPage = (BY_PAGE.find(([re]) => re.test(PATH)) || [])[1];
    const order = [fromPage, lv.rec === "pace" ? null : lv.rec, BY_TYPE[lv.avatar], "commuter-challenge", "pronunciation", "vocabulary-diet"];
    const slug = order.find((s) => s && COURSES[s] && !have.has(s));
    if (!slug) return null;
    const reason = slug === lv.rec ? "اقترحه لك اختبار المستوى من إجاباتك" : slug === fromPage ? "يكمل هذا المسار خطوة بخطوة" : lv.avatar ? `يناسب «${TYPES[lv.avatar]}» في مستوى ${lv.level}` : COURSES[slug].why;
    return { slug, ...COURSES[slug], reason };
  }

  const link = (c, where) => `${ROOT}${c.page}?utm_source=site&utm_campaign=${where}`;
  function bind(box, c, where) {
    track("offer_view", where + ":" + c.slug);
    box.addEventListener("click", (e) => { if (e.target.closest("a[data-offer]")) track("offer_click", where + ":" + c.slug); });
  }

  // ---- 1. path and list pages ----
  function pathPages(have) {
    const m = PATH.match(/^\/(paths|plans)\/([\w-]+)\.html$/);
    if (!m || m[2] === "index") return;
    const c = pick(have);
    if (!c) return;
    const isList = m[1] === "plans";
    const items = document.querySelectorAll("main [data-video], main [data-article]");
    const s = L().get();
    const done = [...items].filter((a) => a.dataset.article ? Object.keys(s.read || {}).some((p) => p.endsWith("/articles/" + a.dataset.article + ".html")) : !!(s.watched || {})[a.dataset.video]).length;
    const finished = items.length && done >= new Set([...items].map((a) => a.dataset.video || a.dataset.article)).size;
    const end = document.createElement("section");
    end.className = "mo-end";
    end.innerHTML = `<div class="wrap"><div class="mo-card">
      <div class="mo-label">${finished ? "🏆 أنهيت " + (isList ? "قائمتك" : "المسار") + "! الخطوة التالية" : "تريد الطريق الأسرع؟"}</div>
      <h2>${esc(c.name)}</h2>
      <p class="mo-reason">${esc(c.reason)}.</p>
      <ul class="mo-has">${c.has.map((h) => `<li>${esc(h)}</li>`).join("")}</ul>
      <p class="mo-note">${isList ? "قائمتك المجانية تكفيك إن كنت منتظماً. الكورس يرتب لك كل شيء مع تمارين، فتصل أسرع." : "الدروس المجانية هنا تكفيك إن كنت منتظماً. الكورس يرتب لك كل شيء مع تمارين، فتصل أسرع."}</p>
      <a class="btn btn-primary" data-offer href="${link(c, isList ? "list_end" : "path_end")}">تعرّف على الكورس (${c.price}$ مرة واحدة)</a>
    </div></div>`;
    const footer = document.querySelector("footer.site-footer");
    (document.querySelector("main") || document.body).appendChild(end);
    bind(end, c, isList ? "list_end" : "path_end");
    if (done >= 2 && !finished) {
      const mini = document.createElement("div");
      mini.className = "mo-mini";
      mini.innerHTML = `<div class="wrap"><a data-offer href="${link(c, "path_progress")}">⚡ الطريق الأسرع: <b>${esc(c.name)}</b> · ${esc(c.reason)}</a></div>`;
      const after = document.querySelector(".mp-path");
      if (after) { after.insertAdjacentElement("afterend", mini); bind(mini, c, "path_progress"); }
    }
    void footer;
  }

  // ---- 2. courses.html + my-learning.html: suggested for you ----
  function suggested(have) {
    const where = PATH === "/courses.html" ? "catalog" : PATH === "/my-learning.html" ? "my_learning" : null;
    if (!where) return;
    const lv = L().get().level;
    if (!lv || !lv.level) return; // newcomers: the catalog as it is (plus its own course quiz)
    const c = pick(have);
    if (!c) return;
    const box = document.createElement("div");
    box.className = "mo-suggest";
    box.innerHTML = `<div class="mo-card mo-card-row">
      <div><div class="mo-label">مقترح لك${lv.avatar ? ` · «${esc(TYPES[lv.avatar])}» ${esc(lv.level)}` : ` · مستوى ${esc(lv.level)}`}</div>
      <h2>${esc(c.name)}</h2><p class="mo-reason">${esc(c.reason)}: ${esc(c.why)}.</p></div>
      <a class="btn btn-primary" data-offer href="${link(c, where)}">شاهد الكورس</a></div>`;
    if (where === "catalog") {
      const anchor = document.querySelector("main .article-hero, main section");
      if (!anchor) return;
      const wrap = document.createElement("div");
      wrap.className = "wrap";
      wrap.style.marginTop = "18px";
      wrap.appendChild(box);
      anchor.insertAdjacentElement("afterend", wrap);
    } else {
      const lvCard = document.getElementById("mlLevelCard");
      if (!lvCard) return;
      lvCard.insertAdjacentElement("afterend", box);
    }
    bind(box, c, where);
  }

  // ---- 3. product pages: reassurance + "your test suggested this" ----
  function productPage() {
    const m = PATH.match(/^\/products\/([\w-]+)\.html$/);
    if (!m) return;
    const btn = document.getElementById("checkoutStartBtn");
    if (btn && !document.querySelector(".mo-assure")) {
      const p = document.createElement("div");
      p.className = "mo-assure";
      p.innerHTML = `<span>🔒 دفع آمن بالبطاقة عبر Stripe</span><span>⚡ يصلك الوصول فوراً على بريدك</span><span>♾️ وصول مدى الحياة</span>
        <small>إذا لم تنجح بطاقتك: جرّب بطاقة أخرى، أو تأكد أنها مفعّلة للشراء من الإنترنت ومن خارج بلدك، أو راسل noor@masterenglish.me ونساعدك.</small>`;
      const err = document.getElementById("checkoutError");
      (err || btn).insertAdjacentElement("afterend", p);
    }
    const lv = L().get().level || {};
    if (lv.rec === m[1] || (!lv.rec && BY_TYPE[lv.avatar] === m[1])) {
      const h1 = document.querySelector("main h1");
      if (h1 && !document.querySelector(".mo-yours")) {
        h1.insertAdjacentHTML("afterend", `<p class="mo-yours">✓ ${lv.rec === m[1] ? "هذا الكورس اقترحه لك اختبار المستوى" : `يناسب «${esc(TYPES[lv.avatar] || "")}» في مستوى ${esc(lv.level)}`}</p>`);
      }
    }
  }

  function init() {
    productPage();
    owned().then((have) => { pathPages(have); suggested(have); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
