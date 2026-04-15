"use client";

import { useEffect, useState } from "react";
import { NewListDialog, setStoredListId } from "./ListSelector";

export default function ListPicker({ onPick }) {
  const [lists, setLists] = useState(null); // null = loading
  const [showDialog, setShowDialog] = useState(false);

  const refresh = () =>
    fetch("/api/packing/lists", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setLists(d.lists || []))
      .catch((err) => { console.error(err); setLists([]); });

  useEffect(() => { refresh(); }, []);

  // First-time user with no lists: jump straight to the new-list dialog
  useEffect(() => {
    if (lists && lists.length === 0) setShowDialog(true);
  }, [lists]);

  const pick = (id) => {
    setStoredListId(id);
    onPick(id);
  };

  return (
    <div className="picker-screen">
      <div className="picker-header">
        <span className="picker-logo">🧳</span>
        <h1 className="picker-title">PackBrain</h1>
        <p className="picker-tagline">Which trip are we packing for?</p>
      </div>

      {lists === null ? (
        <div className="picker-loading">Loading…</div>
      ) : (
        <div className="picker-grid">
          {lists.map((l) => (
            <button key={l.id} className="picker-card" onClick={() => pick(l.id)}>
              <div className="picker-card-icon">✈️</div>
              <div className="picker-card-body">
                <div className="picker-card-title">{l.title}</div>
                {(l.destination || l.duration_days) && (
                  <div className="picker-card-sub">
                    {l.destination || ""}
                    {l.destination && l.duration_days ? " · " : ""}
                    {l.duration_days ? `${l.duration_days} days` : ""}
                  </div>
                )}
                <div className="picker-card-meta">
                  Created {new Date(l.created_at).toLocaleDateString()}
                </div>
              </div>
              <span className="picker-card-arrow">›</span>
            </button>
          ))}

          <button className="picker-card picker-card-new" onClick={() => setShowDialog(true)}>
            <div className="picker-card-icon">＋</div>
            <div className="picker-card-body">
              <div className="picker-card-title">New trip list</div>
              <div className="picker-card-sub">Start blank or copy from an existing list</div>
            </div>
          </button>
        </div>
      )}

      {showDialog && (
        <NewListDialog
          lists={lists || []}
          defaultSourceId={lists?.[lists.length - 1]?.id}
          onClose={() => {
            setShowDialog(false);
            // If user cancels with no lists yet, refresh in case they want another try
            if (lists && lists.length === 0) refresh();
          }}
          onCreated={(newId) => {
            setShowDialog(false);
            pick(newId);
          }}
        />
      )}
    </div>
  );
}
