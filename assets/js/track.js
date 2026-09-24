// Lightweight page-view + engagement tracking.
// Sends a pageview on load, then heartbeats accumulated "engaged" seconds
// (tab visible AND user active in the last 60s) every 15s and on unload.
(function () {
  const API = "https://soft-wave-c3e8-masterenglish-fulfillment.masterenglishtube.workers.dev";

  function getSessionId() {
    try {
      let id = localStorage.getItem("me_sid");
      if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem("me_sid", id);
      }
      return id;
    } catch (e) {
      return "no-storage";
    }
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

  fetch(API + "/track/pageview", {
    method: "POST",
    headers: Object.assign({ "Content-Type": "application/json" }, authHeaders()),
    body: JSON.stringify({
      session_id: sessionId,
      visitor_id: visitorId,
      path: location.pathname,
      referrer: document.referrer || "",
    }),
  })
    .then((r) => r.json())
    .then((data) => { pageViewId = data.page_view_id || null; })
    .catch(() => {});

  function sendHeartbeat(useBeacon) {
    if (!pageViewId) return;
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
