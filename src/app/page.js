"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  getBagLabel,
} from "@/lib/packingData";
import ListSelector, { getStoredListId } from "@/components/ListSelector";

// ── Drag handle SVG ──────────────────────────────────────
const GripIcon = () => (
  <svg viewBox="0 0 16 16" width="14" height="14">
    <path d="M5 3h2v2H5zM9 3h2v2H9zM5 7h2v2H5zM9 7h2v2H9zM5 11h2v2H5zM9 11h2v2H9z" fill="currentColor" />
  </svg>
);
const EditIcon = () => (
  <svg viewBox="0 0 16 16" width="13" height="13">
    <path d="M11.013 1.427a1.75 1.75 0 012.474 0l1.086 1.086a1.75 1.75 0 010 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 01-.927-.928l.929-3.25a1.75 1.75 0 01.445-.758l8.61-8.61zm1.414 1.06a.25.25 0 00-.354 0L3.463 11.1a.25.25 0 00-.064.108l-.631 2.208 2.208-.63a.25.25 0 00.108-.064l8.61-8.61a.25.25 0 000-.354l-1.086-1.086z" fill="currentColor" />
  </svg>
);
const TrashIcon = () => (
  <svg viewBox="0 0 16 16" width="13" height="13">
    <path d="M6.5 1.75a.25.25 0 01.25-.25h2.5a.25.25 0 01.25.25V3h-3V1.75zM11 3V1.75A1.75 1.75 0 009.25 0h-2.5A1.75 1.75 0 005 1.75V3H2.75a.75.75 0 000 1.5h.31l.69 9.112A1.75 1.75 0 005.502 15.5h4.996a1.75 1.75 0 001.752-1.888L12.94 4.5h.31a.75.75 0 000-1.5H11zm1.44 1.5H3.56l.68 8.953a.25.25 0 00.25.047h4.996a.25.25 0 00.25-.27L10.44 4.5z" fill="currentColor" />
  </svg>
);

