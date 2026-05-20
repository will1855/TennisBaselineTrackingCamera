import React from 'react';
import type { TargetState } from '../tracking/types';
import type { RailCommand, ControllerState } from '../control/types';

interface DebugPanelProps {
  targetState: TargetState;
  command: RailCommand;
  controllerState: ControllerState;
  carriagePosition: number;
}

interface ValueRowProps {
  label: string;
  value: string | number;
  highlight?: boolean;
  unit?: string;
}

const ValueRow: React.FC<ValueRowProps> = ({ label, value, highlight, unit }) => (
  <div className={`debug-row ${highlight ? 'debug-highlight' : ''}`}>
    <span className="debug-label">{label}</span>
    <span className="debug-value">
      {typeof value === 'number' ? value.toFixed(3) : value}
      {unit && <span className="debug-unit"> {unit}</span>}
    </span>
  </div>
);

function progressBar(value: number, color = '#50dc64') {
  return (
    <div className="debug-bar-wrap">
      <div
        className="debug-bar-fill"
        style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, background: color }}
      />
    </div>
  );
}

/**
 * DebugPanel
 *
 * Shows live numeric values for all system states:
 * tracker output, controller internals, and carriage position.
 */
const DebugPanel: React.FC<DebugPanelProps> = ({
  targetState,
  command,
  controllerState,
  carriagePosition,
}) => {
  const centreError = targetState.x - 0.5;

  return (
    <div className="debug-panel">
      <h3 className="panel-section-title">Live Values</h3>

      <div className="debug-section-label">TRACKER OUTPUT</div>
      <ValueRow label="targetX" value={targetState.x} unit="[0–1]" />
      {progressBar(targetState.x)}
      <ValueRow label="targetDetected" value={targetState.detected ? 'YES' : 'NO'} highlight={!targetState.detected} />
      <ValueRow label="confidence" value={targetState.confidence} />
      {progressBar(targetState.confidence, targetState.confidence > 0.5 ? '#50dc64' : '#e63946')}

      <div className="debug-section-label">CONTROLLER</div>
      <ValueRow label="centreError" value={centreError} unit="[−0.5…+0.5]" highlight={Math.abs(centreError) > 0.15} />
      <ValueRow label="smoothedError" value={controllerState.smoothedError} />
      <ValueRow label="command" value={`${command.direction}`} highlight={command.direction !== 'STOP'} />
      <ValueRow label="speed" value={command.speed} />
      {progressBar(command.speed, '#f4a261')}

      <div className="debug-section-label">RAIL</div>
      <ValueRow label="carriagePos" value={carriagePosition} unit="[0–1]" />
      {progressBar(carriagePosition, '#7b5ea7')}

      <div className="debug-section-label">OVERRIDES</div>
      <ValueRow
        label="manualOverride"
        value={controllerState.manualOverride ?? 'none'}
        highlight={controllerState.manualOverride !== null}
      />
      <ValueRow
        label="emergencyStop"
        value={controllerState.emergencyStop ? 'ACTIVE' : 'clear'}
        highlight={controllerState.emergencyStop}
      />
    </div>
  );
};

export default DebugPanel;
