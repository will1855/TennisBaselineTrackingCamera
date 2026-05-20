import type { RailCommand } from '../control/types';

/**
 * RailPhysics
 *
 * Simulates the physical carriage on the rail.
 * The carriage position is a value 0–1 representing its position along the rail.
 * Physics:
 *  - Velocity is set by the command (direction × speed × maxVelocity).
 *  - Position is integrated from velocity each tick.
 *  - Position is clamped at 0 and 1 (rail end-stops).
 *  - Optional: velocity is damped to simulate friction.
 */
export class RailPhysics {
  private _position: number;       // 0 to 1
  private _velocity: number = 0;   // units/tick (positive = rightward)
  private _maxVelocity: number;    // max position units moved per tick
  private _friction: number;       // 0 = no friction, 1 = stop immediately

  constructor(initialPosition = 0.5, maxVelocity = 0.008, friction = 0.12) {
    this._position = initialPosition;
    this._maxVelocity = maxVelocity;
    this._friction = friction;
  }

  /**
   * Apply one physics tick given the current command.
   * Call once per requestAnimationFrame.
   */
  tick(command: RailCommand): void {
    const targetVelocity = command.direction === 'LEFT'
      ? -command.speed * this._maxVelocity
      : command.direction === 'RIGHT'
        ? command.speed * this._maxVelocity
        : 0;

    // Lerp velocity toward target (simulates motor response + inertia)
    const lerpFactor = command.direction === 'STOP' ? 0.25 : 0.18;
    this._velocity += (targetVelocity - this._velocity) * lerpFactor;

    // Apply friction when coasting to stop
    if (command.direction === 'STOP') {
      this._velocity *= (1 - this._friction);
    }

    // Integrate position
    this._position = Math.max(0, Math.min(1, this._position + this._velocity));

    // Hard stop at rail ends
    if (this._position <= 0 || this._position >= 1) {
      this._velocity = 0;
    }
  }

  get position(): number {
    return this._position;
  }

  get velocity(): number {
    return this._velocity;
  }

  reset(pos = 0.5): void {
    this._position = pos;
    this._velocity = 0;
  }
}
