# MARS-X | AI Gesture-Controlled Rover

A vision-based mission-control web application that lets you pilot a simulated Mars rover in real time using webcam hand gestures. Computer vision inference runs entirely inside the browser using WebAssembly, with no server-side Python or GPU streaming required.

The application also includes an ESP32 hardware bridge interface with a live JSON telemetry stream and ready-to-flash Arduino C++ firmware, designed for future integration with a physical rover.

---

## Overview

Traditional robotics interfaces typically rely on physical joysticks, gamepads, or on-screen directional buttons. MARS-X explores touchless human-robot interaction (HRI) by capturing hand gestures directly from a standard webcam, extracting 21 three-dimensional skeletal landmarks, classifying the hand pose, and translating it into rover kinematics.

The project is built as a self-contained single-page application (SPA). Everything runs client-side: video acquisition, hand landmark estimation, gesture classification, temporal smoothing, and the physics simulation canvas.

---

## Key Features

- **In-Browser Computer Vision**: Real-time hand landmark tracking powered by `@mediapipe/tasks-vision` running on local WebAssembly.
- **Mirrored Selfie Feed**: Displays live webcam input with a horizontal mirror (`scaleX(-1)`) so steering gestures match natural hand movement.
- **21-Point Skeletal HUD**: Dynamic HTML5 canvas overlay rendering bone connections, joint nodes, confidence metrics, and FPS tracking.
- **Robust Gesture Classification**: Decoupled geometric rule engine that identifies 7 distinct hand poses and filters out tracking jitter using a majority-voting smoothing window.
- **Jezero Crater 2D Simulation Arena**: Interactive canvas-based Martian terrain featuring rocker-bogie 6-wheel physics, headlight illumination, obstacle collision bounds (craters and boulders), 360° LiDAR sweeps, and core sample extraction.
- **Synthetic Test Mode**: Built-in virtual gesture player that simulates landmark points and gesture cycles for testing in environments without an active camera.
- **ESP32 Hardware Bridge**: Client-side connection panel with Web Serial API and WebSocket support, real-time JSON payload inspector, and Arduino firmware documentation.
- **Flight Telemetry & Audio Synthesis**: Live terminal log with category filtering, real-time vehicle stats (heading, velocity, RPM, battery, grid coordinates), and procedural Web Audio API telemetry sound effects.

---

## Supported Gestures & Rover Commands

Hand poses are evaluated against the 21 MediaPipe landmarks. The classifier calculates relative Euclidean distances between fingertips, metacarpal joints, and the wrist to determine finger extension and pointing vectors.

| Hand Gesture | Visual Description | Dispatched Command | Rover Kinematic Action |
| :--- | :--- | :--- | :--- |
| **Open Palm** | All 5 fingers outstretched facing camera | `STOP` | Immediate deceleration and dynamic braking |
| **Point Up** | Index extended upward, other fingers curled | `FORWARD` | Forward thrust at nominal throttle |
| **Point Left** | Index pointing horizontally towards screen left | `STEER_LEFT` | Counter-clockwise turn while maintaining forward velocity |
| **Point Right** | Index pointing horizontally towards screen right | `STEER_RIGHT` | Clockwise turn while maintaining forward velocity |
| **Closed Fist** | All 4 fingers curled tightly into palm | `REVERSE` | Reverse propulsion at controlled speed |
| **Peace / V-Sign** | Index and middle extended in a V, others curled | `SCAN_360` | Rover pivots in place with rotating Pancam mast and LiDAR beam |
| **Pinch / OK** | Thumb tip touching index tip in open space | `DRILL_SAMPLE` | Deploys robotic arm to drill and analyze nearby rock specimens |

### How Left and Right Steering Are Determined

Because the user faces their webcam in a mirrored selfie configuration, the video and overlay canvas are horizontally inverted. 

To determine steering direction:
1. The classifier computes the directional vector between the index finger Proximal Interphalangeal joint (`landmark[6]`) and the index tip (`landmark[8]`):
   $$\Delta x = x_{\text{tip}} - x_{\text{pip}}, \quad \Delta y = y_{\text{tip}} - y_{\text{pip}}$$
