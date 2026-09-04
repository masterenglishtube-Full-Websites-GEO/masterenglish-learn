// Embedded Stripe Checkout with an email-capture step first.
// Looks for a container with [data-price-slug], containing:
//   #checkoutStep1 (email input + start button) and #checkoutMount (embed target).
(function () {
  const STRIPE_PUBLISHABLE_KEY = "pk_live_YhbsS2Srfbdv7v0W7FLpQmp600ozhyFpLL";
  const API = "https://soft-wave-c3e8-masterenglish-fulfillment.masterenglishtube.workers.dev";

  document.addEventListener("DOMContentLoaded", () => {
    const block = document.querySelector("[data-price-slug]");
    if (!block) return;

    const slug = block.dataset.priceSlug;
    const step1 = block.querySelector("#checkoutStep1");
    const mount = block.querySelector("#checkoutMount");
    const emailInput = block.querySelector("#checkoutEmail");
    const startBtn = block.querySelector("#checkoutStartBtn");
    const errorEl = block.querySelector("#checkoutError");

    if (!step1 || !mount || !emailInput || !startBtn) return;

    startBtn.addEventListener("click", async () => {
      const email = emailInput.value.trim();
      errorEl.textContent = "";

      if (!email || !email.includes("@")) {
        errorEl.textContent = "الرجاء إدخال بريد إلكتروني صحيح.";
        return;
      }

      startBtn.disabled = true;
      startBtn.textContent = "جارِ التحضير...";

      const siteRoot = location.href.replace(/products\/[^/]*$/, "");

      try {
        const res = await fetch(API + "/checkout/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, email, origin: siteRoot }),
        });
        const data = await res.json();
        if (!res.ok || !data.client_secret) {
          throw new Error(data.error || "checkout_failed");
        }

        await loadStripeJs();
        const stripe = Stripe(STRIPE_PUBLISHABLE_KEY);
        const checkout = await stripe.initEmbeddedCheckout({ clientSecret: data.client_secret });

        step1.style.display = "none";
        mount.style.display = "block";
        checkout.mount(mount);
      } catch (e) {
        errorEl.textContent = "حدث خطأ أثناء تحضير الدفع. حاول مرة أخرى أو راسلنا على noor@masterenglish.me";
        startBtn.disabled = false;
        startBtn.textContent = "المتابعة للدفع";
      }
    });
  });

  function loadStripeJs() {
    return new Promise((resolve, reject) => {
      if (window.Stripe) return resolve();
      const script = document.createElement("script");
      script.src = "https://js.stripe.com/v3/";
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
})();
