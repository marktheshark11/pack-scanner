import { useCallback, useEffect, useRef, useState } from "react";
import { CATEGORIES, MODELS } from "./constants.js";

const INTERVAL = 2000;
const DEFAULT_MODEL = MODELS[0];

function makeThumbnail(video, canvas, context) {
  context.drawImage(video, 0, 0, 32, 24);
  const pixels = context.getImageData(0, 0, 32, 24).data;
  const gray = new Float32Array(768);
  for (let index = 0; index < 768; index += 1) {
    gray[index] = 0.299 * pixels[index * 4] + 0.587 * pixels[index * 4 + 1] + 0.114 * pixels[index * 4 + 2];
  }
  return gray;
}

function frameDifference(a, b) {
  let sum = 0;
  for (let index = 0; index < a.length; index += 1) sum += Math.abs(a[index] - b[index]);
  return sum / a.length;
}

function safeText(value) {
  return String(value || "").trim();
}

export default function Scanner({ packing, model, threshold = 30, imageWidth = 640, onModelChange, onAdd, onMarkPacked, onClose }) {
  const videoRef = useRef(null);
  const captureRef = useRef(null);
  const thumbRef = useRef(null);
  const streamRef = useRef(null);
  const trackRef = useRef(null);
  const previousRef = useRef(null);
  const busyRef = useRef(false);
  const runningRef = useRef(false);
  const controllerRef = useRef(null);
  const requestIdRef = useRef(0);
  const timerRef = useRef(null);
  const packingRef = useRef(packing);
  const [status, setStatus] = useState("Starting camera…");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [cameraError, setCameraError] = useState("");
  const [modelSelect, setModelSelect] = useState(() => MODELS.includes(model) ? model : "__custom");
  const [customModel, setCustomModel] = useState(() => model && !MODELS.includes(model) ? model : "");
  const [torch, setTorch] = useState(false);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showModelSettings, setShowModelSettings] = useState(false);
  const modelSettingsRef = useRef({ modelSelect, customModel });

  useEffect(() => {
    modelSettingsRef.current = { modelSelect, customModel };
  }, [modelSelect, customModel]);
  useEffect(() => {
    packingRef.current = packing;
  }, [packing]);

  const stop = useCallback(() => {
    runningRef.current = false;
    window.clearInterval(timerRef.current);
    if (controllerRef.current) controllerRef.current.abort();
    requestIdRef.current += 1;
    busyRef.current = false;
    if (streamRef.current) streamRef.current.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    trackRef.current = null;
  }, []);

  useEffect(() => {
    let disposed = false;
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, aspectRatio: { ideal: 4 / 3 }, facingMode: { ideal: "environment" } }, audio: false });
        if (disposed) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        video.srcObject = stream;
        await video.play();
        trackRef.current = stream.getVideoTracks()[0];
        setTorchAvailable(Boolean(trackRef.current.getCapabilities?.().torch));
        previousRef.current = null;
        runningRef.current = true;
        setStatus("Fit the whole item in the frame");
        timerRef.current = window.setInterval(tick, INTERVAL);
        tick();
      } catch (cause) {
        if (!disposed) {
          setCameraError(cause.message || cause.name || "Camera unavailable");
          setStatus("Camera access is needed to scan items");
        }
      }
    }
    const tick = () => {
      const video = videoRef.current;
      if (!runningRef.current || !video?.videoWidth || !thumbRef.current) return;
      try {
        const current = makeThumbnail(video, thumbRef.current, thumbRef.current.getContext("2d", { willReadFrequently: true }));
        const difference = previousRef.current ? frameDifference(current, previousRef.current) : 999;
        previousRef.current = current;
        if (busyRef.current || difference < threshold) return;
        if (!captureRef.current || !video.videoWidth) return;
        const width = Math.min(imageWidth, video.videoWidth);
        const height = Math.round(width * video.videoHeight / video.videoWidth);
        captureRef.current.width = width;
        captureRef.current.height = height;
        captureRef.current.getContext("2d").drawImage(video, 0, 0, width, height);
        analyze(captureRef.current.toDataURL("image/jpeg", 0.6));
      } catch (cause) {
        setError(cause.message || "Could not capture a camera frame");
      }
    };
    async function analyze(image) {
      if (busyRef.current) return;
      busyRef.current = true;
      setBusy(true);
      setError("");
      setStatus("Recognizing item…");
      const requestId = ++requestIdRef.current;
      const controller = new AbortController();
      controllerRef.current = controller;
      let timedOut = false;
      const timeout = window.setTimeout(() => { timedOut = true; controller.abort(); }, 30000);
      try {
        const settings = modelSettingsRef.current;
        const selectedModel = settings.modelSelect === "__custom" ? settings.customModel.trim() : settings.modelSelect;
        if (!selectedModel) throw new Error("Enter a model ID in scan settings.");
        onModelChange(selectedModel);
        const response = await fetch("/api/analyze", {
          method: "POST",
          signal: controller.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: selectedModel, image, list: packingRef.current.items.map((item) => item.name) }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
        const match = String(payload.text || "").match(/\{[\s\S]*\}/);
        if (!match) throw new Error("Could not read the model response");
        const parsed = JSON.parse(match[0]);
        if (!runningRef.current || requestId !== requestIdRef.current) return;
        if (!parsed.item && !parsed.match) {
          setStatus("No clear item detected. Try holding it steady in the frame.");
          setResult(null);
          return;
        }
        const name = safeText(parsed.match) || safeText(parsed.item);
        const existingItem = packingRef.current.items.find((item) => item.name.toLowerCase() === name.toLowerCase());
        const category = CATEGORIES.includes(parsed.category) ? parsed.category : "Misc & Entertainment";
        const item = { name, category, icon: category === "Clothing" ? "♧" : category === "Electronics" ? "⌁" : "＋" };
        const detection = { item, existingItem, confidence: typeof parsed.confidence === "number" ? parsed.confidence : null };
        setResult(detection);
        setStatus(existingItem?.packed ? "Item is already packed" : "Item detected");
      } catch (cause) {
        if (cause.name === "AbortError") {
          if (timedOut && runningRef.current && requestId === requestIdRef.current) setError("Scan timed out. Try again.");
        } else if (requestId === requestIdRef.current) {
          setError(cause.message || "Could not analyze this image");
        }
      } finally {
        window.clearTimeout(timeout);
        if (requestId === requestIdRef.current) {
          busyRef.current = false;
          setBusy(false);
        }
      }
    }
    startCamera();
    return () => {
      disposed = true;
      stop();
    };
  // Scanner is mounted for one selected packing; keep its media stream lifecycle isolated.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onVisibility = () => { if (document.hidden) { stop(); onClose(); } };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [onClose, stop]);

  async function toggleTorch() {
    const next = !torch;
    try {
      await trackRef.current?.applyConstraints({ advanced: [{ torch: next }] });
      setTorch(next);
    } catch {
      setError("Flash is not supported by this camera.");
    }
  }

  function confirmResult() {
    if (!result || result.existingItem?.packed) return;
    if (result.existingItem) onMarkPacked(result.existingItem.id);
    else onAdd(result.item);
    setResult(null);
    setStatus(result.existingItem ? `${result.item.name} marked packed` : `${result.item.name} added to ${packingRef.current.name}`);
  }

  function dismissResult() {
    setResult(null);
    setStatus("Fit the whole item in the frame");
  }

  return <main className="scanner-screen">
    <video ref={videoRef} className="scanner-video" playsInline muted autoPlay />
    <canvas ref={captureRef} hidden /><canvas ref={thumbRef} width="32" height="24" hidden />
    <div className="scanner-overlay">
      <header className="scanner-header"><button className="scanner-icon-button" onClick={() => { stop(); onClose(); }} aria-label="Close scanner">×</button><div><span className="scanner-title">Scan item</span><small>{packing.icon} {packing.name}</small></div><button className="scanner-icon-button" disabled={!torchAvailable} onClick={toggleTorch} aria-label={torch ? "Turn flash off" : "Turn flash on"}>{torch ? "ϟ" : "♧"}</button></header>
      <div className="scanner-content"><div className={`scan-frame ${busy ? "scan-frame-busy" : ""}`}><i /><i /><i /><i /><div className="scan-target">{result?.item.icon || "＋"}</div></div><p className="scanner-status">{status}</p></div>
      <footer className="scanner-footer">
        {cameraError && <div className="scanner-error">{cameraError}. Allow camera access and use HTTPS or localhost.</div>}
        {error && <div className="scanner-error" role="alert">{error}</div>}
        {result && <div className="scan-result"><div><span className="eyebrow">{result.existingItem?.packed ? "ALREADY PACKED" : result.existingItem ? "IN THIS PACKING" : "DETECTED"}</span><b>{result.item.name}</b>{result.confidence !== null && <small>{Math.round(result.confidence * 100)}% confidence</small>}</div><div className="scan-actions"><button className="button button-quiet" onClick={dismissResult}>Dismiss</button><button className="button button-primary" disabled={Boolean(result.existingItem?.packed)} onClick={confirmResult}>{result.existingItem?.packed ? "Packed" : result.existingItem ? "Mark packed" : "Add item"}</button></div></div>}
        <div className="scanner-controls"><button className="shutter-button" aria-label="Capture now" onClick={() => { previousRef.current = null; setStatus("Hold steady while I scan…"); }}><span /></button><div className="scanner-small-label">Automatic scan · <button onClick={() => setShowModelSettings((open) => !open)}>{showModelSettings ? "Hide settings" : "Model settings"}</button></div></div>
        {showModelSettings && <div className="model-edit"><select aria-label="Recognition model" value={modelSelect} onChange={(event) => setModelSelect(event.target.value)}>{MODELS.map((choice) => <option key={choice} value={choice}>{choice}</option>)}<option value="__custom">Custom model…</option></select>{modelSelect === "__custom" && <input aria-label="Custom model ID" placeholder="creator/model" value={customModel} onChange={(event) => setCustomModel(event.target.value)} />}</div>}
      </footer>
    </div>
  </main>;
}
