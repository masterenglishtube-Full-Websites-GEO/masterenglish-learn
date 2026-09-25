// Placement test (placement-test.html): 25 questions, then the result is emailed -- level,
// answers with explanations, learning path -- via the Worker's /placement/result. The page
// never shows the level itself, so the visitor has to give a real address to see it.
(function () {
  const QUESTIONS = JSON.parse(document.getElementById("ptQuestions").textContent);
  const API = "https://soft-wave-c3e8-masterenglish-fulfillment.masterenglishtube.workers.dev";
  const GOOGLE_CLIENT_ID = "564162958911-lf8strh07g2oilos6srha0hj95d04o55.apps.googleusercontent.com";
  const AR = "٠١٢٣٤٥٦٧٨٩", ar = (n) => String(n).replace(/[0-9]/g, (d) => AR[d]);
  const $ = (id) => document.getElementById(id);
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  };
  const ERRORS = {
    invalid_email: "هذا البريد لا يبدو صحيحاً. تأكد منه وحاول مرة أخرى.",
    rate_limited: "أرسلنا النتيجة إلى هذا البريد عدة مرات خلال الساعة الأخيرة. تفقد البريد الوارد ومجلد Spam.",
    rate_limited_ip: "أُرسلت نتائج كثيرة من هذا الجهاز خلال الساعة الأخيرة. حاول بعد قليل.",
    send_failed: "تعذّر إرسال الرسالة الآن. حاول بعد قليل، أو راسلنا على noor@masterenglish.me",
    invalid_token: "لم يكتمل تسجيل الدخول بحساب Google. حاول مرة أخرى.",
    login_required: "انتهت جلسة تسجيل الدخول. اكتب بريدك أو سجّل الدخول بحساب Google.",
  };
  let i = 0, score = 0, level = "";
  const answers = [];
  let lastSend = null; // the request body to repeat when the visitor asks to resend

  function shuffle(a) { a = a.slice(); for (let k = a.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [a[k], a[j]] = [a[j], a[k]]; } return a; }

  function show() {
    const q = QUESTIONS[i];
    $("ptCount").textContent = `السؤال ${ar(i + 1)} من ${ar(QUESTIONS.length)}`;
    $("ptLevelTag").textContent = q.level;
    $("ptBar").style.width = (i / QUESTIONS.length * 100) + "%";
    $("ptQ").textContent = q.q;
    $("ptSayWrap").hidden = !q.say;
    $("ptSayFallback").hidden = true;
    const box = $("ptChoices"); box.innerHTML = "";
    const opts = shuffle(q.o.map((label, idx) => ({ label, idx }))).concat([{ label: "لا أعرف", idx: -1 }]);
    opts.forEach((opt) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "quiz-choice"; b.dir = "auto"; b.textContent = opt.label;
      b.addEventListener("click", () => {
        answers[i] = opt.idx;
        i++;
        if (i < QUESTIONS.length) show(); else finish();
      });
      box.appendChild(b);
    });
  }

  $("ptSay").addEventListener("click", () => {
    const q = QUESTIONS[i];
    const ok = window.MELearner && window.MELearner.speak(q.say);
    if (!ok) { $("ptSayFallback").hidden = false; $("ptSayFallback").textContent = "(متصفحك لا يدعم الصوت، الجملة: " + q.say + ")"; }
  });

  function levelFor(s) { return s <= 5 ? "A1" : s <= 10 ? "A2" : s <= 15 ? "B1" : s <= 20 ? "B2" : "C1"; }

  // The result is not shown here: it is emailed, so the address must be real.
  function finish() {
    score = answers.filter((a, k) => a === QUESTIONS[k].a).length;
    level = levelFor(score);
    $("ptRun").hidden = true;
    $("ptGate").hidden = false;
    $("pt").scrollIntoView({ behavior: "smooth", block: "start" });
    const token = store.get("me_auth_token");
    if (token) {
      fetch(API + "/auth/me", { headers: { Authorization: "Bearer " + token } }).then((r) => r.json()).then((d) => {
        if (!d.logged_in || !d.email) return;
        $("ptAccountEmail").textContent = d.email;
        $("ptAccount").hidden = false;
        $("ptChoose").hidden = true;
      }).catch(() => {});
    }
    loadGoogle();
  }

  function loadGoogle() {
    const render = () => {
      google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: (r) => send({ credential: r.credential }) });
      google.accounts.id.renderButton($("ptGoogle"), { theme: "filled_blue", size: "large", shape: "pill", text: "continue_with", locale: "ar", width: 300 });
    };
    if (window.google && window.google.accounts) return render();
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client"; s.async = true; s.onload = render;
    document.head.appendChild(s);
  }

  function status(el, text, isError) { el.textContent = text || ""; el.className = "pt-status" + (isError ? " error" : ""); }

  async function send(extra, statusEl) {
    statusEl = statusEl || $("ptStatus");
    status(statusEl, "جارِ إرسال النتيجة إلى بريدك...");
    document.querySelectorAll("#ptGate button, #ptSent button").forEach((b) => { b.disabled = true; });
    const headers = { "Content-Type": "application/json" };
    if (extra.use_account) headers.Authorization = "Bearer " + store.get("me_auth_token");
    try {
      const res = await fetch(API + "/placement/result", {
        method: "POST", headers, body: JSON.stringify({ answers, session_id: store.get("me_sid"), ...extra }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.ok) throw new Error(d.error || "send_failed");
      if (d.token) store.set("me_auth_token", d.token);
      lastSend = extra.credential ? { use_account: true } : extra; // Google visitors are signed in now
      sent(d.email);
    } catch (e) {
      status(statusEl, ERRORS[e.message] || ERRORS.send_failed, true);
    } finally {
      document.querySelectorAll("#ptGate button, #ptSent button").forEach((b) => { b.disabled = false; });
    }
  }

  function sent(email) {
    $("ptGate").hidden = true;
    $("ptSent").hidden = false;
    $("ptSentTo").textContent = email;
    status($("ptSentStatus"), "");
    const domain = email.split("@")[1] || "";
    const inbox = /gmail|googlemail/.test(domain) ? "https://mail.google.com/mail/u/0/#search/from%3Anoor%40masterenglish.me"
      : /hotmail|outlook|live|msn/.test(domain) ? "https://outlook.live.com/mail/0/"
      : /yahoo/.test(domain) ? "https://mail.yahoo.com/" : /icloud|me\.com/.test(domain) ? "https://www.icloud.com/mail/" : "";
    $("ptOpenMail").hidden = !inbox;
    if (inbox) $("ptOpenMail").href = inbox;
    if (window.MELearner) window.MELearner.setLevel(level, score);
  }

  // Typo check for common providers: "gmial.com" -> "gmail.com"
  const DOMAINS = ["gmail.com", "hotmail.com", "outlook.com", "yahoo.com", "icloud.com", "live.com", "msn.com", "aol.com", "outlook.sa", "hotmail.fr"];
  function distance(a, b) {
    const d = Array.from({ length: a.length + 1 }, (_, x) => [x]);
    for (let y = 1; y <= b.length; y++) d[0][y] = y;
    for (let x = 1; x <= a.length; x++) for (let y = 1; y <= b.length; y++) {
      d[x][y] = Math.min(d[x - 1][y] + 1, d[x][y - 1] + 1, d[x - 1][y - 1] + (a[x - 1] === b[y - 1] ? 0 : 1));
    }
    return d[a.length][b.length];
  }
  function suggestion(email) {
    const at = email.lastIndexOf("@");
    if (at < 1) return null;
    const dom = email.slice(at + 1).toLowerCase();
    if (DOMAINS.includes(dom)) return null;
    let best = null;
    DOMAINS.forEach((x) => { const n = distance(dom, x); if (n > 0 && n <= 2 && (!best || n < best.n)) best = { x, n }; });
    return best ? email.slice(0, at + 1) + best.x : null;
  }

  let confirmedTypo = "";
  $("ptEmailForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const email = $("ptEmail").value.trim();
    $("ptSuggest").hidden = true;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return status($("ptStatus"), ERRORS.invalid_email, true);
    const fix = suggestion(email);
    if (fix && confirmedTypo !== email) {
      status($("ptStatus"), "");
      const box = $("ptSuggest");
      box.innerHTML = "هل تقصد <button type=\"button\" dir=\"ltr\"></button>؟ أو <button type=\"button\">أرسل إلى ما كتبتُ</button>";
      const [useFix, keep] = box.querySelectorAll("button");
      useFix.textContent = fix;
      useFix.addEventListener("click", () => { $("ptEmail").value = fix; box.hidden = true; send({ email: fix }); });
      keep.addEventListener("click", () => { confirmedTypo = email; box.hidden = true; send({ email }); });
      box.hidden = false;
      return;
    }
    send({ email });
  });

  $("ptSendAccount").addEventListener("click", () => send({ use_account: true }));
  $("ptUseOther").addEventListener("click", () => { $("ptAccount").hidden = true; $("ptChoose").hidden = false; $("ptEmail").focus(); });
  $("ptResend").addEventListener("click", () => { if (lastSend) send(lastSend, $("ptSentStatus")); });
  $("ptChange").addEventListener("click", () => {
    $("ptSent").hidden = true; $("ptGate").hidden = false;
    $("ptAccount").hidden = true; $("ptChoose").hidden = false;
    status($("ptStatus"), "");
    $("ptEmail").focus(); $("ptEmail").select();
  });

  $("ptGo").addEventListener("click", () => { $("ptStart").hidden = true; $("ptRun").hidden = false; show(); });
})();
