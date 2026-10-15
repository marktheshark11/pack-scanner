import { useCallback, useEffect, useRef, useState } from "react";
import { CATEGORIES } from "./constants.js";
import SettingsPanel from "./SettingsPanel.jsx";
import { ItemIcon, resolveItemIcon } from "./ItemIcon.jsx";

const INTERVAL = 2000;

function makeThumbnail(video, canvas, context) {
  context.drawImage(video, 0, 0, 32, 24);
  const pixels = context.getImageData(0, 0, 32, 24).data;
  const gray = new Float32Array(768);
  for (let index = 0; index < gray.length; index += 1) {
    gray[index] = 0.299 * pixels[index * 4] + 0.587 * pixels[index * 4 + 1] + 0.114 * pixels[index * 4 + 2];
  }
  return gray;
}

function frameDifference(a, b) {
  let sum = 0;
  for (let index = 0; index < a.length; index += 1) sum += Math.abs(a[index] - b[index]);
  return sum / a.length;
}

function cleanText(value) {
  return String(value || "").trim();
}

export default function Scanner({ packing, model, settings, threshold = 30, imageWidth = 640, onModelChange, onSettingsChange, onAdd, onMarkPacked, onClose }) {
  const videoRef = useRef(null);
  const captureRef = useRef(null);
  const thumbRef = useRef(null);
  const streamRef = useRef(null);
  const trackRef = useRef(null);
  const lastScannedThumbRef = useRef(null);
  const forceScanRef = useRef(false);
  const busyRef = useRef(false);
  const runningRef = useRef(false);
  const controllerRef = useRef(null);
  const requestIdRef = useRef(0);
  const timerRef = useRef(null);
  const packingRef = useRef(packing);
  const modelRef = useRef(model);

  const [status, setStatus] = useState("Starting camera…");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [cameraError, setCameraError] = useState("");
  const [torch, setTorch] = useState(false);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [scanMode, setScanMode] = useState(() => localStorage.getItem("pack-scanner-scan-mode") === "automatic" ? "automatic" : "manual");
  const scanModeRef = useRef(scanMode);
  const idleStatus = scanMode === "manual" ? "Tap the button below to scan" : "Fit the whole item in the frame";

  useEffect(() => {
    scanModeRef.current = scanMode;
    localStorage.setItem("pack-scanner-scan-mode", scanMode);
  }, [scanMode]);

  useEffect(() => {
    packingRef.current = packing;
  }, [packing]);

  useEffect(() => {
    modelRef.current = model;
  }, [model]);

  const stop = useCallback(() => {
    runningRef.current = false;
    window.clearInterval(timerRef.current);
    controllerRef.current?.abort();
    requestIdRef.current += 1;
    busyRef.current = false;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    trackRef.current = null;
  }, []);

  useEffect(() => {
    let disposed = false;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, aspectRatio: { ideal: 4 / 3 }, facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (disposed) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        trackRef.current = stream.getVideoTracks()[0];
        setTorchAvailable(Boolean(trackRef.current.getCapabilities?.().torch));
        lastScannedThumbRef.current = null;
        runningRef.current = true;
        setStatus(scanModeRef.current === "manual" ? "Tap the button below to scan" : "Fit the whole item in the frame");
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
        if (busyRef.current) return;
        const forced = forceScanRef.current;
        const lastScanned = lastScannedThumbRef.current;
        if (!forced) {
          if (scanModeRef.current === "manual") return;
          if (lastScanned && frameDifference(current, lastScanned) < threshold) return;
        }
        forceScanRef.current = false;
        lastScannedThumbRef.current = current;
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
        const selectedModel = modelRef.current;
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
          setStatus(scanModeRef.current === "manual"
            ? "No clear item detected. Tap the button below to try again."
            : "No clear item detected. Fit the whole item in the frame.");
          setResult(null);
          return;
        }

        const name = cleanText(parsed.match) || cleanText(parsed.item);
        const matchingItems = packingRef.current.items.filter((item) => item.name.toLowerCase() === name.toLowerCase());
        const existingItem = matchingItems.find((item) => item.packed) || matchingItems[0];
        const category = CATEGORIES.includes(parsed.category) ? parsed.category : "Misc & Entertainment";
        const item = { name, category, iconKey: resolveItemIcon(name, category) };
        setResult({ item, existingItem, confidence: typeof parsed.confidence === "number" ? parsed.confidence : null });
        setStatus(existingItem ? "This item is already in the packing" : "Item detected");
      } catch (cause) {
        if (cause.name === "AbortError") {
          if (timedOut && runningRef.current && requestId === requestIdRef.current) {
            setError("Scan timed out. Try again.");
            setStatus(scanModeRef.current === "manual" ? "Tap the button below to try again" : "Fit the whole item in the frame");
          }
        } else if (requestId === requestIdRef.current) {
          setError(cause.message || "Could not analyze this image");
          setStatus(scanModeRef.current === "manual" ? "Tap the button below to scan again" : "Fit the whole item in the frame");
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
      setError("Flashlight control is not available on this camera.");
    }
  }

  function markExistingPackedState() {
    if (!result?.existingItem) return;
    onMarkPacked(result.existingItem.id);
    setResult(null);
    setStatus(idleStatus);
  }

  function addResult() {
    if (!result) return;
    onAdd(result.item);
    setResult(null);
    setStatus(idleStatus);
  }

  function dismissResult() {
    setResult(null);
    setStatus(idleStatus);
  }

  function requestScan() {
    forceScanRef.current = true;
    setStatus("Scanning current frame…");
  }

  function changeScanMode(mode) {
    scanModeRef.current = mode;
    setScanMode(mode);
    if (!busyRef.current && !result) setStatus(mode === "manual" ? "Tap the button below to scan" : "Fit the whole item in the frame");
  }

  return (
    <main className="scanner-screen">
      <video ref={videoRef} className="scanner-video" playsInline muted autoPlay />
      <canvas ref={captureRef} hidden />
      <canvas ref={thumbRef} width="32" height="24" hidden />
      <div className="scanner-overlay">
        <header className="scanner-header">
          <button className="scanner-icon-button" onClick={() => { stop(); onClose(); }} aria-label="Close scanner">×</button>
          <div><span className="scanner-title">Scan item</span><small>{packing.icon} {packing.name}</small></div>
          <div className="scanner-header-actions">
            <button className={`scanner-icon-button flashlight-button ${torch ? "flashlight-on" : ""}`} disabled={!torchAvailable} onClick={toggleTorch} aria-label={torch ? "Turn flashlight off" : "Turn flashlight on"} title={torchAvailable ? "Flashlight" : "Flashlight unavailable on this camera"}>🔦</button>
            <button className="scanner-icon-button" onClick={() => setShowSettings(true)} aria-label="Scan settings" title="Scan settings">⚙</button>
          </div>
        </header>

        <div className="scanner-content">
          <div className={`scan-frame ${busy ? "scan-frame-busy" : ""}`}><i /><i /><i /><i /><div className="scan-target">{result ? <ItemIcon name={result.item.name} category={result.item.category} iconKey={result.item.iconKey} size={76} strokeWidth={1.5} /> : "＋"}</div></div>
          <p className="scanner-status">{status}</p>
        </div>

        <footer className="scanner-footer">
          {cameraError && <div className="scanner-error">{cameraError}. Allow camera access and use HTTPS or localhost.</div>}
          {error && <div className="scanner-error" role="alert">{error}</div>}
          {result && (
            <div className="scan-result">
              <div>
                <div className="scan-result-head">
                  <div><span className="eyebrow">{result.existingItem?.packed ? "ALREADY PACKED" : result.existingItem ? "IN THIS PACKING" : "DETECTED"}</span><b>{result.item.name}</b></div>
                  <button className="scan-result-dismiss" aria-label="Dismiss scan result" onClick={dismissResult}>×</button>
                </div>
                {result.confidence !== null && <small>{Math.round(result.confidence * 100)}% confidence</small>}
              </div>
              <div className="scan-actions">
                {result.existingItem ? (
                  <button className="button button-quiet" onClick={markExistingPackedState}>{result.existingItem.packed ? "Mark as unpacked" : "Mark as packed"}</button>
                ) : (
                  <button className="button button-quiet" onClick={dismissResult}>Dismiss</button>
                )}
                {result.existingItem ? (
                  <button className="button button-primary" onClick={addResult}>Add another</button>
                ) : (
                  <button className="button button-primary" onClick={addResult}>Add item</button>
                )}
              </div>
            </div>
          )}
          <div className="scanner-controls">
            <div className="scan-mode-toggle" role="group" aria-label="Scanning mode">
              <button className={scanMode === "automatic" ? "active" : ""} aria-pressed={scanMode === "automatic"} onClick={() => changeScanMode("automatic")}>Automatic</button>
              <button className={scanMode === "manual" ? "active" : ""} aria-pressed={scanMode === "manual"} onClick={() => changeScanMode("manual")}>Manual</button>
            </div>
            <button className="shutter-button" aria-label="Scan current frame" onClick={requestScan}><span /></button>
            <div className="scanner-small-label">{scanMode === "automatic" ? "Scans when the view changes" : "Tap the button to scan"}</div>
          </div>
        </footer>
        {showSettings && (
          <div className="scanner-settings-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowSettings(false); }}>
            <section className="scanner-settings-dialog" role="dialog" aria-modal="true" aria-labelledby="scanner-settings-title">
              <header className="scanner-settings-header"><h2 id="scanner-settings-title">Settings</h2><button className="dialog-close" aria-label="Close settings" onClick={() => setShowSettings(false)}>×</button></header>
              <SettingsPanel model={model} onModelChange={onModelChange} settings={settings} onSettingsChange={onSettingsChange} />
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
