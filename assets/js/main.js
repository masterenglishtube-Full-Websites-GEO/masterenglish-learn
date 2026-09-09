// Affiliate referral capture -- a visitor can land on any page (article,
// video page, homepage) before eventually reaching a product's checkout, so
// this runs site-wide and remembers the code in localStorage until purchase.
// Last-touch attribution: a newer ?ref= always overwrites an older one.
(function captureAffiliateRef() {
  try {
    const params = new URLSearchParams(location.search);
    const ref = params.get('ref');
    if (ref && /^[a-zA-Z0-9_-]{2,40}$/.test(ref)) {
      localStorage.setItem('me_ref_code', ref.toUpperCase());
    }
  } catch (e) {}
})();

// Sticky header shadow on scroll
const header = document.getElementById('siteHeader');
if (header) {
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 10);
  }, { passive: true });
}

// Mobile nav toggle
const navToggle = document.getElementById('navToggle');
const mainNav = document.getElementById('mainNav');
if (navToggle && mainNav) {
  navToggle.addEventListener('click', () => {
    mainNav.classList.toggle('open');
  });
  mainNav.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => mainNav.classList.remove('open'));
  });
}

// Reveal on scroll
const revealEls = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window && revealEls.length) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  revealEls.forEach(el => io.observe(el));
} else {
  revealEls.forEach(el => el.classList.add('in'));
}
