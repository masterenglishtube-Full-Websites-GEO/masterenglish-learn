// Homepage: keep the "latest lessons" strip current between site updates. The build writes
// the newest four lessons into the page; if the channel has published since, swap them in.
(function () {
  const row = document.getElementById("homeLatest");
  if (!row || !window.fetch) return;
  const API = "https://soft-wave-c3e8-masterenglish-fulfillment.masterenglishtube.workers.dev";
  const AR = (n) => String(n).replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);
  const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  const views = (n) => n >= 1e6 ? AR((n / 1e6).toFixed(1).replace(/\.0$/, "")).replace(".", "٫") + " مليون" : n >= 1000 ? AR(Math.round(n / 1000)) + " ألف" : AR(n);
  const date = (iso) => { const d = new Date(iso); return AR(d.getUTCDate()) + " " + MONTHS[d.getUTCMonth()] + " " + AR(d.getUTCFullYear()); };
  const dur = (s) => { const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = String(s % 60).padStart(2, "0"); return h ? h + ":" + String(m).padStart(2, "0") + ":" + x : m + ":" + x; };
  const playIcon = (row.querySelector(".vid-play") || {}).innerHTML || "";

  fetch(API + "/videos/latest?limit=4").then((r) => r.json()).then((d) => {
    const vs = (d.videos || []).slice(0, 4);
    const first = row.querySelector("[data-video]");
    if (vs.length < 4 || (first && first.dataset.video === vs[0].id)) return;
    row.textContent = "";
    vs.forEach((v, i) => {
      const a = document.createElement("a");
      a.className = "vid-card"; a.dataset.video = v.id; a.href = v.url; a.target = "_blank"; a.rel = "noopener";
      a.innerHTML = '<span class="vid-im"><img alt="" loading="lazy" width="320" height="180">' + (i === 0 ? '<span class="vid-new">جديد</span>' : "") +
        '<span class="vid-dur"></span><span class="vid-play">' + playIcon + "</span></span><strong></strong><small></small>";
      a.querySelector("img").src = "https://i.ytimg.com/vi/" + v.id + "/mqdefault.jpg";
      a.querySelector(".vid-dur").textContent = v.s ? dur(v.s) : "";
      a.querySelector("strong").textContent = v.title;
      a.querySelector("small").textContent = views(v.view_count || 0) + " مشاهدة · " + date(v.published_at);
      row.appendChild(a);
    });
  }).catch(() => {});
})();
