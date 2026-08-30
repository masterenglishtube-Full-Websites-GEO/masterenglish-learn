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

  const sessionId = getSessionId();
  let pageViewId = null;
  let engagedSeconds = 0;
  let lastActiveAt = Date.now();
  let visible = document.visibilityState === "visible";

  document.addEventListener("visibilitychange", () => {
    visible = document.visibilityState === "visible";
    if (visible) lastActiveAt = Date.now();
  });
  ["mousemove", "keydown", "scroll", "touchstart"].forEach((evt) => {
    window.addEventListener(evt, () => { lastActiveAt = Date.now(); }, { passive: true });
  });

  fetch(API + "/track/pageview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_id: sessionId,
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
    });
    if (useBeacon && navigator.sendBeacon) {
      navigator.sendBeacon(API + "/track/heartbeat", new Blob([payload], { type: "application/json" }));
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
