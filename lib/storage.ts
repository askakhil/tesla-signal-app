import { haversineMeters, uid } from "./geo";
import type { Signal, StopObservation } from "./types";

const KEY = "tesla-signal-app:v1";
export const CLUSTER_RADIUS_M = 35;

export function loadSignals(): Signal[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Signal[]) : [];
  } catch {
    return [];
  }
}

export function saveSignals(signals: Signal[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(signals));
  } catch {
    // storage full / private mode — ignore for MVP
  }
}

/** Add an observation to the nearest signal within radius, or create a new signal. */
export function addObservation(
  signals: Signal[],
  obs: Omit<StopObservation, "id">
): { signals: Signal[]; signal: Signal; isNew: boolean } {
  let nearest: Signal | null = null;
  let nearestDist = Infinity;
  for (const s of signals) {
    const d = haversineMeters(obs.lat, obs.lng, s.lat, s.lng);
    if (d < nearestDist) {
      nearestDist = d;
      nearest = s;
    }
  }

  const fullObs: StopObservation = { ...obs, id: uid() };

  if (nearest && nearestDist <= CLUSTER_RADIUS_M) {
    const n = nearest.observations.length;
    const updated: Signal = {
      ...nearest,
      // slowly move centroid toward new observations
      lat: (nearest.lat * n + obs.lat) / (n + 1),
      lng: (nearest.lng * n + obs.lng) / (n + 1),
      observations: [...nearest.observations, fullObs],
    };
    return {
      signals: signals.map((s) => (s.id === updated.id ? updated : s)),
      signal: updated,
      isNew: false,
    };
  }

  const created: Signal = {
    id: uid(),
    name: `Signal ${signals.length + 1}`,
    lat: obs.lat,
    lng: obs.lng,
    observations: [fullObs],
    createdAt: Date.now(),
  };
  return { signals: [...signals, created], signal: created, isNew: true };
}
