import { Fragment, useEffect, useMemo, useState } from "react";
import { Camera, CalendarDays, ChevronRight, LockKeyhole, LockKeyholeOpen, MoreHorizontal, Plus, Search } from "lucide-react";
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

function groupTripsByDate(trips) {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const groups = [
    { key: "current", label: "Current trips", trips: [] },
    { key: "coming", label: "Coming trips", trips: [] },
    { key: "previous", label: "Previous trips", trips: [] },
  ];

  for (const trip of trips) {
    const group = trip.endDate && trip.endDate < today
      ? groups[2]
      : trip.startDate && trip.startDate > today
        ? groups[1]
        : groups[0];
    group.trips.push(trip);
  }

  groups[0].trips.sort((a, b) => (a.startDate || a.endDate || "9999").localeCompare(b.startDate || b.endDate || "9999"));
  groups[1].trips.sort((a, b) => (a.startDate || a.endDate || "9999").localeCompare(b.startDate || b.endDate || "9999"));
  groups[2].trips.sort((a, b) => (a.endDate || a.startDate || "").localeCompare(b.endDate || b.startDate || ""));
  return groups;
}

function App() {
  const [trips, setTrips] = useState(readTrips);
  const [page, setPage] = useState({ name: "trips" });
  const [model, setModel] = useState(() => localStorage.getItem("pack-scanner-model") || MODELS[0]);
  const [settings, setSettings] = useState(readSettings);
  const [toast, setToast] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [itemDialog, setItemDialog] = useState(null);
  const [dialogName, setDialogName] = useState("");
  const [packingDialog, setPackingDialog] = useState(null);
  const [packingCreateOpen, setPackingCreateOpen] = useState(false);
  const [packingName, setPackingName] = useState("");
  const [packingIcon, setPackingIcon] = useState(PACKING_ICONS[0]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [tripDialog, setTripDialog] = useState(null);
  const [tripCreateOpen, setTripCreateOpen] = useState(false);
  const [tripDeleteTarget, setTripDeleteTarget] = useState(null);

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
  const activePacking = activeTrip?.packings.find((packing) => packing.id === (page.packingId || expanded)) || activeTrip?.packings[0];

  function updateTrip(tripId, update) {
    setTrips((current) => current.map((trip) => trip.id === tripId ? update(trip) : trip));
  }

  function createTrip(values) {
    const trip = { id: makeId(), ...values, packings: [], createdAt: Date.now() };
    setTrips((current) => [trip, ...current]);
    setPage({ name: "trip", tripId: trip.id });
    setTripCreateOpen(false);
  }

  function editTrip(trip) {
    setTripDialog(trip);
  }

  function saveTripEdit(values) {
    if (!tripDialog) return;
    updateTrip(tripDialog.id, (trip) => ({ ...trip, ...values }));
    setToast(`${values.destination} updated`);
    setTripDialog(null);
  }

  function confirmDeleteTrip() {
    if (!tripDeleteTarget) return;
    setTrips((current) => current.filter((trip) => trip.id !== tripDeleteTarget.id));
    setTripDeleteTarget(null);
    setToast(`${tripDeleteTarget.destination} deleted`);
  }

  function createPacking(values) {
    const packing = { id: makeId(), ...values, items: [], locked: false };
    updateTrip(page.tripId, (trip) => ({ ...trip, packings: [...trip.packings, packing] }));
    setExpanded(packing.id);
    setPage({ name: "trip", tripId: page.tripId });
    setPackingCreateOpen(false);
  }

  function togglePackingLock(packingId) {
    const packing = activeTrip?.packings.find((entry) => entry.id === packingId);
    if (!packing) return;
    updateTrip(page.tripId, (trip) => ({
      ...trip,
      packings: trip.packings.map((entry) => entry.id === packingId ? { ...entry, locked: !entry.locked } : entry),
    }));
    setToast(packing.locked
      ? `${packing.name} unlocked`
      : `${packing.name} is now locked. You can pack or unpack items, but can’t add or edit items.`);
  }

  function isPackingLocked(packingId) {
    return activeTrip?.packings.find((packing) => packing.id === packingId)?.locked === true;
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
    if (expanded === id) setExpanded(activeTrip.packings.find((packing) => packing.id !== id)?.id || null);
    setDeleteTarget(null);
    setToast(`${deleteTarget.name} deleted`);
  }

  function addItem(packingId, item) {
    if (isPackingLocked(packingId)) {
      setToast("Unlock this packing to add items");
      return;
    }
    updateTrip(page.tripId, (trip) => ({
      ...trip,
      packings: trip.packings.map((packing) => packing.id !== packingId ? packing : {
        ...packing,
        items: [...packing.items, { id: makeId(), name: item.name, category: item.category || "Misc & Entertainment", iconKey: item.iconKey || resolveItemIcon(item.name, item.category), packed: true }],
      }),
    }));
    setToast(`${item.name} added`);
  }

  function setItemPacked(tripId, packingId, itemId, packed) {
    setTrips((current) => current.map((trip) => trip.id !== tripId ? trip : {
      ...trip,
      packings: trip.packings.map((packing) => packing.id !== packingId ? packing : {
        ...packing,
        items: packing.items.map((item) => item.id === itemId ? { ...item, packed } : item),
      }),
    }));
  }

  function toggleItem(packingId, itemId) {
    const item = activeTrip?.packings.find((packing) => packing.id === packingId)?.items.find((entry) => entry.id === itemId);
    if (item && activeTrip) setItemPacked(activeTrip.id, packingId, itemId, !item.packed);
  }

  function removeItem(packingId, itemId) {
    if (isPackingLocked(packingId)) return;
    updateTrip(page.tripId, (trip) => ({
      ...trip,
      packings: trip.packings.map((packing) => packing.id === packingId ? { ...packing, items: packing.items.filter((item) => item.id !== itemId) } : packing),
    }));
  }

  function updateItemName(packingId, itemId, name) {
    const cleanName = name.trim();
    if (!cleanName || isPackingLocked(packingId)) return;
    updateTrip(page.tripId, (trip) => ({
      ...trip,
      packings: trip.packings.map((packing) => packing.id !== packingId ? packing : {
        ...packing,
        items: packing.items.map((item) => item.id === itemId ? { ...item, name: cleanName } : item),
      }),
    }));
  }

  function addManualItem(packingId, name) {
    if (!name.trim() || isPackingLocked(packingId)) return;
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
    if (isPackingLocked(packingId)) return;
    setDialogName("");
    setItemDialog({ mode: "add", packingId });
  }

  function openEditDialog(packingId, item) {
    if (isPackingLocked(packingId)) return;
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

  function moveItemFromDialog(targetPackingId) {
    if (!itemDialog || itemDialog.mode !== "edit") return;
    const sourcePacking = activeTrip?.packings.find((packing) => packing.id === itemDialog.packingId);
    const targetPacking = activeTrip?.packings.find((packing) => packing.id === targetPackingId);
    const item = sourcePacking?.items.find((entry) => entry.id === itemDialog.itemId);
    if (!sourcePacking || !targetPacking || !item || sourcePacking.locked || targetPacking.locked) return;
    updateTrip(activeTrip.id, (trip) => ({
      ...trip,
      packings: trip.packings.map((packing) => packing.id === sourcePacking.id
        ? { ...packing, items: packing.items.filter((entry) => entry.id !== item.id) }
        : packing.id === targetPacking.id
          ? { ...packing, items: [...packing.items, item] }
          : packing),
    }));
    setExpanded(targetPacking.id);
    setItemDialog(null);
    setToast(`${item.name} moved to ${targetPacking.name}`);
  }

  const title = useMemo(() => {
    if (page.name === "trips") return "Trips";
    if (page.name === "settings") return "Settings";
    return "Trip details";
  }, [page.name]);

  if (page.name === "scan" && activeTrip && activePacking) {
    return <Scanner packing={activePacking} packings={activeTrip.packings} onPackingChange={(packingId) => { setExpanded(packingId); setPage((current) => ({ ...current, packingId })); }} locked={activePacking.locked === true} model={model} settings={settings} threshold={Number(settings.threshold) || 30} imageWidth={Number(settings.imageWidth) || 640} onModelChange={setModel} onSettingsChange={setSettings} onAdd={(item) => addItem(activePacking.id, item)} onMarkPacked={(itemId, packed) => setItemPacked(activeTrip.id, activePacking.id, itemId, packed)} onClose={() => setPage({ name: "trip", tripId: activeTrip.id })} />;
  }

  return (
    <main className={`app-shell page-${page.name}`}>
      <header className={`app-header header-${page.name}`}>
        {page.name === "trips" ? <>
          <h1>{title}</h1>
          <div className="header-actions"><button className="icon-button" aria-label="Settings" onClick={() => setPage({ name: "settings" })}>⚙</button></div>
        </> : page.name === "trip" && activeTrip ? <>
          <button className="icon-button header-back" aria-label="Back" onClick={() => setPage({ name: "trips" })}>‹</button>
          <div className="trip-header-title"><h1>{activeTrip.destination}</h1><p className="date-line"><span>▦</span>{dateRange(activeTrip.startDate, activeTrip.endDate)}</p></div>
          <span className="header-balance" />
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
            <div className="trip-groups">{groupTripsByDate(trips).filter((group) => group.trips.length > 0).map((group) => <section className="trip-group" key={group.key}>
              <h2 className="trip-group-heading">{group.label}</h2>
              <div className="trip-list">{group.trips.map((trip) => {
              const total = countItems(trip.packings);
              const openTrip = () => { setExpanded(trip.packings[0]?.id || null); setPage({ name: "trip", tripId: trip.id }); };
              return <article className="trip-card" key={trip.id}>
                <button className="trip-card-main" aria-label={`Open trip to ${trip.destination}`} onClick={openTrip}>
                  <div className="trip-card-top"><div className="destination-symbol">⌖</div></div>
                  <h3>{trip.destination}</h3><p className="date-line"><span>▦</span>{dateRange(trip.startDate, trip.endDate)}</p>
                  <div className="trip-card-footer"><span>{trip.packings.length} {trip.packings.length === 1 ? "packing" : "packings"}</span><i /> <span>{total} {total === 1 ? "item" : "items"}</span></div>
                </button>
                <div className="trip-card-actions">
                  <button className="trip-edit-button" aria-label={`Edit ${trip.destination}`} onClick={() => editTrip(trip)}><MoreHorizontal size={18} /></button>
                  <button className="trip-open-button" aria-label={`Open ${trip.destination}`} onClick={openTrip}><ChevronRight size={19} /></button>
                </div>
              </article>;
              })}</div>
            </section>)}</div>
          )}
          <button className="button button-outline full-width add-trip-bottom" onClick={() => setTripCreateOpen(true)}>＋ &nbsp;Add trip</button>
        </section>
      )}

      {tripCreateOpen && <TripCreateDialog onSave={createTrip} onClose={() => setTripCreateOpen(false)} />}
      {tripDialog && <TripEditDialog trip={tripDialog} onSave={saveTripEdit} onDelete={() => { setTripDeleteTarget(tripDialog); setTripDialog(null); }} onClose={() => setTripDialog(null)} />}
      {tripDeleteTarget && <TripDeleteDialog trip={tripDeleteTarget} onConfirm={confirmDeleteTrip} onClose={() => setTripDeleteTarget(null)} />}

      {page.name === "settings" && <SettingsPanel model={model} onModelChange={setModel} settings={settings} onSettingsChange={setSettings} />}

      {page.name === "trip" && activeTrip && (
        <section className="page-content trip-detail-page">
          <div className="packing-tabs-row">
            <div className="packing-tabs" role="tablist" aria-label="Packings">
              {activeTrip.packings.map((packing) => {
                const done = packing.items.filter((item) => item.packed).length;
                const selected = activePacking?.id === packing.id;
                return <button key={packing.id} role="tab" aria-selected={selected} className={`packing-tab ${selected ? "is-active" : ""}`} onClick={() => { setExpanded(packing.id); setQuery(""); setSearchOpen(false); }}>
                  <span>{packing.name}</span><small>{done}/{packing.items.length}</small>
                </button>;
              })}
            </div>
            <button className="packing-tab-add" onClick={() => setPackingCreateOpen(true)}><Plus size={16} aria-hidden="true" />Add packing</button>
          </div>
          {!activePacking ? (
            <div className="empty-inline"><span>🧳</span><div><b>No bags yet</b><p>Create a packing list for a suitcase, backpack, or anything else.</p></div></div>
          ) : (() => {
            const packing = activePacking;
            const done = packing.items.filter((item) => item.packed).length;
            const visibleItems = packing.items
              .filter((item) => item.name.toLowerCase().includes(query.toLowerCase()))
              .sort((a, b) => Number(a.packed) - Number(b.packed));
            return <>
              <section className="packing-content" role="tabpanel" aria-label={`${packing.name} items`}>
                <div className="packing-content-heading">
                  <div><span className="packing-icon">{packing.icon}</span><span className="packing-summary"><b>{packing.name}</b><small>{done} / {packing.items.length} packed</small></span></div>
                  <button className={`packing-edit-button ${searchOpen ? "is-active" : ""}`} aria-label={searchOpen ? "Close item search" : "Search items"} title={searchOpen ? "Close item search" : "Search items"} aria-expanded={searchOpen} onClick={() => { setSearchOpen((open) => { if (open) setQuery(""); return !open; }); }}><Search size={16} /></button>
                  <button className="packing-edit-button" aria-label={`Edit ${packing.name}`} onClick={() => editPacking(packing)}><MoreHorizontal size={18} /></button>
                  <button className={`packing-lock-button ${packing.locked ? "is-locked" : ""}`} aria-label={packing.locked ? `Unlock ${packing.name}` : `Lock ${packing.name}`} title={packing.locked ? "Unlock packing" : "Lock packing"} aria-pressed={packing.locked === true} onClick={() => togglePackingLock(packing.id)}>{packing.locked ? <LockKeyhole size={15} /> : <LockKeyholeOpen size={15} />}</button>
                </div>
                <span className="progress-track"><span style={{ width: `${packing.items.length ? done / packing.items.length * 100 : 0}%` }} /></span>
                <div className="packing-expanded">
                  {searchOpen && <label className="search-box"><span>⌕</span><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search items…" /></label>}
                   {visibleItems.length === 0 ? <p className="empty-items">{packing.items.length ? "No matching items." : "No items yet. Add one or scan an item."}</p> : <div className="items-list">{visibleItems.map((item, index) => <Fragment key={item.id}>
                     {!item.packed && (index === 0 || visibleItems[index - 1].packed) && <div className="items-subheader">Unpacked</div>}
                     {item.packed && (index === 0 || !visibleItems[index - 1].packed) && <div className="items-subheader">Packed</div>}
                    <div className="item-row">
                       <span className="item-icon"><ItemIcon name={item.name} category={item.category} iconKey={item.iconKey} size={18} /></span><span className={`item-name ${item.packed ? "item-packed" : ""}`}>{item.name}</span><button className="item-remove" aria-label={packing.locked ? "Editing unavailable while packing is locked" : `Edit ${item.name}`} title={packing.locked ? "Unlock this packing to edit items" : `Edit ${item.name}`} onClick={() => packing.locked ? setToast("This packing is locked and can’t be changed") : openEditDialog(packing.id, item)}>···</button><button className={`check-box ${item.packed ? "checked" : ""}`} aria-label={item.packed ? `Unpack ${item.name}` : `Mark ${item.name} packed`} onClick={() => toggleItem(packing.id, item.id)}>{item.packed ? "✓" : ""}</button>
                    </div>
                  </Fragment>)}</div>}
                </div>
              </section>
              <div className="packing-page-actions">
                <button className="button button-outline" title={packing.locked ? "Unlock this packing to add items" : "Add item manually"} onClick={() => packing.locked ? setToast("This packing is locked and can’t be changed") : openAddDialog(packing.id)}>＋ &nbsp;Add item manually</button>
                <button className="button button-primary page-scan-button" onClick={() => setPage({ name: "scan", tripId: activeTrip.id, packingId: packing.id })}><Camera size={17} /> Scan item</button>
              </div>
            </>;
          })()}
        </section>
      )}

      {packingCreateOpen && activeTrip && <PackingCreateDialog trip={activeTrip} onSave={createPacking} onClose={() => setPackingCreateOpen(false)} />}
      {packingDialog && activeTrip && <PackingEditDialog name={packingName} icon={packingIcon} onNameChange={setPackingName} onIconChange={setPackingIcon} onSave={savePackingEdit} onDelete={() => { const packing = activeTrip.packings.find((entry) => entry.id === packingDialog); setPackingDialog(null); if (packing) setDeleteTarget(packing); }} onClose={() => setPackingDialog(null)} />}
      {deleteTarget && <PackingDeleteDialog packing={deleteTarget} tripName={activeTrip?.destination} onConfirm={confirmDeletePacking} onClose={() => setDeleteTarget(null)} />}
      {itemDialog && activeTrip && <ItemDialog mode={itemDialog.mode} item={activeTrip.packings.find((packing) => packing.id === itemDialog.packingId)?.items.find((item) => item.id === itemDialog.itemId)} packing={activeTrip.packings.find((packing) => packing.id === itemDialog.packingId)} packings={activeTrip.packings} name={dialogName} onNameChange={setDialogName} onSave={saveItemDialog} onTogglePacked={toggleItemFromDialog} onRemove={removeItemFromDialog} onMove={moveItemFromDialog} onClose={() => setItemDialog(null)} />}
      {toast && <div className="toast" role="status">✓ &nbsp;{toast}</div>}
    </main>
  );
}

