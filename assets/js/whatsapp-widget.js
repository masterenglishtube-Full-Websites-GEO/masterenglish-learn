// Floating WhatsApp button (bottom-left, stacked above the contact button).
// Hidden by default -- only revealed to visitors who show real buying intent,
// not shown upfront to every browser. Once revealed in a session it stays
// revealed across page views (sessionStorage), since a qualified lead
// shouldn't have to re-qualify on every page.
(function () {
  const PHONE = "905373195045"; // +90 537 319 50 45
  const QUALIFY_SCORE = 2;
  const SESSION_KEY = "me_wa_qualified";
  const SCORE_KEY = "me_wa_score";
  const PRODUCT_PATH_HINT = /\/products\/|courses\.html/;

  function getScore() {
    return parseInt(sessionStorage.getItem(SCORE_KEY) || "0", 10) || 0;
  }
  function addScore(points) {
    try {
      if (sessionStorage.getItem(SESSION_KEY) === "1") return;
      const next = getScore() + points;
      sessionStorage.setItem(SCORE_KEY, String(next));
      if (next >= QUALIFY_SCORE) qualify();
    } catch (e) {}
  }
  function qualify() {
    try { sessionStorage.setItem(SESSION_KEY, "1"); } catch (e) {}
    reveal();
  }
  function isQualified() {
    try { return sessionStorage.getItem(SESSION_KEY) === "1"; } catch (e) { return false; }
  }

  function buildMessage() {
    const page = (document.title || "").split("|")[0].trim() || location.pathname;
    return `مرحباً، أنا مهتم بالتواصل بخصوص: ${page} (من موقع أتقن الإنجليزية).`;
  }

  let btn, tooltip;
  function reveal() {
    if (!btn) return;
    const href = "https://wa.me/" + PHONE + "?text=" + encodeURIComponent(buildMessage());
    btn.href = href;
    btn.classList.add("show");
  }

  document.addEventListener("DOMContentLoaded", () => {
    btn = document.createElement("a");
    btn.id = "meWhatsappBtn";
    btn.target = "_blank";
    btn.rel = "noopener";
    btn.setAttribute("aria-label", "تواصل معنا عبر واتساب");
    btn.innerHTML = `<svg viewBox="0 0 32 32" width="28" height="28" fill="#fff" aria-hidden="true"><path d="M16.02 3C9.4 3 4 8.4 4 15.02c0 2.39.63 4.63 1.72 6.57L4 29l7.6-1.66a11.96 11.96 0 0 0 4.42.84h.01c6.62 0 12.02-5.4 12.02-12.02C28.05 8.4 22.65 3 16.02 3zm0 21.85h-.01a9.93 9.93 0 0 1-5.05-1.38l-.36-.21-4.49.98 1-4.37-.24-.38a9.88 9.88 0 0 1-1.5-5.27c0-5.46 4.45-9.91 9.92-9.91 2.65 0 5.14 1.03 7.01 2.9a9.85 9.85 0 0 1 2.9 7.02c0 5.47-4.45 9.92-9.18 9.62zm5.44-7.44c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.24-.46-2.36-1.46-.87-.78-1.46-1.74-1.63-2.04-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.6-.91-2.2-.24-.58-.48-.5-.67-.5-.17 0-.37-.02-.57-.02s-.52.07-.8.37c-.27.3-1.04 1.02-1.04 2.48s1.07 2.87 1.22 3.07c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.08 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.13-.27-.2-.57-.35z"/></svg>`;

    tooltip = document.createElement("span");
    tooltip.className = "me-wa-tooltip";
    tooltip.textContent = "تواصل معنا عبر واتساب";

    document.body.appendChild(btn);
    document.body.appendChild(tooltip);

    if (isQualified()) {
      reveal();
    } else {
      if (PRODUCT_PATH_HINT.test(location.pathname)) {
        setTimeout(() => addScore(2), 25000);
      }
      document.addEventListener("me:question-asked", () => addScore(1));
      document.addEventListener("me:escalate-requested", () => addScore(2));
    }
  });
})();
