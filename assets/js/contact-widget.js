// Floating contact button (lower-right) -> sends a message to Noor's inbox.
(function () {
  const API = "https://soft-wave-c3e8-masterenglish-fulfillment.masterenglishtube.workers.dev";

  const btn = document.createElement("button");
  btn.id = "meContactBtn";
  btn.setAttribute("aria-label", "راسلنا");
  btn.innerHTML = "&#128172;";

  const tooltip = document.createElement("span");
  tooltip.className = "me-fab-tooltip";
  tooltip.textContent = "راسل نور مباشرة";

  const panel = document.createElement("div");
  panel.id = "meContactPanel";
  panel.innerHTML = `
    <div class="me-contact-head">
      <span>راسلنا</span>
      <button type="button" id="meContactClose" aria-label="إغلاق">&times;</button>
    </div>
    <div class="me-contact-body">
      <p class="me-contact-hint">اكتب سؤالك كاملاً حتى نفهمه ونرد عليك بدقة. مثال: "كم سعر كورس النطق وهل يشمل شهادة؟" وليس "كم السعر؟" فقط.</p>
      <form id="meContactForm">
        <label for="meContactEmail">بريدك الإلكتروني</label>
        <input type="email" id="meContactEmail" required placeholder="example@email.com" autocomplete="email">
        <p class="me-contact-hint" style="margin:4px 0 10px;">على هذا العنوان يصلك ردي، فاكتبه بدقة.</p>
        <p id="meContactSuggest" class="me-contact-error" hidden></p>
        <label for="meContactMessage">رسالتك</label>
        <textarea id="meContactMessage" required minlength="15" rows="4" placeholder="اكتب سؤالك بالتفصيل هنا..."></textarea>
        <button type="submit" id="meContactSubmit">إرسال</button>
        <p id="meContactStatus" role="status"></p>
      </form>
      <form id="meContactCodeForm" hidden>
        <p class="me-contact-hint">أرسلنا رمزاً من ٦ أرقام إلى <bdi id="meContactCodeTo"></bdi>. اكتبه هنا لتصل رسالتك إلى نور.</p>
        <label for="meContactCode">رمز التأكيد</label>
        <input id="meContactCode" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" required placeholder="123456" dir="ltr">
        <button type="submit" id="meContactCodeSubmit">تأكيد وإرسال</button>
        <p class="me-contact-hint" style="margin-top:8px;">لم يصلك الرمز خلال دقيقتين؟ افتح مجلد Spam، أو <a href="#" id="meContactChange">صحّح عنوانك</a>.</p>
        <p id="meContactCodeStatus" role="status"></p>
      </form>
    </div>
  `;

  // A mistyped address means Noor's reply bounces and the visitor never knows (2026-10-10).
  // Signed-in visitors get their verified address; common typos get a "did you mean" first.
  const DOMAINS = ["gmail.com", "hotmail.com", "outlook.com", "yahoo.com", "icloud.com", "live.com", "msn.com", "aol.com", "outlook.sa", "hotmail.fr", "yahoo.fr"];
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
    if (/^www\./.test(email)) return email.slice(4);
    const dom = email.slice(at + 1);
    if (DOMAINS.includes(dom)) return null;
    const best = DOMAINS.map((x) => ({ x, d: distance(dom, x) })).sort((a, b) => a.d - b.d)[0];
    return best && best.d <= 2 ? email.slice(0, at + 1) + best.x : null;
  }
  let confirmedTypo = "";

  document.addEventListener("DOMContentLoaded", () => {
    document.body.appendChild(btn);
    document.body.appendChild(tooltip);
    document.body.appendChild(panel);

    try {
      const token = localStorage.getItem("me_auth_token");
      if (token) {
        fetch(API + "/auth/me", { headers: { Authorization: "Bearer " + token } }).then((r) => r.json()).then((d) => {
          const field = panel.querySelector("#meContactEmail");
          if (d && d.logged_in && d.email && !field.value) field.value = d.email;
        }).catch(() => {});
      }
    } catch (e) {}

    btn.addEventListener("click", () => {
      panel.classList.toggle("open");
    });
    panel.querySelector("#meContactClose").addEventListener("click", () => {
      panel.classList.remove("open");
    });

    panel.querySelector("#meContactForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const field = panel.querySelector("#meContactEmail");
      const email = field.value.trim().toLowerCase().replace(/^mailto:/, "").replace(/^<|>$/g, "").replace(/\s+/g, "");
      field.value = email;
      const message = panel.querySelector("#meContactMessage").value.trim();
      const status = panel.querySelector("#meContactStatus");
      const submitBtn = panel.querySelector("#meContactSubmit");
      const suggest = panel.querySelector("#meContactSuggest");
      suggest.hidden = true;

      const fix = suggestion(email);
      if (fix && confirmedTypo !== email) {
        suggest.innerHTML = `هل تقصد <bdi></bdi>؟ <button type="button" data-fix="1">نعم، صحّحه</button> <button type="button" data-fix="0">عنواني صحيح</button>`;
        suggest.querySelector("bdi").textContent = fix;
        suggest.hidden = false;
        suggest.querySelector('[data-fix="1"]').onclick = () => { field.value = fix; suggest.hidden = true; };
        suggest.querySelector('[data-fix="0"]').onclick = () => { confirmedTypo = email; suggest.hidden = true; };
        return;
      }

      if (message.length < 15) {
        status.textContent = "الرجاء كتابة سؤال كامل ومفهوم (15 حرفاً على الأقل).";
        status.className = "me-contact-error";
        return;
      }

      submitBtn.disabled = true;
      status.textContent = "جارِ الإرسال...";
      status.className = "";

      try {
        // Signed in = verified: the message goes straight to Noor. Otherwise a code is emailed
        // first and the message waits until it's typed (proves a real, working address).
        const headers = { "Content-Type": "application/json" };
        try { const t = localStorage.getItem("me_auth_token"); if (t) headers.Authorization = "Bearer " + t; } catch (e2) {}
        const res = await fetch(API + "/contact", {
          method: "POST", headers, body: JSON.stringify({ email, message, path: location.pathname }),
        });
        const d = await res.json().catch(() => ({}));
        if (res.status === 429) {
          status.textContent = "أرسلت عدة رسائل اليوم. حاول غداً، أو راسل نور مباشرة على noor@masterenglish.me";
          status.className = "me-contact-error";
          return;
        }
        if (res.status === 400) {
          status.textContent = d.error === "invalid_message" ? "الرجاء كتابة سؤال كامل ومفهوم (15 حرفاً على الأقل)." : "هذا البريد لا يبدو صحيحاً. تأكد منه وحاول مرة أخرى.";
          status.className = "me-contact-error";
          return;
        }
        if (!res.ok) throw new Error("failed");
        if (d.pending) {
          pendingId = d.id;
          panel.querySelector("#meContactCodeTo").textContent = d.email;
          panel.querySelector("#meContactForm").hidden = true;
          panel.querySelector("#meContactCodeForm").hidden = false;
          panel.querySelector("#meContactCodeStatus").textContent = "";
          panel.querySelector("#meContactCode").value = "";
          panel.querySelector("#meContactCode").focus();
          return;
        }
        status.textContent = `وصلت رسالتك إلى نور، وسيصلك الرد على ${d.email || email}.`;
        status.className = "me-contact-success";
        panel.querySelector("#meContactMessage").value = "";
      } catch (err) {
        status.textContent = "حدث خطأ، حاول مرة أخرى أو راسلنا مباشرة على noor@masterenglish.me";
        status.className = "me-contact-error";
      } finally {
        submitBtn.disabled = false;
      }
    });

    let pendingId = null;
    panel.querySelector("#meContactChange").addEventListener("click", (e) => {
      e.preventDefault();
      panel.querySelector("#meContactCodeForm").hidden = true;
      panel.querySelector("#meContactForm").hidden = false;
      panel.querySelector("#meContactEmail").focus();
    });
    panel.querySelector("#meContactCodeForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const status = panel.querySelector("#meContactCodeStatus");
      const btn2 = panel.querySelector("#meContactCodeSubmit");
      const code = panel.querySelector("#meContactCode").value.replace(/\D/g, "");
      if (code.length !== 6) {
        status.textContent = "الرمز ٦ أرقام.";
        status.className = "me-contact-error";
        return;
      }
      btn2.disabled = true;
      status.textContent = "جارِ التأكيد...";
      status.className = "";
      try {
        const res = await fetch(API + "/contact/verify", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: pendingId, code }),
        });
        const d = await res.json().catch(() => ({}));
        if (res.ok && d.ok) {
          panel.querySelector("#meContactCodeForm").hidden = true;
          panel.querySelector("#meContactForm").hidden = false;
          panel.querySelector("#meContactMessage").value = "";
          const st = panel.querySelector("#meContactStatus");
          st.textContent = `تم التأكيد، ووصلت رسالتك إلى نور. سيصلك الرد على ${d.email}.`;
          st.className = "me-contact-success";
          return;
        }
        status.className = "me-contact-error";
        status.textContent = d.error === "wrong_code" ? `الرمز غير صحيح.${d.tries_left > 0 ? ` بقي ${d.tries_left} محاولات.` : ""}`
          : d.error === "expired" ? "انتهت صلاحية الرمز. صحّح عنوانك أو أعد الإرسال ليصلك رمز جديد."
          : d.error === "too_many_attempts" ? "محاولات كثيرة. أعد إرسال رسالتك ليصلك رمز جديد."
          : "حدث خطأ، حاول مرة أخرى.";
      } catch (err) {
        status.textContent = "حدث خطأ، حاول مرة أخرى.";
        status.className = "me-contact-error";
      } finally {
        btn2.disabled = false;
      }
    });
  });
})();
