(function () {
  const grid = document.getElementById("gallery-grid");
  if (!grid) return;

  const portfolioItems = Array.isArray(window.PORTFOLIO_ITEMS) ? window.PORTFOLIO_ITEMS : [];
  let currentItems = portfolioItems.slice();
  let reorderEnabled = false;
  renderGallery(currentItems);
  bindUploader();
  bindReorderControls();

  function renderGallery(itemsToRender) {
  currentItems = itemsToRender.slice();
  const nextSlot = String(itemsToRender.length + 1).padStart(2, "0");
  grid.innerHTML = itemsToRender.map((item, index) => {
    const hasImage = Boolean(item.src);
    const title = escapeHtml(item.title || `Work ${String(index + 1).padStart(2, "0")}`);
    const meta = escapeHtml(item.meta || "ETETT1309 Archive");
    const model = item.model ? `<span class="model">${escapeHtml(item.model)}</span>` : "";
    const count = Array.isArray(item.images) && item.images.length > 1
      ? `<span class="count label">${item.images.length} Photos</span>`
      : "";
    const alt = escapeHtml(item.alt || title);
    const focus = item.focus ? ` style="--focus: ${escapeAttribute(item.focus)}"` : "";
    const media = hasImage
      ? `<img src="${escapeAttribute(item.src)}" alt="${alt}" loading="lazy">`
      : `<div class="placeholder"><span class="mark">✦</span><span class="label">Upload Pending</span></div>`;

    return `
      <article class="work" role="button" tabindex="0" data-index="${index}" draggable="${reorderEnabled ? "true" : "false"}">
        <div class="frame"${focus}>${media}</div>
        <div class="meta">
          <b>${title}</b>
          <span>${meta}</span>
          ${model}
          ${count}
        </div>
      </article>
    `;
  }).join("") + `
    <button class="add-work" type="button" id="open-upload" aria-label="사진 추가">
      <span><span class="plus">+</span><span class="label">Add Photo</span><span class="hint label">Slot ${nextSlot}</span></span>
    </button>
  `;
  bindPostCards(itemsToRender);
  bindDragOrder();
  }

  function bindPostCards(items) {
    grid.querySelectorAll(".work").forEach((card) => {
      const open = () => openPost(items[Number(card.dataset.index)]);
      card.addEventListener("click", open);
      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          open();
        }
      });
    });
  }

  function bindReorderControls() {
    const toggle = document.getElementById("enable-order");
    const save = document.getElementById("save-order");
    const status = document.getElementById("order-status");
    const token = document.getElementById("order-token");
    if (!toggle || !save || !status || !token) return;

    toggle.addEventListener("click", () => {
      reorderEnabled = !reorderEnabled;
      status.textContent = reorderEnabled ? "Drag cards to reorder" : "";
      toggle.textContent = reorderEnabled ? "Done" : "Reorder";
      renderGallery(currentItems);
    });

    save.addEventListener("click", async () => {
      const uploadKey = token.value.trim();
      if (!uploadKey) {
        status.textContent = "업로드 키를 입력해주세요.";
        return;
      }
      save.disabled = true;
      status.textContent = "Saving order";
      try {
        await githubFetch(uploadKey, `/repos/${OWNER}/${REPO}`);
        const current = await getFile(uploadKey, GALLERY_PATH);
        const nextGallery = `window.PORTFOLIO_ITEMS = ${JSON.stringify(currentItems, null, 2)};\n`;
        await putFile(uploadKey, GALLERY_PATH, textToBase64(nextGallery), "Reorder gallery posts", current.sha);
        status.textContent = "Saved";
      } catch (error) {
        status.textContent = error.message || String(error);
      } finally {
        save.disabled = false;
      }
    });
  }

  function bindDragOrder() {
    if (!reorderEnabled) return;
    let fromIndex = null;

    grid.querySelectorAll(".work").forEach((card) => {
      card.addEventListener("dragstart", (event) => {
        fromIndex = Number(card.dataset.index);
        card.classList.add("dragging");
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", String(fromIndex));
      });

      card.addEventListener("dragend", () => {
        card.classList.remove("dragging");
        grid.querySelectorAll(".drag-over").forEach((item) => item.classList.remove("drag-over"));
      });

      card.addEventListener("dragover", (event) => {
        event.preventDefault();
        card.classList.add("drag-over");
      });

      card.addEventListener("dragleave", () => {
        card.classList.remove("drag-over");
      });

      card.addEventListener("drop", (event) => {
        event.preventDefault();
        card.classList.remove("drag-over");
        const toIndex = Number(card.dataset.index);
        if (!Number.isInteger(fromIndex) || !Number.isInteger(toIndex) || fromIndex === toIndex) return;
        const next = currentItems.slice();
        const [moved] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, moved);
        renderGallery(next);
      });
    });
  }

  function openPost(item) {
    if (!item) return;
    const dialog = document.getElementById("post-dialog");
    const title = document.getElementById("post-title");
    const meta = document.getElementById("post-meta");
    const model = document.getElementById("post-model");
    const images = document.getElementById("post-images");
    const source = document.getElementById("post-source");
    const close = document.getElementById("close-post");
    const openDelete = document.getElementById("open-delete");
    const deleteBox = document.getElementById("delete-box");
    const deleteToken = document.getElementById("delete-token");
    const confirmDelete = document.getElementById("confirm-delete");
    const deleteStatus = document.getElementById("delete-status");
    if (!dialog || !title || !meta || !model || !images || !source || !close || !openDelete || !deleteBox || !deleteToken || !confirmDelete || !deleteStatus) return;

    dialog.dataset.postIndex = String(currentItems.indexOf(item));
    title.textContent = item.title || "";
    meta.textContent = item.meta || "";
    model.textContent = item.model || "";

    const imageList = Array.isArray(item.images) && item.images.length ? item.images : [item.src].filter(Boolean);
    images.innerHTML = imageList.map((src, index) => {
      const alt = escapeHtml(`${item.title || "Portfolio"} ${index + 1}`);
      return `<img src="${escapeAttribute(src)}" alt="${alt}" loading="lazy">`;
    }).join("");

    if (item.url) {
      source.href = item.url;
      source.hidden = false;
    } else {
      source.hidden = true;
    }

    if (!dialog.dataset.bound) {
      close.addEventListener("click", () => dialog.close());
      dialog.addEventListener("click", (event) => {
        if (event.target === dialog) dialog.close();
      });
      openDelete.addEventListener("click", () => {
        deleteBox.classList.toggle("open");
      });
      confirmDelete.addEventListener("click", () => deleteCurrentPost());
      dialog.dataset.bound = "true";
    }

    deleteBox.classList.remove("open");
    deleteToken.value = "";
    deleteStatus.textContent = "";
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  async function deleteCurrentPost() {
    const dialog = document.getElementById("post-dialog");
    const deleteToken = document.getElementById("delete-token");
    const confirmDelete = document.getElementById("confirm-delete");
    const deleteStatus = document.getElementById("delete-status");
    if (!dialog || !deleteToken || !confirmDelete || !deleteStatus) return;

    const token = deleteToken.value.trim();
    const index = Number(dialog.dataset.postIndex);
    if (!token) {
      deleteStatus.textContent = "업로드 키를 입력해주세요.";
      return;
    }
    if (!Number.isInteger(index) || index < 0 || index >= currentItems.length) {
      deleteStatus.textContent = "삭제할 게시물을 찾을 수 없습니다.";
      return;
    }

    confirmDelete.disabled = true;
    deleteStatus.textContent = "Deleting";
    try {
      await githubFetch(token, `/repos/${OWNER}/${REPO}`);
      const current = await getFile(token, GALLERY_PATH);
      const remoteItems = parseGallery(current.text);
      const target = currentItems[index];
      const nextItems = remoteItems.filter((item) => !samePost(item, target));
      if (nextItems.length === remoteItems.length) throw new Error("목록에서 해당 게시물을 찾지 못했습니다.");
      const nextGallery = `window.PORTFOLIO_ITEMS = ${JSON.stringify(nextItems, null, 2)};\n`;
      await putFile(token, GALLERY_PATH, textToBase64(nextGallery), "Delete gallery post", current.sha);
      deleteStatus.textContent = "Deleted";
      renderGallery(nextItems);
      bindUploader();
      dialog.close();
    } catch (error) {
      deleteStatus.textContent = error.message || String(error);
    } finally {
      confirmDelete.disabled = false;
    }
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
        const files = Array.from(document.getElementById("photo").files);
        const title = document.getElementById("title").value.trim();
        const meta = document.getElementById("meta").value.trim();
        const model = document.getElementById("model").value.trim();
        const filenameBase = document.getElementById("filename").value;

        if (!token || !files.length || !title || !meta || !model) throw new Error("업로드 키, 사진, 제목, 중제목, 소제목은 필수입니다.");
        if (files.some((file) => file.size > 8 * 1024 * 1024)) throw new Error("8MB 이하 이미지만 업로드할 수 있습니다.");

        setStatus("Checking upload key");
        await githubFetch(token, `/repos/${OWNER}/${REPO}`);

        setStatus("Uploading images");
        const imagePaths = [];
        for (let index = 0; index < files.length; index += 1) {
          const file = files[index];
          const filename = normalizeFilename(filenameBase, file, index, files.length);
          const imagePath = `assets/gallery/${filename}`;
          const existingImage = await getFileIfExists(token, imagePath);
          await putFile(token, imagePath, await fileToBase64(file), `Upload gallery image ${filename}`, existingImage && existingImage.sha);
          imagePaths.push(imagePath);
        }

        setStatus("Updating list");
        const current = await getFile(token, GALLERY_PATH);
        const nextItems = parseGallery(current.text);
        nextItems.push({
          src: imagePaths[0],
          images: imagePaths,
          title,
          meta,
          model,
          alt: `${title} ${meta}`,
          focus: "50% 24%"
        });

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
    if (!response.ok) {
      const error = new Error(explainGithubError(response.status, data.message));
      error.status = response.status;
      throw error;
    }
    return data;
  }

  async function getFile(token, path) {
    const data = await githubFetch(token, `/repos/${OWNER}/${REPO}/contents/${encodeURIComponentPath(path)}?ref=${BRANCH}`);
    return {
      sha: data.sha,
      text: decodeBase64Text(data.content || "")
    };
  }

  async function getFileIfExists(token, path) {
    try {
      return await getFile(token, path);
    } catch (error) {
      if (error.status === 404) return null;
      throw error;
    }
  }

  async function putFile(token, path, content, message, sha) {
    const body = { message, content, branch: BRANCH };
    if (sha) body.sha = sha;
    return githubFetch(token, `/repos/${OWNER}/${REPO}/contents/${encodeURIComponentPath(path)}`, {
      method: "PUT",
      body: JSON.stringify(body)
    });
  }

  function explainGithubError(status, message) {
    if (status === 401) return "업로드 키가 올바르지 않거나 만료되었습니다.";
    if (status === 403) return "업로드 키 권한이 부족합니다. Contents 권한을 Read and write로 설정해주세요.";
    if (status === 404) return "저장소나 파일을 찾을 수 없습니다. 업로드 키가 이 저장소에 접근 가능한지 확인해주세요.";
    if (status === 409) return "동시에 수정된 파일이 있습니다. 새로고침 후 다시 시도해주세요.";
    if (status === 422) return "파일명 충돌 또는 요청 오류입니다. 파일명을 바꾸거나 새로고침 후 다시 시도해주세요.";
    return message || `GitHub API 오류: ${status}`;
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

  function samePost(left, right) {
    if (!left || !right) return false;
    if (left.url && right.url && left.url === right.url) return true;
    if (left.src && right.src && left.src === right.src) return true;
    return left.title === right.title && left.meta === right.meta && left.model === right.model;
  }

  function normalizeFilename(value, file, index, total) {
    const ext = (file.name.match(/\.[a-z0-9]+$/i) || [".jpg"])[0].toLowerCase();
    const base = (value || file.name.replace(/\.[^.]+$/, ""))
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9가-힣._-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const cleanBase = base.replace(/\.[a-z0-9]+$/i, "") || `work-${Date.now()}`;
    const suffix = total > 1 ? `-${String(index + 1).padStart(2, "0")}` : "";
    return `${cleanBase}${suffix}${ext}`;
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
