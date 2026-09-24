// Learner layer, loaded on every public page:
//  1. counts clicks to YouTube (video vs subscribe) so admin analytics shows which
//     pages feed the channel;
//  2. keeps the learner's progress (articles read, quiz scores, placement level,
//     saved phrases, last page) in localStorage, and syncs it to the account when
//     the visitor is signed in (same me_auth_token as the header login);
//  3. adds a "listen" button to English phrases inside article text (browser
//     speech synthesis, American voice) with an option to save the phrase.
// Other scripts use window.MELearner.recordQuiz(key, score, total) etc.
(function () {
  const API = "https://soft-wave-c3e8-masterenglish-fulfillment.masterenglishtube.workers.dev";
  const KEY = "me_progress";
  const TOKEN_KEY = "me_auth_token";

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  };

  // ---- events ------------------------------------------------------------
  function track(type, target) {
    const body = JSON.stringify({ event_type: type, target: target || "", path: location.pathname, session_id: store.get("me_sid"), visitor_id: store.get("me_vid") });
    try {
      if (navigator.sendBeacon) navigator.sendBeacon(API + "/track/event", new Blob([body], { type: "text/plain;charset=UTF-8" }));
      else fetch(API + "/track/event", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true });
    } catch (e) {}
  }

  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href]");
    if (!a || a.hasAttribute("data-seek")) return;
    const href = a.href;
    if (!/youtube\.com|youtu\.be/.test(href)) return;
    if (/sub_confirmation/.test(href)) return track("yt_subscribe", href);
    const m = href.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/);
    track("yt_click", m ? m[1] : href);
    if (m) markWatched(m[1]);
  }, true);

  // Chapter links under an embedded lesson: jump the embed to that moment.
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[data-seek]");
    if (!a) return;
    const frame = document.querySelector('iframe[src*="/embed/' + a.dataset.video + '"]');
    if (!frame) return;
    e.preventDefault();
    frame.src = frame.src.split("?")[0] + "?start=" + a.dataset.seek + "&autoplay=1";
    frame.scrollIntoView({ behavior: "smooth", block: "center" });
    track("video_play", a.dataset.video + "@" + a.dataset.seek);
    markWatched(a.dataset.video);
  });

  // Plays of embedded lesson videos: the iframe takes focus when clicked.
  window.addEventListener("blur", () => {
    const f = document.activeElement;
    if (f && f.tagName === "IFRAME" && /youtube/.test(f.src)) {
      const m = f.src.match(/embed\/([A-Za-z0-9_-]{11})/);
      track("video_play", m ? m[1] : "");
      if (m) markWatched(m[1]);
    }
  });

  // ---- progress ----------------------------------------------------------
  function load() {
    try { return JSON.parse(store.get(KEY)) || {}; } catch (e) { return {}; }
  }
  let state = Object.assign({ read: {}, watched: {}, quizzes: {}, phrases: [], level: null, last: null }, load());
  if (!state.watched) state.watched = {};

  function markWatched(id) {
    state.watched[id] = Date.now();
    save();
    document.dispatchEvent(new CustomEvent("me:progress"));
  }
  let syncTimer = null;

  function save() {
    store.set(KEY, JSON.stringify(state));
    const token = store.get(TOKEN_KEY);
    if (!token) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => {
      fetch(API + "/learner/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ progress: state }),
        keepalive: true,
      }).then((r) => r.ok ? r.json() : null).then((d) => {
        if (d && d.progress) { state = d.progress; store.set(KEY, JSON.stringify(state)); }
      }).catch(() => {});
    }, 1500);
  }

  function pullFromAccount() {
    const token = store.get(TOKEN_KEY);
    if (!token || sessionStorage.getItem("me_progress_pulled")) return;
    fetch(API + "/learner/progress", { headers: { Authorization: "Bearer " + token } })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        try { sessionStorage.setItem("me_progress_pulled", "1"); } catch (e) {}
        if (d && d.progress) save(); // server merges its copy with ours and returns the union
        else if (Object.keys(state.read).length || state.phrases.length) save();
      }).catch(() => {});
  }

  const api = {
    get: () => state,
    recordQuiz(key, score, total) {
      const cur = state.quizzes[key];
      if (!cur || score >= cur.score) state.quizzes[key] = { score, total, ts: Date.now() };
      save();
      track("quiz_done", key + ":" + score + "/" + total);
    },
    setLevel(level, score) {
      state.level = { level, score, ts: Date.now() };
      save();
      track("placement_done", level);
    },
    savePhrase(en, title) {
      if (!en) return;
      state.phrases = state.phrases.filter((p) => p.en.toLowerCase() !== en.toLowerCase());
      state.phrases.unshift({ en, src: location.pathname, title: title || document.title.split("|")[0].trim(), ts: Date.now() });
      state.phrases = state.phrases.slice(0, 300);
      save();
    },
    removePhrase(en) {
      state.phrases = state.phrases.filter((p) => p.en !== en);
      save();
    },
    track,
    speak,
  };
  window.MELearner = api;

  // Article read = 60% scrolled after at least 25 seconds on the page.
  const isArticle = /\/articles\/(?!index)[^/]+\.html$/.test(location.pathname);
  const pageTitle = (document.querySelector("h1") || {}).textContent || document.title;
  if (isArticle || /\/(products|paths|topics|lessons|guides)\//.test(location.pathname)) {
    state.last = { path: location.pathname, title: pageTitle.trim().slice(0, 160), ts: Date.now() };
    store.set(KEY, JSON.stringify(state));
  }
  if (isArticle) {
    const started = Date.now();
    let done = !!state.read[location.pathname];
    window.addEventListener("scroll", () => {
      if (done) return;
      const doc = document.documentElement;
      const pct = (window.scrollY + doc.clientHeight) / Math.max(1, doc.scrollHeight);
      if (pct > 0.6 && Date.now() - started > 25000) {
        done = true;
        state.read[location.pathname] = Date.now();
        save();
      }
    }, { passive: true });
  }

  // ---- listen to English phrases ------------------------------------------
  let voice = null;
  function pickVoice() {
    if (!("speechSynthesis" in window)) return null;
    const voices = speechSynthesis.getVoices();
    return voices.find((v) => /en[-_]US/i.test(v.lang) && /google|samantha|aria|jenny|natural/i.test(v.name)) ||
      voices.find((v) => /en[-_]US/i.test(v.lang)) || voices.find((v) => /^en/i.test(v.lang)) || null;
  }
  if ("speechSynthesis" in window) {
    voice = pickVoice();
    speechSynthesis.onvoiceschanged = () => { voice = pickVoice(); };
  }
  function speak(text) {
    if (!("speechSynthesis" in window)) return false;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    if (voice) u.voice = voice;
    u.rate = 0.9;
    speechSynthesis.speak(u);
    return true;
  }

  const SKIP = /^(master english|youtube|google|udemy|coursera|zoom|teams|pdf|ielts|toefl|cefr|chatgpt|ai|in english|ok|a1|a2|b1|b2|c1|c2|the commuter challenge|pace|stripe|whatsapp|linkedin|email|e-?mail)$/i;
  const PHRASE_RE = /[A-Za-z][A-Za-z'’-]*(?:[ \t]*[,]?[ \t]+[A-Za-z][A-Za-z'’-]*)*(?:[ \t]*(?:\.\.\.|…|[?!.]))?/g;

  let toast = null;
  function showToast(text) {
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "me-say-toast";
      toast.setAttribute("role", "status");
      document.body.appendChild(toast);
    }
    toast.innerHTML = "";
    const label = document.createElement("span");
    label.lang = "en"; label.dir = "ltr";
    label.textContent = "🔊 " + text;
    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    const saved = state.phrases.some((p) => p.en.toLowerCase() === text.toLowerCase());
    saveBtn.textContent = saved ? "✓ محفوظة" : "☆ احفظ العبارة";
    saveBtn.disabled = saved;
    saveBtn.addEventListener("click", () => {
      api.savePhrase(text);
      saveBtn.textContent = "✓ محفوظة";
      saveBtn.disabled = true;
    });
    const link = document.createElement("a");
    link.href = (location.pathname.includes("/articles/") || /\/(paths|topics|lessons|guides)\//.test(location.pathname) ? "../" : "") + "my-learning.html";
    link.textContent = "عباراتي";
    toast.append(label, saveBtn, link);
    toast.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toast.classList.remove("show"), 6000);
  }

  function addListenButtons() {
    if (!("speechSynthesis" in window)) return;
    const roots = document.querySelectorAll(".article-body .prose, .guide-body");
    roots.forEach((root) => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          const p = node.parentElement;
          if (!p || !/[A-Za-z]{2}/.test(node.nodeValue)) return NodeFilter.FILTER_REJECT;
          if (p.closest("a, button, script, style, code, .en-note, .video-caption, .author-box, .related-links, #relatedVideosWidget, .article-cta, .quiz-choice, .me-say, h1, h2, .breadcrumb, .article-meta, [data-no-say], .lesson-quiz, .quiz-q, .dlg b, .vocab-head")) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        },
      });
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach((node) => {
        const text = node.nodeValue;
        PHRASE_RE.lastIndex = 0;
        const parts = [];
        let last = 0, m;
        while ((m = PHRASE_RE.exec(text))) {
          const phrase = m[0].trim();
          const letters = phrase.replace(/[^A-Za-z]/g, "");
          if (letters.length < 3 || SKIP.test(phrase.replace(/[?!.…]+$/, ""))) continue;
          parts.push([m.index, m.index + m[0].length, phrase]);
        }
        if (!parts.length) return;
        const frag = document.createDocumentFragment();
        parts.forEach(([s, e, phrase]) => {
          if (s > last) frag.appendChild(document.createTextNode(text.slice(last, s)));
          const span = document.createElement("span");
          span.className = "me-say";
          span.lang = "en";
          span.textContent = text.slice(s, e);
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "me-say-btn";
          btn.setAttribute("aria-label", "استمع: " + phrase);
          btn.textContent = "🔊";
          btn.addEventListener("click", () => {
            speak(phrase);
            showToast(phrase);
            track("tts_play", phrase.slice(0, 120));
          });
          span.appendChild(btn);
          frag.appendChild(span);
          last = e;
        });
        if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
        node.parentNode.replaceChild(frag, node);
      });
    });
  }

  function init() {
    addListenButtons();
    pullFromAccount();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