export default App;

function TripCreateDialog({ onSave, onClose }) {
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const onKeyDown = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function submit(event) {
    event.preventDefault();
    if (!destination.trim()) return setError("Add a destination to continue.");
    if (startDate && endDate && endDate < startDate) return setError("End date must be after the start date.");
    onSave({ destination: destination.trim(), startDate, endDate });
  }
  return <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <form className="item-dialog trip-create-dialog" role="dialog" aria-modal="true" aria-labelledby="trip-create-title" onSubmit={submit}>
      <header className="dialog-header"><button type="button" className="dialog-close" aria-label="Close dialog" onClick={onClose}>×</button><h2 id="trip-create-title">Add trip</h2><span /></header>
      <label className="dialog-field">Destination<input autoFocus required value={destination} onChange={(event) => { setDestination(event.target.value); setError(""); }} placeholder="e.g. Spain" /></label>
      <DateField className="dialog-field" label="Start date" value={startDate} onChange={(value) => { setStartDate(value); setError(""); }} />
      <DateField className="dialog-field" label="End date" value={endDate} min={startDate || undefined} onChange={(value) => { setEndDate(value); setError(""); }} />
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="packing-create-actions"><button type="button" className="button button-outline" onClick={onClose}>Cancel</button><button type="submit" className="button button-primary">Save trip</button></div>
    </form>
  </div>;
}

