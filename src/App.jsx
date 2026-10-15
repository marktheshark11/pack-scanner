import { useEffect, useMemo, useState } from "react";
import { Camera, MoreHorizontal } from "lucide-react";
import Scanner from "./Scanner.jsx";
import SettingsPanel from "./SettingsPanel.jsx";
import { ItemIcon, resolveItemIcon } from "./ItemIcon.jsx";
import { MODELS, PACKING_ICONS } from "./constants.js";

const STORE_KEY = "pack-scanner-trips-v1";

function readTrips() {
  try {
    const value = JSON.parse(localStorage.getItem(STORE_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function readSettings() {
  try {
    return JSON.parse(localStorage.getItem("pack-scanner-settings-v1") || "{}");
  } catch {
    return {};
  }
}

function makeId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function dateRange(start, end) {
  const fmt = (value) => new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  if (!start && !end) return "Dates not set";
  if (!start) return fmt(end);
  if (!end) return fmt(start);
  return `${fmt(start)} — ${fmt(end)}`;
}

function countItems(packings) {
  return packings.reduce((sum, packing) => sum + packing.items.length, 0);
}

function App() {
  const [trips, setTrips] = useState(readTrips);
  const [page, setPage] = useState({ name: "trips" });
  const [model, setModel] = useState(() => localStorage.getItem("pack-scanner-model") || MODELS[0]);
  const [settings, setSettings] = useState(readSettings);
  const [toast, setToast] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [query, setQuery] = useState("");
  const [itemDialog, setItemDialog] = useState(null);
  const [dialogName, setDialogName] = useState("");
  const [packingDialog, setPackingDialog] = useState(null);
  const [packingName, setPackingName] = useState("");
  const [packingIcon, setPackingIcon] = useState(PACKING_ICONS[0]);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    localStorage.setItem(STORE_KEY, JSON.stringify(trips));
  }, [trips]);
  useEffect(() => {
    localStorage.setItem("pack-scanner-model", model);
  }, [model]);
  useEffect(() => {
    localStorage.setItem("pack-scanner-settings-v1", JSON.stringify(settings));
  }, [settings]);
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(timer);
  }, [toast]);
  const activeTrip = trips.find((trip) => trip.id === page.tripId);
  const activePacking = activeTrip?.packings.find((packing) => packing.id === page.packingId);

  function updateTrip(tripId, update) {
    setTrips((current) => current.map((trip) => trip.id === tripId ? update(trip) : trip));
  }

  function createTrip(values) {
    const trip = { id: makeId(), ...values, packings: [], createdAt: Date.now() };
    setTrips((current) => [trip, ...current]);
    setPage({ name: "trip", tripId: trip.id });
  }

  function createPacking(values) {
    const packing = { id: makeId(), ...values, items: [] };
    updateTrip(page.tripId, (trip) => ({ ...trip, packings: [...trip.packings, packing] }));
    setExpanded(packing.id);
    setPage({ name: "trip", tripId: page.tripId });
  }

  function editPacking(packing) {
    setPackingName(packing.name);
    setPackingIcon(packing.icon);
    setPackingDialog(packing.id);
  }

  function savePackingEdit(event) {
    event.preventDefault();
    const name = packingName.trim();
    if (!name || !packingDialog) return;
    updateTrip(page.tripId, (trip) => ({
      ...trip,
      packings: trip.packings.map((packing) => packing.id === packingDialog ? { ...packing, name, icon: packingIcon } : packing),
    }));
    setPackingDialog(null);
    setToast(`${name} updated`);
  }

  function confirmDeletePacking() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    updateTrip(page.tripId, (trip) => ({ ...trip, packings: trip.packings.filter((packing) => packing.id !== id) }));
    if (expanded === id) setExpanded(null);
    setDeleteTarget(null);
    setToast(`${deleteTarget.name} deleted`);
  }

  function addItem(packingId, item) {
    updateTrip(page.tripId, (trip) => ({
      ...trip,
      packings: trip.packings.map((packing) => packing.id !== packingId ? packing : {
        ...packing,
        items: [...packing.items, { id: makeId(), name: item.name, category: item.category || "Misc & Entertainment", iconKey: item.iconKey || resolveItemIcon(item.name, item.category), packed: true }],
      }),
    }));
    setToast(`${item.name} added`);
  }

  function toggleItem(packingId, itemId) {
    updateTrip(page.tripId, (trip) => ({
      ...trip,
      packings: trip.packings.map((packing) => packing.id !== packingId ? packing : {
        ...packing,
        items: packing.items.map((item) => item.id === itemId ? { ...item, packed: !item.packed } : item),
      }),
    }));
  }

  function removeItem(packingId, itemId) {
    updateTrip(page.tripId, (trip) => ({
      ...trip,
      packings: trip.packings.map((packing) => packing.id === packingId ? { ...packing, items: packing.items.filter((item) => item.id !== itemId) } : packing),
    }));
  }

  function updateItemName(packingId, itemId, name) {
    const cleanName = name.trim();
    if (!cleanName) return;
    updateTrip(page.tripId, (trip) => ({
      ...trip,
      packings: trip.packings.map((packing) => packing.id !== packingId ? packing : {
        ...packing,
        items: packing.items.map((item) => item.id === itemId ? { ...item, name: cleanName } : item),
      }),
    }));
  }

  function addManualItem(packingId, name) {
    if (!name.trim()) return;
    const cleanName = name.trim();
    updateTrip(page.tripId, (trip) => ({
      ...trip,
      packings: trip.packings.map((packing) => packing.id !== packingId ? packing : {
        ...packing,
        items: [...packing.items, { id: makeId(), name: cleanName, category: "Misc & Entertainment", iconKey: resolveItemIcon(cleanName), packed: false }],
      }),
    }));
    setToast(`${cleanName} added`);
  }

  function openAddDialog(packingId) {
    setDialogName("");
    setItemDialog({ mode: "add", packingId });
  }

  function openEditDialog(packingId, item) {
    setDialogName(item.name);
    setItemDialog({ mode: "edit", packingId, itemId: item.id });
  }

  function saveItemDialog() {
    if (!itemDialog || !dialogName.trim()) return;
    if (itemDialog.mode === "add") addManualItem(itemDialog.packingId, dialogName);
    else updateItemName(itemDialog.packingId, itemDialog.itemId, dialogName);
    setItemDialog(null);
  }

  function toggleItemFromDialog() {
    if (!itemDialog) return;
    toggleItem(itemDialog.packingId, itemDialog.itemId);
    setItemDialog(null);
  }

  function removeItemFromDialog() {
    if (!itemDialog) return;
    removeItem(itemDialog.packingId, itemDialog.itemId);
    setItemDialog(null);
  }

  const title = useMemo(() => {
    if (page.name === "trips") return "Trips";
    if (page.name === "new-trip") return "New trip";
    if (page.name === "new-packing") return "New packing";
    if (page.name === "settings") return "Settings";
    return "Trip details";
  }, [page.name]);

  if (page.name === "scan" && activeTrip && activePacking) {
    return <Scanner packing={activePacking} model={model} settings={settings} threshold={Number(settings.threshold) || 30} imageWidth={Number(settings.imageWidth) || 640} onModelChange={setModel} onSettingsChange={setSettings} onAdd={(item) => addItem(activePacking.id, item)} onMarkPacked={(itemId) => toggleItem(activePacking.id, itemId)} onClose={() => setPage({ name: "trip", tripId: activeTrip.id })} />;
  }

  return (
    <main className={`app-shell page-${page.name}`}>
      <header className={`app-header header-${page.name}`}>
        {page.name === "trips" ? <>
          <h1>{title}</h1>
          <div className="header-actions"><button className="icon-button" aria-label="Settings" onClick={() => setPage({ name: "settings" })}>⚙</button></div>
        </> : <>
          <button className="icon-button header-back" aria-label={page.name === "new-trip" || page.name === "settings" ? "Close" : "Back"} onClick={() => page.name === "new-trip" || page.name === "settings" ? setPage({ name: "trips" }) : page.name === "new-packing" ? setPage({ name: "trip", tripId: page.tripId }) : setPage({ name: "trips" })}>{page.name === "new-trip" || page.name === "new-packing" ? "×" : "‹"}</button>
          <h1>{title}</h1><span className="header-balance" />
        </>}
      </header>

      {page.name === "trips" && (
        <section className="page-content">
          {trips.length === 0 ? (
            <div className="empty-state"><div className="empty-illustration">✈</div><h3>Your next trip starts here</h3><p>Add a destination, then organize what you’ll pack in each bag.</p><small>Tap + to plan your first trip</small></div>
          ) : (
            <div className="trip-list">{trips.map((trip) => {
              const total = countItems(trip.packings);
              return <button className="trip-card" key={trip.id} onClick={() => { setExpanded(null); setPage({ name: "trip", tripId: trip.id }); }}>
                <div className="trip-card-top"><div className="destination-symbol">⌖</div><span className="arrow">›</span></div>
                <h3>{trip.destination}</h3><p className="date-line"><span>▦</span>{dateRange(trip.startDate, trip.endDate)}</p>
                <div className="trip-card-footer"><span>{trip.packings.length} {trip.packings.length === 1 ? "packing" : "packings"}</span><i /> <span>{total} {total === 1 ? "item" : "items"}</span></div>
              </button>;
            })}</div>
          )}
          <button className="button button-outline full-width add-trip-bottom" onClick={() => setPage({ name: "new-trip" })}>＋ &nbsp;Add trip</button>
        </section>
      )}

      {page.name === "new-trip" && <TripForm onSave={createTrip} />}

      {page.name === "settings" && <SettingsPanel model={model} onModelChange={setModel} settings={settings} onSettingsChange={setSettings} />}

      {page.name === "trip" && activeTrip && (
        <section className="page-content trip-detail-page">
          <div className="destination-heading"><div><h2>{activeTrip.destination}</h2><p className="date-line"><span>▦</span>{dateRange(activeTrip.startDate, activeTrip.endDate)}</p></div></div>
          <div className="section-heading packing-heading"><h3>Packings</h3><span className="muted-count">{activeTrip.packings.length} {activeTrip.packings.length === 1 ? "bag" : "bags"}</span></div>
          {activeTrip.packings.length === 0 ? (
            <div className="empty-inline"><span>🧳</span><div><b>No bags yet</b><p>Create a packing list for a suitcase, backpack, or anything else.</p></div></div>
          ) : <div className="packing-list">
            {activeTrip.packings.map((packing) => {
              const done = packing.items.filter((item) => item.packed).length;
              const isExpanded = expanded === packing.id;
              const visibleItems = packing.items.filter((item) => item.name.toLowerCase().includes(query.toLowerCase()));
              return <article className={`packing-card ${isExpanded ? "is-expanded" : ""}`} key={packing.id}>
                <div className="packing-card-head">
                  <div className="packing-card-topline">
                    <button className="packing-card-toggle" onClick={() => { setExpanded(isExpanded ? null : packing.id); setQuery(""); }} aria-expanded={isExpanded}>
                      <span className="packing-card-main-row"><span className="packing-icon">{packing.icon}</span><span className="packing-summary"><b>{packing.name}</b><small>{done} / {packing.items.length} packed</small></span></span>
                    </button>
                    <button className="packing-edit-button" aria-label={`Edit ${packing.name}`} onClick={() => editPacking(packing)}><MoreHorizontal size={18} /></button>
                    <button className="packing-scan-shortcut" aria-label={`Scan and add an item to ${packing.name}`} onClick={() => setPage({ name: "scan", tripId: activeTrip.id, packingId: packing.id })}><Camera size={15} strokeWidth={1.8} /><span>Pack</span></button>
                  </div>
                  <span className="progress-track"><span style={{ width: `${packing.items.length ? done / packing.items.length * 100 : 0}%` }} /></span>
                </div>
                {!isExpanded && packing.items.length > 0 && <button className="packing-preview" aria-label={`Expand ${packing.name} items`} aria-expanded="false" onClick={() => { setExpanded(packing.id); setQuery(""); }}>{packing.items.filter((item) => item.packed).slice(0, 2).map((item) => <span key={item.id}>✓ &nbsp;{item.name}</span>)}{packing.items.length > 2 && <small>+{packing.items.length - 2} more…</small>}</button>}
                {isExpanded && <div className="packing-expanded">
                  <div className="item-tools"><b>Items</b><button className="button button-outline add-item-top-button" onClick={() => openAddDialog(packing.id)}>＋ &nbsp;Add item manually</button></div>
                  <label className="search-box"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search items…" /></label>
                  {visibleItems.length === 0 ? <p className="empty-items">{packing.items.length ? "No matching items." : "No items yet. Add one or scan an item."}</p> : <div className="items-list">{visibleItems.map((item) => <div className="item-row" key={item.id}>
                    <button className={`check-box ${item.packed ? "checked" : ""}`} aria-label={item.packed ? `Unpack ${item.name}` : `Mark ${item.name} packed`} onClick={() => toggleItem(packing.id, item.id)}>{item.packed ? "✓" : ""}</button><span className="item-icon"><ItemIcon name={item.name} category={item.category} iconKey={item.iconKey} size={17} /></span><span className={`item-name ${item.packed ? "item-packed" : ""}`}>{item.name}</span><button className="item-remove" aria-label={`Edit ${item.name}`} onClick={() => openEditDialog(packing.id, item)}>···</button>
                  </div>)}</div>}
                </div>}
              </article>;
            })}
          </div>}
          <button className="button button-outline full-width add-packing-bottom" onClick={() => setPage({ name: "new-packing", tripId: activeTrip.id })}>＋ &nbsp;Add packing</button>
        </section>
      )}

      {page.name === "new-packing" && activeTrip && <PackingForm trip={activeTrip} onSave={createPacking} />}
      {packingDialog && activeTrip && <PackingEditDialog name={packingName} icon={packingIcon} onNameChange={setPackingName} onIconChange={setPackingIcon} onSave={savePackingEdit} onDelete={() => { const packing = activeTrip.packings.find((entry) => entry.id === packingDialog); setPackingDialog(null); if (packing) setDeleteTarget(packing); }} onClose={() => setPackingDialog(null)} />}
      {deleteTarget && <PackingDeleteDialog packing={deleteTarget} tripName={activeTrip?.destination} onConfirm={confirmDeletePacking} onClose={() => setDeleteTarget(null)} />}
      {itemDialog && activeTrip && <ItemDialog mode={itemDialog.mode} item={activeTrip.packings.find((packing) => packing.id === itemDialog.packingId)?.items.find((item) => item.id === itemDialog.itemId)} packing={activeTrip.packings.find((packing) => packing.id === itemDialog.packingId)} name={dialogName} onNameChange={setDialogName} onSave={saveItemDialog} onTogglePacked={toggleItemFromDialog} onRemove={removeItemFromDialog} onClose={() => setItemDialog(null)} />}
      {toast && <div className="toast" role="status">✓ &nbsp;{toast}</div>}
    </main>
  );
}