export default function PackingListPage() {
  const pathname = usePathname();
  const [categories, setCategories] = useState([]);
  const [checkedItems, setCheckedItems] = useState(new Set());
  const [activeFilter, setActiveFilter] = useState("all");
  const [editingId, setEditingId] = useState(null);
  const [bagPickerId, setBagPickerId] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [currentListId, setCurrentListId] = useState(null);
  const [addingSection, setAddingSection] = useState(false);

  // Track newly created items (not yet in DB)
  const newItemIds = useRef(new Set());

  // Drag state refs (no re-render needed)
  const dragState = useRef({ itemId: null, catId: null });

  // Resolve initial list id from URL/localStorage on mount
  useEffect(() => {
    setCurrentListId(getStoredListId());
  }, []);

  // Load list contents whenever currentListId changes (after mount)
  useEffect(() => {
    if (!mounted && currentListId === null) {
      // First render: still wait for the id-resolution effect to run
    }
    const url = currentListId ? `/api/packing?listId=${currentListId}` : "/api/packing";
    fetch(url, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data.list && !currentListId) setCurrentListId(data.list.id);
        if (data.categories) {
          setCategories(data.categories);
          const checked = new Set();
          data.categories.forEach((c) =>
            c.items.forEach((i) => { if (i.checked) checked.add(i.id); })
          );
          setCheckedItems(checked);
        }
      })
      .catch((err) => console.error("Failed to load packing data:", err))
      .finally(() => setMounted(true));
  }, [currentListId]);

  // Close bag picker on outside click
  useEffect(() => {
    if (!bagPickerId) return;
    const close = () => setBagPickerId(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [bagPickerId]);

  // ── Persist ────────────────────────────────────────────
  const persistCategories = useCallback((cats) => {
    setCategories(cats);
  }, []);

  const persistChecked = useCallback((nextChecked) => {
    setCheckedItems(nextChecked);
  }, []);

  // ── Computed ───────────────────────────────────────────
  const allItems = categories.flatMap((c) => c.items);
  const totalItems = allItems.length;
  const doneItems = allItems.filter((i) => checkedItems.has(i.id)).length;
  const pct = totalItems ? Math.round((doneItems / totalItems) * 100) : 0;

  const bagCounts = { "checked-bag": 0, backpack: 0, worn: 0, home: 0 };
  allItems.forEach((i) => {
    if (!checkedItems.has(i.id)) bagCounts[i.bag]++;
  });

  // ── Filter ─────────────────────────────────────────────
  const filterItems = (items) => {
    if (activeFilter === "all") return items;
    if (activeFilter === "unchecked") return items.filter((i) => !checkedItems.has(i.id));
    return items.filter((i) => i.bag === activeFilter);
  };

  // ── Handlers ───────────────────────────────────────────
  const handleCheck = (id) => {
    const next = new Set(checkedItems);
    const newChecked = !next.has(id);
    newChecked ? next.add(id) : next.delete(id);
    persistChecked(next);
    // Persist to DB
    fetch("/api/packing/items", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle", itemId: id, checked: newChecked }),
    }).catch(console.error);
  };

  const handleDelete = (catId, itemId) => {
    if (!confirm("Delete this item?")) return;
    const next = categories.map((c) =>
      c.id === catId ? { ...c, items: c.items.filter((i) => i.id !== itemId) } : c
    );
    const nextChecked = new Set(checkedItems);
    nextChecked.delete(itemId);
    persistCategories(next);
    persistChecked(nextChecked);
    // Persist to DB
    fetch("/api/packing/items", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId }),
    }).catch(console.error);
  };

  const handleAdd = (catId) => {
    const newId = `new-${Date.now()}`;
    const next = categories.map((c) =>
      c.id === catId
        ? {
            ...c,
            items: [...c.items, { id: newId, name: "New item", qty: 1, bag: "checked-bag", note: "" }],
          }
        : c
    );
    newItemIds.current.add(newId);
    persistCategories(next);
    setEditingId(newId);
  };

  const handleSaveEdit = (catId, itemId, data) => {
    const next = categories.map((c) =>
      c.id === catId
        ? { ...c, items: c.items.map((i) => (i.id === itemId ? { ...i, ...data } : i)) }
        : c
    );
    persistCategories(next);
    setEditingId(null);

    // Persist to DB — POST for new items, PATCH for existing
    if (newItemIds.current.has(itemId)) {
      newItemIds.current.delete(itemId);
      fetch("/api/packing/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: itemId, categoryId: catId, ...data }),
      }).catch(console.error);
    } else {
      fetch("/api/packing/items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update", itemId, fields: data }),
      }).catch(console.error);
    }
  };

  const handleReset = () => {
    if (confirm("Reset all checkboxes?")) {
      persistChecked(new Set());
    }
  };

  const handleBagChange = (catId, itemId, newBag) => {
    const next = categories.map((c) =>
      c.id === catId
        ? { ...c, items: c.items.map((i) => (i.id === itemId ? { ...i, bag: newBag } : i)) }
        : c
    );
    persistCategories(next);
    setBagPickerId(null);
    // Persist to DB
    fetch("/api/packing/items", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", itemId, fields: { bag: newBag } }),
    }).catch(console.error);
  };

  const handleAddSection = async ({ title, icon }) => {
    setAddingSection(false);
    if (!title?.trim()) return;
    try {
      const res = await fetch("/api/packing/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listId: currentListId, title: title.trim(), icon: icon || "📦" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setCategories([...categories, { ...data.category, items: [] }]);
    } catch (e) {
      console.error(e);
      alert("Failed to add section: " + e.message);
    }
  };

  const handleCopy = () => {
    const lines = categories.map((cat) => {
      const header = `\n── ${cat.icon} ${cat.title} ──`;
      const items = cat.items.map((i) => {
        const check = checkedItems.has(i.id) ? "✅" : "⬜";
        const qty = i.qty ? ` ×${i.qty}` : "";
        return `${check} ${i.name}${qty} → ${getBagLabel(i.bag)}`;
      });
      return [header, ...items].join("\n");
    });
    navigator.clipboard.writeText(`🧳 PackBrain\n${"═".repeat(30)}${lines.join("\n")}`);
  };

  // ── Move item up/down (mobile-friendly reorder) ────────
  const handleMoveItem = (catId, itemId, direction) => {
    const next = categories.map((c) => {
      if (c.id !== catId) return c;
      const items = [...c.items];
      const idx = items.findIndex((i) => i.id === itemId);
      if (idx < 0) return c;
      const newIdx = direction === "up" ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= items.length) return c;
      [items[idx], items[newIdx]] = [items[newIdx], items[idx]];
      return { ...c, items };
    });
    persistCategories(next);
    // Persist reorder to DB
    const cat = next.find((c) => c.id === catId);
    if (cat) {
      fetch("/api/packing/items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reorder", itemIds: cat.items.map((i) => i.id) }),
      }).catch(console.error);
    }
  };

  // ── Drag & Drop ────────────────────────────────────────
  const onDragStart = (e, itemId, catId) => {
    dragState.current = { itemId, catId };
    e.dataTransfer.effectAllowed = "move";
    e.currentTarget.classList.add("drag-ghost");
  };

  const onDragEnd = (e) => {
    e.currentTarget.classList.remove("drag-ghost");
    document.querySelectorAll(".drag-over-before, .drag-over-after").forEach((el) => {
      el.classList.remove("drag-over-before", "drag-over-after");
    });
    dragState.current = { itemId: null, catId: null };
  };

  const onDragOver = (e, targetId, targetCatId) => {
    e.preventDefault();
    const { itemId, catId } = dragState.current;
    if (!itemId || targetId === itemId || catId !== targetCatId) return;

    const li = e.currentTarget;
    const rect = li.getBoundingClientRect();
    const pos = e.clientY < rect.top + rect.height / 2 ? "before" : "after";

    document.querySelectorAll(".drag-over-before, .drag-over-after").forEach((el) =>
      el.classList.remove("drag-over-before", "drag-over-after")
    );
    li.classList.add(pos === "before" ? "drag-over-before" : "drag-over-after");
  };

  const onDrop = (e, targetId, targetCatId) => {
    e.preventDefault();
    const { itemId, catId } = dragState.current;
    if (!itemId || targetId === itemId || catId !== targetCatId) return;

    const next = categories.map((c) => {
      if (c.id !== catId) return c;
      const items = [...c.items];
      const fromIdx = items.findIndex((i) => i.id === itemId);
      const [moved] = items.splice(fromIdx, 1);
      const toIdx = items.findIndex((i) => i.id === targetId);
      const rect = e.currentTarget.getBoundingClientRect();
      const insertIdx = e.clientY < rect.top + rect.height / 2 ? toIdx : toIdx + 1;
      items.splice(insertIdx, 0, moved);
      return { ...c, items };
    });
    persistCategories(next);
    // Persist reorder to DB
    const cat = next.find((c) => c.id === catId);
    if (cat) {
      fetch("/api/packing/items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reorder", itemIds: cat.items.map((i) => i.id) }),
      }).catch(console.error);
    }
  };

  // Progress ring
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  const ringColor = pct === 100 ? "#00E676" : pct > 75 ? "#00C9A7" : pct > 40 ? "#FFD93D" : "#6C63FF";

  if (!mounted) return null;

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-top">
          <div className="logo-area">
            <span className="logo-icon">🧳</span>
            <div className="logo-text">
              <h1>PackBrain</h1>
              <p className="tagline">Pack smarter, not harder</p>
            </div>
          </div>
          <div className="header-right">
            <ListSelector currentListId={currentListId} onChange={setCurrentListId} />
            <div className="progress-area">
              <div className="progress-ring-container">
                <svg className="progress-ring" viewBox="0 0 60 60">
                  <circle className="progress-ring-bg" cx="30" cy="30" r={radius} />
                  <circle
                    className="progress-ring-fill"
                    cx="30" cy="30" r={radius}
                    style={{ strokeDasharray: circumference, strokeDashoffset: offset, stroke: ringColor }}
                  />
                </svg>
                <div className="progress-text">{pct}%</div>
              </div>
              <div className="progress-label">packed</div>
            </div>
          </div>
        </div>

        {/* Nav tabs */}
        <nav className="nav-tabs">
          <Link href="/" className={`nav-tab ${pathname === "/" ? "active" : ""}`}>📋 Packing List</Link>
          <Link href="/phases" className={`nav-tab ${pathname === "/phases" ? "active" : ""}`}>🧠 AI Phases</Link>
        </nav>
      </header>

      {/* Stats */}
      <div className="stats-bar">
        {[
          { key: "checked-bag", icon: "🧳", label: "Checked Bag" },
          { key: "backpack", icon: "🎒", label: "Backpack" },
          { key: "worn", icon: "👟", label: "Worn" },
          { key: "home", icon: "🏠", label: "Home Prep" },
        ].map(({ key, icon, label }) => (
          <div key={key} className={`stat ${bagCounts[key] === 0 ? "stat-done" : ""}`}>
            <div className="stat-icon">{icon}</div>
            <div className="stat-info">
              <div className="stat-value">
                {bagCounts[key] === 0 ? <span style={{ color: "#00E676" }}>✓ Done</span> : `${bagCounts[key]} left`}
              </div>
              <div className="stat-label">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="filter-bar">
        {[
          { key: "all", label: "All" },
          { key: "checked-bag", label: "🧳 Checked" },
          { key: "backpack", label: "🎒 Backpack" },
          { key: "worn", label: "👟 Worn" },
          { key: "home", label: "🏠 Home" },
          { key: "unchecked", label: "⬜ Remaining" },
        ].map(({ key, label }) => (
          <button
            key={key}
            className={`filter-btn ${activeFilter === key ? "active" : ""}`}
            onClick={() => setActiveFilter(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Categories */}
      <main>
        {categories.map((cat) => {
          const filtered = filterItems(cat.items);
          if (filtered.length === 0) return null;
          const catChecked = filtered.filter((i) => checkedItems.has(i.id)).length;
          const allDone = catChecked === filtered.length;

          return (
            <section key={cat.id} className="category">
              <div className="category-header" style={{ "--cat-color": cat.color }}>
                <div className="category-title-area">
                  <span className="category-icon">{cat.icon}</span>
                  <h2 className="category-title">{cat.title}</h2>
                  <span className={`category-count ${allDone ? "done" : ""}`}>
                    {catChecked}/{filtered.length}
                  </span>
                </div>
                <div className="category-progress-bar">
                  <div
                    className="category-progress-fill"
                    style={{ width: `${(catChecked / filtered.length) * 100}%`, background: cat.color }}
                  />
                </div>
              </div>

              <ul className="item-list">
                {filtered.map((item) =>
                  editingId === item.id ? (
                    <EditRow
                      key={item.id}
                      item={item}
                      catId={cat.id}
                      onSave={handleSaveEdit}
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
                    <li
                      key={item.id}
                      className={`item ${checkedItems.has(item.id) ? "checked" : ""}`}
                      draggable
                      onDragStart={(e) => onDragStart(e, item.id, cat.id)}
                      onDragEnd={onDragEnd}
                      onDragOver={(e) => onDragOver(e, item.id, cat.id)}
                      onDragLeave={(e) => {
                        const li = e.currentTarget;
                        if (!li.contains(e.relatedTarget)) {
                          li.classList.remove("drag-over-before", "drag-over-after");
                        }
                      }}
                      onDrop={(e) => onDrop(e, item.id, cat.id)}
                    >
                      <span className="drag-handle"><GripIcon /></span>
                      <label className="item-label" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="item-checkbox"
                          checked={checkedItems.has(item.id)}
                          onChange={() => handleCheck(item.id)}
                        />
                        <span className="custom-checkbox" style={{ "--cb-color": cat.color }}>
                          <svg viewBox="0 0 12 10" className="check-icon">
                            <polyline points="1.5 6 4.5 9 10.5 1" />
                          </svg>
                        </span>
                        <span className="item-name">{item.name}</span>
                        {item.qty && <span className="item-qty">×{item.qty}</span>}
                      </label>
                      <div className="item-meta">
                        {item.note && <span className="item-note">{item.note}</span>}
                        <div className="bag-tag-wrapper">
                          <button
                            className={`bag-tag ${item.bag}`}
                            onClick={(e) => { e.stopPropagation(); setBagPickerId(bagPickerId === item.id ? null : item.id); }}
                          >
                            {getBagLabel(item.bag)}
                          </button>
                          {bagPickerId === item.id && (
                            <div className="bag-picker-popover">
                              {[
                                { key: "checked-bag", label: "🧳 Checked" },
                                { key: "backpack", label: "🎒 Backpack" },
                                { key: "worn", label: "👟 On you" },
                                { key: "home", label: "🏠 Home" },
                              ].map(({ key, label }) => (
                                <button
                                  key={key}
                                  className={`bag-picker-option ${item.bag === key ? "active" : ""}`}
                                  onClick={(e) => { e.stopPropagation(); handleBagChange(cat.id, item.id, key); }}
                                >
                                  {label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="mobile-reorder-btns">
                          <button
                            className="move-btn"
                            onClick={() => handleMoveItem(cat.id, item.id, "up")}
                            disabled={filtered.indexOf(item) === 0}
                            aria-label="Move up"
                          >▲</button>
                          <button
                            className="move-btn"
                            onClick={() => handleMoveItem(cat.id, item.id, "down")}
                            disabled={filtered.indexOf(item) === filtered.length - 1}
                            aria-label="Move down"
                          >▼</button>
                        </div>
                        <button className="edit-btn" onClick={() => setEditingId(item.id)}><EditIcon /></button>
                        <button className="delete-btn" onClick={() => handleDelete(cat.id, item.id)}><TrashIcon /></button>
                      </div>
                    </li>
                  )
                )}
              </ul>

              <button className="add-item-btn" onClick={() => handleAdd(cat.id)}>
                <span>+</span> Add item
              </button>
            </section>
          );
        })}

        {/* Add new section */}
        {addingSection ? (
          <AddSectionRow
            onSave={handleAddSection}
            onCancel={() => setAddingSection(false)}
          />
        ) : (
          <button className="add-section-btn" onClick={() => setAddingSection(true)}>
            <span>+</span> Add section
          </button>
        )}
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-actions">
          <button className="btn btn-reset" onClick={handleReset}>↺ Reset All</button>
          <button className="btn btn-export" onClick={handleCopy}>📋 Copy List</button>
        </div>
        <p className="footer-tip">💡 Progress saves automatically</p>
      </footer>
    </div>
  );
}

// ── Inline Edit Row ──────────────────────────────────────
function EditRow({ item, catId, onSave, onCancel }) {
  const [name, setName] = useState(item.name);
  const [qty, setQty] = useState(item.qty || "");
  const [note, setNote] = useState(item.note || "");
  const [bag, setBag] = useState(item.bag);
  const nameRef = useRef(null);

  useEffect(() => {
    if (nameRef.current) {
      nameRef.current.focus();
      nameRef.current.select();
    }
  }, []);

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSave(catId, item.id, {
      name: name.trim(),
      qty: parseInt(qty) || null,
      note: note.trim(),
      bag,
    });
  };

  return (
    <li className="item editing">
      <div className="edit-form">
        <div className="edit-row">
          <div className="edit-field">
            <label className="edit-field-label">Name</label>
            <input ref={nameRef} className="edit-input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="edit-field edit-field-sm">
            <label className="edit-field-label">Qty</label>
            <input className="edit-input" type="number" value={qty} onChange={(e) => setQty(e.target.value)} min="0" placeholder="—" />
          </div>
        </div>
        <div className="edit-row">
          <div className="edit-field">
            <label className="edit-field-label">Note</label>
            <input className="edit-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional..." />
          </div>
          <div className="edit-field edit-field-sm">
            <label className="edit-field-label">Bag</label>
            <select className="edit-select" value={bag} onChange={(e) => setBag(e.target.value)}>
              <option value="checked-bag">🧳 Checked</option>
              <option value="backpack">🎒 Backpack</option>
              <option value="worn">👟 On you</option>
              <option value="home">🏠 Home</option>
            </select>
          </div>
        </div>
        <div className="edit-actions">
          <button className="edit-save" onClick={handleSubmit}>✓ Save</button>
          <button className="edit-cancel" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </li>
  );
}

// ── Add Section Row ──────────────────────────────────────
function AddSectionRow({ onSave, onCancel }) {
  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState("📦");
  const titleRef = useRef(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  const submit = () => {
    if (!title.trim()) return;
    onSave({ title, icon });
  };

  const onKey = (e) => {
    if (e.key === "Enter") submit();
    if (e.key === "Escape") onCancel();
  };

  return (
    <section className="category add-section-edit">
      <div className="edit-form">
        <div className="edit-row">
          <div className="edit-field edit-field-sm">
            <label className="edit-field-label">Icon</label>
            <input
              className="edit-input"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              onKeyDown={onKey}
              maxLength={4}
              placeholder="📦"
            />
          </div>
          <div className="edit-field">
            <label className="edit-field-label">Section name</label>
            <input
              ref={titleRef}
              className="edit-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={onKey}
              placeholder="e.g. Toiletries"
            />
          </div>
        </div>
        <div className="edit-actions">
          <button className="edit-save" onClick={submit}>✓ Add section</button>
          <button className="edit-cancel" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </section>
  );
}
