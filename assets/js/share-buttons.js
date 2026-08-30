// Renders a share bar into any element with id="meShareBox".
// Native share sheet when available (mobile), otherwise a "copy link + text" button.
(function () {
  document.addEventListener("DOMContentLoaded", () => {
    const box = document.getElementById("meShareBox");
    if (!box) return;

    const title = document.title;
    const url = location.href;
    const shareText = `${title} - ${url}`;

    const wrap = document.createElement("div");
    wrap.className = "me-share";
    wrap.innerHTML = `<span>شارك هذه الصفحة</span>`;

    if (navigator.share) {
      const shareBtn = document.createElement("button");
      shareBtn.type = "button";
      shareBtn.textContent = "مشاركة";
      shareBtn.addEventListener("click", () => {
        navigator.share({ title, url }).catch(() => {});
      });
      wrap.appendChild(shareBtn);
    }

    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.textContent = "نسخ الرابط";
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(shareText);
        copyBtn.textContent = "تم النسخ!";
        setTimeout(() => { copyBtn.textContent = "نسخ الرابط"; }, 2000);
      } catch (e) {
        copyBtn.textContent = "انسخ يدوياً: " + url;
      }
    });
    wrap.appendChild(copyBtn);

    const waBtn = document.createElement("button");
    waBtn.type = "button";
    waBtn.textContent = "واتساب";
    waBtn.addEventListener("click", () => {
      window.open("https://wa.me/?text=" + encodeURIComponent(shareText), "_blank", "noopener");
    });
    wrap.appendChild(waBtn);

    box.appendChild(wrap);
  });
})();
