(function () {
  const grid = document.getElementById("gallery-grid");
  if (!grid) return;

  const portfolioItems = Array.isArray(window.PORTFOLIO_ITEMS) ? window.PORTFOLIO_ITEMS : [];
  renderGallery(portfolioItems);
  bindUploader();

  function renderGallery(itemsToRender) {
  grid.innerHTML = itemsToRender.map((item, index) => {
    const hasImage = Boolean(item.src);
    const title = escapeHtml(item.title || `Work ${String(index + 1).padStart(2, "0")}`);
    const meta = escapeHtml(item.meta || "ETETT1309 Archive");
    const alt = escapeHtml(item.alt || title);
    const url = item.url ? escapeAttribute(item.url) : "";
    const media = hasImage
      ? `<img src="${escapeAttribute(item.src)}" alt="${alt}" loading="lazy">`
      : `<div class="placeholder"><span class="mark">✦</span><span class="label">Upload Pending</span></div>`;
    const frame = url
      ? `<a class="frame" href="${url}" target="_blank" rel="noreferrer">${media}</a>`
      : `<div class="frame">${media}</div>`;

    return `
      <article class="work">
        ${frame}
        <div class="meta">
          <b>${title}</b>
          <span>${meta}</span>
        </div>
      </article>
    `;
  }).join("") + `
    <button class="add-work" type="button" id="open-upload" aria-label="사진 추가">
      <span><span class="plus">+</span><span class="label">Add Photo</span><span class="hint label">Slot 06</span></span>
    </button>
  `;
  }

  function bindUploader() {
    const dialog = document.getElementById("upload-dialog");
    const openButton = document.getElementById("open-upload");
    const closeButton = document.getElementById("close-upload");
    const form = document.getElementById("upload-form");
    const statusBox = document.getElementById("upload-status");
    const submit = document.getElementById("submit-upload");

    if (!dialog || !openButton || !closeButton || !form || !statusBox || !submit) return;

    openButton.addEventListener("click", () => {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    });

    if (!dialog.dataset.bound) {
      closeButton.addEventListener("click", () => dialog.close());
      dialog.addEventListener("click", (event) => {
        if (event.target === dialog) dialog.close();
      });
      dialog.dataset.bound = "true";
    }

    if (form.dataset.bound) return;
    form.dataset.bound = "true";
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      setStatus("Preparing");
      submit.disabled = true;

      try {
        const token = document.getElementById("token").value.trim();
        const file = document.getElementById("photo").files[0];
        const title = document.getElementById("title").value.trim();
        const meta = document.getElementById("meta").value.trim();
        const alt = document.getElementById("alt").value.trim() || title;
        const filename = normalizeFilename(document.getElementById("filename").value, file);
        const imagePath = `assets/gallery/${filename}`;

        if (!token || !file || !title) throw new Error("업로드 키, 사진, 제목은 필수입니다.");
        if (file.size > 8 * 1024 * 1024) throw new Error("8MB 이하 이미지만 업로드할 수 있습니다.");

        setStatus("Uploading image");
        await putFile(token, imagePath, await fileToBase64(file), `Upload gallery image ${filename}`);

        setStatus("Updating list");
        const current = await getFile(token, GALLERY_PATH);
        const nextItems = parseGallery(current.text);
        nextItems.push({ src: imagePath, title, meta, alt });

        setStatus("Saving");
        const nextGallery = `window.PORTFOLIO_ITEMS = ${JSON.stringify(nextItems, null, 2)};\n`;
        await putFile(token, GALLERY_PATH, textToBase64(nextGallery), "Update gallery list", current.sha);

        setStatus("Done", "ok");
        renderGallery(nextItems);
        bindUploader();
        form.reset();
      } catch (error) {
        setStatus(error.message || String(error), "error");
      } finally {
        submit.disabled = false;
      }
    });

    function setStatus(message, kind = "") {
      statusBox.className = `upload-status ${kind}`.trim();
      statusBox.textContent = message;
    }
  }

  const OWNER = "xxoxx1309-byte";
  const REPO = "etett1309";
  const BRANCH = "main";
  const API = "https://api.github.com";
  const GALLERY_PATH = "assets/gallery.js";

  async function githubFetch(token, path, options = {}) {
    const response = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        "Accept": "application/vnd.github+json",
        "Authorization": `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        ...(options.headers || {})
      }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || `GitHub API 오류: ${response.status}`);
    return data;
  }

  async function getFile(token, path) {
    const data = await githubFetch(token, `/repos/${OWNER}/${REPO}/contents/${encodeURIComponentPath(path)}?ref=${BRANCH}`);
    return {
      sha: data.sha,
      text: decodeBase64Text(data.content || "")
    };
  }

  async function putFile(token, path, content, message, sha) {
    const body = { message, content, branch: BRANCH };
    if (sha) body.sha = sha;
    return githubFetch(token, `/repos/${OWNER}/${REPO}/contents/${encodeURIComponentPath(path)}`, {
      method: "PUT",
      body: JSON.stringify(body)
    });
  }

  function parseGallery(text) {
    const match = text.match(/window\.PORTFOLIO_ITEMS\s*=\s*([\s\S]*?);\s*$/);
    if (!match) return [];
    try {
      const parsed = JSON.parse(match[1]);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function normalizeFilename(value, file) {
    const ext = (file.name.match(/\.[a-z0-9]+$/i) || [".jpg"])[0].toLowerCase();
    const base = (value || file.name.replace(/\.[^.]+$/, ""))
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9가-힣._-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return base.endsWith(ext) ? base : `${base || `work-${Date.now()}`}${ext}`;
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1]);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  function textToBase64(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = "";
    bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
    return btoa(binary);
  }

  function decodeBase64Text(content) {
    const clean = content.replace(/\s/g, "");
    const binary = atob(clean);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  function encodeURIComponentPath(path) {
    return path.split("/").map(encodeURIComponent).join("/");
  }

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
