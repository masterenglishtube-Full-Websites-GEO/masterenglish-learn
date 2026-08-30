// Floating contact button (lower-right) -> sends a message to Noor's inbox.
(function () {
  const API = "https://soft-wave-c3e8-masterenglish-fulfillment.masterenglishtube.workers.dev";

  const btn = document.createElement("button");
  btn.id = "meContactBtn";
  btn.setAttribute("aria-label", "راسلنا");
  btn.innerHTML = "&#128172;";

  const panel = document.createElement("div");
  panel.id = "meContactPanel";
  panel.innerHTML = `
    <div class="me-contact-head">
      <span>راسلينا</span>
      <button type="button" id="meContactClose" aria-label="إغلاق">&times;</button>
    </div>
    <div class="me-contact-body">
      <p class="me-contact-hint">اكتب سؤالك كاملاً حتى نفهمه ونرد عليك بدقة. مثال: "كم سعر كورس النطق وهل يشمل شهادة؟" وليس "كم السعر؟" فقط.</p>
      <form id="meContactForm">
        <label for="meContactEmail">بريدك الإلكتروني</label>
        <input type="email" id="meContactEmail" required placeholder="example@email.com">
        <label for="meContactMessage">رسالتك</label>
        <textarea id="meContactMessage" required minlength="15" rows="4" placeholder="اكتب سؤالك بالتفصيل هنا..."></textarea>
        <button type="submit" id="meContactSubmit">إرسال</button>
        <p id="meContactStatus" role="status"></p>
      </form>
    </div>
  `;

  document.addEventListener("DOMContentLoaded", () => {
    document.body.appendChild(btn);
    document.body.appendChild(panel);

    btn.addEventListener("click", () => {
      panel.classList.toggle("open");
    });
    panel.querySelector("#meContactClose").addEventListener("click", () => {
      panel.classList.remove("open");
    });

    panel.querySelector("#meContactForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = panel.querySelector("#meContactEmail").value.trim();
      const message = panel.querySelector("#meContactMessage").value.trim();
      const status = panel.querySelector("#meContactStatus");
      const submitBtn = panel.querySelector("#meContactSubmit");

      if (message.length < 15) {
        status.textContent = "الرجاء كتابة سؤال كامل ومفهوم (15 حرفاً على الأقل).";
        status.className = "me-contact-error";
        return;
      }

      submitBtn.disabled = true;
      status.textContent = "جارِ الإرسال...";
      status.className = "";

      try {
        const res = await fetch(API + "/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, message, path: location.pathname }),
        });
        if (!res.ok) throw new Error("failed");
        status.textContent = "تم الإرسال. سنرد عليك قريباً عبر بريدك الإلكتروني.";
        status.className = "me-contact-success";
        panel.querySelector("#meContactForm").reset();
      } catch (err) {
        status.textContent = "حدث خطأ، حاول مرة أخرى أو راسلنا مباشرة على noor@masterenglish.me";
        status.className = "me-contact-error";
      } finally {
        submitBtn.disabled = false;
      }
    });
  });
})();