export default App;

function TripForm({ onSave }) {
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState("");
  function submit(event) {
    event.preventDefault();
    if (!destination.trim()) return setError("Add a destination to continue.");
    if (startDate && endDate && endDate < startDate) return setError("End date must be after the start date.");
    onSave({ destination: destination.trim(), startDate, endDate });
  }
  return <form className="form-page" onSubmit={submit}>
    <label className="field-label">Destination<input autoFocus value={destination} onChange={(event) => setDestination(event.target.value)} placeholder="e.g. Spain" /></label>
    <div className="date-fields"><label className="field-label">Start date<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label><label className="field-label">End date<input type="date" value={endDate} min={startDate || undefined} onChange={(event) => setEndDate(event.target.value)} /></label></div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <button className="button button-primary form-submit" type="submit">Save trip <span>→</span></button>
  </form>;
}

function PackingForm({ trip, onSave }) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState(PACKING_ICONS[0]);
  const [error, setError] = useState("");
  function submit(event) {
    event.preventDefault();
    if (!name.trim()) return setError("Give this packing a name.");
    onSave({ name: name.trim(), icon });
  }
  return <form className="form-page" onSubmit={submit}>
    <label className="field-label">Trip<input value={trip.destination} readOnly /></label>
    <label className="field-label">Name<input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Suitcase" /></label>
    <fieldset className="icon-picker"><legend>Choose an icon</legend><div>{PACKING_ICONS.map((option) => <button type="button" key={option} className={icon === option ? "selected" : ""} aria-pressed={icon === option} onClick={() => setIcon(option)}>{option}</button>)}</div></fieldset>
    {error && <p className="form-error" role="alert">{error}</p>}
    <button className="button button-primary form-submit" type="submit">Save packing <span>→</span></button>
  </form>;
}

