(() => {
  const $ = (id) => document.getElementById(id);
  const DB_KEY = "activity-file-manager-v1";
  let files = [];
  let activity = [];
  let activeView = "all";
  let activeFilter = "all";
  let gridMode = false;
  let sessionAdded = 0;
  let toastTimer;
  let modalAction = null;

  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const formatBytes = (n) => {
    if (!n) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), units.length - 1);
    return `${(n / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
  };
  const dateLabel = (iso) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "Just now";
    const diff = Math.max(0, Date.now() - d.getTime());
    if (diff < 60_000) return "Just now";
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} hr ago`;
    return d.toLocaleDateString(undefined, {month:"short", day:"numeric", year: d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined});
  };
  const fileCategory = (file) => {
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (["png","jpg","jpeg","gif","webp","svg","bmp","heic"].includes(ext)) return "image";
    if (["pdf"].includes(ext)) return "pdf";
    if (["doc","docx","txt","rtf","odt","xls","xlsx","ppt","pptx","csv","md"].includes(ext)) return "document";
    return "other";
  };
  const iconFor = (file) => {
    const c = fileCategory(file);
    return c === "image" ? "▧" : c === "pdf" ? "PDF" : c === "document" ? "▤" : "◇";
  };
  function persist() {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify({files, activity}));
    } catch (e) {
      toast("Browser storage is full. Large files are not copied into this demo.");
    }
  }
  function logActivity(action, fileName) {
    activity.unshift({id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()), action, fileName, at: new Date().toISOString()});
    activity = activity.slice(0, 80);
    persist();
  }
  function toast(message) {
    $("toast").textContent = message;
    $("toast").classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $("toast").classList.remove("show"), 2600);
  }
  function load() {
    try {
      const data = JSON.parse(localStorage.getItem(DB_KEY) || "{}");
      files = Array.isArray(data.files) ? data.files : [];
      activity = Array.isArray(data.activity) ? data.activity : [];
    } catch { files = []; activity = []; }
    render();
  }
  function visibleFiles() {
    const query = $("searchInput").value.trim().toLowerCase();
    let list = files.filter(f => activeView === "trash" ? f.trashed : !f.trashed);
    if (activeView === "favorites") list = list.filter(f => f.favorite);
    if (activeView === "recent") list = list.filter(f => true).sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 20);
    if (activeFilter !== "all") list = list.filter(f => activeFilter === "other" ? !["image","pdf","document"].includes(fileCategory(f)) : activeFilter === "document" ? ["document","pdf"].includes(fileCategory(f)) : fileCategory(f) === activeFilter);
    if (query) list = list.filter(f => f.name.toLowerCase().includes(query));
    const sort = $("sortSelect").value;
    if (sort === "newest") list.sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    if (sort === "oldest") list.sort((a,b) => new Date(a.updatedAt) - new Date(b.updatedAt));
    if (sort === "name") list.sort((a,b) => a.name.localeCompare(b.name));
    if (sort === "size") list.sort((a,b) => b.size - a.size);
    return list;
  }
  function render() {
    const visible = visibleFiles();
    const live = files.filter(f => !f.trashed);
    $("fileCount").textContent = live.length;
    $("totalFiles").textContent = live.length;
    $("sessionFiles").textContent = sessionAdded;
    $("favoriteCount").textContent = live.filter(f => f.favorite).length;
    const totalBytes = live.reduce((sum, f) => sum + (f.size || 0), 0);
    $("storageText").textContent = formatBytes(totalBytes);
    $("storageBar").style.width = `${Math.min(100, totalBytes / (100 * 1024 * 1024) * 100)}%`;
    const titles = {all:"All files",recent:"Recent activity",favorites:"Favorites",trash:"Trash"};
    $("viewTitle").textContent = titles[activeView];
    $("listHeading").textContent = activeView === "trash" ? "Deleted files" : activeView === "favorites" ? "Your favorites" : activeView === "recent" ? "Recently updated" : "Your files";
    $("listSubheading").textContent = activeView === "trash" ? "Restore files or permanently delete them" : "Manage your uploaded files and folders";
    document.querySelectorAll(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.view === activeView));
    document.querySelectorAll(".filter").forEach(b => b.classList.toggle("active", b.dataset.filter === activeFilter));
    $("fileArea").classList.toggle("grid-mode", gridMode);
    $("listViewBtn").classList.toggle("active", !gridMode);
    $("gridViewBtn").classList.toggle("active", gridMode);
    $("fileRows").innerHTML = visible.map(f => {
      const cat = fileCategory(f);
      return `<tr>
        <td><div class="file-name"><span class="file-type-icon ${cat === "pdf" ? "type-pdf" : cat === "image" ? "type-image" : cat === "document" ? "type-document" : "type-other"}">${iconFor(f)}</span><span class="file-name-text"><strong title="${escapeHtml(f.name)}">${escapeHtml(f.name)}${f.favorite ? " ★" : ""}</strong><small>${escapeHtml(cat === "pdf" ? "PDF document" : cat === "image" ? "Image file" : cat === "document" ? "Document" : "File")}</small></span></div></td>
        <td>${formatBytes(f.size)}</td><td>${dateLabel(f.updatedAt)}</td>
        <td><div class="row-actions">${activeView === "trash" ? `<button class="mini-btn" title="Restore" data-action="restore" data-id="${f.id}">↶</button><button class="mini-btn" title="Delete permanently" data-action="delete" data-id="${f.id}">×</button>` : `<button class="mini-btn" title="${f.favorite ? "Remove favorite" : "Add favorite"}" data-action="favorite" data-id="${f.id}">${f.favorite ? "★" : "☆"}</button><button class="mini-btn" title="Download" data-action="download" data-id="${f.id}">↓</button><button class="mini-btn" title="Details" data-action="details" data-id="${f.id}">•••</button><button class="mini-btn" title="Move to trash" data-action="trash" data-id="${f.id}">♲</button>`}</div></td>
      </tr>`;
    }).join("");
    $("emptyState").style.display = visible.length ? "none" : "block";
    $("showingText").textContent = `Showing ${visible.length} file${visible.length === 1 ? "" : "s"}`;
    renderActivity();
  }
  function renderActivity() {
    const items = activity.slice(0, 6);
    $("activityList").innerHTML = items.length ? items.map(a => `<div class="activity-item"><span class="activity-icon">${a.action === "Uploaded" ? "↑" : a.action === "Downloaded" ? "↓" : a.action === "Favorited" ? "☆" : a.action === "Restored" ? "↶" : "▤"}</span><div class="activity-copy"><p><strong>${escapeHtml(a.action)}</strong> ${escapeHtml(a.fileName)}</p><small>${dateLabel(a.at)}</small></div></div>`).join("") : `<div class="activity-empty">Your file activity will appear here.</div>`;
  }
  function upload(filesList) {
    const incoming = Array.from(filesList || []);
    if (!incoming.length) return;
    let added = 0;
    incoming.forEach(file => {
      // This demo stores file metadata only. File bytes remain on the user's device.
      const item = {id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()), name:file.name, size:file.size, type:file.type, updatedAt:new Date().toISOString(), favorite:false, trashed:false};
      files.unshift(item);
      logActivity("Uploaded", file.name);
      added++;
    });
    sessionAdded += added;
    persist();
    render();
    toast(`${added} file${added === 1 ? "" : "s"} added to the demo list.`);
  }
  function showModal(title, body, primaryLabel = "Done", action = null, symbol = "▤") {
    $("modalTitle").textContent = title;
    $("modalBody").innerHTML = body;
    $("modalPrimary").textContent = primaryLabel;
    $("modalSymbol").textContent = symbol;
    modalAction = action;
    $("modalBackdrop").hidden = false;
  }
  function closeModal() { $("modalBackdrop").hidden = true; modalAction = null; }
  function details(file) {
    showModal("File details", `<div class="modal-body-row"><span>Name</span><strong>${escapeHtml(file.name)}</strong></div><div class="modal-body-row"><span>File size</span><strong>${formatBytes(file.size)}</strong></div><div class="modal-body-row"><span>File type</span><strong>${escapeHtml(file.type || fileCategory(file))}</strong></div><div class="modal-body-row"><span>Last activity</span><strong>${new Date(file.updatedAt).toLocaleString()}</strong></div><div class="modal-body-row"><span>Storage</span><strong>Metadata only</strong></div>`, "Close", null, iconFor(file));
  }
  function handleAction(action, id) {
    const file = files.find(f => f.id === id);
    if (!file) return;
    if (action === "details") return details(file);
    if (action === "favorite") {
      file.favorite = !file.favorite; file.updatedAt = new Date().toISOString();
      logActivity(file.favorite ? "Favorited" : "Unfavorited", file.name);
      persist(); render(); toast(file.favorite ? "Added to favorites." : "Removed from favorites.");
    }
    if (action === "trash") {
      file.trashed = true; file.updatedAt = new Date().toISOString();
      logActivity("Moved to trash", file.name); persist(); render(); toast("Moved to trash.");
    }
    if (action === "restore") {
      file.trashed = false; file.updatedAt = new Date().toISOString();
      logActivity("Restored", file.name); persist(); render(); toast("File restored.");
    }
    if (action === "delete") {
      showModal("Delete permanently?", ` <p style="font-size:12px;color:#88869a">“${escapeHtml(file.name)}” will be removed from this browser's demo list.</p>`, "Delete", () => {
        files = files.filter(f => f.id !== id); logActivity("Deleted permanently", file.name); persist(); render(); closeModal(); toast("File deleted.");
      }, "×");
    }
    if (action === "download") {
      // Since only metadata is stored, this downloads a small reference note rather than original file content.
      const blob = new Blob([`Activity File Manager demo record\nName: ${file.name}\nSize: ${file.size} bytes\n\nThe original file content was not uploaded or stored by this demo.`], {type:"text/plain"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `${file.name}.demo-info.txt`; a.click();
      URL.revokeObjectURL(url); logActivity("Downloaded info for", file.name); render(); toast("Downloaded a demo info note, not the original file.");
    }
  }

  $("uploadBtn").addEventListener("click", () => $("fileInput").click());
  $("emptyUploadBtn").addEventListener("click", () => $("fileInput").click());
  $("fileInput").addEventListener("change", e => { upload(e.target.files); e.target.value = ""; });
  $("searchInput").addEventListener("input", render);
  $("sortSelect").addEventListener("change", render);
  document.querySelectorAll(".nav-item").forEach(b => b.addEventListener("click", () => { activeView = b.dataset.view; render(); }));
  document.querySelectorAll(".filter").forEach(b => b.addEventListener("click", () => { activeFilter = b.dataset.filter; render(); }));
  $("listViewBtn").addEventListener("click", () => { gridMode = false; render(); });
  $("gridViewBtn").addEventListener("click", () => { gridMode = true; render(); });
  $("fileRows").addEventListener("click", e => { const b = e.target.closest("button[data-action]"); if (b) handleAction(b.dataset.action, b.dataset.id); });
  $("modalClose").addEventListener("click", closeModal);
  $("modalCancel").addEventListener("click", closeModal);
  $("modalPrimary").addEventListener("click", () => { if (modalAction) modalAction(); else closeModal(); });
  $("modalBackdrop").addEventListener("click", e => { if (e.target === $("modalBackdrop")) closeModal(); });
  $("clearSearchBtn").addEventListener("click", () => { $("searchInput").value = ""; activeFilter = "all"; activeView = "all"; $("sortSelect").value = "newest"; render(); });
  $("activityBtn").addEventListener("click", () => { $("activityPanel").style.display = "block"; $("activityPanel").scrollIntoView({behavior:"smooth", block:"center"}); });
  $("viewAllActivity").addEventListener("click", () => {
    const body = activity.length ? activity.slice(0,30).map(a => `<div class="modal-body-row"><span>${escapeHtml(dateLabel(a.at))}</span><strong>${escapeHtml(a.action)}: ${escapeHtml(a.fileName)}</strong></div>`).join("") : "<p>No activity recorded yet.</p>";
    showModal("Activity history", body, "Close", null, "◷");
  });
  $("profileBtn").addEventListener("click", () => showModal("Demo workspace", "<p style='font-size:12px;color:#88869a;line-height:1.7'>This is a local-only demo. Files and activity metadata are saved in this browser's local storage. Online multi-device storage needs a backend and authentication.</p>", "Got it", null, "U"));
  document.addEventListener("keydown", e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); $("searchInput").focus(); }
    if (e.key === "Escape") closeModal();
  });
  load();
})();