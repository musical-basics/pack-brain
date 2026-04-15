"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DEFAULT_BAGS } from "@/lib/packingData";
import { getUrlListId, setStoredListId } from "@/components/ListSelector";
import ListPicker from "@/components/ListPicker";
import s from "./home2.module.css";

// Convert #rrggbb into an rgba() string with the given alpha (0–1).
const alpha = (hex, a) => {
  if (!hex || !hex.startsWith("#") || hex.length !== 7) return `rgba(255,255,255,${a})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
};

export default function Home2Page() {
  const pathname = usePathname();
  const [categories, setCategories] = useState([]);
  const [checkedItems, setCheckedItems] = useState(new Set());
  const [activeFilter, setActiveFilter] = useState("all");
  const [editingId, setEditingId] = useState(null);
  const [bagPickerId, setBagPickerId] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [currentListId, setCurrentListId] = useState(null);
  const [addingSection, setAddingSection] = useState(false);
  const [showListMenu, setShowListMenu] = useState(false);
  const [lists, setLists] = useState([]);
  const [bags, setBags] = useState(DEFAULT_BAGS);
  const [showBagsManager, setShowBagsManager] = useState(false);

  const newItemIds = useRef(new Set());
  const dragState = useRef({ itemId: null, catId: null });
  const listMenuRef = useRef(null);

  // Resolve list id from URL only — picker if missing
  useEffect(() => {
    setCurrentListId(getUrlListId());
    setMounted(true);
  }, []);

  // Load list contents
  useEffect(() => {
    if (!currentListId) {
      setCategories([]);
      setCheckedItems(new Set());
      return;
    }
    fetch(`/api/packing?listId=${currentListId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data.categories) {
          setCategories(data.categories);
          const checked = new Set();
          data.categories.forEach((c) =>
            c.items.forEach((i) => { if (i.checked) checked.add(i.id); })
          );
          setCheckedItems(checked);
        }
        if (data.list?.bags?.length) setBags(data.list.bags);
      })
      .catch((err) => console.error("Failed to load packing data:", err));
  }, [currentListId]);

  // Fetch list metadata for the trip pill / dropdown
  useEffect(() => {
    fetch("/api/packing/lists", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setLists(d.lists || []))
      .catch(console.error);
  }, [currentListId]);

  // Close menus on outside click
  useEffect(() => {
    if (!bagPickerId && !showListMenu) return;
    const close = (e) => {
      if (showListMenu && listMenuRef.current && !listMenuRef.current.contains(e.target)) {
        setShowListMenu(false);
      }
      if (bagPickerId) setBagPickerId(null);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [bagPickerId, showListMenu]);

  const handlePick = (id) => {
    setStoredListId(id);
    setCurrentListId(id);
  };

  const persistCategories = useCallback((cats) => setCategories(cats), []);
  const persistChecked = useCallback((next) => setCheckedItems(next), []);

  // ── Computed ──────────────────────────────────────────
  const allItems = categories.flatMap((c) => c.items);
  const totalItems = allItems.length;
  const doneItems = allItems.filter((i) => checkedItems.has(i.id)).length;
  const pct = totalItems ? Math.round((doneItems / totalItems) * 100) : 0;

  const bagCounts = Object.fromEntries(bags.map((b) => [b.key, 0]));
  allItems.forEach((i) => {
    if (checkedItems.has(i.id)) return;
    if (bagCounts[i.bag] != null) bagCounts[i.bag]++;
  });
  const bagByKey = Object.fromEntries(bags.map((b) => [b.key, b]));
  const bagLabelOf = (key) => {
    const b = bagByKey[key];
    return b ? b.label : key;
  };

  const filterItems = (items) => {
    if (activeFilter === "all") return items;
    if (activeFilter === "unchecked") return items.filter((i) => !checkedItems.has(i.id));
    return items.filter((i) => i.bag === activeFilter);
  };

  // ── Handlers (parity with /) ─────────────────────────
  const handleCheck = (id) => {
    const next = new Set(checkedItems);
    const newChecked = !next.has(id);
    newChecked ? next.add(id) : next.delete(id);
    persistChecked(next);
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
        ? { ...c, items: [...c.items, { id: newId, name: "New item", qty: 1, bag: "checked-bag", note: "" }] }
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
    if (confirm("Reset all checkboxes?")) persistChecked(new Set());
  };

  const handleBagChange = (catId, itemId, newBag) => {
    const next = categories.map((c) =>
      c.id === catId
        ? { ...c, items: c.items.map((i) => (i.id === itemId ? { ...i, bag: newBag } : i)) }
        : c
    );
    persistCategories(next);
    setBagPickerId(null);
    fetch("/api/packing/items", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", itemId, fields: { bag: newBag } }),
    }).catch(console.error);
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
    const cat = next.find((c) => c.id === catId);
    if (cat) {
      fetch("/api/packing/items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reorder", itemIds: cat.items.map((i) => i.id) }),
      }).catch(console.error);
    }
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

  const handleMoveSection = (catId, direction) => {
    const idx = categories.findIndex((c) => c.id === catId);
    if (idx < 0) return;
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= categories.length) return;
    const next = [...categories];
    [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
    setCategories(next);
    fetch("/api/packing/categories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reorder", categoryIds: next.map((c) => c.id) }),
    }).catch(console.error);
  };

  const handleSaveBags = async (nextBags) => {
    setBags(nextBags);
    setShowBagsManager(false);
    try {
      const res = await fetch("/api/packing/lists", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listId: currentListId, fields: { bags: nextBags } }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          (data.error || "").includes("bags")
            ? "DB column missing. Run:\n\nALTER TABLE packbrain.packing_lists\n  ADD COLUMN IF NOT EXISTS bags JSONB DEFAULT '[]'::jsonb;\n\nin Supabase SQL editor, then try again."
            : data.error || "Failed"
        );
      }
    } catch (e) {
      console.error(e);
      alert("Couldn't save bags: " + e.message);
    }
  };

  const handleDeleteSection = async (catId, title) => {
    if (!confirm(`Delete section "${title}" and all its items?`)) return;
    setCategories(categories.filter((c) => c.id !== catId));
    try {
      const res = await fetch(`/api/packing/categories?categoryId=${catId}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
    } catch (e) {
      console.error(e);
      alert("Failed to delete section: " + e.message);
    }
  };

  // Drag & drop
  const onDragStart = (e, itemId, catId) => {
    dragState.current = { itemId, catId };
    e.dataTransfer.effectAllowed = "move";
    e.currentTarget.classList.add(s.dragGhost);
  };
  const onDragEnd = (e) => {
    e.currentTarget.classList.remove(s.dragGhost);
    document.querySelectorAll(`.${s.dragOverBefore}, .${s.dragOverAfter}`).forEach((el) => {
      el.classList.remove(s.dragOverBefore, s.dragOverAfter);
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
    document.querySelectorAll(`.${s.dragOverBefore}, .${s.dragOverAfter}`).forEach((el) =>
      el.classList.remove(s.dragOverBefore, s.dragOverAfter)
    );
    li.classList.add(pos === "before" ? s.dragOverBefore : s.dragOverAfter);
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
    const cat = next.find((c) => c.id === catId);
    if (cat) {
      fetch("/api/packing/items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reorder", itemIds: cat.items.map((i) => i.id) }),
      }).catch(console.error);
    }
  };

  // Progress ring math
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  const ringColor = pct === 100 ? "#22c55e" : pct > 75 ? "#10b981" : pct > 40 ? "#f59e0b" : "#6366f1";

  if (!mounted) return null;
  if (!currentListId) return <ListPicker onPick={handlePick} />;

  const listQuery = `?list=${currentListId}`;
  const currentList = lists.find((l) => l.id === currentListId);
  const tripLabel = currentList
    ? `${currentList.destination || currentList.title}${currentList.duration_days ? ` · ${currentList.duration_days} days` : ""}`
    : "Loading…";

  return (
    <div className={s.shell}>
      <div className={s.frame}>
        {/* ── Header ──────────────────────────────────── */}
        <header className={s.header}>
          <div className={s.headerLeft}>
            <h1 className={s.brand}>PackBrain<span className={s.brandDot} /></h1>

            <div ref={listMenuRef} style={{ position: "relative" }}>
              <button
                className={s.tripPill}
                onClick={(e) => { e.stopPropagation(); setShowListMenu((v) => !v); }}
                title="Switch trip list"
              >
                <span className={s.tripPillIcon}>✈️</span>
                <span>{tripLabel}</span>
                <span className={s.tripPillCaret}>▾</span>
              </button>
              {showListMenu && (
                <div className={s.listSelectorMenu} onClick={(e) => e.stopPropagation()}>
                  {lists.map((l) => (
                    <button
                      key={l.id}
                      className={`${s.listSelectorOption} ${l.id === currentListId ? s.listSelectorOptionActive : ""}`}
                      onClick={() => {
                        setShowListMenu(false);
                        setStoredListId(l.id);
                        setCurrentListId(l.id);
                      }}
                    >
                      <div className={s.listSelectorTitle}>{l.title}</div>
                      {(l.destination || l.duration_days) && (
                        <div className={s.listSelectorSub}>
                          {l.destination || ""}
                          {l.destination && l.duration_days ? " · " : ""}
                          {l.duration_days ? `${l.duration_days} days` : ""}
                        </div>
                      )}
                    </button>
                  ))}
                  <button
                    className={`${s.listSelectorOption} ${s.listSelectorNew}`}
                    onClick={() => {
                      setShowListMenu(false);
                      setStoredListId(null);
                      setCurrentListId(null);
                    }}
                  >
                    ← Back to list picker
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className={s.ring}>
            <svg className={s.ringSvg} viewBox="0 0 48 48">
              <circle className={s.ringBg} cx="24" cy="24" r={radius} />
              <circle
                className={s.ringFill}
                cx="24" cy="24" r={radius}
                style={{ strokeDasharray: circumference, strokeDashoffset: offset, stroke: ringColor }}
              />
            </svg>
            <div className={s.ringText}>{pct}%</div>
          </div>
        </header>

        {/* ── Nav tabs ───────────────────────────────── */}
        <nav className={s.nav}>
          <Link href={`/${listQuery}`} className={`${s.navTab} ${pathname === "/" ? s.navTabActive : ""}`}>
            📋 Packing
          </Link>
          <Link href={`/home2${listQuery}`} className={`${s.navTab} ${pathname === "/home2" ? s.navTabActive : ""}`}>
            ✨ Home2
          </Link>
          <Link href={`/phases${listQuery}`} className={`${s.navTab} ${pathname === "/phases" ? s.navTabActive : ""}`}>
            🧠 Phases
          </Link>
        </nav>

        {/* ── Main ───────────────────────────────────── */}
        <main className={s.main}>
          {/* Bag tiles (dynamic) */}
          <section className={s.bagSection}>
            <div className={s.bagSectionHead}>
              <span className={s.bagSectionLabel}>Bags</span>
              <button
                className={s.manageBagsBtn}
                onClick={() => setShowBagsManager(true)}
                title="Add, edit or delete bags"
              >
                ⚙ Manage
              </button>
            </div>
            <div className={s.bagGrid}>
              {bags.map((b) => {
                const left = bagCounts[b.key] ?? 0;
                const done = left === 0;
                return (
                  <div
                    key={b.key}
                    className={`${s.bagTile} ${done ? s.bagTileDone : ""}`}
                    style={{ "--bag-accent": b.color }}
                  >
                    <div className={s.bagTileGlow} style={{ background: b.color }} />
                    <div className={s.bagTileTop}>
                      <span className={s.bagTileIcon} style={{ color: b.color }}>{b.icon}</span>
                      <span className={s.bagTileCount}>{done ? "✓ done" : `${left} left`}</span>
                    </div>
                    <p className={s.bagTileLabel}>{b.label}</p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Filters (derived from bags) */}
          <section className={s.filterRow}>
            <div className={s.filterScroll}>
              <button
                className={`${s.filterPill} ${activeFilter === "all" ? s.filterPillActive : ""}`}
                onClick={() => setActiveFilter("all")}
              >
                All
                {totalItems > 0 && <span className={s.filterPillCount}>{totalItems}</span>}
              </button>
              <button
                className={`${s.filterPill} ${activeFilter === "unchecked" ? s.filterPillActive : ""}`}
                onClick={() => setActiveFilter("unchecked")}
              >
                Remaining
              </button>
              {bags.map((b) => (
                <button
                  key={b.key}
                  className={`${s.filterPill} ${activeFilter === b.key ? s.filterPillActive : ""}`}
                  onClick={() => setActiveFilter(b.key)}
                >
                  <span className={s.filterPillDot} style={{ background: b.color }} />
                  {b.label}
                </button>
              ))}
            </div>
          </section>

          {/* Categories */}
          <div className={s.categories}>
            {categories.map((cat, catIdx) => {
              const filtered = filterItems(cat.items);
              if (filtered.length === 0 && cat.items.length > 0) return null;
              const catChecked = filtered.filter((i) => checkedItems.has(i.id)).length;
              const allDone = filtered.length > 0 && catChecked === filtered.length;
              const pctFill = filtered.length > 0 ? (catChecked / filtered.length) * 100 : 0;

              return (
                <section key={cat.id} className={`${s.section} ${allDone ? s.sectionDone : ""}`}>
                  <div className={s.sectionHeader}>
                    <div className={s.sectionTitleRow}>
                      <div className={s.sectionTitleLeft}>
                        <div className={s.sectionIconChip}>{cat.icon}</div>
                        <h2 className={s.sectionTitle}>{cat.title}</h2>
                      </div>
                      {allDone ? (
                        <span className={s.sectionCountDone}>✓ Done</span>
                      ) : (
                        <span className={s.sectionCount}>{catChecked}/{filtered.length} packed</span>
                      )}
                      <div className={s.itemActions}>
                        <button
                          className={s.iconBtn}
                          onClick={() => handleMoveSection(cat.id, "up")}
                          disabled={catIdx === 0}
                          aria-label="Move section up"
                          title="Move section up"
                        >▲</button>
                        <button
                          className={s.iconBtn}
                          onClick={() => handleMoveSection(cat.id, "down")}
                          disabled={catIdx === categories.length - 1}
                          aria-label="Move section down"
                          title="Move section down"
                        >▼</button>
                        <button
                          className={s.sectionDeleteBtn}
                          onClick={() => handleDeleteSection(cat.id, cat.title)}
                          title="Delete section"
                        >🗑</button>
                      </div>
                    </div>
                    <div className={s.sectionBar}>
                      <div className={s.sectionBarFill} style={{ width: `${pctFill}%` }} />
                    </div>
                  </div>

                  <ul className={s.itemList}>
                    {filtered.map((item) =>
                      editingId === item.id ? (
                        <EditRow
                          key={item.id}
                          item={item}
                          catId={cat.id}
                          bags={bags}
                          onSave={handleSaveEdit}
                          onCancel={() => setEditingId(null)}
                        />
                      ) : (
                        <li
                          key={item.id}
                          className={`${s.item} ${checkedItems.has(item.id) ? s.itemChecked : ""}`}
                          draggable
                          onDragStart={(e) => onDragStart(e, item.id, cat.id)}
                          onDragEnd={onDragEnd}
                          onDragOver={(e) => onDragOver(e, item.id, cat.id)}
                          onDrop={(e) => onDrop(e, item.id, cat.id)}
                          onClick={() => handleCheck(item.id)}
                        >
                          <div className={s.itemCheck}>
                            <svg className={s.itemCheckSvg} viewBox="0 0 12 10">
                              <polyline points="1.5 6 4.5 9 10.5 1" />
                            </svg>
                          </div>
                          <div className={s.itemBody}>
                            <div className={s.itemTitleRow}>
                              <span className={s.itemTitle}>{item.name}</span>
                              {item.qty > 1 && <span className={s.itemQty}>×{item.qty}</span>}
                            </div>
                            {item.note && <span className={s.itemNote}>ℹ {item.note}</span>}
                          </div>
                          <div className={s.itemMeta} onClick={(e) => e.stopPropagation()}>
                            <button
                              className={s.bagTag}
                              style={(() => {
                                const b = bagByKey[item.bag];
                                if (!b) return {};
                                return {
                                  color: b.color,
                                  background: alpha(b.color, 0.1),
                                  borderColor: alpha(b.color, 0.25),
                                };
                              })()}
                              onClick={(e) => {
                                e.stopPropagation();
                                setBagPickerId(bagPickerId === item.id ? null : item.id);
                              }}
                            >
                              {bagLabelOf(item.bag)}
                              {bagPickerId === item.id && (
                                <div className={s.bagPicker}>
                                  {bags.map((b) => (
                                    <button
                                      key={b.key}
                                      className={`${s.bagPickerOption} ${item.bag === b.key ? s.bagPickerOptionActive : ""}`}
                                      onClick={(ev) => { ev.stopPropagation(); handleBagChange(cat.id, item.id, b.key); }}
                                    >
                                      <span style={{ color: b.color, marginRight: 6 }}>{b.icon}</span> {b.label}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </button>
                            <div className={s.itemActions}>
                              <button
                                className={s.iconBtn}
                                onClick={() => handleMoveItem(cat.id, item.id, "up")}
                                disabled={filtered.indexOf(item) === 0}
                              >▲</button>
                              <button
                                className={s.iconBtn}
                                onClick={() => handleMoveItem(cat.id, item.id, "down")}
                                disabled={filtered.indexOf(item) === filtered.length - 1}
                              >▼</button>
                              <button
                                className={s.iconBtn}
                                onClick={() => setEditingId(item.id)}
                                title="Edit"
                              >✎</button>
                              <button
                                className={s.iconBtn}
                                onClick={() => handleDelete(cat.id, item.id)}
                                title="Delete"
                              >×</button>
                            </div>
                          </div>
                        </li>
                      )
                    )}
                  </ul>

                  <button className={s.addItemBtn} onClick={() => handleAdd(cat.id)}>
                    <span className={s.addItemBtnIcon}>+</span>
                    Add item to {cat.title}
                  </button>
                </section>
              );
            })}

            {addingSection ? (
              <AddSectionRow onSave={handleAddSection} onCancel={() => setAddingSection(false)} />
            ) : (
              <button className={s.addSectionBtn} onClick={() => setAddingSection(true)}>
                <span className={s.addSectionBtnIcon}>＋</span>
                Create new section
              </button>
            )}
          </div>
        </main>

        {/* ── Footer ─────────────────────────────────── */}
        <footer className={s.footer}>
          <div className={s.footerDivider} />
          <div className={s.footerActions}>
            <button className={s.footerBtn} onClick={handleReset}>↺ Reset All</button>
            <button className={s.footerBtn} onClick={handleCopy}>📋 Copy List</button>
          </div>
          <p className={s.footerTip}>💡 Drag items to reorder, tap a tag to change bag.</p>
        </footer>

        {showBagsManager && (
          <ManageBagsModal
            bags={bags}
            onSave={handleSaveBags}
            onCancel={() => setShowBagsManager(false)}
          />
        )}
      </div>
    </div>
  );
}

// ── Manage bags modal ───────────────────────────────────
function ManageBagsModal({ bags, onSave, onCancel }) {
  const [draft, setDraft] = useState(() =>
    bags.map((b) => ({ ...b, _id: `${b.key}-${Math.random().toString(36).slice(2, 6)}` }))
  );

  const update = (idx, patch) => {
    const next = [...draft];
    next[idx] = { ...next[idx], ...patch };
    setDraft(next);
  };
  const remove = (idx) => setDraft(draft.filter((_, i) => i !== idx));
  const move = (idx, dir) => {
    const ni = dir === "up" ? idx - 1 : idx + 1;
    if (ni < 0 || ni >= draft.length) return;
    const next = [...draft];
    [next[idx], next[ni]] = [next[ni], next[idx]];
    setDraft(next);
  };
  const add = () => {
    const key = `bag-${Date.now().toString(36)}`;
    setDraft([
      ...draft,
      { _id: key, key, icon: "👜", label: "New bag", color: "#a78bfa" },
    ]);
  };

  const save = () => {
    // Strip _id before saving; ensure label/key non-empty.
    const cleaned = draft
      .map((b) => ({
        key: (b.key || "").trim() || `bag-${Math.random().toString(36).slice(2, 8)}`,
        label: (b.label || "").trim() || "Bag",
        icon: (b.icon || "📦").trim() || "📦",
        color: b.color || "#a78bfa",
      }))
      .filter((b) => b.key);
    onSave(cleaned);
  };

  return (
    <div className={s.modalBackdrop} onClick={onCancel}>
      <div className={s.modal} onClick={(e) => e.stopPropagation()}>
        <div className={s.modalHeader}>
          <h3 className={s.modalTitle}>Manage bags</h3>
          <button className={s.iconBtn} onClick={onCancel} aria-label="Close">×</button>
        </div>

        <div className={s.bagRows}>
          {draft.map((b, idx) => (
            <div key={b._id} className={s.bagRow}>
              <div className={s.bagRowTop}>
                <input
                  className={s.bagRowIcon}
                  value={b.icon}
                  onChange={(e) => update(idx, { icon: e.target.value })}
                  maxLength={4}
                  placeholder="📦"
                />
                <input
                  className={s.bagRowLabel}
                  value={b.label}
                  onChange={(e) => update(idx, { label: e.target.value })}
                  placeholder="Bag name"
                />
                <input
                  className={s.bagRowColor}
                  type="color"
                  value={b.color}
                  onChange={(e) => update(idx, { color: e.target.value })}
                />
              </div>
              <div className={s.bagRowBottom}>
                <span className={s.bagRowKey} title="Key used internally — unique id">
                  key: {b.key}
                </span>
                <div className={s.itemActions}>
                  <button className={s.iconBtn} onClick={() => move(idx, "up")} disabled={idx === 0}>▲</button>
                  <button className={s.iconBtn} onClick={() => move(idx, "down")} disabled={idx === draft.length - 1}>▼</button>
                  <button
                    className={s.iconBtn}
                    onClick={() => {
                      if (confirm(`Delete "${b.label}"? Items using this bag will keep the tag but show it raw.`)) remove(idx);
                    }}
                    title="Delete bag"
                  >×</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button className={s.addBagBtn} onClick={add}>+ Add a bag</button>

        <div className={s.modalActions}>
          <button className={s.editCancel} onClick={onCancel}>Cancel</button>
          <button className={s.editSave} onClick={save}>Save bags</button>
        </div>
      </div>
    </div>
  );
}

// ── Inline edit (item) ──────────────────────────────────
function EditRow({ item, catId, bags, onSave, onCancel }) {
  const [name, setName] = useState(item.name);
  const [qty, setQty] = useState(item.qty || "");
  const [note, setNote] = useState(item.note || "");
  const [bag, setBag] = useState(item.bag);
  const nameRef = useRef(null);

  useEffect(() => { nameRef.current?.focus(); nameRef.current?.select(); }, []);

  const submit = () => {
    if (!name.trim()) return;
    onSave(catId, item.id, {
      name: name.trim(),
      qty: parseInt(qty) || null,
      note: note.trim(),
      bag,
    });
  };

  return (
    <li className={s.editPanel}>
      <div className={s.editRow}>
        <div className={s.editField}>
          <label className={s.editLabel}>Name</label>
          <input ref={nameRef} className={s.editInput} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className={`${s.editField} ${s.editFieldSm}`}>
          <label className={s.editLabel}>Qty</label>
          <input className={s.editInput} type="number" value={qty} onChange={(e) => setQty(e.target.value)} min="0" placeholder="—" />
        </div>
      </div>
      <div className={s.editRow}>
        <div className={s.editField}>
          <label className={s.editLabel}>Note</label>
          <input className={s.editInput} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional…" />
        </div>
        <div className={`${s.editField} ${s.editFieldSm}`}>
          <label className={s.editLabel}>Bag</label>
          <select className={s.editSelect} value={bag} onChange={(e) => setBag(e.target.value)}>
            {bags.map((b) => (
              <option key={b.key} value={b.key}>{b.icon} {b.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div className={s.editActions}>
        <button className={s.editCancel} onClick={onCancel}>Cancel</button>
        <button className={s.editSave} onClick={submit}>✓ Save</button>
      </div>
    </li>
  );
}

// ── Inline add-section ──────────────────────────────────
function AddSectionRow({ onSave, onCancel }) {
  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState("📦");
  const titleRef = useRef(null);

  useEffect(() => { titleRef.current?.focus(); }, []);

  const submit = () => {
    if (!title.trim()) return;
    onSave({ title, icon });
  };
  const onKey = (e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") onCancel(); };

  return (
    <div className={s.editPanel}>
      <div className={s.editRow}>
        <div className={`${s.editField} ${s.editFieldSm}`}>
          <label className={s.editLabel}>Icon</label>
          <input className={s.editInput} value={icon} onChange={(e) => setIcon(e.target.value)} onKeyDown={onKey} maxLength={4} />
        </div>
        <div className={s.editField}>
          <label className={s.editLabel}>Section name</label>
          <input ref={titleRef} className={s.editInput} value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={onKey} placeholder="e.g. Toiletries" />
        </div>
      </div>
      <div className={s.editActions}>
        <button className={s.editCancel} onClick={onCancel}>Cancel</button>
        <button className={s.editSave} onClick={submit}>✓ Add section</button>
      </div>
    </div>
  );
}