function PackingEditDialog({ name, icon, onNameChange, onIconChange, onSave, onDelete, onClose }) {
  useEffect(() => {
    const onKeyDown = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <form className="item-dialog packing-edit-dialog" role="dialog" aria-modal="true" aria-labelledby="packing-edit-title" onSubmit={onSave}>
      <header className="dialog-header"><button type="button" className="dialog-close" aria-label="Close dialog" onClick={onClose}>×</button><h2 id="packing-edit-title">Edit packing</h2><span /></header>
      <label className="dialog-field">Packing name<input autoFocus required value={name} onChange={(event) => onNameChange(event.target.value)} /></label>
      <fieldset className="icon-picker"><legend>Icon</legend><div>{PACKING_ICONS.map((option) => <button type="button" key={option} className={icon === option ? "selected" : ""} aria-pressed={icon === option} onClick={() => onIconChange(option)}>{option}</button>)}</div></fieldset>
      <button type="submit" className="button button-primary dialog-save">Save changes</button>
      <button type="button" className="dialog-remove" onClick={onDelete}><span aria-hidden="true">♲</span> Delete packing</button>
    </form>
  </div>;
}

function PackingDeleteDialog({ packing, tripName, onConfirm, onClose }) {
  useEffect(() => {
    const onKeyDown = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="item-dialog packing-delete-dialog" role="alertdialog" aria-modal="true" aria-labelledby="packing-delete-title">
      <header className="dialog-header"><button className="dialog-close" aria-label="Close dialog" onClick={onClose}>×</button><h2 id="packing-delete-title">Delete packing?</h2><span /></header>
      <p><b>{packing.name}</b>{tripName ? ` from ${tripName}` : ""} and all of its items will be deleted.</p>
      <div className="delete-dialog-actions"><button className="button button-outline" onClick={onClose}>Cancel</button><button className="button button-danger" onClick={onConfirm}>Delete packing</button></div>
    </section>
  </div>;
}

function ItemDialog({ mode, item, packing, name, onNameChange, onSave, onTogglePacked, onRemove, onClose }) {
  useEffect(() => {
    const onKeyDown = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const editing = mode === "edit";
  const iconKey = item?.iconKey || resolveItemIcon(item?.name);
  return <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <form className="item-dialog" role="dialog" aria-modal="true" aria-labelledby="item-dialog-title" onSubmit={(event) => { event.preventDefault(); onSave(); }}>
      <header className="dialog-header"><button type="button" className="dialog-close" aria-label="Close dialog" onClick={onClose}>×</button><h2 id="item-dialog-title">{editing ? "Edit item" : "Add item"}</h2><span /></header>
      <p className="dialog-packing-name">{packing?.name || "Packing"}</p>
      <div className="dialog-item-art"><ItemIcon name={item?.name} category={item?.category} iconKey={iconKey} size={62} strokeWidth={1.7} /></div>
      <label className="dialog-field">Item name<input autoFocus required value={name} onChange={(event) => onNameChange(event.target.value)} placeholder="Name" /></label>
      <button type="submit" className="button button-primary dialog-save">Save</button>
      {editing && <>
        <button type="button" className="button button-outline dialog-toggle" onClick={onTogglePacked}>{item?.packed ? "Mark as unpacked" : "Mark as packed"}</button>
        <button type="button" className="dialog-remove" onClick={onRemove}><span aria-hidden="true">♲</span> Remove from packing</button>
      </>}
    </form>
  </div>;
}
