/**
 * PackBrain — App Logic
 * Interactive packing dashboard with localStorage persistence.
 */

(function () {
  "use strict";

  const STORAGE_KEY = "packbrain-checked-items";
  const DATA_STORAGE_KEY = "packbrain-item-overrides";

  // ── State ──────────────────────────────────────────────
  let checkedItems = loadCheckedItems();
  let activeFilter = "all";
  let editingItemId = null;

  // Drag state
  let dragItemId = null;
  let dragCatId = null;
  let dragOverItemId = null;
  let dragOverPosition = null; // 'before' or 'after'

  // Apply saved overrides to PACKING_DATA on load
  applyDataOverrides();

  // ── DOM Refs ───────────────────────────────────────────
  const mainContent = document.getElementById("mainContent");
  const progressPercent = document.getElementById("progressPercent");
  const progressRingFill = document.querySelector(".progress-ring-fill");
  const filterBtns = document.querySelectorAll(".filter-btn");

  // ── Init ───────────────────────────────────────────────
  renderCategories();
  updateProgress();
  updateStats();
  setupFilters();
  setupFooterButtons();

  // ── Render ─────────────────────────────────────────────
  function renderCategories() {
    mainContent.innerHTML = "";

    PACKING_DATA.forEach((category) => {
      const filteredItems = filterItems(category.items);
      if (filteredItems.length === 0) return;

      const section = document.createElement("section");
      section.className = "category";
      section.dataset.category = category.id;

      const checkedCount = filteredItems.filter((i) => checkedItems.has(i.id)).length;
      const totalCount = filteredItems.length;
      const allChecked = checkedCount === totalCount;

      section.innerHTML = `
        <div class="category-header" style="--cat-color: ${category.color}">
          <div class="category-title-area">
            <span class="category-icon">${category.icon}</span>
            <h2 class="category-title">${category.title}</h2>
            <span class="category-count ${allChecked ? "done" : ""}">${checkedCount}/${totalCount}</span>
          </div>
          <div class="category-progress-bar">
            <div class="category-progress-fill" style="width: ${(checkedCount / totalCount) * 100}%; background: ${category.color}"></div>
          </div>
        </div>
        <ul class="item-list" data-cat-id="${category.id}">
          ${filteredItems.map((item) => renderItem(item, category)).join("")}
        </ul>
        <button class="add-item-btn" data-cat-id="${category.id}">
          <span>+</span> Add item
        </button>
      `;

      mainContent.appendChild(section);
    });

    // Bind checkbox events
    mainContent.querySelectorAll(".item-checkbox").forEach((cb) => {
      cb.addEventListener("change", handleCheck);
    });

    // Bind edit buttons
    mainContent.querySelectorAll(".edit-btn").forEach((btn) => {
      btn.addEventListener("click", handleEditClick);
    });

    // Bind delete buttons
    mainContent.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", handleDeleteClick);
    });

    // Bind add-item buttons
    mainContent.querySelectorAll(".add-item-btn").forEach((btn) => {
      btn.addEventListener("click", handleAddItem);
    });

    // Bind edit form events
    mainContent.querySelectorAll(".edit-form").forEach((form) => {
      form.querySelector(".edit-save").addEventListener("click", handleEditSave);
      form.querySelector(".edit-cancel").addEventListener("click", handleEditCancel);
    });

    // Setup drag-and-drop
    setupDragAndDrop();
  }

  function renderItem(item, category) {
    const checked = checkedItems.has(item.id);
    const bagLabel = getBagLabel(item.bag);
    const bagClass = item.bag;
    const color = category.color;
    const isEditing = editingItemId === item.id;

    if (isEditing) {
      return `
        <li class="item editing" data-bag="${item.bag}" data-id="${item.id}" data-cat-id="${category.id}">
          <div class="edit-form" data-id="${item.id}" data-cat-id="${category.id}">
            <div class="edit-row">
              <div class="edit-field">
                <label class="edit-field-label">Name</label>
                <input type="text" class="edit-input" name="name" value="${escapeHtml(item.name)}">
              </div>
              <div class="edit-field edit-field-sm">
                <label class="edit-field-label">Qty</label>
                <input type="number" class="edit-input" name="qty" value="${item.qty || ''}" min="0" placeholder="—">
              </div>
            </div>
            <div class="edit-row">
              <div class="edit-field">
                <label class="edit-field-label">Note</label>
                <input type="text" class="edit-input" name="note" value="${escapeHtml(item.note || '')}" placeholder="Optional note...">
              </div>
              <div class="edit-field edit-field-sm">
                <label class="edit-field-label">Bag</label>
                <select class="edit-select" name="bag">
                  <option value="checked-bag" ${item.bag === 'checked-bag' ? 'selected' : ''}>🧳 Checked</option>
                  <option value="backpack" ${item.bag === 'backpack' ? 'selected' : ''}>🎒 Backpack</option>
                  <option value="worn" ${item.bag === 'worn' ? 'selected' : ''}>👟 On you</option>
                  <option value="home" ${item.bag === 'home' ? 'selected' : ''}>🏠 Home</option>
                </select>
              </div>
            </div>
            <div class="edit-actions">
              <button class="edit-save">✓ Save</button>
              <button class="edit-cancel">Cancel</button>
            </div>
          </div>
        </li>
      `;
    }

    return `
      <li class="item ${checked ? "checked" : ""}" data-bag="${item.bag}" data-id="${item.id}" data-cat-id="${category.id}" draggable="true">
        <span class="drag-handle" title="Drag to reorder">
          <svg viewBox="0 0 16 16" width="14" height="14"><path d="M5 3h2v2H5zM9 3h2v2H9zM5 7h2v2H5zM9 7h2v2H9zM5 11h2v2H5zM9 11h2v2H9z" fill="currentColor"/></svg>
        </span>
        <label class="item-label">
          <input type="checkbox" class="item-checkbox" data-id="${item.id}" ${checked ? "checked" : ""}>
          <span class="custom-checkbox" style="--cb-color: ${color}">
            <svg viewBox="0 0 12 10" class="check-icon"><polyline points="1.5 6 4.5 9 10.5 1"></polyline></svg>
          </span>
          <span class="item-name">${item.name}</span>
          ${item.qty ? `<span class="item-qty">×${item.qty}</span>` : ""}
        </label>
        <div class="item-meta">
          ${item.note ? `<span class="item-note">${item.note}</span>` : ""}
          <span class="bag-tag ${bagClass}">${bagLabel}</span>
          <button class="edit-btn" data-id="${item.id}" title="Edit item">
            <svg viewBox="0 0 16 16" width="14" height="14"><path d="M11.013 1.427a1.75 1.75 0 012.474 0l1.086 1.086a1.75 1.75 0 010 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 01-.927-.928l.929-3.25a1.75 1.75 0 01.445-.758l8.61-8.61zm1.414 1.06a.25.25 0 00-.354 0L3.463 11.1a.25.25 0 00-.064.108l-.631 2.208 2.208-.63a.25.25 0 00.108-.064l8.61-8.61a.25.25 0 000-.354l-1.086-1.086z" fill="currentColor"/></svg>
          </button>
          <button class="delete-btn" data-id="${item.id}" data-cat-id="${category.id}" title="Delete item">
            <svg viewBox="0 0 16 16" width="14" height="14"><path d="M6.5 1.75a.25.25 0 01.25-.25h2.5a.25.25 0 01.25.25V3h-3V1.75zM11 3V1.75A1.75 1.75 0 009.25 0h-2.5A1.75 1.75 0 005 1.75V3H2.75a.75.75 0 000 1.5h.31l.69 9.112A1.75 1.75 0 005.502 15.5h4.996a1.75 1.75 0 001.752-1.888L12.94 4.5h.31a.75.75 0 000-1.5H11zm1.44 1.5H3.56l.68 8.953a.25.25 0 00.25.047h4.996a.25.25 0 00.25-.27L10.44 4.5z" fill="currentColor"/></svg>
          </button>
        </div>
      </li>
    `;
  }

  // ── Filtering ──────────────────────────────────────────
  function filterItems(items) {
    if (activeFilter === "all") return items;
    if (activeFilter === "unchecked") return items.filter((i) => !checkedItems.has(i.id));
    return items.filter((i) => i.bag === activeFilter);
  }

  function setupFilters() {
    filterBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        filterBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        activeFilter = btn.dataset.filter;
        renderCategories();
      });
    });
  }

  // ── Check Handling ─────────────────────────────────────
  function handleCheck(e) {
    const id = e.target.dataset.id;
    const li = e.target.closest(".item");

    if (e.target.checked) {
      checkedItems.add(id);
      li.classList.add("checked");
      // Fun little animation
      li.style.transform = "scale(0.98)";
      setTimeout(() => (li.style.transform = ""), 150);
    } else {
      checkedItems.delete(id);
      li.classList.remove("checked");
    }

    saveCheckedItems();
    updateProgress();
    updateStats();

    // Re-render if on "unchecked" filter (item should disappear)
    if (activeFilter === "unchecked") {
      setTimeout(() => renderCategories(), 200);
    } else {
      // Update category counts
      updateCategoryCount(li.closest(".category"));
    }
  }

  function updateCategoryCount(section) {
    if (!section) return;
    const catId = section.dataset.category;
    const category = PACKING_DATA.find((c) => c.id === catId);
    if (!category) return;

    const filtered = filterItems(category.items);
    const checkedCount = filtered.filter((i) => checkedItems.has(i.id)).length;
    const totalCount = filtered.length;
    const allChecked = checkedCount === totalCount;

    const countEl = section.querySelector(".category-count");
    const fillEl = section.querySelector(".category-progress-fill");

    if (countEl) {
      countEl.textContent = `${checkedCount}/${totalCount}`;
      countEl.classList.toggle("done", allChecked);
    }
    if (fillEl) {
      fillEl.style.width = `${(checkedCount / totalCount) * 100}%`;
    }
  }

  // ── Progress Ring ──────────────────────────────────────
  function updateProgress() {
    const allItems = PACKING_DATA.flatMap((c) => c.items);
    const total = allItems.length;
    const done = allItems.filter((i) => checkedItems.has(i.id)).length;
    const pct = Math.round((done / total) * 100);

    progressPercent.textContent = `${pct}%`;

    // SVG ring
    const radius = 34;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (pct / 100) * circumference;

    progressRingFill.style.strokeDasharray = `${circumference}`;
    progressRingFill.style.strokeDashoffset = `${offset}`;

    // Color transitions
    if (pct === 100) {
      progressRingFill.style.stroke = "#00E676";
      document.querySelector(".progress-area").classList.add("complete");
    } else if (pct > 75) {
      progressRingFill.style.stroke = "#00C9A7";
      document.querySelector(".progress-area").classList.remove("complete");
    } else if (pct > 40) {
      progressRingFill.style.stroke = "#FFD93D";
      document.querySelector(".progress-area").classList.remove("complete");
    } else {
      progressRingFill.style.stroke = "#6C63FF";
      document.querySelector(".progress-area").classList.remove("complete");
    }
  }

  // ── Stats ──────────────────────────────────────────────
  function updateStats() {
    const bags = { "checked-bag": 0, backpack: 0, worn: 0, home: 0 };
    PACKING_DATA.flatMap((c) => c.items).forEach((i) => {
      if (!checkedItems.has(i.id)) bags[i.bag]++;
    });

    document.getElementById("checkedCount").textContent = bags["checked-bag"];
    document.getElementById("backpackCount").textContent = bags["backpack"];
    document.getElementById("wornCount").textContent = bags["worn"];
    document.getElementById("homeCount").textContent = bags["home"];

    // Highlight stats that are fully done
    Object.entries(bags).forEach(([bag, count]) => {
      const statEl = document.getElementById(
        bag === "checked-bag" ? "statCheckedBag" : 
        bag === "backpack" ? "statBackpack" : 
        bag === "worn" ? "statWorn" : "statHome"
      );
      if (statEl) {
        if (count === 0) {
          statEl.classList.add("stat-done");
          statEl.querySelector(".stat-value").innerHTML = `<span style="color: #00E676">✓ Done</span>`;
        } else {
          statEl.classList.remove("stat-done");
          statEl.querySelector(".stat-value").innerHTML = `<span id="${
            bag === "checked-bag" ? "checkedCount" : 
            bag === "backpack" ? "backpackCount" : 
            bag === "worn" ? "wornCount" : "homeCount"
          }">${count}</span> left`;
        }
      }
    });
  }

  // ── Footer Buttons ─────────────────────────────────────
  function setupFooterButtons() {
    document.getElementById("btnReset").addEventListener("click", () => {
      if (confirm("Reset all checkboxes? Your progress will be cleared.")) {
        checkedItems.clear();
        saveCheckedItems();
        renderCategories();
        updateProgress();
        updateStats();
      }
    });

    document.getElementById("btnExport").addEventListener("click", () => {
      const lines = [];
      PACKING_DATA.forEach((cat) => {
        lines.push(`\n── ${cat.icon} ${cat.title} ──`);
        cat.items.forEach((item) => {
          const check = checkedItems.has(item.id) ? "✅" : "⬜";
          const qty = item.qty ? ` ×${item.qty}` : "";
          const bag = getBagLabel(item.bag);
          lines.push(`${check} ${item.name}${qty} → ${bag}`);
        });
      });

      const text = `🧳 PackBrain — Packing List\n${"═".repeat(35)}${lines.join("\n")}`;
      navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById("btnExport");
        const orig = btn.innerHTML;
        btn.innerHTML = "<span>✓</span> Copied!";
        btn.classList.add("copied");
        setTimeout(() => {
          btn.innerHTML = orig;
          btn.classList.remove("copied");
        }, 2000);
      });
    });
  }

  // ── Edit Handling ───────────────────────────────────────
  function handleEditClick(e) {
    e.preventDefault();
    e.stopPropagation();
    const id = e.currentTarget.dataset.id;
    editingItemId = id;
    renderCategories();
    // Focus the name input
    const nameInput = mainContent.querySelector(`.edit-form[data-id="${id}"] input[name="name"]`);
    if (nameInput) nameInput.focus();
  }

  function handleEditSave(e) {
    const form = e.target.closest(".edit-form");
    const itemId = form.dataset.id;
    const catId = form.dataset.catId;

    const newName = form.querySelector('input[name="name"]').value.trim();
    const newQty = parseInt(form.querySelector('input[name="qty"]').value) || null;
    const newNote = form.querySelector('input[name="note"]').value.trim();
    const newBag = form.querySelector('select[name="bag"]').value;

    if (!newName) return;

    // Find and update the item in PACKING_DATA
    const category = PACKING_DATA.find((c) => c.id === catId);
    if (category) {
      const item = category.items.find((i) => i.id === itemId);
      if (item) {
        item.name = newName;
        item.qty = newQty;
        item.note = newNote;
        item.bag = newBag;
      }
    }

    editingItemId = null;
    saveDataOverrides();
    renderCategories();
    updateProgress();
    updateStats();
  }

  function handleEditCancel() {
    editingItemId = null;
    renderCategories();
  }

  function handleDeleteClick(e) {
    e.preventDefault();
    e.stopPropagation();
    const itemId = e.currentTarget.dataset.id;
    const catId = e.currentTarget.dataset.catId;

    const category = PACKING_DATA.find((c) => c.id === catId);
    if (!category) return;

    const item = category.items.find((i) => i.id === itemId);
    if (!item) return;

    if (!confirm(`Delete "${item.name}"?`)) return;

    category.items = category.items.filter((i) => i.id !== itemId);
    checkedItems.delete(itemId);
    saveCheckedItems();
    saveDataOverrides();
    renderCategories();
    updateProgress();
    updateStats();
  }

  function handleAddItem(e) {
    const catId = e.currentTarget.dataset.catId;
    const category = PACKING_DATA.find((c) => c.id === catId);
    if (!category) return;

    const newId = `${catId}-${Date.now()}`;
    category.items.push({
      id: newId,
      name: "New item",
      qty: 1,
      bag: category.id === "home-prep" ? "home" : "checked-bag",
      note: "",
    });

    editingItemId = newId;
    saveDataOverrides();
    renderCategories();
    updateProgress();
    updateStats();

    // Focus the name input and select all text
    const nameInput = mainContent.querySelector(`.edit-form[data-id="${newId}"] input[name="name"]`);
    if (nameInput) {
      nameInput.focus();
      nameInput.select();
    }
  }

  // ── Drag & Drop ────────────────────────────────────────
  function setupDragAndDrop() {
    const items = mainContent.querySelectorAll(".item[draggable='true']");

    items.forEach((item) => {
      item.addEventListener("dragstart", onDragStart);
      item.addEventListener("dragend", onDragEnd);
      item.addEventListener("dragover", onDragOver);
      item.addEventListener("dragleave", onDragLeave);
      item.addEventListener("drop", onDrop);
    });

    // Also allow dropping on item-lists (for empty regions)
    mainContent.querySelectorAll(".item-list").forEach((list) => {
      list.addEventListener("dragover", (e) => e.preventDefault());
      list.addEventListener("drop", onDrop);
    });
  }

  function onDragStart(e) {
    const li = e.target.closest(".item");
    if (!li) return;

    dragItemId = li.dataset.id;
    dragCatId = li.dataset.catId;

    li.classList.add("dragging");

    // Set drag image slightly transparent
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", dragItemId);

    // Delay adding class so the drag image renders from the original
    requestAnimationFrame(() => {
      li.classList.add("drag-ghost");
    });
  }

  function onDragEnd(e) {
    const li = e.target.closest(".item");
    if (li) {
      li.classList.remove("dragging", "drag-ghost");
    }

    // Clear all indicators
    mainContent.querySelectorAll(".drag-over-before, .drag-over-after").forEach((el) => {
      el.classList.remove("drag-over-before", "drag-over-after");
    });

    dragItemId = null;
    dragCatId = null;
    dragOverItemId = null;
    dragOverPosition = null;
  }

  function onDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    const li = e.target.closest(".item[draggable='true']");
    if (!li || li.dataset.id === dragItemId) return;
    if (li.dataset.catId !== dragCatId) return; // Only within same category

    const rect = li.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const position = e.clientY < midY ? "before" : "after";

    // Only update if changed
    if (dragOverItemId !== li.dataset.id || dragOverPosition !== position) {
      // Clear old indicators
      mainContent.querySelectorAll(".drag-over-before, .drag-over-after").forEach((el) => {
        el.classList.remove("drag-over-before", "drag-over-after");
      });

      dragOverItemId = li.dataset.id;
      dragOverPosition = position;

      li.classList.add(position === "before" ? "drag-over-before" : "drag-over-after");
    }
  }

  function onDragLeave(e) {
    const li = e.target.closest(".item");
    if (!li) return;

    // Only clear if actually leaving the element
    const related = e.relatedTarget;
    if (related && li.contains(related)) return;

    li.classList.remove("drag-over-before", "drag-over-after");
  }

  function onDrop(e) {
    e.preventDefault();

    if (!dragItemId || !dragCatId) return;

    const targetLi = e.target.closest(".item[draggable='true']");
    if (!targetLi || targetLi.dataset.id === dragItemId) return;
    if (targetLi.dataset.catId !== dragCatId) return;

    const category = PACKING_DATA.find((c) => c.id === dragCatId);
    if (!category) return;

    const fromIdx = category.items.findIndex((i) => i.id === dragItemId);
    const toIdx = category.items.findIndex((i) => i.id === targetLi.dataset.id);
    if (fromIdx === -1 || toIdx === -1) return;

    // Remove the dragged item
    const [movedItem] = category.items.splice(fromIdx, 1);

    // Calculate insert position
    const rect = targetLi.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const dropPosition = e.clientY < midY ? "before" : "after";

    // Find the new index of the target (after removal)
    const newToIdx = category.items.findIndex((i) => i.id === targetLi.dataset.id);
    const insertIdx = dropPosition === "before" ? newToIdx : newToIdx + 1;

    category.items.splice(insertIdx, 0, movedItem);

    saveDataOverrides();
    renderCategories();
    updateProgress();
    updateStats();
  }

  // ── Helpers ────────────────────────────────────────────
  function getBagLabel(bag) {
    const labels = {
      "checked-bag": "🧳 Checked",
      backpack: "🎒 Backpack",
      worn: "👟 On you",
      home: "🏠 Home",
    };
    return labels[bag] || bag;
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // ── Persistence ────────────────────────────────────────
  function loadCheckedItems() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? new Set(JSON.parse(data)) : new Set();
    } catch {
      return new Set();
    }
  }

  function saveCheckedItems() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...checkedItems]));
  }

  // Data overrides — persist item edits/additions/deletions
  function saveDataOverrides() {
    const snapshot = PACKING_DATA.map((cat) => ({
      id: cat.id,
      items: cat.items.map((item) => ({
        id: item.id,
        name: item.name,
        qty: item.qty,
        bag: item.bag,
        note: item.note,
      })),
    }));
    localStorage.setItem(DATA_STORAGE_KEY, JSON.stringify(snapshot));
  }

  function applyDataOverrides() {
    try {
      const data = localStorage.getItem(DATA_STORAGE_KEY);
      if (!data) return;
      const overrides = JSON.parse(data);

      overrides.forEach((override) => {
        const category = PACKING_DATA.find((c) => c.id === override.id);
        if (category) {
          category.items = override.items;
        }
      });
    } catch {
      // ignore corrupt data
    }
  }
})();
