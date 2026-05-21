import React, { useState, useEffect, useRef, useCallback } from 'react';
import './styles.css';

import { SimulatedTracker } from './tracking/SimulatedTracker';
import { ColorTracker } from './tracking/ColorTracker';
import type { TargetState, SimulatorConfig } from './tracking/types';
import { DEFAULT_TARGET_STATE, DEFAULT_SIMULATOR_CONFIG } from './tracking/types';

import { RailController } from './control/RailController';
import type { RailCommand, RailControllerConfig, ManualOverride, ControllerState } from './control/types';
import { DEFAULT_CONFIG } from './control/types';

import { MockHardwareAdapter } from './hardware/MockHardwareAdapter';
import { RailPhysics } from './simulation/RailPhysics';

import CameraView from './components/CameraView';
import RailSimulator from './components/RailSimulator';
import ControlPanel from './components/ControlPanel';
import CommandLog from './components/CommandLog';
import type { LogEntry } from './components/CommandLog';
import DebugPanel from './components/DebugPanel';
import SystemDiagram from './components/SystemDiagram';

type TrackingMode = 'simulated' | 'webcam';

let logIdCounter = 0;

function formatTimestamp(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
}

const App: React.FC = () => {
  // ─── Mode / running state ─────────────────────────────────────────────────
  const [mode, setMode] = useState<TrackingMode>('simulated');
  const [isRunning, setIsRunning] = useState(false);

  // ─── Live data ────────────────────────────────────────────────────────────
  const [targetState, setTargetState] = useState<TargetState>(DEFAULT_TARGET_STATE);
  const [command, setCommand] = useState<RailCommand>({ direction: 'STOP', speed: 0, reason: 'init' });
  const [controllerState, setControllerState] = useState<ControllerState>({
    lastCommand: { direction: 'STOP', speed: 0 },
    smoothedError: 0,
    currentSpeed: 0,
    manualOverride: null,
    emergencyStop: false,
  });
  const [carriagePosition, setCarriagePosition] = useState(0.5);
  const [velocity, setVelocity] = useState(0);
  const [simulatedPlayerX, setSimulatedPlayerX] = useState(0.5);

  // ─── Config ────────────────────────────────────────────────────────────────
  const [config, setConfig] = useState<RailControllerConfig>({ ...DEFAULT_CONFIG });
  const [simulatorConfig, setSimulatorConfig] = useState<SimulatorConfig>({ ...DEFAULT_SIMULATOR_CONFIG });

  // ─── Emergency stop ───────────────────────────────────────────────────────
  const [emergencyActive, setEmergencyActive] = useState(false);

  // ─── Command log ──────────────────────────────────────────────────────────
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const lastLoggedDir = useRef<string>('');
  const lastLoggedSpeed = useRef<number>(0);

  // ─── Refs for loop ────────────────────────────────────────────────────────
  const simTracker = useRef<SimulatedTracker | null>(null);
  const colorTracker = useRef<ColorTracker | null>(null);
  const controller = useRef<RailController>(new RailController(DEFAULT_CONFIG));
  const adapter = useRef<MockHardwareAdapter>(new MockHardwareAdapter());
  const physics = useRef<RailPhysics>(new RailPhysics(0.5, 0.018, 0.1));
  const rafRef = useRef<number>(0);
  const isRunningRef = useRef(false);
  const targetStateRef = useRef<TargetState>(DEFAULT_TARGET_STATE);
  const configRef = useRef<RailControllerConfig>({ ...DEFAULT_CONFIG });
  const simulatorConfigRef = useRef<SimulatorConfig>({ ...DEFAULT_SIMULATOR_CONFIG });

  // Keep refs in sync
  useEffect(() => { configRef.current = config; }, [config]);
  useEffect(() => { simulatorConfigRef.current = simulatorConfig; }, [simulatorConfig]);

  // ─── Command logging helper ───────────────────────────────────────────────
  const logCommand = useCallback((cmd: RailCommand, conf: number) => {
    // Only log if direction or speed changed meaningfully to avoid spam
    const speedDiff = Math.abs(cmd.speed - lastLoggedSpeed.current);
    if (cmd.direction === lastLoggedDir.current && speedDiff < 0.05) return;

    lastLoggedDir.current = cmd.direction;
    lastLoggedSpeed.current = cmd.speed;

    const entry: LogEntry = {
      id: ++logIdCounter,
      timestamp: formatTimestamp(),
      direction: cmd.direction,
      speed: cmd.speed,
      confidence: conf,
      reason: cmd.reason,
    };
    setLogEntries(prev => [...prev.slice(-19), entry]);
  }, []);

  // ─── Main animation loop ──────────────────────────────────────────────────
  const loop = useCallback(() => {
    if (!isRunningRef.current) return;

    // 1. Update tracker
    const tracker = mode === 'simulated' ? simTracker.current : colorTracker.current;
    if (tracker) {
      if (mode === 'simulated' && simTracker.current) {
        simTracker.current.updateConfig(simulatorConfigRef.current);
      }
      tracker.update(physics.current.position);
      const ts = tracker.getTargetState();
      targetStateRef.current = ts;
      setTargetState(ts);

      if (mode === 'simulated' && simTracker.current) {
        setSimulatedPlayerX(simTracker.current.absolutePlayerX);
      }
    }

    // 2. Compute command
    controller.current.updateConfig(configRef.current);
    const cmd = controller.current.compute(targetStateRef.current);
    setCommand(cmd);
    setControllerState(controller.current.getState());

    // 3. Send to adapter
    adapter.current.sendCommand(cmd);

    // 4. Physics tick
    physics.current.tick(cmd);
    setCarriagePosition(physics.current.position);
    setVelocity(physics.current.velocity);

    // 5. Log
    logCommand(cmd, targetStateRef.current.confidence);

    rafRef.current = requestAnimationFrame(loop);
  }, [mode, logCommand]);

  // ─── Start / Stop ──────────────────────────────────────────────────────────
  const handleStartStop = useCallback(async () => {
    if (isRunning) {
      // Stop
      isRunningRef.current = false;
      setIsRunning(false);
      cancelAnimationFrame(rafRef.current);
      simTracker.current?.stop();
      colorTracker.current?.stop();
      controller.current.reset();
      setCommand({ direction: 'STOP', speed: 0, reason: 'stopped' });
      setTargetState(DEFAULT_TARGET_STATE);
      setSimulatedPlayerX(0.5);
    } else {
      // Start
      controller.current = new RailController(config);

      if (mode === 'simulated') {
        simTracker.current = new SimulatedTracker(simulatorConfigRef.current);
        await simTracker.current.start();
        setSimulatedPlayerX(simTracker.current.absolutePlayerX);
      } else {
        colorTracker.current = new ColorTracker();
        try {
          await colorTracker.current.start();
        } catch (err) {
          alert(`Webcam access denied: ${err}`);
          return;
        }
      }

      isRunningRef.current = true;
      setIsRunning(true);
      rafRef.current = requestAnimationFrame(loop);
    }
  }, [isRunning, mode, config, loop]);

  // ─── Config change ────────────────────────────────────────────────────────
  const handleConfigChange = useCallback((partial: Partial<RailControllerConfig>) => {
    setConfig(prev => {
      const next = { ...prev, ...partial };
      controller.current.updateConfig(next);
      return next;
    });
  }, []);

  const handleSimulatorConfigChange = useCallback((partial: Partial<SimulatorConfig>) => {
    setSimulatorConfig(prev => {
      const next = { ...prev, ...partial };
      if (simTracker.current) {
        simTracker.current.updateConfig(next);
      }
      return next;
    });
  }, []);

  // ─── Manual override ──────────────────────────────────────────────────────
  const handleManualOverride = useCallback((override: ManualOverride) => {
    controller.current.setManualOverride(override);
    setControllerState(controller.current.getState());
  }, []);

  // ─── Emergency stop ───────────────────────────────────────────────────────
  const handleEmergencyStop = useCallback(() => {
    if (emergencyActive) {
      // Clear emergency stop
      controller.current.setEmergencyStop(false);
      setEmergencyActive(false);
    } else {
      // Activate emergency stop
      controller.current.setEmergencyStop(true);
      setEmergencyActive(true);
      setCommand({ direction: 'STOP', speed: 0, reason: 'EMERGENCY_STOP' });
    }
  }, [emergencyActive]);

  // ─── Cleanup on unmount ───────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      isRunningRef.current = false;
      cancelAnimationFrame(rafRef.current);
      simTracker.current?.stop();
      colorTracker.current?.stop();
    };
  }, []);

  // ─── Restart loop when loop fn changes ───────────────────────────────────
  useEffect(() => {
    if (isRunningRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(loop);
    }
  }, [loop]);

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-brand">
          <span className="header-icon">🎾</span>
          <div>
            <h1 className="header-title">CourtSide Camera Tracker</h1>
            <p className="header-subtitle">Baseline Rail — Proof of Concept Demo</p>
          </div>
        </div>
        <div className="header-status">
          <span className={`status-dot ${isRunning ? 'running' : ''} ${emergencyActive ? 'emergency' : ''}`} />
          <span className="status-label">
            {emergencyActive ? 'EMERGENCY STOP' : isRunning ? `TRACKING · ${mode}` : 'IDLE'}
          </span>
        </div>
      </header>

      {/* System Diagram */}
      <SystemDiagram />

      {/* Main grid */}
      <main className="app-main">
        {/* Left column: Camera / Simulated view */}
        <section className="col-left">
          <div className="section-card">
            <div className="card-title">
              {mode === 'webcam' ? '📷 Webcam Feed' : '🎾 Court Simulation'}
            </div>
            {mode === 'webcam' ? (
              <CameraView
                tracker={colorTracker.current}
                isActive={isRunning}
                targetState={targetState}
              />
            ) : (
              <CourtView
                targetState={targetState}
                isRunning={isRunning}
                absolutePlayerX={mode === 'simulated' ? simulatedPlayerX : targetState.x}
              />
            )}
          </div>

          {/* Rail Simulator */}
          <div className="section-card">
            <RailSimulator
              carriagePosition={carriagePosition}
              targetX={mode === 'simulated' ? simulatedPlayerX : carriagePosition + (targetState.x - 0.5)}
              command={command}
              velocity={velocity}
            />
          </div>
        </section>

        {/* Right column: Controls + Debug + Log */}
        <section className="col-right">
          <div className="section-card">
            <ControlPanel
              mode={mode}
              onModeChange={setMode}
              isRunning={isRunning}
              onStartStop={handleStartStop}
              config={config}
              onConfigChange={handleConfigChange}
              onManualOverride={handleManualOverride}
              onEmergencyStop={handleEmergencyStop}
              emergencyActive={emergencyActive}
              simulatorConfig={simulatorConfig}
              onSimulatorConfigChange={handleSimulatorConfigChange}
            />
          </div>

          <div className="section-card">
            <DebugPanel
              targetState={targetState}
              command={command}
              controllerState={controllerState}
              carriagePosition={carriagePosition}
            />
          </div>

          <div className="section-card">
            <CommandLog entries={logEntries} />
          </div>
        </section>
      </main>
    </div>
  );
};

