import { describe, it, expect, beforeEach } from 'vitest';
import { SimulatedTracker } from './SimulatedTracker';

describe('SimulatedTracker', () => {
  let tracker: SimulatedTracker;

  beforeEach(() => {
    tracker = new SimulatedTracker({
      playerSpeed: 0.01,
      speedVariation: 0,
      pauseDuration: 0, // no pausing for deterministic testing
    });
  });

  it('should initialize correctly when started', async () => {
    await tracker.start();
    const state = tracker.getTargetState();
    expect(tracker.absolutePlayerX).toBe(0.5);
    // Initially not run update yet, so state should be initialised
    expect(state.detected).toBe(false);
  });

  it('should calculate relative player position correctly (closed-loop)', async () => {
    await tracker.start();

    // First update at carriagePosition = 0.5. Player starts at 0.5, moves by speed (0.01) * direction (1) -> 0.51
    tracker.update(0.5);
    let state = tracker.getTargetState();
    expect(tracker.absolutePlayerX).toBe(0.51);
    // relativeX = 0.5 + (0.51 - 0.5) = 0.51
    expect(state.x).toBeCloseTo(0.51);
    expect(state.detected).toBe(true);

    // If carriage tracks the player perfectly and moves to 0.51:
    // Next tick: player moves 0.51 -> 0.52.
    // relativeX = 0.5 + (0.52 - 0.51) = 0.51.
    tracker.update(0.51);
    state = tracker.getTargetState();
    expect(tracker.absolutePlayerX).toBe(0.52);
    expect(state.x).toBeCloseTo(0.51);

    // If carriage lags behind (stands still at 0.50):
    // Next tick: player moves 0.52 -> 0.53
    // relativeX = 0.5 + (0.53 - 0.50) = 0.53.
    tracker.update(0.50);
    state = tracker.getTargetState();
    expect(tracker.absolutePlayerX).toBe(0.53);
    expect(state.x).toBeCloseTo(0.53);
  });

  it('should lose tracking if player gets out of bounds relative to carriage', async () => {
    await tracker.start();

    // If the carriage moves completely away from the player (e.g. to 0.0), player is at 0.51:
    // relativeX = 0.5 + (0.51 - 0.0) = 1.01 -> clamped to 1.0
    tracker.update(0.0);
    const state = tracker.getTargetState();
    expect(state.x).toBe(1.0);
    expect(state.detected).toBe(false);
    expect(state.confidence).toBeLessThan(0.15);
  });

  it('should support dynamic config updates', async () => {
    await tracker.start();
    tracker.updateConfig({ playerSpeed: 0.05 });
    
    // Player moves by speed (0.05) -> 0.55
    tracker.update(0.5);
    expect(tracker.absolutePlayerX).toBe(0.55);
  });
});
