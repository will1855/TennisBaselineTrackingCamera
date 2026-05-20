# CourtSide Camera Tracker — Baseline Rail Demo

> **Status:** v1 proof-of-concept · browser-only · no hardware required

---

## What This Demo Proves

This is a **modular browser-based software demo** for a portable tennis baseline camera rail system.

A motorised rail sits at the back of a tennis court (~1m high). A phone mounted on the carriage films the match. The app tracks the player and sends left/right/stop commands so the carriage follows them automatically.

This v1 demo proves the core software pipeline works end-to-end:

```
Tracker → RailController → HardwareAdapter → RailSimulator
```

Specifically:
- A tracker can output a normalised `TargetState` (x, y, confidence, detected)
- The `RailController` converts that into a `RailCommand` (LEFT / RIGHT / STOP + speed) with dead zone, smoothing, acceleration limits, and fail-safes
- The `MockHardwareAdapter` receives commands (ready to be swapped for real hardware)
- The `RailPhysics` simulation renders a realistic carriage response

---

## How to Run

```bash
# Install dependencies
npm install

# Start the dev server (opens at http://localhost:5173)
npm run dev

# Run unit tests (RailController algorithm)
npm run test

# Watch mode (re-runs on file change)
npm run test:watch
```

---

## Architecture

### Data Flow

```
┌─────────────┐    TargetState     ┌──────────────────┐    RailCommand    ┌─────────────────────┐    sendCommand()    ┌─────────────┐
│   Tracker   │ ─────────────────► │  RailController  │ ────────────────► │  HardwareAdapter    │ ──────────────────► │    Rail     │
│             │    x, y, conf,     │                  │  dir, speed,      │                     │                     │             │
│ Simulated / │    detected        │  Dead zone       │  reason           │  Mock (v1)          │                     │ RailPhysics │
│ ColorTracker│                    │  Smoothing (EMA) │                   │  Bluetooth (future) │                     │ simulation  │
└─────────────┘                    │  Accel limit     │                   │  Serial (future)    │                     └─────────────┘
                                   │  Max speed       │                   └─────────────────────┘
                                   │  Lost tracking   │
                                   │  Emergency stop  │
                                   │  Manual override │
                                   └──────────────────┘
```

### Module Structure

```
src/
├── App.tsx                     Main application, animation loop, state wiring
├── main.tsx                    React entry point
├── styles.css                  Full dark UI stylesheet

├── tracking/
│   ├── types.ts                TargetState interface, ITracker interface
│   ├── Tracker.ts              Abstract base class
│   ├── SimulatedTracker.ts     Tennis player movement simulation (no webcam)
│   ├── ColorTracker.ts         Webcam colour blob tracker (getUserMedia + Canvas)
│   ├── MediaPipeTracker.stub.ts  Future: pose estimation (see comments)
│   ├── OpenCVTracker.stub.ts     Future: CV-based tracking (see comments)
│   └── index.ts                Barrel export

├── control/
│   ├── types.ts                RailCommand, RailControllerConfig types
│   ├── RailController.ts       Core control algorithm
│   └── RailController.test.ts  12 Vitest unit tests

├── hardware/
│   ├── types.ts                IHardwareAdapter interface
│   ├── HardwareAdapter.ts      Factory / barrel export
│   ├── MockHardwareAdapter.ts  Logs commands, fires UI callbacks
│   ├── FutureBluetoothAdapter.stub.ts  Future: Web Bluetooth → ESP32
│   └── FutureSerialAdapter.stub.ts     Future: Web Serial → ESP32

├── simulation/
│   └── RailPhysics.ts          Velocity/inertia/friction carriage simulation

└── components/
    ├── CameraView.tsx          Webcam feed + click-to-pick overlay
    ├── RailSimulator.tsx       Canvas rail + carriage visualisation
    ├── ControlPanel.tsx        Mode selector, sliders, manual buttons
    ├── CommandLog.tsx          Timestamped command history
    ├── DebugPanel.tsx          Live numeric values + progress bars
    └── SystemDiagram.tsx       Animated pipeline diagram
```

### Key Types

