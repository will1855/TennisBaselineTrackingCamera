import type { TargetState } from '../tracking/types';
import type {
  RailCommand,
  RailControllerConfig,
  ControllerState,
  ManualOverride,
} from './types';
import { DEFAULT_CONFIG } from './types';

/**
 * RailController
 *
 * The core control algorithm. Converts a TargetState into a RailCommand
 * with the following features:
 *
 *  - Dead zone:          Small errors around centre are ignored (camera shake tolerance).
 *  - Proportional speed: Speed scales linearly with error beyond the dead zone.
 *  - Smoothing (EMA):   Exponential moving average on error to reduce jitter.
 *  - Acceleration limit: Speed changes are clamped to prevent jerky motion.
 *  - Max speed cap:      Output speed never exceeds config.maxSpeed.
 *  - Lost-tracking:      If confidence < threshold or !detected → STOP.
 *  - Emergency stop:     Hard override → STOP at all times.
 *  - Manual override:    User can force LEFT / RIGHT / STOP.
 */
export class RailController {
  private _config: RailControllerConfig;
  private _smoothedError = 0;
  private _currentSpeed = 0;
  private _integralError = 0;
  private _manualOverride: ManualOverride = null;
  private _emergencyStop = false;
  private _lastCommand: RailCommand = { direction: 'STOP', speed: 0, reason: 'init' };

  constructor(config: Partial<RailControllerConfig> = {}) {
    this._config = { ...DEFAULT_CONFIG, ...config };
  }

  // ─── Configuration ───────────────────────────────────────────────────────

  updateConfig(partial: Partial<RailControllerConfig>): void {
    this._config = { ...this._config, ...partial };
  }

  getConfig(): RailControllerConfig {
    return { ...this._config };
  }

  // ─── Overrides ────────────────────────────────────────────────────────────

  setManualOverride(override: ManualOverride): void {
    this._manualOverride = override;
  }

  setEmergencyStop(active: boolean): void {
    this._emergencyStop = active;
    if (active) {
      this._currentSpeed = 0;
      this._smoothedError = 0;
      this._integralError = 0;
    }
  }

  // ─── Core Algorithm ───────────────────────────────────────────────────────

  /**
   * Compute the next RailCommand from the current TargetState.
   * Call this on every animation frame.
   */
  compute(target: TargetState): RailCommand {
    // Emergency stop — highest priority
    if (this._emergencyStop) {
      this._lastCommand = { direction: 'STOP', speed: 0, reason: 'EMERGENCY_STOP' };
      return this._lastCommand;
    }

    // Manual override — second priority
    if (this._manualOverride !== null) {
      const dir = this._manualOverride;
      const speed = dir === 'STOP' ? 0 : this._config.maxSpeed * 0.6;
      this._lastCommand = { direction: dir, speed, reason: 'MANUAL_OVERRIDE' };
      return this._lastCommand;
    }

    // Lost tracking fail-safe
    if (!target.detected || target.confidence < this._config.confidenceThreshold) {
      this._currentSpeed = 0;
      this._smoothedError = 0;
      this._integralError = 0;
      this._lastCommand = { direction: 'STOP', speed: 0, reason: 'LOST_TRACKING' };
      return this._lastCommand;
    }

    // Error = deviation from centre (positive = right, negative = left)
    const rawError = target.x - 0.5;

    // Exponential moving average smoothing
    const alpha = Math.max(0.01, Math.min(1, this._config.smoothing));
    this._smoothedError = this._smoothedError * (1 - alpha) + rawError * alpha;

    const absError = Math.abs(this._smoothedError);

    // Dead zone
    if (absError < this._config.deadZone) {
      this._integralError = 0; // Clear integral to prevent windup when centered
      this._currentSpeed = this._applyAcceleration(this._currentSpeed, 0);
      this._lastCommand = { direction: 'STOP', speed: 0, reason: 'DEAD_ZONE' };
      return this._lastCommand;
    }

    // Accumulate integral error
    this._integralError += this._smoothedError;
    // Anti-windup
    const maxI = 20;
    this._integralError = Math.max(-maxI, Math.min(this._integralError, maxI));

    // PI control signal
    const pTerm = this._smoothedError * this._config.proportionalGain;
    const iTerm = this._integralError * this._config.integralGain;
    const controlSignal = pTerm + iTerm;
    const absSignal = Math.abs(controlSignal);

    // Target speed mapping
    const targetSpeed = Math.min(absSignal, this._config.maxSpeed);

    // Acceleration limiting
    this._currentSpeed = this._applyAcceleration(this._currentSpeed, targetSpeed);

    const direction = controlSignal < 0 ? 'LEFT' : 'RIGHT';
    this._lastCommand = {
      direction,
      speed: this._currentSpeed,
      reason: `PI=${controlSignal.toFixed(3)}`,
    };
    return this._lastCommand;
  }

  private _applyAcceleration(current: number, target: number): number {
    const diff = target - current;
    const clamped = Math.max(-this._config.accelerationLimit, Math.min(diff, this._config.accelerationLimit));
    return Math.max(0, Math.min(current + clamped, this._config.maxSpeed));
  }

  // ─── State ─────────────────────────────────────────────────────────────────

  getState(): ControllerState {
    return {
      lastCommand: { ...this._lastCommand },
      smoothedError: this._smoothedError,
      currentSpeed: this._currentSpeed,
      manualOverride: this._manualOverride,
      emergencyStop: this._emergencyStop,
    };
  }

  reset(): void {
    this._smoothedError = 0;
    this._integralError = 0;
    this._currentSpeed = 0;
    this._lastCommand = { direction: 'STOP', speed: 0, reason: 'reset' };
  }
}
