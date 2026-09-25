// Site-wide visitor login: a small header widget offering "Sign in with
// Google" (one click) or a magic-link email fallback. Purely opt-in --
// nothing on the site is gated behind it. Once logged in, every future
// pageview (see track.js) carries the visitor's token, so their browsing
// gets attached to their real profile in admin.html instead of staying
// anonymous.
(function () {
  const API = "https://soft-wave-c3e8-masterenglish-fulfillment.masterenglishtube.workers.dev";
  const GOOGLE_CLIENT_ID = "564162958911-lf8strh07g2oilos6srha0hj95d04o55.apps.googleusercontent.com";
  const TOKEN_KEY = "me_auth_token";

  function getSessionId() {
    try {
      return localStorage.getItem("me_sid") || null;
    } catch (e) {
      return null;
    }
  }

  function getToken() {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch (e) {
      return null;
    }
  }

  function setToken(token) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch (e) {}
  }

  function clearToken() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch (e) {}
  }

  let btn, panel, googleBtnWrap, emailForm, statusEl, menuEl, headLabel;

  function loadGoogleScript(cb) {
    if (window.google && window.google.accounts) return cb();
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = cb;
    document.head.appendChild(s);
  }

  async function handleGoogleCredential(response) {
    statusEl.textContent = "جارِ تسجيل الدخول...";
    statusEl.className = "";
    try {
      const res = await fetch(API + "/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: response.credential, session_id: getSessionId() }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "failed");
      setToken(data.token);
      renderLoggedIn(data.name, data.email);
      panel.classList.remove("open");
    } catch (e) {
      statusEl.textContent = "حدث خطأ، حاول مرة أخرى";
      statusEl.className = "me-auth-error";
    }
  }

  function renderGoogleButton() {
    loadGoogleScript(() => {
      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCredential,
        });
        googleBtnWrap.innerHTML = "";
        window.google.accounts.id.renderButton(googleBtnWrap, {
          theme: "outline",
          size: "large",
          text: "signin_with",
          locale: "ar",
        });
      } catch (e) {}
    });
  }

  function renderLoggedOut() {
    btn.textContent = "تسجيل الدخول";
    btn.classList.remove("me-auth-logged-in");
    headLabel.textContent = "تسجيل الدخول";
    googleBtnWrap.style.display = "";
    document.querySelector(".me-auth-divider").style.display = "";
    emailForm.style.display = "";
    menuEl.classList.remove("open");
  }

  function renderLoggedIn(name, email) {
    const label = name || (email ? email.split("@")[0] : "حسابي");
    btn.textContent = `مرحباً، ${label}`;
    btn.classList.add("me-auth-logged-in");
    headLabel.textContent = label;
    googleBtnWrap.style.display = "none";
    document.querySelector(".me-auth-divider").style.display = "none";
    emailForm.style.display = "none";
    menuEl.classList.add("open");
  }

  async function checkLoginState() {
    const token = getToken();
    if (!token) {
      renderLoggedOut();
      return;
    }
    try {
      const res = await fetch(API + "/auth/me", {
        headers: { Authorization: "Bearer " + token },
      });
      const data = await res.json();
      if (data.logged_in) {
        renderLoggedIn(data.name, data.email);
      } else {
        clearToken();
        renderLoggedOut();
      }
    } catch (e) {
      // Network hiccup -- don't log the visitor out over a transient error.
    }
  }

  function positionPanel() {
    const rect = btn.getBoundingClientRect();
    panel.style.top = rect.bottom + 8 + "px";
    // getBoundingClientRect() is always physical (LTR) pixels regardless of
    // page direction, so anchor with physical `left`/`right`, not a logical
    // property -- mixing the two here previously pushed the panel off-screen.
    const panelWidth = 300;
    let left = rect.left;
    left = Math.min(left, window.innerWidth - panelWidth - 12);
    left = Math.max(left, 12);
    panel.style.right = "auto";
    panel.style.left = left + "px";
  }

  document.addEventListener("DOMContentLoaded", () => {
    const headerInner = document.querySelector(".header-inner");
    if (!headerInner) return;
    const ctaBtn = headerInner.querySelector(".btn-nav");

    btn = document.createElement("button");
    btn.id = "meAuthBtn";
    btn.type = "button";
    btn.textContent = "تسجيل الدخول";

    if (ctaBtn) {
      ctaBtn.parentNode.insertBefore(btn, ctaBtn);
    } else {
      headerInner.appendChild(btn);
    }

    panel = document.createElement("div");
    panel.id = "meAuthPanel";
    panel.innerHTML = `
      <div class="me-auth-head">
        <strong id="meAuthHeadLabel">تسجيل الدخول</strong>
        <button type="button" id="meAuthClose" aria-label="إغلاق">&times;</button>
      </div>
      <div id="meAuthGoogleBtn"></div>
      <p class="me-auth-divider">أو</p>
      <form id="meAuthEmailForm">
        <input type="email" id="meAuthEmail" required placeholder="بريدك الإلكتروني">
        <button type="submit" id="meAuthSubmit">أرسل رابط الدخول</button>
      </form>
      <div class="me-auth-menu" id="meAuthMenu">
        <p style="font-size:13px; color:var(--ink-soft); margin:0 0 10px;">أنت مسجل الدخول</p>
        <button type="button" id="meAuthLogout">تسجيل الخروج</button>
      </div>
      <p id="meAuthStatus"></p>
    `;
    document.body.appendChild(panel);

    googleBtnWrap = document.getElementById("meAuthGoogleBtn");
    emailForm = document.getElementById("meAuthEmailForm");
    statusEl = document.getElementById("meAuthStatus");
    menuEl = document.getElementById("meAuthMenu");
    headLabel = document.getElementById("meAuthHeadLabel");

    btn.addEventListener("click", () => {
      const willOpen = !panel.classList.contains("open");
      if (willOpen) {
        positionPanel();
        if (!btn.classList.contains("me-auth-logged-in")) renderGoogleButton();
      }
      panel.classList.toggle("open", willOpen);
    });

    document.getElementById("meAuthClose").addEventListener("click", () => {
      panel.classList.remove("open");
    });

    document.getElementById("meAuthLogout").addEventListener("click", async () => {
      const token = getToken();
      clearToken();
      renderLoggedOut();
      panel.classList.remove("open");
      if (token) {
        fetch(API + "/auth/logout", {
          method: "POST",
          headers: { Authorization: "Bearer " + token },
        }).catch(() => {});
      }
    });

    emailForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("meAuthEmail").value.trim();
      const submitBtn = document.getElementById("meAuthSubmit");
      if (!email || !email.includes("@")) {
        statusEl.textContent = "الرجاء إدخال بريد إلكتروني صحيح";
        statusEl.className = "me-auth-error";
        return;
      }
      submitBtn.disabled = true;
      statusEl.textContent = "جارِ الإرسال...";
      statusEl.className = "";
      try {
        const res = await fetch(API + "/auth/request-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, session_id: getSessionId() }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          statusEl.textContent = data.detail || "حدث خطأ، حاول مرة أخرى";
          statusEl.className = "me-auth-error";
        } else {
          statusEl.textContent = `أرسلنا رابط الدخول إلى ${email} ✉️ لم يصلك خلال دقائق؟ تحقق من مجلد الرسائل غير المرغوب فيها (Spam)، وإذا لم تجده هناك أيضاً راسلنا على noor@masterenglish.me.`;
          statusEl.className = "me-auth-success";
          emailForm.reset();
        }
      } catch (e) {
        statusEl.textContent = "حدث خطأ تقني، حاول مرة أخرى";
        statusEl.className = "me-auth-error";
      } finally {
        submitBtn.disabled = false;
      }
    });

    checkLoginState();
  });
})();
