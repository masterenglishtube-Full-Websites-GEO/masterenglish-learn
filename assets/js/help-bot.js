// Floating AI help bot (bottom-right). Clearly labeled as automated.
// Requires an email before chatting (so every conversation is tied to a real
// person in the CRM, same pattern as the contact widget and newsletter signup).
// Proactively offers to forward the conversation to Noor by email.
(function () {
  const API = "https://soft-wave-c3e8-masterenglish-fulfillment.masterenglishtube.workers.dev";

  let visitorEmail = null;
  let lastQuestion = "";
  let lastAnswer = "";

  // Known-good questions the bot can reliably answer (knowledge base covers
  // these directly), in Arabic and English. When the live AutoRAG answer
  // looks like a "couldn't find it" fallback, we guess intent from the
  // visitor's own words and offer the 3 closest matches as clickable chips,
  // instead of just pushing straight to "email Noor".
  const QUESTIONS_BANK = [
    { text: "كم سعر كورس أسرار النطق الأمريكي؟", keywords: ["سعر", "نطق", "امريكي", "كم", "تكلفة", "دولار", "price", "pronunciation", "cost"] },
    { text: "How much does the pronunciation course cost?", keywords: ["price", "pronunciation", "cost", "how much", "dollar"] },
    { text: "ما هي سياسة استرجاع الأموال؟", keywords: ["استرجاع", "استرداد", "الغاء", "فلوس", "مال", "refund", "cancel", "money back"] },
    { text: "What is your refund policy?", keywords: ["refund", "cancel", "money back", "policy"] },
    { text: "من أين أبدأ إذا كنت مبتدئاً؟", keywords: ["ابدأ", "مبتدئ", "بداية", "وين", "start", "beginner", "level"] },
    { text: "Where should I start as a beginner?", keywords: ["start", "beginner", "where", "level", "new"] },
    { text: "هل الوصول للكورس مدى الحياة؟", keywords: ["مدى الحياة", "وصول", "اشتراك", "شهري", "lifetime", "access", "subscription"] },
    { text: "Is course access lifetime or a subscription?", keywords: ["lifetime", "access", "subscription", "expire"] },
    { text: "ماذا يتضمن كورس The Commuter Challenge؟", keywords: ["commuter", "مواصلات", "سيارة", "قيادة", "تنقل"] },
    { text: "What's included in The Commuter Challenge?", keywords: ["commuter", "challenge", "driving", "included"] },
    { text: "ماذا يتضمن دليل مقابلة العمل من التوتر إلى التميز؟", keywords: ["مقابلة", "عمل", "وظيفة", "interview", "job"] },
    { text: "What does the job interview guide cover?", keywords: ["interview", "job", "guide", "cover"] },
    { text: "كيف أختار الكورس المناسب لي؟", keywords: ["اختار", "مناسب", "كورس", "choose", "which course", "right course"] },
    { text: "How do I choose the right course for me?", keywords: ["choose", "which course", "right", "suitable"] },
    { text: "هل يوجد كود خصم؟", keywords: ["خصم", "كود", "كوبون", "discount", "coupon", "code"] },
    { text: "Is there a discount code?", keywords: ["discount", "coupon", "code", "promo"] },
    { text: "ما هي طرق الدفع المتاحة؟", keywords: ["دفع", "بطاقة", "فيزا", "payment", "card", "visa", "pay"] },
    { text: "What payment methods do you accept?", keywords: ["payment", "card", "visa", "pay", "accept"] },
    { text: "كيف أتواصل مع نور مباشرة؟", keywords: ["تواصل", "نور", "مباشرة", "contact", "reach", "email noor"] },
    { text: "How can I contact Noor directly?", keywords: ["contact", "reach", "email", "noor"] },
  ];

  function normalizeWords(s) {
    return (s.toLowerCase().match(/[a-z؀-ۿ]+/g) || []);
  }

  function suggestQuestions(userText) {
    const words = new Set(normalizeWords(userText));
    if (!words.size) return [];
    const scored = QUESTIONS_BANK.map((q) => {
      const score = q.keywords.reduce((acc, kw) => acc + (words.has(kw) || userText.toLowerCase().includes(kw) ? 1 : 0), 0);
      return { q, score };
    }).filter((x) => x.score > 0);
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 3).map((x) => x.q.text);
  }

  function looksLikeFallback(answer) {
    const a = answer.toLowerCase();
    return a.includes("لم أتمكن من إيجاد إجابة") || a.includes("حدث خطأ تقني") ||
      a.includes("couldn't find an answer") || a.includes("technical error");
  }

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
        document.dispatchEvent(new CustomEvent("me:escalate-requested"));
      } catch (e) {
        wrap.innerHTML = "<p>حدث خطأ، راسلينا مباشرة على noor@masterenglish.me</p>";
      }
    });
    msgs.appendChild(wrap);
    msgs.scrollTop = msgs.scrollHeight;
  }

  // When the bot can't confidently answer, guess intent from the visitor's
  // own wording and offer the 3 closest questions we CAN answer, as
  // clickable chips, instead of only pushing straight to "email Noor".
  function addSuggestedQuestions(suggestions) {
    const msgs = panel.querySelector("#meHelpBotMessages");
    const wrap = document.createElement("div");
    wrap.className = "me-helpbot-suggestions";
    const label = document.createElement("p");
    label.textContent = "ربما تقصد أحد هذه الأسئلة:";
    wrap.appendChild(label);
    suggestions.forEach((s) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "me-helpbot-suggestion-chip";
      chip.textContent = s;
      chip.addEventListener("click", () => {
        wrap.remove();
        const input = panel.querySelector("#meHelpBotQuestion");
        input.value = s;
        panel.querySelector("#meHelpBotForm").requestSubmit();
      });
      wrap.appendChild(chip);
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
      document.dispatchEvent(new CustomEvent("me:question-asked"));

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
        if (looksLikeFallback(lastAnswer)) {
          const suggestions = suggestQuestions(question);
          if (suggestions.length) addSuggestedQuestions(suggestions);
        }
        addEscalateOffer();
      } catch (err) {
        thinking.remove();
        addMessage("حدث خطأ تقني. حاول مرة أخرى أو راسلينا على noor@masterenglish.me", "bot");
      }
    });
  });
})();
