"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { bearingDeg, haversineMeters } from "@/lib/geo";
import { predictSignal } from "@/lib/predictor";
import { addObservation, loadSignals, saveSignals } from "@/lib/storage";
import type { Signal } from "@/lib/types";

interface Pos { lat: number; lng: number; speedMps: number | null; heading: number | null; accuracy: number | null; at: number; }

const STOP_SPEED = 0.5;   // m/s — below this you're stopped
const RESUME_SPEED = 2;   // m/s — above this you're moving again
const STOP_CONFIRM_MS = 3000;
const NEAR_M = 200;       // show prediction when this close to a known signal

export default function Home() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [driving, setDriving] = useState(false);
  const [pos, setPos] = useState<Pos | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [stoppedSince, setStoppedSince] = useState<number | null>(null);
  const [log, setLog] = useState<string[]>([]);

  const watchId = useRef<number | null>(null);
  const lastPos = useRef<Pos | null>(null);
  const lowSince = useRef<number | null>(null);
  const activeStop = useRef<{ arrivedAt: number; lat: number; lng: number; heading: number | null } | null>(null);
  const signalsRef = useRef<Signal[]>([]);
  signalsRef.current = signals;

  useEffect(() => { setSignals(loadSignals()); }, []);
  useEffect(() => { if (signals.length) saveSignals(signals); }, [signals]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  function pushLog(msg: string) {
    setLog((l) => [`${new Date().toLocaleTimeString()} — ${msg}`, ...l].slice(0, 8));
  }

  function handlePosition(p: GeolocationPosition) {
    const { latitude: lat, longitude: lng, accuracy, heading } = p.coords;
    let speed = p.coords.speed;
    // Fallback: derive speed from distance / time when the device doesn't report it
    if (speed == null && lastPos.current) {
      const dt = (p.timestamp - lastPos.current.at) / 1000;
      if (dt > 0.5) speed = haversineMeters(lastPos.current.lat, lastPos.current.lng, lat, lng) / dt;
    }
    const next: Pos = { lat, lng, speedMps: speed, heading, accuracy, at: p.timestamp };
    if (lastPos.current && next.heading == null) {
      const d = haversineMeters(lastPos.current.lat, lastPos.current.lng, lat, lng);
      if (d > 3) next.heading = bearingDeg(lastPos.current.lat, lastPos.current.lng, lat, lng);
    }
    lastPos.current = next;
    setPos(next);
    if (!driving) return;

    const v = speed ?? 0;
    if (v < STOP_SPEED) {
      if (lowSince.current == null) lowSince.current = p.timestamp;
      if (!activeStop.current && p.timestamp - lowSince.current >= STOP_CONFIRM_MS) {
        activeStop.current = { arrivedAt: lowSince.current, lat, lng, heading: next.heading };
        setStoppedSince(lowSince.current);
        pushLog("Stop detected");
      }
    } else if (v > RESUME_SPEED) {
      lowSince.current = null;
      if (activeStop.current) {
        const stop = activeStop.current;
        activeStop.current = null;
        setStoppedSince(null);
        const durationSec = Math.round((p.timestamp - stop.arrivedAt) / 1000);
        if (durationSec >= 4 && durationSec <= 600) {
          const res = addObservation(signalsRef.current, {
            arrivedAt: stop.arrivedAt, resumedAt: p.timestamp,
            stopDurationSec: durationSec, lat: stop.lat, lng: stop.lng, heading: stop.heading,
          });
          setSignals(res.signals);
          pushLog(`${res.isNew ? "New signal" : res.signal.name} logged — stopped ${durationSec}s (${res.signal.observations.length} obs)`);
        } else {
          pushLog(`Stop ignored (${durationSec}s — too short/long, probably traffic/parking)`);
        }
      }
    }
  }

  function startDrive() {
    if (!("geolocation" in navigator)) { setGpsError("Geolocation not available in this browser."); return; }
    setGpsError(null);
    setDriving(true);
    watchId.current = navigator.geolocation.watchPosition(
      handlePosition,
      (e) => setGpsError(`GPS error: ${e.message}. Location permission must be allowed and the site must be HTTPS.`),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 }
    );
    pushLog("Drive started — GPS tracking on");
  }

  function stopDrive() {
    if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
    setDriving(false);
    activeStop.current = null; lowSince.current = null; setStoppedSince(null);
    pushLog("Drive ended");
  }

  // Desktop / parked test: inject 5 past observations aligned to a 90s cycle at current location
  function simulatePastDrive() {
    const base = pos ?? { lat: 40.0893, lng: -75.385 };
    let s = signalsRef.current;
    const cycleMs = 90_000;
    const firstGreen = Math.floor((Date.now() - 5 * 3600_000) / cycleMs) * cycleMs;
    for (let i = 0; i < 5; i++) {
      const resumedAt = firstGreen + i * 47 * cycleMs + (i % 2) * cycleMs; // spread over hours, same phase
      const res = addObservation(s, {
        arrivedAt: resumedAt - 18_000, resumedAt, stopDurationSec: 18,
        lat: base.lat, lng: base.lng, heading: 90,
      });
      s = res.signals;
    }
    setSignals(s);
    pushLog("Simulated 5 past stops (90s cycle) — prediction should now appear");
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(signals, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "signal-data.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function importData(file: File) {
    file.text().then((txt) => {
      try {
        const parsed = JSON.parse(txt) as Signal[];
        setSignals(parsed); saveSignals(parsed); pushLog(`Imported ${parsed.length} signals`);
      } catch { pushLog("Import failed — not valid signal JSON"); }
    });
  }

  const nearest = useMemo(() => {
    if (!pos) return null;
    let best: { signal: Signal; dist: number } | null = null;
    for (const s of signals) {
      const d = haversineMeters(pos.lat, pos.lng, s.lat, s.lng);
      if (!best || d < best.dist) best = { signal: s, dist: d };
    }
    return best && best.dist <= NEAR_M ? best : null;
  }, [pos, signals]);

  const prediction = nearest ? predictSignal(nearest.signal, now) : null;
  const speedMph = pos?.speedMps != null ? Math.round(pos.speedMps * 2.237) : null;
  const stoppedSec = stoppedSince ? Math.round((now - stoppedSince) / 1000) : null;

  return (
    <main>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h1>🚦 Signal Predictor</h1>
          <p className="muted small">Learns signal cycles from your drives. Keep this page open while driving.</p>
        </div>
        {driving
          ? <button className="btn stop" onClick={stopDrive}>■ Stop Drive</button>
          : <button className="btn" onClick={startDrive}>▶ Start Drive</button>}
      </div>

      {gpsError && <div className="banner">{gpsError}</div>}

      <div className="card center">
        {nearest ? (
          <>
            <p className="muted">{nearest.signal.name} · {Math.round(nearest.dist)}m away · {nearest.signal.observations.length} observations</p>
            {prediction ? (
              <>
                <div className={`countdown ${prediction.secondsToGreen === 0 ? "green" : "red"}`}>
                  {prediction.secondsToGreen === 0 ? "GO" : prediction.secondsToGreen}
                </div>
                <p className="muted">
                  {prediction.secondsToGreen === 0 ? "Predicted green now" : "seconds to predicted green"} ·
                  cycle {prediction.cycleSec}s · confidence {Math.round(prediction.confidence * 100)}%
                  {prediction.confidence < 0.4 ? " (low — signal may be sensor-triggered)" : ""}
                </p>
              </>
            ) : (
              <>
                <div className="countdown none">Learning…</div>
                <p className="muted">Need 3+ stops from different cycles at this signal. So far: {nearest.signal.observations.length}</p>
              </>
            )}
          </>
        ) : (
          <>
            <div className="countdown none">{signals.length ? "No known signal nearby" : "No signals learned yet"}</div>
            <p className="muted">{signals.length ? "Predictions appear within 200m of a learned signal." : "Start a drive — your first stops will create signals automatically."}</p>
          </>
        )}
      </div>

      <div className="card">
        <div className="grid">
          <div className="stat"><span className="muted small">Status</span><b>{stoppedSince ? `Stopped ${stoppedSec}s` : driving ? "Driving" : "Idle"}</b></div>
          <div className="stat"><span className="muted small">Speed</span><b>{speedMph == null ? "—" : `${speedMph} mph`}</b></div>
          <div className="stat"><span className="muted small">GPS accuracy</span><b>{pos?.accuracy ? `${Math.round(pos.accuracy)}m` : "—"}</b></div>
          <div className="stat"><span className="muted small">Signals learned</span><b>{signals.length}</b></div>
        </div>
        {pos && <p className="muted small" style={{ marginTop: 10 }}>{pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}</p>}
        {log.length > 0 && <div style={{ marginTop: 10 }}>{log.map((l, i) => <p key={i} className="small muted">{l}</p>)}</div>}
      </div>

      <div className="card">
        <h2>Your signals</h2>
        {signals.length === 0 ? <p className="muted">None yet.</p> : (
          <table>
            <thead><tr><th>Name</th><th>Stops</th><th>Cycle</th><th>Confidence</th><th></th></tr></thead>
            <tbody>
              {signals.map((s) => {
                const p = predictSignal(s, now);
                return (
                  <tr key={s.id}>
                    <td>
                      <input type="text" defaultValue={s.name} onBlur={(e) => {
                        const name = e.target.value.trim() || s.name;
                        setSignals(signals.map((x) => x.id === s.id ? { ...x, name } : x));
                      }} />
                    </td>
                    <td>{s.observations.length}</td>
                    <td>{p ? `${p.cycleSec}s` : "learning"}</td>
                    <td>{p ? <span className={`badge ${p.confidence >= 0.6 ? "high" : p.confidence >= 0.35 ? "med" : ""}`}>{Math.round(p.confidence * 100)}%</span> : "—"}</td>
                    <td><button className="btn ghost small-btn" onClick={() => { const next = signals.filter((x) => x.id !== s.id); setSignals(next); saveSignals(next); }}>Delete</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <div className="row" style={{ marginTop: 14 }}>
          <button className="btn ghost small-btn" onClick={simulatePastDrive}>Simulate past drive (test)</button>
          <button className="btn ghost small-btn" onClick={exportData}>Export JSON</button>
          <label className="btn ghost small-btn" style={{ display: "inline-flex", alignItems: "center", cursor: "pointer" }}>
            Import JSON
            <input type="file" accept="application/json" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) importData(f); }} />
          </label>
          <button className="btn ghost small-btn" onClick={() => { setSignals([]); localStorage.removeItem("tesla-signal-app:v1"); pushLog("All data cleared"); }}>Clear all</button>
        </div>
        <p className="muted small" style={{ marginTop: 10 }}>Data lives in this browser only (localStorage). Export regularly — Tesla browser may clear it. Rename signals to street names after your first drive.</p>
      </div>
    </main>
  );
}
