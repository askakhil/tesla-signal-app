import type { Prediction, Signal } from "./types";

const CANDIDATE_CYCLES = [30, 40, 45, 50, 60, 70, 75, 80, 90, 100, 110, 120, 130, 150, 180, 240];

// Minimal arc (seconds) covering all phases mod cycle, and its start phase.
function minimalArc(timesSec: number[], cycle: number): { spread: number; phase: number } {
  const sorted = timesSec
    .map((t) => ((t % cycle) + cycle) % cycle)
    .sort((a, b) => a - b);
  const n = sorted.length;
  const doubled = [...sorted, ...sorted.map((p) => p + cycle)];
  let bestSpread = Infinity;
  let bestPhase = sorted[0] ?? 0;
  for (let i = 0; i < n; i++) {
    const spread = doubled[i + n - 1] - doubled[i];
    if (spread < bestSpread) {
      bestSpread = spread;
      bestPhase = doubled[i] % cycle;
    }
  }
  return { spread: bestSpread, phase: bestPhase };
}

export function predictSignal(signal: Signal, nowMs: number): Prediction | null {
  const greens = signal.observations
    .map((o) => o.resumedAt / 1000)
    .sort((a, b) => a - b);

  const distinct: number[] = [];
  for (const g of greens) {
    if (!distinct.length || g - distinct[distinct.length - 1] > 20) distinct.push(g);
  }
  if (distinct.length < 3) return null;

  let best: { cycle: number; spread: number; phase: number; score: number } | null = null;
  for (const cycle of CANDIDATE_CYCLES) {
    const { spread, phase } = minimalArc(distinct, cycle);
    // Penalize short cycles slightly: a 60s fit will also fit a true 120s signal.
    const score = spread + (cycle < 60 ? 3 : 0) + cycle * 0.01;
    if (!best || score < best.score) best = { cycle, spread, phase, score };
  }
  if (!best) return null;

  const nowSec = nowMs / 1000;
  const cycle = best.cycle;
  const nowMod = ((nowSec % cycle) + cycle) % cycle;
  let delta = best.phase - nowMod;
  if (delta < 0) delta += cycle;
  const secondsToGreen = delta > cycle - 3 ? 0 : Math.round(delta);

  const spreadScore = Math.max(0, 1 - best.spread / 20);
  const countScore = Math.min(1, distinct.length / 8);
  const confidence = Math.round((0.7 * spreadScore + 0.3 * countScore) * 100) / 100;

  return {
    cycleSec: cycle,
    phaseSec: Math.round(best.phase),
    nextGreenAt: nowMs + secondsToGreen * 1000,
    secondsToGreen,
    confidence,
    spreadSec: Math.round(best.spread * 10) / 10,
    observationCount: distinct.length,
  };
}
