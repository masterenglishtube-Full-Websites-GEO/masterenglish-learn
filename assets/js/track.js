// Lightweight page-view + engagement tracking.
// Sends a pageview on load, then heartbeats accumulated "engaged" seconds
// (tab visible AND user active in the last 60s) every 15s and on unload.
// A session ends after 30 minutes without activity (the next visit starts a new one),
// so "returning visitors" = one visitor id with several sessions. Noor's own browsers
// (admin.html sets me_internal, or any page opened once with ?internal=1) are not tracked.
(function () {
  const API = "https://soft-wave-c3e8-masterenglish-fulfillment.masterenglishtube.workers.dev";
  const SESSION_IDLE_MS = 30 * 60 * 1000;

  try {
    if (/[?&]internal=1/.test(location.search)) localStorage.setItem("me_internal", "1");
    if (localStorage.getItem("me_internal") === "1") return;
  } catch (e) {}

  function getSessionId() {
    try {
      let id = localStorage.getItem("me_sid");
      const last = parseInt(localStorage.getItem("me_sid_at"), 10) || 0;
      if (!id || Date.now() - last > SESSION_IDLE_MS) {
        id = crypto.randomUUID();
        localStorage.setItem("me_sid", id);
      }
      localStorage.setItem("me_sid_at", String(Date.now()));
      return id;
    } catch (e) {
      return "no-storage";
    }
  }
  function touchSession() {
    try { localStorage.setItem("me_sid_at", String(Date.now())); } catch (e) {}
  }

  // Long-lived visitor id, separate from the session id above: this one
  // persists indefinitely (until the visitor clears storage) so a return
  // visit is still recognizable as "the same person" before they ever log
  // in, when me_sid alone would otherwise look like a brand-new visitor.
  function getVisitorId() {
    try {
      let id = localStorage.getItem("me_vid");
      if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem("me_vid", id);
      }
      return id;
    } catch (e) {
      return null;
    }
  }

  function getAuthToken() {
    try {
      return localStorage.getItem("me_auth_token") || null;
    } catch (e) {
      return null;
    }
  }

  function authHeaders() {
    const token = getAuthToken();
    return token ? { Authorization: "Bearer " + token } : {};
  }

  const sessionId = getSessionId();
  const visitorId = getVisitorId();
  let pageViewId = null;
  let engagedSeconds = 0;
  let lastActiveAt = Date.now();
  let visible = document.visibilityState === "visible";
  let maxScrollPct = 0;

  function computeScrollPct() {
    const doc = document.documentElement;
    const scrollable = Math.max(1, doc.scrollHeight - doc.clientHeight);
    const pct = Math.round(((window.scrollY || doc.scrollTop) / scrollable) * 100);
    return Math.max(0, Math.min(100, pct));
  }
  let scrollTicking = false;
  window.addEventListener("scroll", () => {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(() => {
      maxScrollPct = Math.max(maxScrollPct, computeScrollPct());
      scrollTicking = false;
    });
  }, { passive: true });

  document.addEventListener("visibilitychange", () => {
    visible = document.visibilityState === "visible";
    if (visible) lastActiveAt = Date.now();
  });
  ["mousemove", "keydown", "scroll", "touchstart"].forEach((evt) => {
    window.addEventListener(evt, () => { lastActiveAt = Date.now(); }, { passive: true });
  });

  // A tagged link (?utm_source=telegram&utm_campaign=site_launch) becomes the visit's source,
  // "utm:telegram/site_launch", so a post on Telegram, YouTube or by email can be measured even
  // when the app sends no referrer. The dashboard's sources table groups it as "utm:telegram".
  function sourceOf() {
    try {
      const q = new URLSearchParams(location.search);
      const clean = (v, n) => (v || "").toLowerCase().replace(/[^a-z0-9_.-]/g, "").slice(0, n);
      const src = clean(q.get("utm_source"), 40);
      if (src) {
        const camp = clean(q.get("utm_campaign"), 60);
        return "utm:" + src + (camp ? "/" + camp : "");
      }
    } catch (e) {}
    return document.referrer || "";
  }

  fetch(API + "/track/pageview", {
    method: "POST",
    headers: Object.assign({ "Content-Type": "application/json" }, authHeaders()),
    body: JSON.stringify({
      session_id: sessionId,
      visitor_id: visitorId,
      path: location.pathname,
      referrer: sourceOf(),
    }),
  })
    .then((r) => r.json())
    .then((data) => { pageViewId = data.page_view_id || null; })
    .catch(() => {});

  function sendHeartbeat(useBeacon) {
    if (!pageViewId) return;
    touchSession();
    const payload = JSON.stringify({
      page_view_id: pageViewId,
      session_id: sessionId,
      engaged_seconds: Math.round(engagedSeconds),
      scroll_pct: Math.max(maxScrollPct, computeScrollPct()),
    });
    if (useBeacon && navigator.sendBeacon) {
      navigator.sendBeacon(API + "/track/heartbeat", new Blob([payload], { type: "text/plain;charset=UTF-8" }));
    } else {
      fetch(API + "/track/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  }

  setInterval(() => {
    const idleFor = Date.now() - lastActiveAt;
    if (visible && idleFor < 60000) engagedSeconds += 1;
  }, 1000);

  setInterval(() => sendHeartbeat(false), 15000);

  window.addEventListener("pagehide", () => sendHeartbeat(true));
})();