2. The vector is normalized: $n_x = \frac{\Delta x}{\sqrt{\Delta x^2 + \Delta y^2}}$.
3. In canvas coordinates where 0 is left and 1 is right:
   - When pointing towards the user's left on screen ($n_x < -0.55$), `POINT_LEFT` is triggered.
   - When pointing towards the user's right on screen ($n_x > 0.55$), `POINT_RIGHT` is triggered.
   - When pointing predominantly towards the top of the screen ($n_y < -0.55$), `POINT_UP` is triggered.

### Gesture Smoothing & Jitter Reduction

Raw per-frame computer vision predictions can flicker due to motion blur or minor occlusion. To stabilize commands, predictions pass through a `GestureSmoother` buffer:
- A rolling window of recent gesture classifications (default size: 4–5 frames) is maintained.
- A gesture is only emitted when it holds a strict majority in the buffer.
- When no hand is detected, the smoother falls back to `NONE`, which safely dispatches a `STOP` command to the rover.

---

## Technology Stack

### Frontend & Vision
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 8
- **Styling**: Tailwind CSS v4
- **Computer Vision**: `@mediapipe/tasks-vision` (HandLandmarker task model)
- **Icons**: Lucide React
- **Audio**: Web Audio API (procedural oscillator and gain envelope synthesis)

### Testing & Tooling
- **Unit Testing**: Node.js built-in test runner (`node:test`, `node:assert/strict`) executed via `tsx`
- **Compiler**: TypeScript (`tsc --noEmit`)
- **Linting & Formatting**: TypeScript compiler checks

---

## System Architecture

```
                      +-----------------------------+
                      |   User Webcam / MediaStream  |
                      +--------------+--------------+
                                     |
                                     v
                      +-----------------------------+
                      |  MediaPipe Hand Landmarker  |
                      |   (21 3D Landmarks / WASM)  |
                      +--------------+--------------+
                                     |
                                     v
                      +-----------------------------+
                      |    gestureClassifier.ts     |
                      |   - Finger Extension Logic  |
                      |   - Pointing Vector Angle   |
                      |   - Pinch Distance Metric   |
                      +--------------+--------------+
                                     |
                                     v
                      +-----------------------------+
                      |      GestureSmoother        |
                      |   (Majority Voting Window)  |
                      +--------------+--------------+
                                     |
                   +-----------------+-----------------+
                   |                                   |
                   v                                   v
+------------------------------------+   +------------------------------------+
|        RoverSimulationPanel        |   |         Esp32HardwareModal         |
|  - 2D Canvas Physics Engine        |   |  - Web Serial (navigator.serial)   |
|  - 6-Wheel Rocker-Bogie Kinematics |   |  - WebSocket Client (ws://)        |
|  - Obstacle Collision Bounds       |   |  - Live JSON Payload Serialization |
|  - Sample Drilling & 360 Scan      |   |  - Hardware Safety Interlock       |
+------------------------------------+   +------------------------------------+
```

---

## Directory Structure

```
mars-rover-gesture-control/
├── .env.example              # Environment variables template
├── index.html                # Entry HTML with custom aerospace fonts
├── metadata.json             # Applet metadata and permission declarations
├── package.json              # Project dependencies, metadata, and scripts
├── tsconfig.json             # TypeScript configuration
├── vite.config.ts            # Vite build configuration with Tailwind plugin
└── src/
    ├── main.tsx              # React DOM root entry point
    ├── App.tsx               # Main dashboard component and global state
    ├── index.css             # Tailwind CSS entry with custom font declarations
    ├── types/
    │   └── rover.ts          # TypeScript interfaces (gestures, telemetry, logs, ESP32)
    ├── components/
    │   ├── Header.tsx                # Aerospace navigation bar and system status indicators
    │   ├── WebcamVisionPanel.tsx     # Webcam video, MediaPipe landmarker, canvas HUD overlay
    │   ├── RoverSimulationPanel.tsx  # Martian canvas simulator, physics loop, rover rendering
    │   ├── GestureReferenceCard.tsx  # Gesture cheat-sheet and manual test triggers
    │   ├── TelemetryFeed.tsx         # Timestamped flight logs and vehicle metrics bar
    │   └── Esp32HardwareModal.tsx    # Hardware connection settings, payload preview, Arduino code
    └── utils/
        ├── gestureClassifier.ts      # Pure math/logic for landmark classification & smoothing
        ├── gestureClassifier.test.ts # Unit tests for gesture recognition algorithms
        ├── roverPhysics.ts           # Kinematics, collision detection, and terrain state
        ├── roverPhysics.test.ts      # Unit tests for rover motion and simulation events
        └── soundEffects.ts           # Web Audio API sound generator for flight telemetry
```

