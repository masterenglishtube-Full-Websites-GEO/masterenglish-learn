// Free lesson PDFs are downloaded through the Worker after a Google sign-in.
// Any element with data-gated-pdf="<id>" becomes a download button: signed-in
// visitors (same me_auth_token as the header login) get the file straight away;
// everyone else sees a Google-only sign-in dialog first. Signing in also adds
// them to the newsletter, which the dialog states before they sign in.
(function () {
  const API = "https://soft-wave-c3e8-masterenglish-fulfillment.masterenglishtube.workers.dev";
  const GOOGLE_CLIENT_ID = "564162958911-lf8strh07g2oilos6srha0hj95d04o55.apps.googleusercontent.com";
  const TOKEN_KEY = "me_auth_token";

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} },
  };

  let pending = null; // { id, button }
  let dialog, statusEl, googleWrap, googleReady = false;

  function setStatus(text, kind) {
    statusEl.textContent = text || "";
    statusEl.className = "me-gate-status" + (kind ? " " + kind : "");
  }

  function buildDialog() {
    dialog = document.createElement("div");
    dialog.className = "me-gate";
    dialog.hidden = true;
    dialog.innerHTML = `
      <div class="me-gate-card" role="dialog" aria-modal="true" aria-labelledby="meGateTitle">
        <button type="button" class="me-gate-close" aria-label="إغلاق">&times;</button>
        <p class="me-gate-eyebrow">ملف PDF مجاني</p>
        <h3 id="meGateTitle">سجّل الدخول بحساب Google لتحميل الملف</h3>
        <p class="me-gate-text">بضغطة واحدة يصلك الملف فوراً. بتسجيل الدخول تنضم أيضاً إلى نشرة أتقن الإنجليزية (دروس ونصائح أسبوعية)، ويمكنك إلغاء الاشتراك في أي وقت من أسفل أي رسالة.</p>
        <div class="me-gate-google" id="meGateGoogle"></div>
        <p class="me-gate-status" role="status"></p>
        <p class="me-gate-legal">نحترم خصوصيتك: <a href="${"../".repeat(Math.max(0, location.pathname.split("/").length - 2))}privacy.html">سياسة الخصوصية</a></p>
      </div>`;
    document.body.appendChild(dialog);
    statusEl = dialog.querySelector(".me-gate-status");
    googleWrap = dialog.querySelector("#meGateGoogle");
    dialog.querySelector(".me-gate-close").addEventListener("click", close);
    dialog.addEventListener("click", (e) => { if (e.target === dialog) close(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !dialog.hidden) close(); });
  }

  function close() {
    dialog.hidden = true;
    pending = null;
  }

  function loadGoogle(cb) {
    if (window.google && window.google.accounts) return cb();
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = cb;
    s.onerror = () => setStatus("تعذّر تحميل تسجيل الدخول من Google. تحقق من الاتصال وحاول مرة أخرى.", "error");
    document.head.appendChild(s);
  }

  async function onCredential(response) {
    setStatus("جارِ تسجيل الدخول...");
    try {
      const res = await fetch(API + "/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: response.credential, session_id: store.get("me_sid") }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "failed");
      store.set(TOKEN_KEY, data.token);
      if (pending) await download(pending.id, pending.button, true);
    } catch (e) {
      setStatus("لم يكتمل تسجيل الدخول. حاول مرة أخرى.", "error");
    }
  }

  function open(id, button) {
    if (!dialog) buildDialog();
    pending = { id, button };
    setStatus("");
    dialog.hidden = false;
    loadGoogle(() => {
      try {
        if (!googleReady) {
          window.google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: onCredential });
          googleReady = true;
        }
        googleWrap.innerHTML = "";
        window.google.accounts.id.renderButton(googleWrap, { theme: "filled_blue", size: "large", text: "continue_with", shape: "pill", locale: "ar" });
      } catch (e) {
        setStatus("تعذّر عرض زر Google. حاول مرة أخرى بعد قليل.", "error");
      }
    });
  }

  async function download(id, button, fromDialog) {
    const token = store.get(TOKEN_KEY);
    if (!token) return open(id, button);
    const original = button.textContent;
    button.setAttribute("aria-busy", "true");
    button.textContent = "جارِ تجهيز الملف...";
    try {
      const res = await fetch(API + "/lead-magnet?file=" + encodeURIComponent(id), { headers: { Authorization: "Bearer " + token } });
      if (res.status === 401) {
        store.del(TOKEN_KEY);
        button.textContent = original;
        return open(id, button);
      }
      if (!res.ok) throw new Error("download_failed");
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = button.dataset.fileName || id + ".pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(href), 30000);
      button.textContent = "تم التحميل ✓ حمّله مرة أخرى";
      if (window.MELearner) window.MELearner.track("pdf_download", id);
      if (fromDialog && dialog) {
        setStatus("تم! بدأ تحميل الملف.", "ok");
        setTimeout(close, 1400);
      }
    } catch (e) {
      button.textContent = original;
      if (fromDialog && dialog) setStatus("حدث خطأ أثناء التحميل. حاول مرة أخرى.", "error");
      else alert("حدث خطأ أثناء التحميل. حاول مرة أخرى.");
    } finally {
      button.removeAttribute("aria-busy");
    }
  }

  document.addEventListener("click", (e) => {
    const button = e.target.closest("[data-gated-pdf]");
    if (!button) return;
    e.preventDefault();
    download(button.dataset.gatedPdf, button, false);
  });
})();
