// Floating AI help bot (bottom-right). Clearly labeled as automated.
// Requires an email before chatting (so every conversation is tied to a real
// person in the CRM, same pattern as the contact widget and newsletter signup).
// Proactively offers to forward the conversation to Noor by email.
(function () {
  const API = "https://soft-wave-c3e8-masterenglish-fulfillment.masterenglishtube.workers.dev";

  let visitorEmail = null;
  let lastQuestion = "";
  let lastAnswer = "";

  const btn = document.createElement("button");
  btn.id = "meHelpBotBtn";
  btn.setAttribute("aria-label", "مساعد آلي");
  btn.innerHTML = "&#129302;";

  const tooltip = document.createElement("span");
  tooltip.className = "me-fab-tooltip-right";
  tooltip.textContent = "مساعد آلي فوري";

  const nudge = document.createElement("div");
  nudge.className = "me-helpbot-nudge";
  nudge.innerHTML = `<span>👋 كيف يمكنني مساعدتك؟</span><button type="button" class="me-nudge-close" aria-label="إغلاق">&times;</button>`;

  const panel = document.createElement("div");
  panel.id = "meHelpBotPanel";
  panel.innerHTML = `
    <div class="me-helpbot-head">
      <span>مساعد آلي &middot; ليس نور شخصياً</span>
      <button type="button" id="meHelpBotClose" aria-label="إغلاق">&times;</button>
    </div>
    <div class="me-helpbot-body">
      <div id="meHelpBotEmailStep">
        <p class="me-helpbot-hint">هذا مساعد آلي يجيب عن أسئلة شائعة حول الكورسات والأسعار. أدخل بريدك الإلكتروني لبدء المحادثة.</p>
        <input type="email" id="meHelpBotEmail" placeholder="بريدك الإلكتروني">
        <button type="button" id="meHelpBotStart">ابدأ المحادثة</button>
      </div>
      <div id="meHelpBotChatStep" style="display:none;">
        <div id="meHelpBotMessages"></div>
        <form id="meHelpBotForm">
          <input type="text" id="meHelpBotQuestion" placeholder="اكتب سؤالك هنا..." autocomplete="off">
          <button type="submit">إرسال</button>
        </form>
      </div>
    </div>
  `;

  const PAGE_LABELS = {
    "quiz.html": "دليل الكورس السريع",
    "courses.html": "صفحة الكورسات",
    "videos.html": "الفيديوهات",
    "testimonials.html": "آراء الطلاب",
    "search.html": "البحث",
  };

  function escapeHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // The bot's answer text (from AutoRAG) often references site pages by their
  // relative path in quotes (e.g. "articles/where-to-start.html") -- turn those
  // into real clickable links instead of leaving visitors to copy/retype a path,
  // which is exactly what caused 404s when people dropped the "articles/" folder.
  function linkifyPaths(text) {
    const escaped = escapeHtml(text);
    const pathPattern = /['"`]?((?:articles|products)\/[a-zA-Z0-9_-]+\.html|quiz\.html|courses\.html|videos\.html|testimonials\.html|search\.html)['"`]?/g;
    return escaped.replace(pathPattern, (match, path) => {
      const label = PAGE_LABELS[path] || path;
      return `<a href="/${path}">${label}</a>`;
    });
  }

  function addMessage(text, who) {
    const msgs = panel.querySelector("#meHelpBotMessages");
    const el = document.createElement("div");
    el.className = "me-helpbot-msg me-helpbot-msg-" + who;
    if (who === "bot") {
      el.innerHTML = linkifyPaths(text);
    } else {
      el.textContent = text;
    }
    msgs.appendChild(el);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function addEscalateOffer() {
    const msgs = panel.querySelector("#meHelpBotMessages");
    const wrap = document.createElement("div");
    wrap.className = "me-helpbot-escalate";
    wrap.innerHTML = `
      <p>هل تريد إرسال هذا السؤال إلى نور مباشرة عبر البريد الإلكتروني؟</p>
      <button type="button" class="me-helpbot-escalate-btn">نعم، أرسله إلى نور</button>
    `;
    wrap.querySelector("button").addEventListener("click", async () => {
      wrap.innerHTML = "<p>جارِ الإرسال...</p>";
      try {
        await fetch(API + "/help/escalate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: visitorEmail, question: lastQuestion, answer: lastAnswer }),
        });
        wrap.innerHTML = "<p>تم الإرسال. سترد عليك نور عبر بريدك الإلكتروني قريباً.</p>";
      } catch (e) {
        wrap.innerHTML = "<p>حدث خطأ، راسلينا مباشرة على noor@masterenglish.me</p>";
      }
    });
    msgs.appendChild(wrap);
    msgs.scrollTop = msgs.scrollHeight;
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.body.appendChild(btn);
    document.body.appendChild(tooltip);
    document.body.appendChild(panel);
    document.body.appendChild(nudge);

    // Proactively offer help after 5s if the visitor hasn't opened the chat yet.
    let nudgeDismissed = false;
    const nudgeTimer = setTimeout(() => {
      if (!nudgeDismissed && !panel.classList.contains("open")) nudge.classList.add("show");
    }, 5000);

    function dismissNudge() {
      nudgeDismissed = true;
      clearTimeout(nudgeTimer);
      nudge.classList.remove("show");
    }

    nudge.addEventListener("click", (e) => {
      if (e.target.closest(".me-nudge-close")) {
        dismissNudge();
        return;
      }
      dismissNudge();
      panel.classList.add("open");
    });

    btn.addEventListener("click", () => { dismissNudge(); panel.classList.toggle("open"); });
    panel.querySelector("#meHelpBotClose").addEventListener("click", () => panel.classList.remove("open"));

    panel.querySelector("#meHelpBotStart").addEventListener("click", () => {
      const email = panel.querySelector("#meHelpBotEmail").value.trim();
      if (!email || !email.includes("@")) {
        panel.querySelector("#meHelpBotEmail").focus();
        return;
      }
      visitorEmail = email;
      panel.querySelector("#meHelpBotEmailStep").style.display = "none";
      panel.querySelector("#meHelpBotChatStep").style.display = "flex";
      addMessage("مرحباً! أنا مساعد آلي وليس نور شخصياً. اسألني عن الكورسات أو الأسعار أو سياسة الاسترجاع، وإذا لم أستطع الإجابة يمكنني إرسال سؤالك إلى نور مباشرة.", "bot");
      panel.querySelector("#meHelpBotQuestion").focus();
    });

    panel.querySelector("#meHelpBotForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const input = panel.querySelector("#meHelpBotQuestion");
      const question = input.value.trim();
      if (!question) return;
      input.value = "";
      addMessage(question, "user");
      lastQuestion = question;

      const thinking = document.createElement("div");
      thinking.className = "me-helpbot-msg me-helpbot-msg-bot";
      thinking.innerHTML = `<span class="me-helpbot-typing"><span></span><span></span><span></span></span>`;
      const msgsEl = panel.querySelector("#meHelpBotMessages");
      msgsEl.appendChild(thinking);
      msgsEl.scrollTop = msgsEl.scrollHeight;

      try {
        const res = await fetch(API + "/help/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: visitorEmail, question }),
        });
        const data = await res.json();
        thinking.remove();
        lastAnswer = data.answer || "عذراً، حدث خطأ.";
        addMessage(lastAnswer, "bot");
        addEscalateOffer();
      } catch (err) {
        thinking.remove();
        addMessage("حدث خطأ تقني. حاول مرة أخرى أو راسلينا على noor@masterenglish.me", "bot");
      }
    });
  });
})();
