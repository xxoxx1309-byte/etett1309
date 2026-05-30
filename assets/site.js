(function () {
  const grid = document.getElementById("gallery-grid");
  if (!grid) return;

  const fallbackItems = [
    { title: "Photo Slot 01", meta: "Upload an image from admin.html" },
    { title: "Photo Slot 02", meta: "Square gallery cell" },
    { title: "Photo Slot 03", meta: "Square gallery cell" },
    { title: "Photo Slot 04", meta: "Square gallery cell" },
    { title: "Photo Slot 05", meta: "Square gallery cell" },
    { title: "Photo Slot 06", meta: "Square gallery cell" }
  ];

  const items = Array.isArray(window.PORTFOLIO_ITEMS) && window.PORTFOLIO_ITEMS.length
    ? window.PORTFOLIO_ITEMS
    : fallbackItems;

  grid.innerHTML = items.map((item, index) => {
    const hasImage = Boolean(item.src);
    const title = escapeHtml(item.title || `Work ${String(index + 1).padStart(2, "0")}`);
    const meta = escapeHtml(item.meta || "ETETT1309 Archive");
    const alt = escapeHtml(item.alt || title);
    const media = hasImage
      ? `<img src="${escapeAttribute(item.src)}" alt="${alt}" loading="lazy">`
      : `<div class="placeholder"><span class="mark">✦</span><span class="label">Upload Pending</span></div>`;

    return `
      <article class="work">
        <div class="frame">${media}</div>
        <div class="meta">
          <b>${title}</b>
          <span>${meta}</span>
        </div>
      </article>
    `;
  }).join("");

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/`/g, "&#096;");
  }
}());
