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
      // Stripe's script downloads at the same time as our server call, not after it (2026-11-11).
      const stripeReady = loadStripeJs();

      const siteRoot = location.href.replace(/products\/[^/]*$/, "");
      let refCode = null;
      try { refCode = localStorage.getItem("me_ref_code"); } catch (e) {}

      try {
        const res = await fetch(API + "/checkout/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, email, origin: siteRoot, ref_code: refCode || undefined }),
        });
        const data = await res.json();
        if (!res.ok || !data.client_secret) {
          throw new Error(data.error || "checkout_failed");
        }

        await stripeReady;
        const stripe = Stripe(STRIPE_PUBLISHABLE_KEY);
        const checkout = await stripe.initEmbeddedCheckout({ clientSecret: data.client_secret });

        step1.style.display = "none";
        // Phones: the green box's side padding left Stripe's form too narrow, so it was cut off
        // on the right (2026-10-29). The open box gets slim padding (style.css .checkout-open).
        block.classList.add("checkout-open");
        mount.dir = "ltr";
        mount.style.display = "block";
        checkout.mount(mount);
      } catch (e) {
        errorEl.textContent = "حدث خطأ أثناء تحضير الدفع. حاول مرة أخرى أو راسلنا على noor@masterenglish.me";
        startBtn.disabled = false;
        startBtn.textContent = "المتابعة للدفع";
      }
    });
  });

  let stripeJs = null;
  function loadStripeJs() {
    if (stripeJs) return stripeJs;
    return (stripeJs = new Promise((resolve, reject) => {
      if (window.Stripe) return resolve();
      const script = document.createElement("script");
      script.src = "https://js.stripe.com/v3/";
      script.onload = resolve;
      script.onerror = () => { stripeJs = null; reject(); };
      document.head.appendChild(script);
    }));
  }
  // Fetch Stripe's script as soon as the page is idle, so the form opens quickly after the email.
  const warm = () => { if (document.querySelector("[data-price-slug]")) loadStripeJs().catch(() => {}); };
  if (window.requestIdleCallback) requestIdleCallback(warm, { timeout: 3000 }); else setTimeout(warm, 1500);
})();
