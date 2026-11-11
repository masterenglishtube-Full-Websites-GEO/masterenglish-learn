// Embedded Stripe Checkout, built before the visitor reaches the payment box (email step only as a fallback).
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

    const siteRoot = location.href.replace(/products\/[^/]*$/, "").replace(/[?#].*$/, "");
    let refCode = null;
    try { refCode = localStorage.getItem("me_ref_code"); } catch (e) {}

    // Asks our server for a Stripe session and mounts Stripe's form in the page.
    // email is optional: without it, Stripe's own form asks for it.
    let opening = null;
    function open(email) {
      if (opening) return opening;
      const stripeReady = loadStripeJs();
      return (opening = (async () => {
        // Signed-in visitors send their login, so the server fills in their email (2026-11-11).
        const headers = { "Content-Type": "application/json" };
        try { const t = localStorage.getItem("me_auth_token"); if (t) headers.Authorization = "Bearer " + t; } catch (e) {}
        const res = await fetch(API + "/checkout/create", {
          method: "POST",
          headers,
          body: JSON.stringify({ slug, email: email || undefined, origin: siteRoot, ref_code: refCode || undefined }),
        });
        const data = await res.json();
        if (!res.ok || !data.client_secret) throw new Error(data.error || "checkout_failed");
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
      })().catch((e) => { opening = null; throw e; }));
    }

    // Noor, 2026-11-11: the form should be there already, not a grey loading screen after a click.
    // Stripe needs 2 to 4 seconds to build its form, so it is built before the visitor reaches the
    // box: when the box is about two screens away, or at once when a buy shortcut is pressed.
    // Stripe's form asks for the email itself. If this fails, the email step below stays as before.
    const early = () => open().catch(() => {});
    document.addEventListener("me:buy", early);
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) { io.disconnect(); early(); }
      }, { rootMargin: "200% 0px" });
      io.observe(block);
    } else {
      early();
    }

    startBtn.addEventListener("click", async () => {
      const email = emailInput.value.trim();
      errorEl.textContent = "";

      if (!email || !email.includes("@")) {
        errorEl.textContent = "الرجاء إدخال بريد إلكتروني صحيح.";
        return;
      }

      startBtn.disabled = true;
      startBtn.textContent = "جارِ التحضير...";
      try {
        await open(email);
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