// ── Inline court simulation view ──────────────────────────────────────────────

interface CourtViewProps {
  targetState: TargetState;
  isRunning: boolean;
  absolutePlayerX: number;
}

const CourtView: React.FC<CourtViewProps> = ({ targetState, isRunning, absolutePlayerX }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const stateRef = useRef(targetState);
  stateRef.current = targetState;

  const absolutePlayerXRef = useRef(absolutePlayerX);
  absolutePlayerXRef.current = absolutePlayerX;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const draw = () => {
      const ctx = canvas.getContext('2d')!;
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // Sky / backdrop
      const sky = ctx.createLinearGradient(0, 0, 0, H * 0.4);
      sky.addColorStop(0, '#0a1628');
      sky.addColorStop(1, '#1a2a3a');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H * 0.4);

      // Court surface
      const court = ctx.createLinearGradient(0, H * 0.35, 0, H);
      court.addColorStop(0, '#2d5a27');
      court.addColorStop(0.3, '#3a7a32');
      court.addColorStop(1, '#2a5020');
      ctx.fillStyle = court;
      ctx.fillRect(0, H * 0.35, W, H * 0.65);

      // Court lines (perspective-ish)
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 1.5;

      // Baseline (near)
      ctx.beginPath();
      ctx.moveTo(W * 0.08, H * 0.88);
      ctx.lineTo(W * 0.92, H * 0.88);
      ctx.stroke();

      // Baseline (far)
      ctx.beginPath();
      ctx.moveTo(W * 0.22, H * 0.50);
      ctx.lineTo(W * 0.78, H * 0.50);
      ctx.stroke();

      // Side lines
      ctx.beginPath();
      ctx.moveTo(W * 0.08, H * 0.88);
      ctx.lineTo(W * 0.22, H * 0.50);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(W * 0.92, H * 0.88);
      ctx.lineTo(W * 0.78, H * 0.50);
      ctx.stroke();

      // Centre service line
      ctx.beginPath();
      ctx.moveTo(W * 0.5, H * 0.88);
      ctx.lineTo(W * 0.5, H * 0.50);
      ctx.stroke();

      // Net
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(W * 0.15, H * 0.70);
      ctx.lineTo(W * 0.85, H * 0.70);
      ctx.stroke();

      // Net post left
      ctx.strokeStyle = 'rgba(200,200,200,0.6)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(W * 0.15, H * 0.60);
      ctx.lineTo(W * 0.15, H * 0.70);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(W * 0.85, H * 0.60);
      ctx.lineTo(W * 0.85, H * 0.70);
      ctx.stroke();

      // Player
      const ts = stateRef.current;
      const px = W * 0.08 + absolutePlayerXRef.current * (W * 0.84);
      const py = H * 0.82;

      if (isRunning) {
        // Player shadow
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.ellipse(px, py + 14, 12, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Body
        ctx.fillStyle = '#e8e8ff';
        ctx.beginPath();
        ctx.roundRect(px - 7, py - 28, 14, 28, 4);
        ctx.fill();

        // Shorts
        ctx.fillStyle = '#f4a261';
        ctx.fillRect(px - 7, py - 10, 14, 12);

        // Head
        ctx.fillStyle = '#f5cba7';
        ctx.beginPath();
        ctx.arc(px, py - 34, 8, 0, Math.PI * 2);
        ctx.fill();

        // Confidence ring
        ctx.strokeStyle = `rgba(80,220,100,${ts.confidence})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px, py - 18, 22, 0, Math.PI * 2);
        ctx.stroke();

        // Target X line
        ctx.strokeStyle = 'rgba(244,162,97,0.5)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(px, H * 0.88);
        ctx.lineTo(px, H);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Camera position indicator at bottom
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(0, H * 0.93, W, H * 0.07);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('📱 Camera Rail Position (see simulator below)', W / 2, H * 0.975);

      if (!isRunning) {
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(0, 0, W, H * 0.93);
        ctx.fillStyle = '#50dc64';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Press ▶ Start Tracking', W / 2, H * 0.48);
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '12px sans-serif';
        ctx.fillText('Simulated mode — no webcam needed', W / 2, H * 0.54);
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    draw();

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [isRunning]);

  return <canvas ref={canvasRef} className="court-canvas" />;
};

export default App;
