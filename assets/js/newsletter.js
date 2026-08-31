// Renders a newsletter signup card into any element with id="meNewsletterBox".
(function () {
  const API = "https://soft-wave-c3e8-masterenglish-fulfillment.masterenglishtube.workers.dev";

  document.addEventListener("DOMContentLoaded", () => {
    const box = document.getElementById("meNewsletterBox");
    if (!box) return;

    box.innerHTML = `
      <div class="me-newsletter">
        <h3>لا تفوّت درساً جديداً</h3>
        <p>انضم إلى النشرة البريدية واحصل على نصائح ودروس دورية لتعلم التحدث بالإنجليزية بثقة.</p>
        <form id="meNewsletterForm" class="me-newsletter-form">
          <input type="email" id="meNewsletterEmail" required placeholder="بريدك الإلكتروني">
          <button type="submit">اشترك الآن</button>
        </form>
        <p id="meNewsletterStatus"></p>
      </div>
    `;

    box.querySelector("#meNewsletterForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = box.querySelector("#meNewsletterEmail").value.trim();
      const status = box.querySelector("#meNewsletterStatus");
      const submitBtn = box.querySelector("button[type=submit]");

      submitBtn.disabled = true;
      status.textContent = "جارِ الاشتراك...";
      status.className = "";

      try {
        const res = await fetch(API + "/newsletter/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, path: location.pathname }),
        });
        if (!res.ok) throw new Error("failed");
        status.textContent = "تم الاشتراك بنجاح! تحقق من بريدك الإلكتروني.";
        status.className = "me-newsletter-success";
        box.querySelector("#meNewsletterForm").reset();
      } catch (err) {
        status.textContent = "حدث خطأ، حاول مرة أخرى.";
        status.className = "me-newsletter-error";
      } finally {
        submitBtn.disabled = false;
      }
    });
  });
})();
