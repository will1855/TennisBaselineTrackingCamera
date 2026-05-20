import { describe, it, expect, beforeEach } from 'vitest';
import { RailController } from './RailController';
import type { TargetState } from '../tracking/types';
import { DEFAULT_CONFIG } from './types';

// Helper to build a target state
function makeTarget(x: number, confidence = 0.95, detected = true): TargetState {
  return { x, y: 0.5, confidence, detected };
}

// Run controller multiple ticks to let smoothing converge
function runTicks(ctrl: RailController, target: TargetState, ticks = 30) {
  let cmd = ctrl.compute(target);
  for (let i = 0; i < ticks - 1; i++) cmd = ctrl.compute(target);
  return cmd;
}

describe('RailController', () => {
  let controller: RailController;

  beforeEach(() => {
    controller = new RailController({
      ...DEFAULT_CONFIG,
      smoothing: 1.0,        // instant response for tests
      accelerationLimit: 1.0, // no ramp for tests
      deadZone: 0.05,
      maxSpeed: 0.8,
      confidenceThreshold: 0.3,
    });
  });

  // ── Direction tests ────────────────────────────────────────────────────────

  it('target centred should STOP', () => {
    const cmd = runTicks(controller, makeTarget(0.5));
    expect(cmd.direction).toBe('STOP');
  });

  it('target left of centre should command LEFT', () => {
    const cmd = runTicks(controller, makeTarget(0.1));
    expect(cmd.direction).toBe('LEFT');
  });

  it('target right of centre should command RIGHT', () => {
    const cmd = runTicks(controller, makeTarget(0.9));
    expect(cmd.direction).toBe('RIGHT');
  });

  // ── Lost tracking ──────────────────────────────────────────────────────────

  it('low confidence should STOP', () => {
    const cmd = runTicks(controller, makeTarget(0.9, 0.1));
    expect(cmd.direction).toBe('STOP');
    expect(cmd.reason).toBe('LOST_TRACKING');
  });

  it('detected=false should STOP', () => {
    const cmd = runTicks(controller, makeTarget(0.8, 0.9, false));
    expect(cmd.direction).toBe('STOP');
    expect(cmd.reason).toBe('LOST_TRACKING');
  });

  // ── Speed scaling ─────────────────────────────────────────────────────────

  it('speed should increase as error increases', () => {
    const ctrl2 = new RailController({ ...DEFAULT_CONFIG, smoothing: 1.0, accelerationLimit: 1.0 });
    const ctrl3 = new RailController({ ...DEFAULT_CONFIG, smoothing: 1.0, accelerationLimit: 1.0 });

    const cmdSmallError = runTicks(ctrl2, makeTarget(0.6)); // small error
    const cmdLargeError = runTicks(ctrl3, makeTarget(0.9)); // large error

    expect(cmdLargeError.speed).toBeGreaterThan(cmdSmallError.speed);
  });

  it('speed should not exceed maxSpeed', () => {
    const cmd = runTicks(controller, makeTarget(0.0)); // maximum possible error
    expect(cmd.speed).toBeLessThanOrEqual(0.8 + 1e-9); // allow floating point tolerance
  });

  // ── Dead zone ─────────────────────────────────────────────────────────────

  it('target within dead zone should STOP', () => {
    const cmd = runTicks(controller, makeTarget(0.52)); // 0.02 error < 0.05 dead zone
    expect(cmd.direction).toBe('STOP');
  });

  it('target just outside dead zone should move', () => {
    const cmd = runTicks(controller, makeTarget(0.5 + 0.07)); // 0.07 > 0.05 dead zone
    expect(cmd.direction).toBe('RIGHT');
    expect(cmd.speed).toBeGreaterThan(0);
  });

  // ── Emergency stop ────────────────────────────────────────────────────────

  it('emergency stop should STOP regardless of target', () => {
    controller.setEmergencyStop(true);
    const cmd = runTicks(controller, makeTarget(0.9));
    expect(cmd.direction).toBe('STOP');
    expect(cmd.reason).toBe('EMERGENCY_STOP');
  });

  // ── Manual override ───────────────────────────────────────────────────────

  it('manual LEFT override should command LEFT', () => {
    controller.setManualOverride('LEFT');
    const cmd = controller.compute(makeTarget(0.9)); // target says RIGHT but manual wins
    expect(cmd.direction).toBe('LEFT');
    expect(cmd.reason).toBe('MANUAL_OVERRIDE');
  });

  it('manual override cleared → control resumes', () => {
    controller.setManualOverride('LEFT');
    controller.compute(makeTarget(0.5));
    controller.setManualOverride(null);
    const cmd = runTicks(controller, makeTarget(0.5));
    expect(cmd.direction).toBe('STOP'); // back to tracking
  });
});
