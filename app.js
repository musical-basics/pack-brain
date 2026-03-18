/**
 * PackBrain — App Logic
 * Interactive packing dashboard with localStorage persistence.
 */

(function () {
  "use strict";

  const STORAGE_KEY = "packbrain-checked-items";

  // ── State ──────────────────────────────────────────────
  let checkedItems = loadCheckedItems();
  let activeFilter = "all";

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
        <ul class="item-list">
          ${filteredItems.map((item) => renderItem(item, category.color)).join("")}
        </ul>
      `;

      mainContent.appendChild(section);
    });

    // Bind checkbox events
    mainContent.querySelectorAll(".item-checkbox").forEach((cb) => {
      cb.addEventListener("change", handleCheck);
    });
  }

  function renderItem(item, color) {
    const checked = checkedItems.has(item.id);
    const bagLabel = getBagLabel(item.bag);
    const bagClass = item.bag;

    return `
      <li class="item ${checked ? "checked" : ""}" data-bag="${item.bag}">
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
})();