```ts
// Tracker output — normalised 0–1 coordinates
interface TargetState {
  x: number;          // 0 = left edge, 1 = right edge of frame
  y: number;          // 0 = top, 1 = bottom
  confidence: number; // 0 = no signal, 1 = fully confident
  detected: boolean;  // true only when tracker has a valid lock
}

// Command sent to hardware
interface RailCommand {
  direction: 'LEFT' | 'RIGHT' | 'STOP';
  speed: number;      // 0 to 1
  reason?: string;    // e.g. 'DEAD_ZONE', 'LOST_TRACKING', 'EMERGENCY_STOP'
}
```

### RailController Algorithm

| Priority | Condition | Output |
|----------|-----------|--------|
| 1 | Emergency stop active | STOP speed=0 |
| 2 | Manual override set | Override direction |
| 3 | confidence < threshold OR !detected | STOP (lost tracking fail-safe) |
| 4 | \|error\| < dead zone | STOP (dead zone) |
| 5 | Normal tracking | LEFT or RIGHT, proportional speed with EMA smoothing + acceleration limiting |

---

## Why v1 Does Not Use OpenCV or MediaPipe

Both are excellent tools, but they add unnecessary complexity at this stage:

| Concern | Reason |
|---------|--------|
| **Bundle size** | OpenCV.js is ~8MB; MediaPipe models are 10–30MB |
| **Setup friction** | WASM loading, CORS, model file hosting |
| **v1 goal** | Prove the *control algorithm and hardware interface* work — not the tracker |
| **Swap-in design** | The `ITracker` interface means any tracker can replace `ColorTracker` later |

The stub files (`MediaPipeTracker.stub.ts`, `OpenCVTracker.stub.ts`) document exactly how to integrate each library when the time comes.

---

## Tracking Mode Details

### Simulated Mode
- No webcam permission needed — works instantly
- Simulates a player moving back and forth along the baseline
- Player pauses at each side (rally simulation), varies speed
- Confidence ~0.9–1.0

### Webcam Colour Tracking Mode
- Uses `getUserMedia` to access the rear or front camera
- User clicks/taps a colour in the live feed to lock onto
- Canvas 2D pixel processing finds the largest matching colour blob using HSV distance
- Confidence drops if the blob is small or disappears → controller stops safely

---

## Control Algorithm Parameters

| Parameter | Default | Effect |
|-----------|---------|--------|
| Dead zone | 5% | Ignore small tracking noise near centre |
| Smoothing (EMA α) | 0.15 | Lower = more stable but slower response |
| Max speed | 80% | Cap motor speed |
| Acceleration limit | 0.08/tick | Prevents jerky start/stop |
| Confidence threshold | 0.30 | Below this → stop (lost tracking) |

---

## Next Steps

### Short term (v2)
- Replace `ColorTracker` with **MediaPipe Pose Landmarker** for robust player detection
- Use hip midpoint landmark for precise baseline position
- Test tracking accuracy and smoothness with recorded match footage

### Hardware prototype (v3)
- Build a **short physical rail** (1–2m) with a stepper or DC motor + encoder
- Flash **ESP32** firmware that receives 2-byte motor commands over BLE or USB Serial
- Connect using `FutureBluetoothAdapter.stub.ts` or `FutureSerialAdapter.stub.ts` (both have implementation guides in comments)
- Measure latency: tracker frame → command → motor response

### Full product
- Mount on a full-length baseline rail (10–12m)
- Add mechanical end-stops with limit switches
- Weatherproof enclosure
- Battery power
- Auto-calibration (detect court lines to set rail bounds)

---

## Test Coverage

```
src/control/RailController.test.ts  (12 tests)

✓ target centred should STOP
✓ target left of centre should command LEFT
✓ target right of centre should command RIGHT
✓ low confidence should STOP
✓ detected=false should STOP
✓ speed should increase as error increases
✓ speed should not exceed maxSpeed
✓ target within dead zone should STOP
✓ target just outside dead zone should move
✓ emergency stop should STOP regardless of target
✓ manual LEFT override should command LEFT
✓ manual override cleared → control resumes
```

---

## Tech Stack

| Tool | Purpose |
|------|---------|
| Vite | Build tool and dev server |
| React 19 | UI framework |
| TypeScript | Type safety across all modules |
| Canvas 2D API | Court view, rail simulator, colour tracking |
| getUserMedia | Webcam access |
| requestAnimationFrame | 60fps animation loop |
| Vitest | Unit tests |
| Plain CSS | Styling (no frameworks) |

---

*Built as a modular proof-of-concept. Every module is designed to be replaced or upgraded independently.*
