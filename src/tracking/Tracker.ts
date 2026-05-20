import type { ITracker, TargetState } from './types';
import { DEFAULT_TARGET_STATE } from './types';

/**
 * Abstract base class for all trackers.
 * Subclasses must implement the _computeTarget() method.
 */
export abstract class Tracker implements ITracker {
  protected _state: TargetState = { ...DEFAULT_TARGET_STATE };
  protected _running = false;

  abstract start(): Promise<void>;
  abstract stop(): void;
  protected abstract _computeTarget(): TargetState;

  update(): void {
    if (!this._running) return;
    this._state = this._computeTarget();
  }

  getTargetState(): TargetState {
    return { ...this._state };
  }
}
