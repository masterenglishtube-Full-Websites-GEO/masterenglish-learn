// Study game layer (Noor, 2026-10-29): makes coming back every day feel good.
//  1. Streak chip in the header on every page (🔥 days in a row, one free rest day a week)
//  2. Whole-path progress on path and list pages ("32% done, 4 lessons to finish")
//  3. Badges for milestones, with a small celebration when one is earned
//  4. "Retake the test" after 30 days, and "from A2 to B1" when the level goes up
//  5. Phrase review game (flashcards with spaced repetition) on my-learning.html and daily.html
//  6. Badges and review on my-learning.html
//  7. daily.html: the 5-minute daily challenge (listen, say it, quick question, review)
//  8. challenge.html: the monthly community challenge (one shared total, never a ranking)
//  9. Weekly goal the learner picks (3, 5 or 7 days) with a ring that fills (my-learning, daily)
// 10. Shareable achievement cards (streak, finished path) as an image for WhatsApp/Telegram
// 11. End of each lesson: its 3 key phrases, saved with one tap
// 12. Word of the week quest on daily.html; optional sound on right answers (off by default)
// Loaded by learner.js after personal.js; reads and writes progress through window.MELearner.
(function () {
  const SCRIPT = document.currentScript && document.currentScript.src;
  const ROOT = SCRIPT ? new URL("../../", SCRIPT).href : "/";
  const API = "https://soft-wave-c3e8-masterenglish-fulfillment.masterenglishtube.workers.dev";
  const PATH = location.pathname.replace(/^\/masterenglish-learn/, "");
  if (/\/(admin|watch|verify|thank-you|upsell|affiliate|checkout)\.html$/.test(PATH) || document.documentElement.lang === "en") return;
  const L = () => window.MELearner;
  if (!L()) return;
  const S = () => L().get();
  const AR = (n) => String(n).replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const days = (n) => (n === 1 ? "يوم" : n === 2 ? "يومان" : n <= 10 ? "أيام" : "يوماً");
  const track = (t, x) => L().track(t, x || "");
  const DAY = 86400000;

  // ---- phrase bank (also used by daily.html): English, Arabic meaning ----
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
  const todayIndex = () => Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / DAY);
  const phraseToday = () => PHRASES[todayIndex() % PHRASES.length];

  // ---- small celebration (toast + confetti made of plain divs) ----
  function celebrate(title, text) {
    const box = document.createElement("div");
    box.className = "mp-celebrate";
    box.setAttribute("role", "status");
    box.innerHTML = `<b>${esc(title)}</b>${text ? `<span>${esc(text)}</span>` : ""}`;
    ding(true);
    document.body.appendChild(box);
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const colors = ["#f4b82e", "#1f7a5c", "#c9522a", "#3b82f6", "#e0a21a"];
      for (let i = 0; i < 28; i++) {
        const c = document.createElement("i");
        c.className = "mp-confetti";
        c.style.cssText = `left:${Math.random() * 100}vw; background:${colors[i % colors.length]}; animation-delay:${Math.random() * 0.4}s; transform:rotate(${Math.random() * 360}deg)`;
        document.body.appendChild(c);
        setTimeout(() => c.remove(), 2600);
      }
    }
    requestAnimationFrame(() => box.classList.add("show"));
    setTimeout(() => { box.classList.remove("show"); setTimeout(() => box.remove(), 400); }, 4200);
  }

  // ---- sound on right answers (off unless the learner turns it on in my-learning) ----
  const soundOn = () => { try { return localStorage.getItem("me_sound") === "1"; } catch (e) { return false; } };
  let audio = null;
  function ding(high) {
    if (!soundOn()) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const o = audio.createOscillator(), g = audio.createGain();
      o.type = "sine"; o.frequency.value = high ? 880 : 660;
      g.gain.setValueAtTime(0.0001, audio.currentTime);
      g.gain.exponentialRampToValueAtTime(0.18, audio.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.35);
      o.connect(g); g.connect(audio.destination); o.start(); o.stop(audio.currentTime + 0.4);
      if (navigator.vibrate) navigator.vibrate(30);
    } catch (e) {}
  }

  // ---- weekly goal: days with learning this week (Monday to Sunday) ----
  function weekStart() { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d; }
  function isoWeek() {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    const w1 = new Date(d.getFullYear(), 0, 4);
    return `${d.getFullYear()}-W${String(1 + Math.round(((d - w1) / DAY - 3 + ((w1.getDay() + 6) % 7)) / 7)).padStart(2, "0")}`;
  }
  function weekProgress() {
    const goal = (S().goal && +S().goal.days) || 0, start = weekStart(), act = L().activeDays();
    let n = 0;
    for (let i = 0; i < 7; i++) { const d = new Date(start.getTime() + i * DAY); if (act.has(L().dayKey(d))) n++; }
    return { goal, n, reached: goal > 0 && n >= goal };
  }
  function goalRing(size) {
    const { goal, n } = weekProgress(), r = size / 2 - 7, c = 2 * Math.PI * r, pct = goal ? Math.min(1, n / goal) : 0;
    return `<svg class="mp-ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--border)" stroke-width="7"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="#1f7a5c" stroke-width="7" stroke-linecap="round"
        stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
      <text x="50%" y="56%" text-anchor="middle" font-size="${size / 4.5}" font-weight="800" fill="currentColor">${AR(n)}/${AR(goal || 0)}</text></svg>`;
  }
  function goalBox() {
    const box = document.createElement("div");
    box.className = "mp-goal";
    const paint = () => {
      const w = weekProgress();
      box.innerHTML = w.goal
        ? `${goalRing(78)}<div><b>${w.reached ? "🎯 حققت هدف الأسبوع!" : `هدفك: ${AR(w.goal)} أيام هذا الأسبوع`}</b>
            <span>${w.reached ? "رائع. الأسبوع القادم: نفس الهدف أو أعلى؟" : `تعلّمت ${AR(w.n)} من ${AR(w.goal)}، بقي ${AR(w.goal - w.n)}`}</span>
            <span class="mp-goal-pick">غيّر الهدف: ${[3, 5, 7].map((d) => `<button type="button" data-g="${d}"${d === w.goal ? ' aria-pressed="true"' : ""}>${AR(d)}</button>`).join("")}</span></div>`
        : `<div><b>🎯 اختر هدفك لهذا الأسبوع</b><span>كم يوماً تريد أن تتعلم؟ الهدف الذي تختاره بنفسك يحفّزك أكثر.</span>
            <span class="mp-goal-pick">${[3, 5, 7].map((d) => `<button type="button" data-g="${d}">${AR(d)} أيام</button>`).join("")}</span></div>`;
      box.querySelectorAll("[data-g]").forEach((b) => b.addEventListener("click", () => { L().setGoal(+b.dataset.g); paint(); checkBadges(); }));
    };
    paint();
    document.addEventListener("me:progress", paint);
    return box;
  }

  // ---- shareable achievement card (canvas image; Web Share where available, else download) ----
  function shareCard(big, line, sub, name) {
    const cv = document.createElement("canvas");
    cv.width = 1080; cv.height = 1080;
    const x = cv.getContext("2d");
    const g = x.createLinearGradient(0, 0, 1080, 1080);
    g.addColorStop(0, "#0c3a2c"); g.addColorStop(1, "#145a43");
    x.fillStyle = g; x.fillRect(0, 0, 1080, 1080);
    x.fillStyle = "rgba(244,184,46,.12)"; x.beginPath(); x.arc(900, 180, 260, 0, 7); x.fill();
    x.direction = "rtl"; x.textAlign = "center";
    const font = (w, px) => `${w} ${px}px Tajawal, Cairo, Tahoma, Arial, sans-serif`;
    x.fillStyle = "#f4b82e"; x.font = font(800, 54); x.fillText("أتقن الإنجليزية · Master English", 540, 150);
    x.font = font(900, 210); x.fillText(big, 540, 470);
    x.fillStyle = "#ffffff"; x.font = font(800, 66); x.fillText(line, 540, 610);
    x.fillStyle = "#cfe3da"; x.font = font(600, 46); x.fillText(sub, 540, 700);
    if (name) { x.fillStyle = "#ffffff"; x.font = font(700, 52); x.fillText(name, 540, 800); }
    x.fillStyle = "#f4b82e"; x.font = font(700, 44); x.fillText("masterenglish.me", 540, 980);
    cv.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], "masterenglish-achievement.png", { type: "image/png" });
      track("share_card", line.slice(0, 60));
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], text: `${line} · masterenglish.me` }).catch(() => {});
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob); a.download = file.name; a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      }
    }, "image/png");
  }
  function learnerName() {
    const token = (() => { try { return localStorage.getItem("me_auth_token"); } catch (e) { return null; } })();
    if (!token) return Promise.resolve("");
    return fetch(API + "/auth/me", { headers: { Authorization: "Bearer " + token } }).then((r) => r.json()).then((d) => (d && d.name) || "").catch(() => "");
  }

  // ---- end of lesson: its 3 key phrases, saved with one tap ----
  function recap() {
    if (!/^\/(articles|lessons|guides)\/(?!index\.html)[\w-]+\.html$/.test(PATH)) return;
    const seen = new Set(), list = [];
    document.querySelectorAll(".article-body .me-say").forEach((el) => {
      const t = ((el.firstChild && el.firstChild.nodeValue) || el.textContent).replace("🔊", "").trim();
      const n = t.split(/\s+/).length;
      if (n < 2 || n > 9 || seen.has(t.toLowerCase())) return;
      seen.add(t.toLowerCase()); list.push(t);
    });
    // Real phrases first: 3+ words, not a Title Case name ("Shutter Island").
    const good = list.filter((t) => t.split(/\s+/).length >= 3 && !/^([A-Z][\w'’-]*\s*)+[.?!]?$/.test(t));
    const pool = good.length >= 3 ? good : list;
    if (pool.length < 3) return;
    const three = [pool[0], pool[Math.floor(pool.length / 2)], pool[pool.length - 1]];
    const box = document.createElement("aside");
    box.className = "mp-recap";
    box.setAttribute("data-no-say", "");
    box.innerHTML = `<div class="me-next-label">خلاصة الدرس</div><h2>٣ عبارات خذها معك</h2>
      <ul>${three.map((t) => `<li><bdi lang="en">${esc(t)}</bdi> <button type="button" class="mp-recap-say" aria-label="استمع">🔊</button></li>`).join("")}</ul>
      <button type="button" class="btn btn-primary mp-recap-save">☆ احفظ الثلاث في عباراتي</button>`;
    box.querySelectorAll(".mp-recap-say").forEach((b, i) => b.addEventListener("click", () => L().speak(three[i])));
    box.querySelector(".mp-recap-save").addEventListener("click", (e) => {
      three.forEach((t) => L().savePhrase(t));
      e.target.textContent = "✓ حُفظت، وستراجعها في لعبة البطاقات"; e.target.disabled = true;
      track("recap_save", PATH); ding(true);
    });
    const next = document.querySelector(".me-next");
    const anchor = document.querySelector(".article-body .wrap.prose") || document.querySelector(".article-body .wrap");
    if (next) next.insertAdjacentElement("beforebegin", box); else if (anchor) anchor.appendChild(box);
  }

  // ---- word of the week ----
  const WORDS = [
    ["figure out", "يكتشف / يجد حلاً", "I'll figure it out."], ["catch up", "يلحق بـ / يعوّض ما فاته", "Let's catch up this weekend."],
    ["get used to", "يعتاد على", "I'm getting used to the new job."], ["run out of", "ينفد منه", "We ran out of time."],
    ["look forward to", "يتطلع بشوق إلى", "I'm looking forward to it."], ["come up with", "يبتكر / يأتي بفكرة", "She came up with a great idea."],
    ["deal with", "يتعامل مع", "I can deal with it."], ["make sense", "يكون منطقياً", "That makes sense."],
    ["on the same page", "متفقون على الفكرة نفسها", "Are we on the same page?"], ["give it a try", "يجرّب", "Just give it a try."],
    ["keep in mind", "يأخذ بعين الاعتبار", "Keep in mind that it's late."], ["take your time", "خذ وقتك", "Take your time, no rush."],
  ];
  function wordOfWeek(host) {
    const wk = isoWeek(), idx = parseInt(wk.slice(-2), 10) % WORDS.length, [w, ar, ex] = WORDS[idx];
    const box = document.createElement("section");
    box.className = "mp-step mp-quest";
    const paint = () => {
      const days = (S().quest || {})[wk] || {}, used = Object.keys(days).length, today = !!days[L().dayKey(new Date())];
      box.innerHTML = `<h2>💬 كلمة الأسبوع</h2>
        <div class="mp-phrase" lang="en" dir="ltr">${esc(w)}</div><p>${esc(ar)} · <bdi lang="en">${esc(ex)}</bdi> <button type="button" class="mp-recap-say" aria-label="استمع">🔊</button></p>
        <p>المهمة: استعملها في جملة عن حياتك (بصوت عالٍ أو كتابة) في ٣ أيام مختلفة هذا الأسبوع.</p>
        <div class="mp-quest-dots">${[0, 1, 2].map((i) => `<i class="${i < used ? "on" : ""}"></i>`).join("")}</div>
        <button type="button" class="btn ${today ? "btn-ghost" : "btn-primary"}" id="mpQuestBtn"${today ? " disabled" : ""}>${today ? "✓ استعملتها اليوم" : "استعملتها اليوم"}</button>`;
      box.querySelector(".mp-recap-say").addEventListener("click", () => L().speak(ex));
      box.querySelector("#mpQuestBtn").addEventListener("click", () => {
        if (!L().questDay(wk, L().dayKey(new Date()))) return;
        ding(true);
        if (Object.keys(S().quest[wk]).length === 3) track("quest_done", wk);
        paint(); checkBadges();
      });
    };
    paint();
    host.appendChild(box);
  }

  // ---- 1. streak chip in the header ----
  function streakChip() {
    const host = document.querySelector(".site-header .header-inner");
    if (!host || host.querySelector(".mp-streak")) return;
    const known = L().activeDays().size;
    if (!known) return; // newcomers: nothing to show yet
    const a = document.createElement("a");
    a.className = "mp-streak";
    a.href = ROOT + "daily.html";
    const toggle = host.querySelector(".nav-toggle");
    host.insertBefore(a, toggle || null);
    // Phones: the header is full, so the streak sits on the "حسابي" tab of the bottom bar instead.
    const tab = document.querySelector('.me-tabbar [data-tab="me"]');
    let pip = null;
    if (tab) { pip = document.createElement("span"); pip.className = "mp-tab-streak"; tab.appendChild(pip); }
    const paint = () => {
      const st = L().streak();
      if (pip) { pip.textContent = "🔥" + AR(st.n); pip.classList.toggle("cold", !st.today); }
      a.classList.toggle("cold", !st.today);
      a.innerHTML = `<span aria-hidden="true">🔥</span><b>${AR(st.n)}</b>`;
      a.title = st.today ? `${AR(st.n)} ${days(st.n)} متتالية. أحسنت!` : st.n ? `حافظ على سلسلتك (${AR(st.n)} ${days(st.n)}): تحدي اليوم ٥ دقائق` : "ابدأ سلسلتك اليوم: تحدي ٥ دقائق";
      a.setAttribute("aria-label", a.title);
    };
    paint();
    document.addEventListener("me:progress", paint);
  }

  // ---- 2. whole-path progress (paths/*.html, plans/*.html) ----
  function pathProgress() {
    const m = PATH.match(/^\/(paths|plans)\/([\w-]+)\.html$/);
    if (!m || m[2] === "index") return;
    const seen = new Set(), items = [];
    document.querySelectorAll("main [data-video], main [data-article]").forEach((a) => {
      const k = a.dataset.video || a.dataset.article;
      if (!seen.has(k)) { seen.add(k); items.push(a); }
    });
    if (items.length < 3) return;
    const box = document.createElement("div");
    box.className = "mp-path";
    const hero = document.querySelector("main .article-hero, main .hub-hero, main section");
    (hero || document.querySelector("main")).insertAdjacentElement(hero ? "afterend" : "afterbegin", box);
    const paint = () => {
      const s = S();
      const done = items.filter((a) => a.dataset.article ? Object.keys(s.read || {}).some((p) => p.endsWith("/articles/" + a.dataset.article + ".html")) : !!(s.watched || {})[a.dataset.video]).length;
      const pct = Math.round(done / items.length * 100), left = items.length - done;
      box.innerHTML = `<div class="wrap"><div class="mp-path-card">
        <div class="mp-path-top"><b>${done ? `أنهيت ${AR(pct)}٪ من ${m[1] === "plans" ? "قائمتك" : "هذا المسار"}` : `${AR(items.length)} درساً في ${m[1] === "plans" ? "قائمتك" : "هذا المسار"}`}</b>
        <span>${!done ? "ابدأ بالدرس الأول، ويحفظ الموقع تقدّمك" : left === 0 ? "🏆 أنهيته كاملاً!" : left <= 3 ? `🏁 بقي ${AR(left)} ${left === 1 ? "درس واحد" : "دروس"} فقط!` : `${AR(done)} من ${AR(items.length)} · بقي ${AR(left)}`}</span></div>
        <div class="mp-bar"><span style="width:${Math.max(pct, done ? 3 : 0)}%"></span></div>
        ${left === 0 ? `<button type="button" class="btn btn-primary mp-path-share">🏆 احصل على بطاقة إنجازك</button>` : ""}
      </div></div>`;
      const ps = box.querySelector(".mp-path-share");
      if (ps) ps.addEventListener("click", () => {
        const title = ((document.querySelector("main h1") || {}).textContent || "").split(":")[0].trim().slice(0, 40);
        const date = new Intl.DateTimeFormat("ar", { day: "numeric", month: "long", year: "numeric" }).format(new Date());
        learnerName().then((nm) => shareCard("🏆", `أنهيت ${title}`, date, nm));
      });
      if (!left && L().setFlag("badges", "path_done")) { track("badge", "path_done"); celebrate("🏆 أنهيت مساراً كاملاً!", "شارة جديدة في صفحة «حسابي»"); }
    };
    paint();
    document.addEventListener("me:progress", paint);
  }

  // ---- 3. badges ----
  const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
  const BADGES = [
    ["first", "🌱", "أول درس", "أنهيت أول درس", (s, x) => x.lessons >= 1],
    ["streak3", "🔥", "٣ أيام متتالية", "تعلّمت ٣ أيام متتالية", (s, x) => x.streak >= 3],
    ["streak7", "⚡", "أسبوع كامل", "٧ أيام متتالية", (s, x) => x.streak >= 7],
    ["streak30", "👑", "شهر كامل", "٣٠ يوماً متتالية", (s, x) => x.streak >= 30],
    ["lessons10", "📚", "١٠ دروس", "أنهيت ١٠ دروس", (s, x) => x.lessons >= 10],
    ["lessons50", "🎓", "٥٠ درساً", "أنهيت ٥٠ درساً", (s, x) => x.lessons >= 50],
    ["quiz_perfect", "💯", "علامة كاملة", "علامة كاملة في اختبار", (s) => Object.values(s.quizzes || {}).some((q) => q && q.total && q.score >= q.total)],
    ["quiz10", "🎯", "١٠ اختبارات", "حللت ١٠ اختبارات", (s) => Object.keys(s.quizzes || {}).length >= 10],
    ["phrases10", "⭐", "١٠ عبارات", "حفظت ١٠ عبارات", (s) => (s.phrases || []).length >= 10],
    ["speaker", "🎙️", "متكلم واثق", "٨٠٪ أو أكثر في ٥ تمارين نطق", (s) => Object.values(s.speak || {}).filter((v) => v >= 80).length >= 5],
    ["reviewer", "🧠", "مراجع ذكي", "راجعت ١٠ عبارات", (s) => Object.keys(s.review || {}).length >= 10],
    ["path_done", "🏆", "أنهيت مساراً", "أنهيت مساراً أو قائمة كاملة", () => false],
    ["level_up", "📈", "ارتفع مستواك", "نتيجة أعلى في اختبار المستوى", (s) => {
      const prev = (s.levels || []).slice(-1)[0];
      return !!(prev && s.level && LEVELS.indexOf(s.level.level) > LEVELS.indexOf(prev.level));
    }],
    ["challenge", "🤝", "تحدي الشهر", "انضممت لتحدي الشهر", (s) => Object.keys(s.challenge || {}).length > 0],
    ["word_week", "💬", "كلمة الأسبوع", "استعملت كلمة الأسبوع ٣ أيام", (s) => Object.values(s.quest || {}).some((d) => Object.keys(d || {}).length >= 3)],
    ["goal_week", "🎯", "هدف الأسبوع", "حققت هدفك الأسبوعي", () => weekProgress().reached],
  ];
  function facts() {
    const s = S();
    return { lessons: Object.keys(s.read || {}).length + Object.keys(s.watched || {}).length, streak: L().streak().n };
  }
  let checking = false;
  function checkBadges() {
    if (checking) return;
    checking = true;
    const s = S(), x = facts(), fresh = [];
    for (const [id, icon, name, , test] of BADGES) {
      if ((s.badges || {})[id] || !test(s, x)) continue;
      if (L().setFlag("badges", id)) { track("badge", id); fresh.push(`${icon} ${name}`); }
    }
    if (fresh.length === 1) celebrate(`شارة جديدة: ${fresh[0]}`, "تجدها في صفحة «حسابي»");
    else if (fresh.length > 1) celebrate(`🏅 ${AR(fresh.length)} شارات جديدة!`, fresh.join(" · "));
    checking = false;
  }

  // ---- 4. retake the test after 30 days; "from A2 to B1" ----
  function retestBanner() {
    if (!(PATH === "/" || PATH === "/index.html" || PATH === "/my-learning.html")) return;
    const lv = S().level;
    if (!lv || !lv.ts || Date.now() - lv.ts < 30 * DAY) return;
    const box = document.createElement("div");
    box.className = "mp-retest";
    box.innerHTML = `<div class="wrap"><div class="mp-retest-card"><b>📈 مرّ أكثر من شهر على اختبارك (${esc(lv.level)})</b>
      <span>أعد الاختبار الآن وشاهد كم تقدّمت.</span><a class="btn btn-primary" href="${ROOT}placement-test.html" data-retest>أعد الاختبار</a></div></div>`;
    box.querySelector("[data-retest]").addEventListener("click", () => track("next_step", "retest"));
    const anchor = document.querySelector(".me-home") || document.querySelector("#myLearning") || document.querySelector("main");
    if (anchor.id === "myLearning") anchor.prepend(box); else anchor.insertAdjacentElement(anchor.classList.contains("me-home") ? "afterend" : "afterbegin", box);
  }
  function levelUpWatch() {
    if (PATH !== "/placement-test.html") return;
    let seenTs = (S().level || {}).ts || 0;
    document.addEventListener("me:progress", () => {
      const s = S(), lv = s.level;
      if (!lv || lv.ts === seenTs) return;
      seenTs = lv.ts;
      const prev = (s.levels || []).slice(-1)[0];
      if (!prev) return;
      const up = LEVELS.indexOf(lv.level) - LEVELS.indexOf(prev.level);
      celebrate(up > 0 ? `📈 من ${prev.level} إلى ${lv.level}!` : `مستواك الآن ${lv.level}`, up > 0 ? "تقدّمك حقيقي. استمر!" : `آخر مرة: ${prev.level}. التدريب اليومي يرفعه.`);
    });
  }

  // ---- 5. phrase review (flashcards, spaced repetition) ----
  function duePhrases(max) {
    const s = S(), now = Date.now();
    return (s.phrases || []).filter((p) => { const r = (s.review || {})[p.en]; return !r || r.due <= now; }).slice(0, max);
  }
  function reviewGame(host, max, onDone) {
    const queue = duePhrases(max);
    if (!queue.length) {
      host.innerHTML = (S().phrases || []).length
        ? `<p class="ml-empty">✓ لا عبارات للمراجعة الآن. ستعود كل عبارة في وقتها (بعد يوم، ثم يومين، ثم ٤...).</p>`
        : `<p class="ml-empty">احفظ عبارات من الدروس (زر 🔊 ثم «احفظ العبارة») لتراجعها هنا كلعبة بطاقات.</p>`;
      if (onDone) onDone(0);
      return;
    }
    let i = 0, knewCount = 0;
    const show = () => {
      if (i >= queue.length) {
        host.innerHTML = `<div class="mp-card-done">🧠 راجعت ${AR(queue.length)} ${queue.length === 1 ? "عبارة" : queue.length === 2 ? "عبارتين" : "عبارات"}، وعرفت ${AR(knewCount)}. أحسنت!</div>`;
        track("review_done", queue.length + ":" + knewCount);
        checkBadges();
        if (onDone) onDone(queue.length);
        return;
      }
      const p = queue[i];
      host.innerHTML = `<div class="mp-card">
        <div class="mp-card-count">${AR(i + 1)} / ${AR(queue.length)}</div>
        <div class="mp-card-en" lang="en" dir="ltr">${esc(p.en)}</div>
        <button type="button" class="btn btn-ghost mp-card-say">🔊 استمع</button>
        <p class="mp-card-hint">هل تعرف معناها وتستطيع قولها في جملة؟</p>
        <div class="mp-card-back" hidden>من: <a href="${esc(p.src || "#")}">${esc(p.title || "درس")}</a></div>
        <div class="mp-card-actions">
          <button type="button" class="btn btn-ghost" data-k="0">أراجعها</button>
          <button type="button" class="btn btn-primary" data-k="1">عرفتها ✓</button>
        </div></div>`;
      L().speak(p.en);
      host.querySelector(".mp-card-say").addEventListener("click", () => L().speak(p.en));
      host.querySelectorAll("[data-k]").forEach((b) => b.addEventListener("click", () => {
        const knew = b.dataset.k === "1";
        if (knew) { knewCount++; ding(false); }
        L().reviewPhrase(p.en, knew);
        i++;
        show();
      }));
    };
    show();
  }

  // ---- 6. my-learning.html: badges + review ----
  function myLearning() {
    if (PATH !== "/my-learning.html") return;
    const stats = document.getElementById("mlStats");
    if (!stats) return;
    const badges = document.createElement("div");
    badges.className = "ml-card";
    badges.id = "mpBadges";
    const review = document.createElement("div");
    review.className = "ml-card";
    review.innerHTML = `<h2>🧠 راجع عباراتك</h2><div id="mpReview"></div>`;
    stats.insertAdjacentElement("afterend", review);
    stats.insertAdjacentElement("afterend", badges);
    const goalCard = document.createElement("div");
    goalCard.className = "ml-card";
    goalCard.appendChild(goalBox());
    stats.insertAdjacentElement("afterend", goalCard);
    const paintBadges = () => {
      const s = S(), got = s.badges || {}, st = L().streak();
      const n = BADGES.filter(([id]) => got[id]).length;
      badges.innerHTML = `<h2>🏅 شاراتي (${AR(n)} من ${AR(BADGES.length)})</h2>
        <p class="mp-streak-line">🔥 سلسلتك: <b>${AR(st.n)}</b> ${days(st.n)} متتالية${st.today ? " · أنهيت اليوم ✓" : ` · <a href="daily.html">تحدي اليوم (٥ دقائق)</a>`}${st.n >= 2 ? ` · <button type="button" class="me-link" id="mpShareStreak">📤 شارك سلسلتك</button>` : ""}</p>
        <p class="mp-sound"><label><input type="checkbox" id="mpSound"${soundOn() ? " checked" : ""}> 🔔 صوت عند الإجابة الصحيحة</label></p>
        <div class="mp-badges">${BADGES.map(([id, icon, name, how]) => `<div class="mp-badge${got[id] ? " got" : ""}" title="${esc(how)}"><span>${icon}</span><b>${esc(name)}</b><small>${esc(how)}</small></div>`).join("")}</div>`;
      const sh = badges.querySelector("#mpShareStreak");
      if (sh) sh.addEventListener("click", () => learnerName().then((nm) => shareCard(`🔥 ${AR(st.n)}`, `${AR(st.n)} ${days(st.n)} متتالية من الإنجليزية`, `و${AR(n)} شارات على أتقن الإنجليزية`, nm.split(/\s+/)[0])));
      badges.querySelector("#mpSound").addEventListener("change", (e) => { try { localStorage.setItem("me_sound", e.target.checked ? "1" : "0"); } catch (x) {} ding(true); });
    };
    paintBadges();
    document.addEventListener("me:progress", paintBadges);
    reviewGame(document.getElementById("mpReview"), 10);
  }

  // ---- 7. daily.html: the 5-minute challenge ----
  function daily() {
    const host = document.getElementById("mpDaily");
    if (!host) return;
    const [en, ar] = phraseToday();
    const others = PHRASES.filter((p) => p[0] !== en);
    const pick = others[todayIndex() % others.length][1], pick2 = others[(todayIndex() * 7 + 3) % others.length][1];
    const choices = [ar, pick, pick2 === pick ? others[(todayIndex() + 11) % others.length][1] : pick2].sort((a, b) => (a.length * 7 + todayIndex()) % 5 - (b.length * 7 + todayIndex()) % 5);
    const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
    const words = (s) => String(s).toLowerCase().replace(/[^a-z' ]/g, " ").split(/\s+/).filter(Boolean);
    const done = { listen: false, say: false, quiz: false, review: false };
    const st = L().streak();
    host.innerHTML = `
      <div class="mp-daily-head"><div class="mp-daily-fire${st.today ? "" : " cold"}">🔥 <b id="mpDayStreak">${AR(st.n)}</b> <span>${days(st.n)} متتالية</span></div>
        <div class="mp-daily-steps"><i data-s="listen"></i><i data-s="say"></i><i data-s="quiz"></i><i data-s="review"></i></div></div>
      <section class="mp-step" data-step="listen"><h2>١. استمع</h2>
        <div class="mp-phrase" lang="en" dir="ltr">${esc(en)}</div>
        <button type="button" class="btn btn-primary" id="mpListen">🔊 استمع للعبارة</button> <button type="button" class="btn btn-ghost" id="mpSlow">🐢 ببطء</button></section>
      <section class="mp-step" data-step="say"><h2>٢. قلها بصوتك</h2>
        <p>${Rec ? "اضغط وقل العبارة بصوت واضح. سنخبرك كم كلمة وصلت." : "قلها بصوت عالٍ ٣ مرات، ثم اضغط «قلتها»."}</p>
        <button type="button" class="sp-mic" id="mpMic">${Rec ? "🎙️ اضغط وقلها" : "✓ قلتها ٣ مرات"}</button>
        <div class="mp-say-result" id="mpSayResult" role="status"></div></section>
      <section class="mp-step" data-step="quiz"><h2>٣. ما معناها؟</h2>
        <div class="mp-choices">${choices.map((c) => `<button type="button" class="mp-choice" data-ok="${c === ar ? 1 : 0}">${esc(c)}</button>`).join("")}</div>
        <div class="mp-quiz-result" id="mpQuizResult" role="status"></div></section>
      <section class="mp-step" data-step="review"><h2>٤. راجع عباراتك</h2><div id="mpDailyReview"></div></section>
      <div class="mp-finish" id="mpFinish" hidden></div>
      <div id="mpDailyExtra"></div>`;
    const extra = host.querySelector("#mpDailyExtra");
    extra.appendChild(goalBox());
    wordOfWeek(extra);
    const mark = (k) => {
      if (done[k]) return;
      done[k] = true;
      host.querySelector(`[data-s="${k}"]`).classList.add("on");
      host.querySelector(`[data-step="${k}"]`).classList.add("done");
      if (Object.values(done).every(Boolean)) finish();
    };
    host.querySelector("#mpListen").addEventListener("click", () => { L().speak(en); track("tts_play", en); mark("listen"); });
    host.querySelector("#mpSlow").addEventListener("click", () => {
      if (!("speechSynthesis" in window)) return;
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(en); u.lang = "en-US"; u.rate = 0.6; speechSynthesis.speak(u);
      mark("listen");
    });
    const mic = host.querySelector("#mpMic"), out = host.querySelector("#mpSayResult");
    mic.addEventListener("click", () => {
      if (!Rec) { mark("say"); out.textContent = "ممتاز! التكرار بصوت عالٍ هو ما يبني الكلام."; return; }
      const rec = new Rec();
      rec.lang = "en-US"; rec.interimResults = false; rec.maxAlternatives = 5;
      rec.onstart = () => { mic.classList.add("on"); mic.textContent = "⏺ نستمع… تكلّم الآن"; };
      rec.onend = () => { mic.classList.remove("on"); mic.textContent = "🎙️ جرّب مرة أخرى"; };
      rec.onerror = (e) => { out.innerHTML = e.error === "not-allowed" ? "اسمح للموقع باستعمال الميكروفون ثم جرّب." : "لم نسمعك جيداً. جرّب مرة أخرى."; };
      rec.onresult = (e) => {
        const said = new Set([...e.results[0]].flatMap((a) => words(a.transcript)));
        const target = words(en), pct = Math.round(target.filter((w) => said.has(w)).length / target.length * 100);
        const r = L().recordSpeak("daily:" + en, pct);
        out.innerHTML = `<b>${pct >= 80 ? "ممتاز!" : pct >= 50 ? "قريب جداً!" : "جرّب مرة أخرى"} ${AR(pct)}٪</b>` + (r.prev && pct > r.prev ? " · 🎉 رقم قياسي جديد!" : r.prev ? ` · أفضل نتيجة لك: ${AR(r.best)}٪` : "")
          + `<div class="sp-words">${target.map((w) => `<span class="${said.has(w) ? "hit" : "miss"}">${esc(w)}</span>`).join("")}</div>`;
        track("speak_score", "daily:" + pct);
        if (pct >= 50) mark("say");
      };
      rec.start();
    });
    host.querySelectorAll(".mp-choice").forEach((b) => b.addEventListener("click", () => {
      const ok = b.dataset.ok === "1";
      b.classList.add(ok ? "ok" : "no");
      host.querySelector("#mpQuizResult").textContent = ok ? "✓ صحيح!" : "ليست هذه. جرّب مرة أخرى.";
      if (ok) { ding(true); host.querySelectorAll(".mp-choice").forEach((x) => (x.disabled = true)); mark("quiz"); }
    }));
    reviewGame(host.querySelector("#mpDailyReview"), 5, () => mark("review"));
    function finish() {
      L().markDaily();
      track("daily_challenge", "done");
      const s2 = L().streak();
      host.querySelector("#mpDayStreak").textContent = AR(s2.n);
      host.querySelector(".mp-daily-fire").classList.remove("cold");
      const f = host.querySelector("#mpFinish");
      f.hidden = false;
      f.innerHTML = `<h2>🔥 أنهيت تحدي اليوم!</h2><p>سلسلتك الآن <b>${AR(s2.n)}</b> ${days(s2.n)} متتالية. تعال غداً لعبارة جديدة.</p>
        <p><button type="button" class="btn btn-primary" id="mpShare">📤 شارك إنجازك</button> <a class="btn btn-ghost" href="${ROOT}my-learning.html">شاراتي وتقدّمي</a> <a class="btn btn-ghost" href="${ROOT}challenge.html">تحدي الشهر</a></p>`;
      f.querySelector("#mpShare").addEventListener("click", () => learnerName().then((nm) => shareCard(`🔥 ${AR(s2.n)}`, `${AR(s2.n)} ${days(s2.n)} متتالية من الإنجليزية`, "تحدي ٥ دقائق كل يوم مع نور", nm.split(/\s+/)[0])));
      celebrate("🔥 أنهيت تحدي اليوم!", `${AR(s2.n)} ${days(s2.n)} متتالية`);
      setTimeout(checkBadges, 4500);
    }
  }

  // ---- 8. challenge.html: monthly community challenge ----
  function challenge() {
    const host = document.getElementById("mpChallenge");
    if (!host) return;
    const month = new Date().toISOString().slice(0, 7);
    const monthName = new Intl.DateTimeFormat("ar", { month: "long" }).format(new Date());
    const paint = (stats) => {
      const s = S(), joined = !!(s.challenge || {})[month];
      const mine = [...L().activeDays()].filter((d) => d.startsWith(month)).length;
      const dim = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
      host.innerHTML = `
        <div class="mp-ch-total"><b>${stats ? AR(stats.days) : "…"}</b><span>تحدياً يومياً أنهاه المتعلمون في ${esc(monthName)}</span>
          ${stats && stats.people ? `<small>${AR(stats.people)} شخصاً شاركوا حتى الآن</small>` : ""}</div>
        <div class="mp-ch-me">
          <h2>${joined ? "أنت في التحدي ✓" : `تحدي ${esc(monthName)}: ٣٠ يوماً من الكلام`}</h2>
          <p>${joined ? `تعلّمت ${AR(mine)} من ${AR(dim)} يوماً هذا الشهر.` : "كل يوم: تحدي ٥ دقائق (استمع، قل، أجب، راجع). يومك يُضاف إلى مجموع الجميع."}</p>
          <div class="mp-bar"><span style="width:${Math.round(mine / dim * 100)}%"></span></div>
          <p>${joined ? `<a class="btn btn-primary" href="${ROOT}daily.html">تحدي اليوم ←</a>` : `<button type="button" class="btn btn-primary" id="mpJoin">انضم للتحدي</button>`}
          <a class="btn btn-ghost" href="https://t.me/noormasterenglish" target="_blank" rel="noopener">شاركنا على تيليغرام</a></p>
        </div>`;
      const j = host.querySelector("#mpJoin");
      if (j) j.addEventListener("click", () => { L().setFlag("challenge", month); track("challenge_join", month); checkBadges(); paint(stats); });
    };
    paint(null);
    fetch(API + "/stats/challenge").then((r) => r.json()).then(paint).catch(() => {});
  }

  function init() {
    streakChip();
    pathProgress();
    retestBanner();
    levelUpWatch();
    myLearning();
    daily();
    challenge();
    recap();
    setTimeout(checkBadges, 1500);
    let t = null;
    document.addEventListener("me:progress", () => { clearTimeout(t); t = setTimeout(checkBadges, 800); });
  }
  window.MEPlay = { celebrate, phraseToday, checkBadges };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
