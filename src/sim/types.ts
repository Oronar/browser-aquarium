/** Ephemeral per-fish animation state — never persisted, rebuilt each session. */
export interface FishRuntime {
  fishId: string;
  x: number;
  y: number;
  heading: number;
  targetHeading: number;
  speed: number;
  targetSpeed: number;
  resting: boolean;
  nextDecisionAt: number;
  tailPhase: number;
}
