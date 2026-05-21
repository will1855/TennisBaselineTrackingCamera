import React from 'react';
import type { RailControllerConfig, ManualOverride } from '../control/types';
import type { SimulatorConfig } from '../tracking/types';

type TrackingMode = 'simulated' | 'webcam';

interface ControlPanelProps {
  mode: TrackingMode;
  onModeChange: (mode: TrackingMode) => void;
  isRunning: boolean;
  onStartStop: () => void;
  config: RailControllerConfig;
  onConfigChange: (partial: Partial<RailControllerConfig>) => void;
  onManualOverride: (override: ManualOverride) => void;
  onEmergencyStop: () => void;
  emergencyActive: boolean;
  simulatorConfig: SimulatorConfig;
  onSimulatorConfigChange: (partial: Partial<SimulatorConfig>) => void;
}

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
  id: string;
}

const SliderRow: React.FC<SliderRowProps> = ({ label, value, min, max, step, format, onChange, id }) => (
  <div className="slider-row">
    <label htmlFor={id} className="slider-label">
      <span>{label}</span>
      <span className="slider-value">{format(value)}</span>
    </label>
    <input
      id={id}
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={e => onChange(parseFloat(e.target.value))}
      className="slider"
    />
  </div>
);

/**
 * ControlPanel
 *
 * All user controls: mode selector, start/stop, algorithm sliders,
 * manual override buttons, and emergency stop.
 */
const ControlPanel: React.FC<ControlPanelProps> = ({
  mode,
  onModeChange,
  isRunning,
  onStartStop,
  config,
  onConfigChange,
  onManualOverride,
  onEmergencyStop,
  emergencyActive,
  simulatorConfig,
  onSimulatorConfigChange,
}) => {
  return (
    <div className="control-panel">
      {/* Mode selector */}
      <div className="panel-section">
        <h3 className="panel-section-title">Tracking Mode</h3>
        <div className="mode-selector">
          <button
            id="mode-simulated"
            className={`mode-btn ${mode === 'simulated' ? 'active' : ''}`}
            onClick={() => onModeChange('simulated')}
            disabled={isRunning}
          >
            🎾 Simulated
          </button>
          <button
            id="mode-webcam"
            className={`mode-btn ${mode === 'webcam' ? 'active' : ''}`}
            onClick={() => onModeChange('webcam')}
            disabled={isRunning}
          >
            📷 Webcam Colour
          </button>
        </div>
        {mode === 'webcam' && (
          <p className="mode-hint">Click on the webcam feed to pick a colour to track</p>
        )}
      </div>

      {/* Start / Stop */}
      <div className="panel-section">
        <button
          id="btn-start-stop"
          className={`start-stop-btn ${isRunning ? 'running' : ''}`}
          onClick={onStartStop}
          disabled={emergencyActive}
        >
          {isRunning ? '⏹ Stop Tracking' : '▶ Start Tracking'}
        </button>
      </div>

      {/* Algorithm config */}
      <div className="panel-section">
        <h3 className="panel-section-title">Control Algorithm</h3>
        <SliderRow
          id="slider-deadzone"
          label="Dead Zone"
          value={config.deadZone}
          min={0.01}
          max={0.25}
          step={0.01}
          format={v => `${(v * 100).toFixed(0)}%`}
          onChange={v => onConfigChange({ deadZone: v })}
        />
        <SliderRow
          id="slider-pgain"
          label="Proportional Gain"
          value={config.proportionalGain}
          min={0.5}
          max={10}
          step={0.5}
          format={v => v.toFixed(1)}
          onChange={v => onConfigChange({ proportionalGain: v })}
        />
        <SliderRow
          id="slider-igain"
          label="Integral Gain"
          value={config.integralGain}
          min={0}
          max={0.5}
          step={0.01}
          format={v => v.toFixed(2)}
          onChange={v => onConfigChange({ integralGain: v })}
        />
        <SliderRow
          id="slider-smoothing"
          label="Smoothing (EMA α)"
          value={config.smoothing}
          min={0.02}
          max={1}
          step={0.01}
          format={v => v.toFixed(2)}
          onChange={v => onConfigChange({ smoothing: v })}
        />
        <SliderRow
          id="slider-maxspeed"
          label="Max Speed"
          value={config.maxSpeed}
          min={0.1}
          max={1}
          step={0.05}
          format={v => `${(v * 100).toFixed(0)}%`}
          onChange={v => onConfigChange({ maxSpeed: v })}
        />
        <SliderRow
          id="slider-accel"
          label="Acceleration Limit"
          value={config.accelerationLimit}
          min={0.01}
          max={0.3}
          step={0.01}
          format={v => v.toFixed(2)}
          onChange={v => onConfigChange({ accelerationLimit: v })}
        />
      </div>

      {/* Simulated Player Config */}
      {mode === 'simulated' && (
        <div className="panel-section">
          <h3 className="panel-section-title">Simulated Player</h3>
          <SliderRow
            id="slider-player-speed"
            label="Base Speed"
            value={simulatorConfig.playerSpeed}
            min={0.001}
            max={0.015}
            step={0.001}
            format={v => (v * 1000).toFixed(0)}
            onChange={v => onSimulatorConfigChange({ playerSpeed: v })}
          />
          <SliderRow
            id="slider-player-variation"
            label="Speed Variation"
            value={simulatorConfig.speedVariation}
            min={0}
            max={0.005}
            step={0.0005}
            format={v => (v * 1000).toFixed(1)}
            onChange={v => onSimulatorConfigChange({ speedVariation: v })}
          />
          <SliderRow
            id="slider-player-pause"
            label="End Pause Duration"
            value={simulatorConfig.pauseDuration}
            min={0}
            max={100}
            step={5}
            format={v => `${v} frames`}
            onChange={v => onSimulatorConfigChange({ pauseDuration: v })}
          />
        </div>
      )}

      {/* Manual override */}
      <div className="panel-section">
        <h3 className="panel-section-title">Manual Override</h3>
        <div className="manual-btns">
          <button
            id="btn-manual-left"
            className="manual-btn"
            onMouseDown={() => onManualOverride('LEFT')}
            onMouseUp={() => onManualOverride(null)}
            onTouchStart={() => onManualOverride('LEFT')}
            onTouchEnd={() => onManualOverride(null)}
            disabled={emergencyActive}
          >
            ◀ LEFT
          </button>
          <button
            id="btn-manual-stop"
            className="manual-btn manual-stop"
            onMouseDown={() => onManualOverride('STOP')}
            onMouseUp={() => onManualOverride(null)}
            onTouchStart={() => onManualOverride('STOP')}
            onTouchEnd={() => onManualOverride(null)}
            disabled={emergencyActive}
          >
            ■ STOP
          </button>
          <button
            id="btn-manual-right"
            className="manual-btn"
            onMouseDown={() => onManualOverride('RIGHT')}
            onMouseUp={() => onManualOverride(null)}
            onTouchStart={() => onManualOverride('RIGHT')}
            onTouchEnd={() => onManualOverride(null)}
            disabled={emergencyActive}
          >
            RIGHT ▶
          </button>
        </div>
      </div>

      {/* Emergency stop */}
      <div className="panel-section">
        <button
          id="btn-emergency-stop"
          className={`emergency-btn ${emergencyActive ? 'active' : ''}`}
          onClick={onEmergencyStop}
        >
          {emergencyActive ? '🔴 EMERGENCY ACTIVE — Click to Clear' : '⚠ EMERGENCY STOP'}
        </button>
      </div>
    </div>
  );
};

export default ControlPanel;
