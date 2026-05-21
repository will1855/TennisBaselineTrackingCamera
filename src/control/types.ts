

export type Direction = 'LEFT' | 'RIGHT' | 'STOP';

/**
 * Command sent to the hardware adapter.
 * direction: motor direction.
 * speed: normalised 0–1.
 * reason: human-readable explanation for logs.
 */
export interface RailCommand {
  direction: Direction;
  speed: number;      // 0 to 1
  reason?: string;
}

export interface RailControllerConfig {
  deadZone: number;         // fraction of frame width, e.g. 0.05
  proportionalGain: number; // how aggressively it reacts to error
  integralGain: number;     // how aggressively it corrects steady-state error
  maxSpeed: number;         // 0 to 1
  smoothing: number;        // 0 to 1 (EMA alpha — higher = more responsive)
  accelerationLimit: number; // max speed change per tick (0–1)
  confidenceThreshold: number; // below this → STOP (lost tracking)
}

export const DEFAULT_CONFIG: RailControllerConfig = {
  deadZone: 0.03,
  proportionalGain: 2.5,
  integralGain: 0.05,
  maxSpeed: 0.9,
  smoothing: 0.25,
  accelerationLimit: 0.12,
  confidenceThreshold: 0.3,
};

export type ManualOverride = 'LEFT' | 'RIGHT' | 'STOP' | null;

export interface ControllerState {
  lastCommand: RailCommand;
  smoothedError: number;
  currentSpeed: number;
  manualOverride: ManualOverride;
  emergencyStop: boolean;
}
