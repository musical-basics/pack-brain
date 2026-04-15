"use client";

import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "packbrain.currentListId";

export function getStoredListId() {
  if (typeof window === "undefined") return null;
  try {
    const url = new URL(window.location.href);
    const fromUrl = url.searchParams.get("list");
    if (fromUrl) return fromUrl;
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

// URL-only — does NOT fall back to localStorage. Used by the home picker so
// visiting / always presents the chooser unless a list is explicitly in the URL.
export function getUrlListId() {
  if (typeof window === "undefined") return null;
  try {
    return new URL(window.location.href).searchParams.get("list");
  } catch {
    return null;
  }
}

export function setStoredListId(id) {
  if (typeof window === "undefined") return;
  try {
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.removeItem(STORAGE_KEY);
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("list", id);
    else url.searchParams.delete("list");
    window.history.replaceState({}, "", url.toString());
  } catch {}
}

export default function ListSelector({ currentListId, onChange }) {
  const [lists, setLists] = useState([]);
  const [open, setOpen] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const wrapRef = useRef(null);

  // Load lists
  const refresh = () =>
    fetch("/api/packing/lists", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setLists(d.lists || []))
      .catch(console.error);

  useEffect(() => { refresh(); }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [open]);

  const current = lists.find((l) => l.id === currentListId) || lists[0];
  const label = current
    ? `✈️ ${current.destination || current.title}${current.duration_days ? ` · ${current.duration_days} days` : ""}`
    : "✈️ Loading...";

  const pick = (id) => {
    setOpen(false);
    setStoredListId(id);
    onChange?.(id);
  };

  return (
    <div className="list-selector" ref={wrapRef}>
      <button
        className="trip-badge list-selector-btn"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        title="Switch trip list"
      >
        {label} <span className="list-selector-caret">▾</span>
      </button>

      {open && (
        <div className="list-selector-menu">
          {lists.map((l) => (
            <button
              key={l.id}
              className={`list-selector-option ${l.id === current?.id ? "active" : ""}`}
              onClick={() => pick(l.id)}
            >
              <div className="list-selector-title">{l.title}</div>
              {(l.destination || l.duration_days) && (
                <div className="list-selector-sub">
                  {l.destination || ""}
                  {l.destination && l.duration_days ? " · " : ""}
                  {l.duration_days ? `${l.duration_days} days` : ""}
                </div>
              )}
            </button>
          ))}
          <button
            className="list-selector-option list-selector-new"
            onClick={() => { setOpen(false); setShowDialog(true); }}
          >
            + New list…
          </button>
          <button
            className="list-selector-option list-selector-back"
            onClick={() => {
              setOpen(false);
              setStoredListId(null);
              onChange?.(null);
            }}
          >
            ← Back to list picker
          </button>
        </div>
      )}

      {showDialog && (
        <NewListDialog
          lists={lists}
          defaultSourceId={current?.id}
          onClose={() => setShowDialog(false)}
          onCreated={async (newId) => {
            setShowDialog(false);
            await refresh();
            setStoredListId(newId);
            onChange?.(newId);
          }}
        />
      )}
    </div>
  );
}

export function NewListDialog({ lists, defaultSourceId, onClose, onCreated }) {
  const [title, setTitle] = useState("");
  const [destination, setDestination] = useState("");
  const [days, setDays] = useState("");
  const [mode, setMode] = useState("copy"); // "copy" | "blank"
  const [sourceId, setSourceId] = useState(defaultSourceId || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    setSourceId(defaultSourceId || "");
  }, [defaultSourceId]);

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) { setErr("Give your list a name"); return; }
    setBusy(true); setErr(null);
    try {
      const body = {
        title: title.trim(),
        destination: destination.trim() || null,
        duration_days: days ? parseInt(days, 10) : null,
      };
      if (mode === "copy" && sourceId) body.fromListId = sourceId;
      const res = await fetch("/api/packing/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      onCreated(data.list.id);
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="list-dialog-backdrop" onClick={onClose}>
      <form className="list-dialog" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h3 className="list-dialog-title">New trip list</h3>

        <label className="list-dialog-field">
          <span>Trip name</span>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Parents' Home — April"
          />
        </label>

        <div className="list-dialog-row">
          <label className="list-dialog-field">
            <span>Destination</span>
            <input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Parents' Home"
            />
          </label>
          <label className="list-dialog-field list-dialog-field-sm">
            <span>Days</span>
            <input
              type="number" min="1"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              placeholder="6"
            />
          </label>
        </div>

        <div className="list-dialog-mode">
          <label className={`list-dialog-mode-opt ${mode === "copy" ? "active" : ""}`}>
            <input
              type="radio" name="mode" value="copy"
              checked={mode === "copy"} onChange={() => setMode("copy")}
            />
            <span>Copy from existing list</span>
          </label>
          <label className={`list-dialog-mode-opt ${mode === "blank" ? "active" : ""}`}>
            <input
              type="radio" name="mode" value="blank"
              checked={mode === "blank"} onChange={() => setMode("blank")}
            />
            <span>Start blank</span>
          </label>
        </div>

        {mode === "copy" && (
          <label className="list-dialog-field">
            <span>Copy items from</span>
            <select value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
              {lists.map((l) => (
                <option key={l.id} value={l.id}>{l.title}</option>
              ))}
            </select>
          </label>
        )}

        {err && <div className="list-dialog-err">⚠️ {err}</div>}

        <div className="list-dialog-actions">
          <button type="button" className="edit-cancel" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="edit-save" disabled={busy}>
            {busy ? "Creating…" : "Create list"}
          </button>
        </div>
      </form>
    </div>
  );
}
