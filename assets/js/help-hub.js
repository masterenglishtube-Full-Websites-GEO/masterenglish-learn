// One "help" button instead of several floating ones (Hick's law: fewer choices on screen,
// faster decisions). It opens a short menu: the instant help bot, a message to Noor, and
// WhatsApp for visitors who already showed buying interest (whatsapp-widget.js decides).
// The original widgets still do the work; their own round buttons are just hidden.
(function () {
  if (document.getElementById("meHelpHub")) return;
  let tries = 0;

  function start() {
    const bot = document.getElementById("meHelpBotBtn");
    const contact = document.getElementById("meContactBtn");
    if (!bot && !contact) { if (++tries < 20) setTimeout(start, 150); return; }

    document.body.classList.add("me-hub");
    const hub = document.createElement("div");
    hub.id = "meHelpHub";
    hub.innerHTML = `
      <div class="me-hub-menu" id="meHubMenu" role="menu" hidden>
        ${bot ? `<button type="button" role="menuitem" data-act="bot"><b>اسأل المساعد الآلي</b><span>إجابة فورية عن الكورسات والأسعار والبداية</span></button>` : ""}
        ${contact ? `<button type="button" role="menuitem" data-act="contact"><b>راسل نور</b><span>رسالتك تصل بريدها وترد عليك شخصياً</span></button>` : ""}
        <a role="menuitem" data-act="wa" target="_blank" rel="noopener" hidden><b>واتساب</b><span>للحجز أو سؤال سريع عن الكورسات</span></a>
      </div>
      <button type="button" class="me-hub-btn" id="meHubBtn" aria-expanded="false" aria-controls="meHubMenu">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 9h8"/><path d="M8 13h6"/><path d="M18 4a3 3 0 0 1 3 3v8a3 3 0 0 1 -3 3h-5l-5 3v-3h-2a3 3 0 0 1 -3 -3v-8a3 3 0 0 1 3 -3h12z"/></svg>
        <span>مساعدة</span>
      </button>`;
    document.body.appendChild(hub);

    const btn = hub.querySelector("#meHubBtn");
    const menu = hub.querySelector("#meHubMenu");
    const wa = hub.querySelector('[data-act="wa"]');
    const setOpen = (open) => {
      menu.hidden = !open;
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      if (open) {
        const w = document.getElementById("meWhatsappBtn");
        const show = !!(w && w.classList.contains("show") && w.href);
        wa.hidden = !show;
        if (show) wa.href = w.href;
      }
    };
    btn.addEventListener("click", () => setOpen(menu.hidden));
    document.addEventListener("click", (e) => { if (!hub.contains(e.target)) setOpen(false); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !menu.hidden) { setOpen(false); btn.focus(); } });
    menu.addEventListener("click", (e) => {
      const item = e.target.closest("[data-act]");
      if (!item) return;
      const act = item.dataset.act;
      if (act !== "wa") e.preventDefault();
      setOpen(false);
      if (act === "bot" && bot) bot.click();
      if (act === "contact" && contact) contact.click();
      if (window.MELearner) window.MELearner.track("nav_tab", "help:" + act);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