function PackingCreateDialog({ trip, onSave, onClose }) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState(PACKING_ICONS[0]);
  const [error, setError] = useState("");
  useEffect(() => {
    const onKeyDown = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function submit(event) {
    event.preventDefault();
    if (!name.trim()) return setError("Give this packing a name.");
    onSave({ name: name.trim(), icon });
  }
  return <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <form className="item-dialog packing-create-dialog" role="dialog" aria-modal="true" aria-labelledby="packing-create-title" onSubmit={submit}>
      <header className="dialog-header"><button type="button" className="dialog-close" aria-label="Close dialog" onClick={onClose}>×</button><h2 id="packing-create-title">Add packing</h2><span /></header>
      <p className="dialog-packing-name">For {trip.destination}</p>
      <label className="dialog-field">Packing name<input autoFocus required value={name} onChange={(event) => { setName(event.target.value); setError(""); }} placeholder="e.g. Suitcase" /></label>
      <fieldset className="icon-picker"><legend>Choose an icon</legend><div>{PACKING_ICONS.map((option) => <button type="button" key={option} className={icon === option ? "selected" : ""} aria-label={`Packing icon ${option}`} aria-pressed={icon === option} onClick={() => setIcon(option)}>{option}</button>)}</div></fieldset>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="packing-create-actions"><button type="button" className="button button-outline" onClick={onClose}>Cancel</button><button type="submit" className="button button-primary">Save packing</button></div>
    </form>
  </div>;
}

function DateField({ label, value, min, onChange, className = "field-label" }) {
  const displayValue = value
    ? new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
    : "YYYY-MM-DD";
  return <label className={className}>{label}
    <span className="date-input-wrap">
      <span className={`date-input-display ${value ? "has-value" : ""}`}>{displayValue}</span>
      <CalendarDays className="date-input-icon" size={16} strokeWidth={1.8} aria-hidden="true" />
      <input type="date" aria-label={label} value={value} min={min} onChange={(event) => onChange(event.target.value)} />
    </span>
  </label>;
}

function TripEditDialog({ trip, onSave, onDelete, onClose }) {
  const [destination, setDestination] = useState(trip.destination);
  const [startDate, setStartDate] = useState(trip.startDate || "");
  const [endDate, setEndDate] = useState(trip.endDate || "");
  const [error, setError] = useState("");

  useEffect(() => {
    const onKeyDown = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function submit(event) {
    event.preventDefault();
    if (!destination.trim()) return setError("Add a destination to continue.");
    if (startDate && endDate && endDate < startDate) return setError("End date must be after the start date.");
    onSave({ destination: destination.trim(), startDate, endDate });
  }

  return <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <form className="item-dialog trip-edit-dialog" role="dialog" aria-modal="true" aria-labelledby="trip-edit-title" onSubmit={submit}>
      <header className="dialog-header"><button type="button" className="dialog-close" aria-label="Close dialog" onClick={onClose}>×</button><h2 id="trip-edit-title">Edit trip</h2><span /></header>
      <label className="dialog-field">Destination<input required value={destination} onChange={(event) => setDestination(event.target.value)} /></label>
      <DateField className="dialog-field" label="Start date" value={startDate} onChange={setStartDate} />
      <DateField className="dialog-field" label="End date" value={endDate} min={startDate || undefined} onChange={setEndDate} />
      {error && <p className="form-error" role="alert">{error}</p>}
      <button type="submit" className="button button-primary dialog-save">Save changes</button>
      <button type="button" className="button button-danger dialog-remove" onClick={onDelete}><span aria-hidden="true">♲</span> Delete trip</button>
    </form>
  </div>;
}

function TripDeleteDialog({ trip, onConfirm, onClose }) {
  useEffect(() => {
    const onKeyDown = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="item-dialog packing-delete-dialog" role="alertdialog" aria-modal="true" aria-labelledby="trip-delete-title">
      <header className="dialog-header"><button className="dialog-close" aria-label="Close dialog" onClick={onClose}>×</button><h2 id="trip-delete-title">Delete trip?</h2><span /></header>
      <p><b>{trip.destination}</b> and all of its packings and items will be deleted.</p>
      <div className="delete-dialog-actions"><button className="button button-outline" onClick={onClose}>Cancel</button><button className="button button-danger" onClick={onConfirm}>Delete trip</button></div>
    </section>
  </div>;
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
      <label className="dialog-field">Packing name<input required value={name} onChange={(event) => onNameChange(event.target.value)} /></label>
      <fieldset className="icon-picker"><legend>Icon</legend><div>{PACKING_ICONS.map((option) => <button type="button" key={option} className={icon === option ? "selected" : ""} aria-pressed={icon === option} onClick={() => onIconChange(option)}>{option}</button>)}</div></fieldset>
      <button type="submit" className="button button-primary dialog-save">Save changes</button>
      <button type="button" className="button button-danger dialog-remove" onClick={onDelete}><span aria-hidden="true">♲</span> Delete packing</button>
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

function ItemDialog({ mode, item, packing, packings, name, onNameChange, onSave, onTogglePacked, onRemove, onMove, onClose }) {
  const otherPackings = packings.filter((entry) => entry.id !== packing?.id);
  const [targetPackingId, setTargetPackingId] = useState(() => otherPackings.find((entry) => !entry.locked)?.id || "");
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
      <label className="dialog-field">Item name<input required value={name} onChange={(event) => onNameChange(event.target.value)} placeholder="Name" /></label>
      <button type="submit" className="button button-primary dialog-save">Save</button>
      {editing && <>
        <button type="button" className="button button-outline dialog-toggle" onClick={onTogglePacked}>{item?.packed ? "Mark as unpacked" : "Mark as packed"}</button>
        {otherPackings.length > 0 && <div className="item-move-controls">
          <label className="dialog-field">Move to packing<select value={targetPackingId} onChange={(event) => setTargetPackingId(event.target.value)}>
            <option value="" disabled>Choose a packing</option>
            {otherPackings.map((entry) => <option key={entry.id} value={entry.id} disabled={entry.locked}>{entry.name}{entry.locked ? " (locked)" : ""}</option>)}
          </select></label>
          <button type="button" className="button button-outline" disabled={!targetPackingId || otherPackings.find((entry) => entry.id === targetPackingId)?.locked} onClick={() => onMove(targetPackingId)}>Move</button>
        </div>}
        <button type="button" className="button button-danger dialog-remove" onClick={onRemove}><span aria-hidden="true">♲</span> Delete from packing</button>
      </>}
    </form>
  </div>;
}
