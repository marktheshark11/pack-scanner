import { useState } from "react";
import { MODELS } from "./constants.js";

export default function SettingsPanel({ model, onModelChange, settings, onSettingsChange }) {
  const isKnownModel = MODELS.includes(model);
  const [customModel, setCustomModel] = useState(isKnownModel ? "" : model);
  const [customActive, setCustomActive] = useState(!isKnownModel);

  return <section className="settings-page">
    <div className="form-intro"><span className="eyebrow">PREFERENCES</span><h2>Scan settings</h2><p>Adjust recognition for your device and camera.</p></div>
    <label className="field-label">AI model<select value={customActive ? "__custom" : model} onChange={(event) => {
      if (event.target.value !== "__custom") {
        setCustomActive(false);
        onModelChange(event.target.value);
      } else {
        setCustomActive(true);
        onModelChange(customModel || MODELS[0]);
      }
    }}>
      {MODELS.map((choice) => <option key={choice} value={choice}>{choice}</option>)}
      <option value="__custom">Custom model…</option>
    </select></label>
    {customActive && <label className="field-label">Custom model ID<input value={customModel} onChange={(event) => {
      setCustomModel(event.target.value);
      onModelChange(event.target.value || MODELS[0]);
    }} placeholder="creator/model" /></label>}
    <label className="field-label slider-label"><span className="setting-label-row">Change threshold <b>{settings.threshold || 30}</b></span><input type="range" min="1" max="60" value={settings.threshold || 30} onChange={(event) => onSettingsChange((current) => ({ ...current, threshold: Number(event.target.value) }))} /></label>
    <label className="field-label">Image width<select value={settings.imageWidth || 640} onChange={(event) => onSettingsChange((current) => ({ ...current, imageWidth: Number(event.target.value) }))}><option value="384">384 px</option><option value="640">640 px</option><option value="896">896 px</option><option value="1280">1280 px</option></select></label>
    <p className="settings-note">Packing data is saved only in this browser. AI recognition needs an internet connection.</p>
  </section>;
}
