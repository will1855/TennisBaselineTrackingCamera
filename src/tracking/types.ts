/**
 * Represents the current state of the tracked target.
 * x and y are normalised 0–1 relative to frame width/height.
 * confidence: 0 = no signal, 1 = fully confident.
 * detected: true only when the tracker has a valid lock.
 */
export interface TargetState {
  x: number;          // 0 to 1 (horizontal position in frame)
  y: number;          // 0 to 1 (vertical position in frame)
  confidence: number; // 0 to 1
  detected: boolean;
}

/**
 * Common interface that all tracker implementations must satisfy.
 * Concrete trackers: SimulatedTracker, ColorTracker.
 * Stub trackers (future): MediaPipeTracker, OpenCVTracker.
 */
export interface ITracker {
  start(): Promise<void>;
  stop(): void;
  update(carriagePosition?: number): void;
  getTargetState(): TargetState;
}

export const DEFAULT_TARGET_STATE: TargetState = {
  x: 0.5,
  y: 0.5,
  confidence: 0,
  detected: false,
};

/**
 * Configuration for the simulated player movement.
 */
export interface SimulatorConfig {
  playerSpeed: number;       // Base player speed
  speedVariation: number;    // Amplitude of sinusoidal speed variation
  pauseDuration: number;     // Number of frames/ticks paused at edges
}

export const DEFAULT_SIMULATOR_CONFIG: SimulatorConfig = {
  playerSpeed: 0.004,
  speedVariation: 0.002,
  pauseDuration: 25,
};