---

## Installation & Setup

### Prerequisites
- Node.js (v18.x or later recommended)
- A modern web browser with WebAssembly support (Chrome, Edge, Firefox, or Safari)
- A connected USB or integrated webcam

### Installation Steps

1. Clone or download the repository:
   ```bash
   git clone https://github.com/your-username/mars-x-rover-gesture-control.git
   cd mars-x-rover-gesture-control
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. (Optional) Set up environment variables if deploying with custom services:
   ```bash
   cp .env.example .env
   ```

---

## Available Commands

The following scripts are defined in `package.json`:

| Command | Action |
| :--- | :--- |
| `npm run dev` | Starts the local Vite development server on `http://localhost:3000` |
| `npm run build` | Compiles and bundles production assets into `dist/` |
| `npm run preview` | Runs a local static server to preview production build artifacts |
| `npm run lint` | Type-checks all TypeScript files via `tsc --noEmit` |
| `npm run clean` | Removes compiled distribution directories (`dist/`, `server.js`) |

### Running Unit Tests

Unit tests are written using Node's native test runner (`node:test`) and executed through `tsx`:

```bash
npx --yes tsx --test src/utils/gestureClassifier.test.ts src/utils/roverPhysics.test.ts
```

---

## How to Use the System

1. **Launch the Application**: Run `npm run dev` and open `http://localhost:3000`.
2. **Start Camera**: Click **Start Camera** in the top navigation bar or the vision panel. When prompted by the browser, grant camera access.
3. **Position Your Hand**:
   - Hold one hand approximately 1.5 to 2.5 feet (45–75 cm) in front of the lens.
   - Ensure the hand is well-lit and facing the camera with the palm toward you.
4. **Trigger Rover Movements**:
   - Point your index finger upward to drive **Forward**.
   - Point left or right to **Steer**.
   - Curl your hand into a clenched fist to drive in **Reverse**.
   - Open all 5 fingers to execute an immediate **Emergency Stop**.
   - Raise index and middle fingers in a V-sign for a **360° LiDAR Scan**.
   - Pinch thumb and index tips together to activate the **Sample Core Drill**.
5. **Synthetic / Offline Testing**:
   - If a webcam is unavailable or permissions are denied, click **Synthetic Feed** in the header or use the **Quick Test** buttons. The application will render virtual hand landmarks and cycle through gestures automatically.
   - You can also navigate directly to `http://localhost:3000/?autostart=1` to launch synthetic simulation mode immediately.
6. **Manual Keyboard Overrides**:
   - You can override gesture inputs at any time using the keyboard: `[W]` Forward, `[A]` Steer Left, `[D]` Steer Right, `[S]` Reverse, `[Space]` Stop, `[P]` Drill, `[V]` Scan.

---

## Rover Simulation Engine

The simulation panel models an exploratory rover traversing the Jezero Crater regolith:
- **Kinematic Model**: Calculates displacement vectors using heading angle $\theta$ and speed $v$:
  $$x_{t+\Delta t} = x_t + v \cos(\theta) \Delta t, \quad y_{t+\Delta t} = y_t + v \sin(\theta) \Delta t$$
- **Turning**: Steering commands modify heading at $65^\circ/\text{second}$.
- **Obstacle Boundaries**: Circular hitboxes represent craters and basalt boulders. If a rover enters an obstacle's danger radius, momentum is halted and a proximity alert sounds.
- **Science Missions**: Four scientific targets are positioned across the map. Approaching within 70 pixels and executing the **Pinch** gesture engages the rock drill and collects sample specimens.
- **Visual Effects**: Headlight light cones, wheel tread tracks, robotic arm extension, and radial radar sweep lines rendered at up to 60 FPS.

---

## ESP32 Hardware Integration

