export interface StopObservation {
  id: string;
  arrivedAt: number; // epoch ms when stop was confirmed
  resumedAt: number; // epoch ms when movement resumed (~green start)
  stopDurationSec: number;
  lat: number;
  lng: number;
  heading: number | null; // degrees, direction of travel
}

export interface Signal {
  id: string;
  name: string;
  lat: number; // centroid
  lng: number;
  observations: StopObservation[];
  createdAt: number;
}

export interface Prediction {
  cycleSec: number;
  phaseSec: number; // green-start offset within cycle (seconds of day mod cycle)
  nextGreenAt: number; // epoch ms
  secondsToGreen: number;
  confidence: number; // 0..1
  spreadSec: number;
  observationCount: number;
}
