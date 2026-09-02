// Related-videos widget — fetches the channel's actual top-performing videos
// matching a topic (by view count), not a hand-picked static list.
// Usage: <div id="relatedVideosWidget" data-topic="نطق أمريكي حروف"></div>
(function () {
  const API = "https://soft-wave-c3e8-masterenglish-fulfillment.masterenglishtube.workers.dev";

  function formatViews(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, "") + " مليون";
    if (n >= 1000) return Math.round(n / 1000) + " ألف";
    return String(n);
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const widget = document.getElementById("relatedVideosWidget");
    if (!widget) return;
    const topic = widget.dataset.topic;
    if (!topic) return;

    try {
      const res = await fetch(`${API}/videos/related?q=${encodeURIComponent(topic)}&limit=3`);
      const data = await res.json();
      const videos = data.videos || [];
      if (!videos.length) {
        widget.style.display = "none";
        return;
      }

      widget.innerHTML = `
        <h2 style="font-family:var(--font-head); font-size:20px; margin-bottom:18px;">فيديوهات ذات صلة من القناة</h2>
        <div class="video-grid" style="gap:18px;"></div>
      `;
      const grid = widget.querySelector(".video-grid");
      videos.forEach((v) => {
        const card = document.createElement("a");
        card.href = v.url;
        card.target = "_blank";
        card.rel = "noopener";
        card.className = "video-card";
        card.style.textDecoration = "none";
        card.style.color = "inherit";
        card.style.display = "block";
        card.innerHTML = `
          <div style="aspect-ratio:16/9; overflow:hidden;">
            <img src="${v.thumbnail_url}" alt="${v.title}" loading="lazy" style="width:100%; height:100%; object-fit:cover;">
          </div>
          <h3 style="font-size:14.5px; padding:12px 14px 6px;">${v.title}</h3>
          <p style="font-size:12.5px; color:var(--ink-soft); padding:0 14px 14px; margin:0;">👁️ ${formatViews(v.view_count)} مشاهدة</p>
        `;
        grid.appendChild(card);
      });
    } catch (e) {
      widget.style.display = "none";
    }
  });
})();
