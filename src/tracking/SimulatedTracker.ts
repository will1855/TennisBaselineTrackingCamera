import { Tracker } from './Tracker';
import type { TargetState, SimulatorConfig } from './types';
import { DEFAULT_SIMULATOR_CONFIG } from './types';

/**
 * SimulatedTracker
 *
 * Runs entirely in the browser — no webcam required.
 * Simulates a tennis player moving back and forth along the baseline,
 * occasionally pausing and bouncing as if in a rally.
 *
 * Output: targetX oscillates 0.1 – 0.9, confidence ~0.9–1.0.
 */
export class SimulatedTracker extends Tracker {
  private _config: SimulatorConfig = { ...DEFAULT_SIMULATOR_CONFIG };
  private _time = 0;
  private _speed = 0.004;
  private _pauseTimer = 0;
  private _paused = false;
  private _direction = 1;
  private _playerX = 0.5;

  constructor(config?: SimulatorConfig) {
    super();
    if (config) {
      this._config = { ...config };
    }
    this._speed = this._config.playerSpeed;
  }

  updateConfig(partial: Partial<SimulatorConfig>): void {
    this._config = { ...this._config, ...partial };
  }

  async start(): Promise<void> {
    this._running = true;
    this._time = 0;
    this._playerX = 0.5;
    this._paused = false;
    this._pauseTimer = 0;
    this._speed = this._config.playerSpeed;
  }

  stop(): void {
    this._running = false;
  }

  protected _computeTarget(): TargetState {
    this._time += 1;

    if (this._paused) {
      this._pauseTimer--;
      if (this._pauseTimer <= 0) {
        this._paused = false;
        // Reverse direction after pause (simulates ball return)
        this._direction *= -1;
      }
    } else {
      this._playerX += this._speed * this._direction;

      // Bounce at edges with small randomness
      if (this._playerX > 0.88) {
        this._playerX = 0.88;
        if (this._config.pauseDuration > 0) {
          this._paused = true;
          this._pauseTimer = Math.floor(this._config.pauseDuration * 0.8) +
            Math.floor(Math.random() * (this._config.pauseDuration * 0.4));
        } else {
          this._direction *= -1;
        }
      } else if (this._playerX < 0.12) {
        this._playerX = 0.12;
        if (this._config.pauseDuration > 0) {
          this._paused = true;
          this._pauseTimer = Math.floor(this._config.pauseDuration * 0.8) +
            Math.floor(Math.random() * (this._config.pauseDuration * 0.4));
        } else {
          this._direction *= -1;
        }
      }

      // Vary speed slightly using configurable base speed and variation amplitude
      this._speed = this._config.playerSpeed + Math.sin(this._time * 0.05) * this._config.speedVariation;
    }

    // Slight vertical bob
    const y = 0.6 + Math.sin(this._time * 0.12) * 0.04;

    // Confidence is near-perfect in simulated mode
    const confidence = this._paused
      ? 0.75 + Math.random() * 0.1
      : 0.88 + Math.random() * 0.12;

    return {
      x: this._playerX,
      y,
      confidence,
      detected: true,
    };
  }
}