The web application is designed to act as a teleoperation ground station for a physical ESP32-based rover.

### Current Implementation Status
- **Simulation Interlock**: By default, physical hardware dispatch is disarmed (`SIMULATION MODE`). Hardware commands are kept safe in the browser sandbox until an explicit connection handshake occurs.
- **Web Serial API**: In supported browsers (Chrome, Edge), clicking **Connect Physical Rover** under Web Serial prompts `navigator.serial.requestPort()` at configurable baud rates (e.g., 115200 bps).
- **WebSocket Protocol**: Supports direct communication with an ESP32 hosting an asynchronous WebSocket server on a local network (`ws://192.168.4.1:81`).
- **Telemetry Payload**: Whenever a gesture changes, the ground station serializes the command into JSON and raw UART formats:

```json
{
  "header": "MRSX_ESP32",
  "timestamp": 1730016073881,
  "command": "FORWARD",
  "speed": 180,
  "steer": 0,
  "armAction": "IDLE",
  "scanMode": false
}
```

Raw Serial Stream Format:
```text
FORWARD:180:0\n
```

### ESP32 Firmware Sketch & Pinout
The modal provides a complete, copyable C++ sketch using the `WebSocketsServer` and `ArduinoJson` libraries for an ESP32 connected to an L298N/TB6612 dual H-Bridge motor driver:
- **Left Motors**: GPIO 25 (ENA), GPIO 26 (IN1), GPIO 27 (IN2)
- **Right Motors**: GPIO 14 (ENB), GPIO 12 (IN3), GPIO 13 (IN4)
- **Drill Servo**: GPIO 18 (PWM)

*Note: The physical robot connection requires matching local network configurations. Browser security restricts mixed content if running the client on HTTPS while attempting insecure WebSocket (`ws://`) connections to local IP addresses.*

---

## Verification & Testing Summary

All pure business logic, kinematics, and gesture classification functions were decoupled and verified with automated unit tests before browser deployment:

- **Unit Tests**: **16/16 tests passing** via `node:test` (`src/utils/gestureClassifier.test.ts` and `src/utils/roverPhysics.test.ts`).
  - Correct classification of `OPEN_PALM`, `FIST`, `POINT_UP`, `POINT_LEFT`, `POINT_RIGHT`, `VICTORY`, and `PINCH`.
  - Disambiguation between tightly balled fists and in-air pinch poses.
  - Multi-frame rolling buffer smoothing and threshold evaluation.
  - Heading displacement math, angular turn rates, dynamic braking, and obstacle bounds checks.
  - ESP32 payload structure and serialization verification.
- **Type Checking**: Clean compilation with zero TypeScript errors (`tsc --noEmit`).
- **Browser Visual Verification**: Tested via headless Chromium at 1440 × 900 (Desktop) and 390 × 844 (Mobile). Responsive adjustments ensure HUD text and control buttons scale cleanly without layout shifts or text wrapping.

---

## Known Limitations

1. **Lighting & Occlusion**: MediaPipe hand landmark detection depends on camera clarity and consistent lighting. Very dark rooms or hands positioned edge-on to the camera may degrade tracking confidence.
2. **Web Serial Browser Support**: The Web Serial API is supported in Chromium-based browsers (Chrome, Edge, Opera) but is not supported in Safari or Firefox. Use WebSocket mode on non-Chromium browsers.
3. **Single Hand Tracking**: The vision model is configured to detect 1 hand at a time (`numHands: 1`) to optimize frame rates and reduce CPU load on lower-powered devices.
4. **Mixed-Content Restrictions**: Connecting to a local unencrypted ESP32 (`ws://192.168.x.x`) from a hosted HTTPS origin may be blocked by browser mixed-content policies unless running locally over HTTP or with an SSL certificate.

---

## Future Improvements

- Add support for two-handed dual-stick tank steering (left hand for throttle, right hand for steering angle).
- Integrate WebRTC peer-to-peer video streaming to display a live first-person camera feed mounted directly on the rover chassis.
- Implement an automated path-recording and waypoint-playback module.
- Add Web Bluetooth (BLE) as an additional wireless hardware connection protocol.

---

## License

This project is licensed under the [Apache License 2.0](LICENSE) as indicated in the source headers.
