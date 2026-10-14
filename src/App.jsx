import { useEffect, useMemo, useState } from "react";
import Scanner from "./Scanner.jsx";
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
  const [addingTo, setAddingTo] = useState(null);
  const [newItemName, setNewItemName] = useState("");

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

  function addItem(packingId, item) {
    updateTrip(page.tripId, (trip) => ({
      ...trip,
      packings: trip.packings.map((packing) => packing.id !== packingId ? packing : {
        ...packing,
        items: [...packing.items, { id: makeId(), name: item.name, category: item.category || "Misc & Entertainment", icon: item.icon || "＋", packed: true }],
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

  function addManualItem(packingId, name) {
    if (!name.trim()) return;
    addItem(packingId, { name: name.trim(), icon: "＋" });
    setNewItemName("");
    setAddingTo(null);
  }

  const title = useMemo(() => {
    if (page.name === "trips") return "Trips";
    if (page.name === "new-trip") return "New trip";
    if (page.name === "new-packing") return "New packing";
    if (page.name === "settings") return "Settings";
    return "Trip details";
  }, [page.name]);

  if (page.name === "scan" && activeTrip && activePacking) {
    return <Scanner packing={activePacking} model={model} threshold={Number(settings.threshold) || 30} imageWidth={Number(settings.imageWidth) || 640} onModelChange={setModel} onAdd={(item) => addItem(activePacking.id, item)} onMarkPacked={(itemId) => toggleItem(activePacking.id, itemId)} onClose={() => setPage({ name: "trip", tripId: activeTrip.id })} />;
  }

  return (
    <main className={`app-shell page-${page.name}`}>
      <header className={`app-header header-${page.name}`}>
        {page.name === "trips" ? <>
          <h1>{title}</h1>
          <div className="header-actions"><button className="icon-button" aria-label="Settings" onClick={() => setPage({ name: "settings" })}>⚙</button><button className="icon-button header-add" aria-label="Create trip" onClick={() => setPage({ name: "new-trip" })}>＋</button></div>
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
        </section>
      )}

      {page.name === "new-trip" && <TripForm onSave={createTrip} />}

      {page.name === "settings" && <SettingsForm model={model} onModelChange={setModel} settings={settings} onSettingsChange={setSettings} />}

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
                <button className="packing-card-toggle" onClick={() => { setExpanded(isExpanded ? null : packing.id); setQuery(""); }} aria-expanded={isExpanded}>
                  <span className="packing-icon">{packing.icon}</span><span className="packing-summary"><b>{packing.name}</b><small>{done} / {packing.items.length} packed</small></span>
                  <span className="packing-chevron">{isExpanded ? "⌃" : "⌄"}</span>
                  <span className="progress-track"><span style={{ width: `${packing.items.length ? done / packing.items.length * 100 : 0}%` }} /></span>
                </button>
                {!isExpanded && packing.items.length > 0 && <div className="packing-preview">{packing.items.filter((item) => item.packed).slice(0, 2).map((item) => <span key={item.id}>✓ &nbsp;{item.name}</span>)}{packing.items.length > 2 && <small>+{packing.items.length - 2} more</small>}</div>}
                {isExpanded && <div className="packing-expanded">
                  <div className="item-tools"><b>Items</b><button className="text-button" onClick={() => setAddingTo(addingTo === packing.id ? null : packing.id)}>＋ Add</button></div>
                  <label className="search-box"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search items…" /></label>
                  {visibleItems.length === 0 ? <p className="empty-items">{packing.items.length ? "No matching items." : "No items yet. Add one or scan an item."}</p> : <div className="items-list">{visibleItems.map((item) => <div className="item-row" key={item.id}>
                    <button className={`check-box ${item.packed ? "checked" : ""}`} aria-label={item.packed ? `Unpack ${item.name}` : `Mark ${item.name} packed`} onClick={() => toggleItem(packing.id, item.id)}>{item.packed ? "✓" : ""}</button><span className="item-icon">{item.icon}</span><span className={`item-name ${item.packed ? "item-packed" : ""}`}>{item.name}</span><button className="item-remove" aria-label={`Remove ${item.name}`} onClick={() => removeItem(packing.id, item.id)}>···</button>
                  </div>)}</div>}
                  {addingTo === packing.id && <form className="inline-add-form" onSubmit={(event) => { event.preventDefault(); addManualItem(packing.id, newItemName); }}><input autoFocus aria-label="New item name" value={newItemName} onChange={(event) => setNewItemName(event.target.value)} placeholder="e.g. Toothbrush" /><button className="button button-primary" type="submit">Add</button></form>}
                  <button className="button button-primary scan-button" onClick={() => setPage({ name: "scan", tripId: activeTrip.id, packingId: packing.id })}>◎ &nbsp; Scan item</button>
                  <button className="button button-outline add-item-button" onClick={() => setAddingTo(addingTo === packing.id ? null : packing.id)}>＋ &nbsp; Add item</button>
                </div>}
              </article>;
            })}
          </div>}
          <button className="button button-outline full-width add-packing-bottom" onClick={() => setPage({ name: "new-packing", tripId: activeTrip.id })}>＋ &nbsp;Add packing</button>
        </section>
      )}

      {page.name === "new-packing" && activeTrip && <PackingForm trip={activeTrip} onSave={createPacking} />}
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

function SettingsForm({ model, onModelChange, settings, onSettingsChange }) {
  const isKnownModel = MODELS.includes(model);
  const [customModel, setCustomModel] = useState(isKnownModel ? "" : model);
  const [customActive, setCustomActive] = useState(!isKnownModel);
  return <section className="settings-page">
    <div className="form-intro"><span className="eyebrow">PREFERENCES</span><h2>Scan settings</h2><p>Adjust recognition for your device and camera.</p></div>
    <label className="field-label">AI model<select value={customActive ? "__custom" : model} onChange={(event) => { if (event.target.value !== "__custom") { setCustomActive(false); onModelChange(event.target.value); } else { setCustomActive(true); onModelChange(customModel || MODELS[0]); } }}>
      {MODELS.map((choice) => <option key={choice} value={choice}>{choice}</option>)}<option value="__custom">Custom model…</option>
    </select></label>
    {customActive && <label className="field-label">Custom model ID<input value={customModel} onChange={(event) => { setCustomModel(event.target.value); onModelChange(event.target.value || MODELS[0]); }} placeholder="creator/model" /></label>}
    <label className="field-label slider-label"><span className="setting-label-row">Change threshold <b>{settings.threshold || 30}</b></span><input type="range" min="1" max="60" value={settings.threshold || 30} onChange={(event) => onSettingsChange((current) => ({ ...current, threshold: Number(event.target.value) }))} /></label>
    <label className="field-label">Image width<select value={settings.imageWidth || 640} onChange={(event) => onSettingsChange((current) => ({ ...current, imageWidth: Number(event.target.value) }))}><option value="384">384 px</option><option value="640">640 px</option><option value="896">896 px</option><option value="1280">1280 px</option></select></label>
    <p className="settings-note">Packing data is saved only in this browser. AI recognition needs an internet connection.</p>
  </section>;
}
