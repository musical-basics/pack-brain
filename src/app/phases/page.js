"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  getBagLabel,
} from "@/lib/packingData";
import ListSelector, { getStoredListId } from "@/components/ListSelector";


export default function PhasesPage() {
  const pathname = usePathname();
  const [categories, setCategories] = useState([]);
  const [checkedItems, setCheckedItems] = useState(new Set());
  const [phases, setPhases] = useState(null);
  const [models, setModels] = useState([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedPhases, setExpandedPhases] = useState(new Set());
  const [mounted, setMounted] = useState(false);
  const [usage, setUsage] = useState(null);
  const [currentListId, setCurrentListId] = useState(null);

  // Drag state for phase reordering
  const phaseDrag = useRef({ fromIdx: null });

  // Resolve initial list id
  useEffect(() => {
    setCurrentListId(getStoredListId());
  }, []);

  // Reload list contents when currentListId changes
  useEffect(() => {
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
        // Reset phases for the newly loaded list
        if (data.phases && data.phases.length > 0) {
          setPhases(data.phases);
          setExpandedPhases(new Set([0]));
        } else {
          setPhases(null);
          setExpandedPhases(new Set());
        }
      })
      .catch((err) => console.error("Failed to load packing data:", err))
      .finally(() => setMounted(true));
  }, [currentListId]);

  useEffect(() => {
    // Fetch available models from providers (once)
    fetch("/api/list-models")
      .then((r) => r.json())
      .then((data) => {
        setModels(data.models || []);
        if (data.models?.length > 0) {
          setSelectedModel(data.models[0].id);
        }
        if (data.errors?.length > 0) {
          console.warn("Model fetch warnings:", data.errors);
        }
      })
      .catch((err) => console.error("Failed to fetch models:", err))
      .finally(() => setModelsLoading(false));
  }, []);

  // ── Progress ───────────────────────────────────────────
  const allItems = categories.flatMap((c) => c.items);
  const totalItems = allItems.length;
  const doneItems = allItems.filter((i) => checkedItems.has(i.id)).length;
  const pct = totalItems ? Math.round((doneItems / totalItems) * 100) : 0;
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  const ringColor = pct === 100 ? "#00E676" : pct > 75 ? "#00C9A7" : pct > 40 ? "#FFD93D" : "#6C63FF";

  // ── Check handling ─────────────────────────────────────
  const handleCheck = (id) => {
    const next = new Set(checkedItems);
    const newChecked = !next.has(id);
    newChecked ? next.add(id) : next.delete(id);
    setCheckedItems(next);
    // Persist to DB
    fetch("/api/packing/items", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle", itemId: id, checked: newChecked }),
    }).catch(console.error);
  };

  // ── Generate phases via AI ─────────────────────────────
  const generatePhases = async () => {
    setLoading(true);
    setError(null);

    try {
      const items = categories.flatMap((c) =>
        c.items.map((i) => ({
          id: i.id,
          name: i.name,
          qty: i.qty,
          bag: i.bag,
          note: i.note,
          category: c.title,
        }))
      );

      const selectedModelObj = models.find((m) => m.id === selectedModel);
      const provider = selectedModelObj?.provider || (selectedModel.includes("claude") ? "anthropic" : "gemini");

      const res = await fetch("/api/generate-phases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, model: selectedModel, provider }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate phases");
      }

      const data = await res.json();
      setPhases(data.phases);
      setExpandedPhases(new Set([0]));
      if (data.usage) setUsage(data.usage);
      // Persist phases to DB
      fetch("/api/packing/phases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phases: data.phases, listId: currentListId }),
      }).catch(console.error);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClearPhases = () => {
    if (confirm("Clear all phases? You can regenerate them.")) {
      setPhases(null);
      setExpandedPhases(new Set());
      setUsage(null);
      // Clear from DB
      const url = currentListId ? `/api/packing/phases?listId=${currentListId}` : "/api/packing/phases";
      fetch(url, { method: "DELETE" }).catch(console.error);
    }
  };

  const togglePhase = (idx) => {
    const next = new Set(expandedPhases);
    next.has(idx) ? next.delete(idx) : next.add(idx);
    setExpandedPhases(next);
  };

  // ── Phase drag-to-reorder ──────────────────────────────
  const onPhaseDragStart = (e, idx) => {
    phaseDrag.current.fromIdx = idx;
    e.dataTransfer.effectAllowed = "move";
    e.currentTarget.classList.add("phase-dragging");
    requestAnimationFrame(() => e.currentTarget.classList.add("phase-ghost"));
  };

  const onPhaseDragEnd = (e) => {
    e.currentTarget.classList.remove("phase-dragging", "phase-ghost");
    document.querySelectorAll(".phase-drag-before, .phase-drag-after").forEach((el) =>
      el.classList.remove("phase-drag-before", "phase-drag-after")
    );
    phaseDrag.current.fromIdx = null;
  };

  const onPhaseDragOver = (e, idx) => {
    e.preventDefault();
    if (phaseDrag.current.fromIdx === null || phaseDrag.current.fromIdx === idx) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = e.clientY < rect.top + rect.height / 2 ? "before" : "after";
    document.querySelectorAll(".phase-drag-before, .phase-drag-after").forEach((el) =>
      el.classList.remove("phase-drag-before", "phase-drag-after")
    );
    e.currentTarget.classList.add(pos === "before" ? "phase-drag-before" : "phase-drag-after");
  };

  const onPhaseDrop = (e, toIdx) => {
    e.preventDefault();
    const fromIdx = phaseDrag.current.fromIdx;
    if (fromIdx === null || fromIdx === toIdx) return;

    const next = [...phases];
    const [moved] = next.splice(fromIdx, 1);
    const rect = e.currentTarget.getBoundingClientRect();
    const insertIdx = e.clientY < rect.top + rect.height / 2 ? toIdx : toIdx + 1;
    const adjustedIdx = fromIdx < toIdx ? insertIdx - 1 : insertIdx;
    next.splice(Math.max(0, adjustedIdx), 0, moved);

    setPhases(next);

    // Remap expanded phases
    setExpandedPhases(new Set());

    // Persist new order to DB
    fetch("/api/packing/phases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phases: next, listId: currentListId }),
    }).catch(console.error);
  };

  // Strip "Phase N:" prefix from AI-generated titles
  const cleanTitle = (title) => title.replace(/^Phase\s*\d+\s*[:–—-]\s*/i, "");

  // ── Move phase up/down (mobile-friendly reorder) ──────
  const handleMovePhase = (idx, direction) => {
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= phases.length) return;
    const next = [...phases];
    [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
    setPhases(next);
    setExpandedPhases(new Set());
    // Persist to DB
    fetch("/api/packing/phases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phases: next, listId: currentListId }),
    }).catch(console.error);
  };

  // ── Phase progress ─────────────────────────────────────
  const getPhaseProgress = (phase) => {
    if (!phase || !phase.itemIds) return { done: 0, total: 0 };
    const total = phase.itemIds.length;
    const done = phase.itemIds.filter((id) => checkedItems.has(id)).length;
    return { done, total };
  };

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

        <nav className="nav-tabs">
          <Link href="/" className={`nav-tab ${pathname === "/" ? "active" : ""}`}>📋 Packing List</Link>
          <Link href="/phases" className={`nav-tab ${pathname === "/phases" ? "active" : ""}`}>🧠 AI Phases</Link>
        </nav>
      </header>

      {/* Phases header */}
      <div className="phases-header">
        <h2>🧠 Packing Phases</h2>
        <div className="phases-controls">
          <div className="model-picker">
            <label>Model</label>
            <select
              className="model-select"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              disabled={modelsLoading}
            >
              {modelsLoading ? (
                <option>Loading models...</option>
              ) : models.length === 0 ? (
                <option>No models available (check API keys)</option>
              ) : (
                <>
                  {models.some((m) => m.provider === "anthropic") && (
                    <optgroup label="Anthropic (Claude)">
                      {models.filter((m) => m.provider === "anthropic").map((m) => (
                        <option key={m.id} value={m.id}>{m.label}</option>
                      ))}
                    </optgroup>
                  )}
                  {models.some((m) => m.provider === "gemini") && (
                    <optgroup label="Google (Gemini)">
                      {models.filter((m) => m.provider === "gemini").map((m) => (
                        <option key={m.id} value={m.id}>{m.label}</option>
                      ))}
                    </optgroup>
                  )}
                </>
              )}
            </select>
          </div>
          <button
            className={`btn-generate ${loading ? "loading" : ""}`}
            onClick={generatePhases}
            disabled={loading || modelsLoading || models.length === 0}
          >
            {loading ? (
              <><span className="loading-spinner" /> Thinking...</>
            ) : phases ? (
              "🔄 Regenerate"
            ) : (
              "✨ Generate Phases"
            )}
          </button>
          {phases && (
            <button className="btn btn-reset" onClick={handleClearPhases} style={{ marginLeft: 4 }}>
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && <div className="error-msg">⚠️ {error}</div>}

      {/* Usage / Cost */}
      {usage && (
        <div className="usage-box">
          <div className="usage-row">
            <span className="usage-label">Input</span>
            <span className="usage-value">{usage.inputTokens.toLocaleString()} tokens</span>
            {usage.cost?.estimated && (
              <span className="usage-cost">${usage.cost.inputCost.toFixed(6)} <span className="usage-rate">(${usage.cost.inputRate}/M)</span></span>
            )}
          </div>
          <div className="usage-row">
            <span className="usage-label">Output</span>
            <span className="usage-value">{usage.outputTokens.toLocaleString()} tokens</span>
            {usage.cost?.estimated && (
              <span className="usage-cost">${usage.cost.outputCost.toFixed(6)} <span className="usage-rate">(${usage.cost.outputRate}/M)</span></span>
            )}
          </div>
          <div className="usage-row usage-total">
            <span className="usage-label">Total</span>
            <span className="usage-value">{usage.totalTokens.toLocaleString()} tokens</span>
            {usage.cost?.estimated && (
              <span className="usage-cost">${usage.cost.totalCost.toFixed(6)}</span>
            )}
          </div>
        </div>
      )}

      {/* Phases content */}
      {!phases ? (
        <div className="phases-empty">
          <div className="phases-empty-icon">🧠</div>
          <h3>No phases generated yet</h3>
          <p>
            Choose an AI model and click &quot;Generate Phases&quot; to have AI break your packing
            into focused, sequential steps so you don&apos;t get overwhelmed.
          </p>
        </div>
      ) : (
        <div>
          {phases.map((phase, idx) => {
            const { done, total } = getPhaseProgress(phase);
            const isComplete = total > 0 && done === total;
            const isActive = !isComplete && (idx === 0 || (() => {
              const prev = getPhaseProgress(phases[idx - 1]);
              return prev.total > 0 && prev.done === prev.total;
            })());
            const isExpanded = expandedPhases.has(idx);

            return (
              <div
                key={idx}
                className={`phase-card ${isComplete ? "completed-phase" : isActive ? "active-phase" : ""} ${isExpanded ? "expanded" : ""}`}
                draggable
                onDragStart={(e) => onPhaseDragStart(e, idx)}
                onDragEnd={onPhaseDragEnd}
                onDragOver={(e) => onPhaseDragOver(e, idx)}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget)) {
                    e.currentTarget.classList.remove("phase-drag-before", "phase-drag-after");
                  }
                }}
                onDrop={(e) => onPhaseDrop(e, idx)}
              >
                <div className="phase-card-header" onClick={() => togglePhase(idx)}>
                  <span
                    className="phase-drag-handle"
                    title="Drag to reorder"
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <svg viewBox="0 0 16 16" width="14" height="14">
                      <path d="M5 3h2v2H5zM9 3h2v2H9zM5 7h2v2H5zM9 7h2v2H9zM5 11h2v2H5zM9 11h2v2H9z" fill="currentColor" />
                    </svg>
                  </span>
                  <div className="phase-number">
                    {isComplete ? "✓" : idx + 1}
                  </div>
                  <div className="phase-title-area">
                    <div className="phase-title">{cleanTitle(phase.title)}</div>
                    <div className="phase-description">{phase.description}</div>
                  </div>
                  <span className={`phase-progress-badge ${isComplete ? "done" : ""}`}>
                    {done}/{total}
                  </span>
                  <span className="phase-chevron">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M8 10.825L2.175 5 3.238 3.938 8 8.7l4.762-4.762L13.825 5z" />
                    </svg>
                  </span>
                  <div className="mobile-reorder-btns phase-mobile-reorder">
                    <button
                      className="move-btn"
                      onClick={(e) => { e.stopPropagation(); handleMovePhase(idx, "up"); }}
                      disabled={idx === 0}
                      aria-label="Move phase up"
                    >▲</button>
                    <button
                      className="move-btn"
                      onClick={(e) => { e.stopPropagation(); handleMovePhase(idx, "down"); }}
                      disabled={idx === phases.length - 1}
                      aria-label="Move phase down"
                    >▼</button>
                  </div>
                </div>

                <div className="phase-card-body">
                  <ul className="phase-items">
                    {phase.itemIds.map((itemId) => {
                      const item = allItems.find((i) => i.id === itemId);
                      if (!item) return null;
                      const checked = checkedItems.has(itemId);

                      return (
                        <li key={itemId} className={`item ${checked ? "checked" : ""}`}>
                          <label className="item-label">
                            <input
                              type="checkbox"
                              className="item-checkbox"
                              checked={checked}
                              onChange={() => handleCheck(itemId)}
                            />
                            <span className="custom-checkbox" style={{ "--cb-color": isActive ? "#6C63FF" : "#444" }}>
                              <svg viewBox="0 0 12 10" className="check-icon">
                                <polyline points="1.5 6 4.5 9 10.5 1" />
                              </svg>
                            </span>
                            <span className="item-name">{item.name}</span>
                            {item.qty && <span className="item-qty">×{item.qty}</span>}
                          </label>
                          <div className="item-meta">
                            {item.note && <span className="item-note">{item.note}</span>}
                            <span className={`bag-tag ${item.bag}`}>{getBagLabel(item.bag)}</span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <footer className="footer">
        <p className="footer-tip">💡 Check items off in either view — progress syncs everywhere</p>
      </footer>
    </div>
  );
}
