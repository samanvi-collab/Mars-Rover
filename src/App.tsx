/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { WebcamVisionPanel } from './components/WebcamVisionPanel';
import { RoverSimulationPanel } from './components/RoverSimulationPanel';
import { TelemetryFeed } from './components/TelemetryFeed';
import { GestureReferenceCard } from './components/GestureReferenceCard';
import { Esp32HardwareModal } from './components/Esp32HardwareModal';
import {
  GestureType,
  RoverCommand,
  GestureDetectionResult,
  RoverTelemetry,
  MissionLogEntry,
} from './types/rover';
import { mapGestureToCommand } from './utils/gestureClassifier';
import { soundManager } from './utils/soundEffects';

export default function App() {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isTestFeedActive, setIsTestFeedActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isHardwareModalOpen, setIsHardwareModalOpen] = useState(false);

  const [activeGesture, setActiveGesture] = useState<GestureType>('NONE');
  const [activeCommand, setActiveCommand] = useState<RoverCommand>('STOP');
  const [confidence, setConfidence] = useState<number>(0);

  const [telemetry, setTelemetry] = useState<RoverTelemetry>({
    x: 400,
    y: 300,
    heading: 90,
    speed: 0,
    throttle: 0,
    wheelRPM: 0,
    steerAngle: 0,
    batteryPercent: 98,
    coreTempC: 18.5,
    signalLatencyMs: 14,
    samplesCollected: 0,
    isScanning: false,
    isDrilling: false,
    drillProgress: 0,
    headlightsOn: true,
    hazardWarning: null,
  });

  const [logs, setLogs] = useState<MissionLogEntry[]>([
    {
      id: 'log-0',
      timestamp: new Date().toLocaleTimeString(),
      type: 'SYSTEM',
      message: 'MARS-X Mission Control online. Jezero Crater grid coordinates synchronized.',
    },
    {
      id: 'log-1',
      timestamp: new Date().toLocaleTimeString(),
      type: 'SYSTEM',
      message: 'Vision Landmarker loaded. Local WASM inference active.',
    },
  ]);

  // Support ?autostart=1 or ?synthetic=1 for headless testing & automated tours
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1' || params.get('synthetic') === '1') {
        setIsTestFeedActive(true);
      }
    }
  }, []);

  const addLog = useCallback(
    (type: 'COMMAND' | 'GESTURE' | 'HAZARD' | 'SAMPLE' | 'SYSTEM', message: string) => {
      setLogs(prev => [
        {
          id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          timestamp: new Date().toLocaleTimeString(),
          type,
          message,
        },
        ...prev.slice(0, 50),
      ]);
    },
    []
  );

  // Handle detection from webcam
  const handleGestureDetected = useCallback(
    (result: GestureDetectionResult) => {
      setActiveGesture(result.gesture);
      setActiveCommand(result.command);
      setConfidence(result.confidence);

      if (result.gesture !== 'NONE') {
        // Log gesture changes
        setLogs(prev => {
          if (prev[0]?.message.includes(result.gesture)) return prev;
          return [
            {
              id: `log-${Date.now()}`,
              timestamp: new Date().toLocaleTimeString(),
              type: 'GESTURE',
              message: `Hand pose: ${result.gesture} (${Math.round(result.confidence * 100)}%) -> Command: ${result.command}`,
            },
            ...prev.slice(0, 50),
          ];
        });
      }
    },
    []
  );

  // Manual gesture selector from UI cards
  const handleSelectSyntheticGesture = useCallback(
    (gesture: GestureType) => {
      const cmd = mapGestureToCommand(gesture);
      setActiveGesture(gesture);
      setActiveCommand(cmd);
      setConfidence(0.96);
      addLog('COMMAND', `Manual Gesture Override: ${gesture} -> Dispatched: ${cmd}`);
    },
    [addLog]
  );

  // Manual command trigger
  const handleManualCommand = useCallback(
    (cmd: RoverCommand) => {
      setActiveCommand(cmd);
      addLog('COMMAND', `Manual Flight Override: ${cmd}`);
    },
    [addLog]
  );

  // Camera start/stop toggle
  const handleToggleCamera = useCallback(() => {
    setIsCameraActive(prev => {
      const next = !prev;
      if (next) {
        setIsTestFeedActive(false);
        addLog('SYSTEM', 'Webcam pipeline requested. Initializing local video capture.');
      } else {
        addLog('SYSTEM', 'Webcam stream deactivated.');
        setActiveGesture('NONE');
        setActiveCommand('STOP');
      }
      return next;
    });
  }, [addLog]);

  // Synthetic feed toggle
  const handleToggleTestFeed = useCallback(() => {
    setIsTestFeedActive(prev => {
      const next = !prev;
      if (next) {
        setIsCameraActive(false);
        addLog('SYSTEM', 'Autonomous synthetic gesture feed activated.');
      } else {
        addLog('SYSTEM', 'Synthetic gesture feed paused.');
        setActiveGesture('NONE');
        setActiveCommand('STOP');
      }
      return next;
    });
  }, [addLog]);

  // Mute audio toggle
  const handleToggleMute = useCallback(() => {
    const isNowMuted = soundManager.toggleMute();
    setIsMuted(isNowMuted);
    addLog('SYSTEM', isNowMuted ? 'Telemetry sound muted.' : 'Telemetry sound unmuted.');
  }, [addLog]);

  return (
    <div className="min-h-screen bg-[#080B11] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/25">
      {/* Top Header */}
      <Header
        isCameraActive={isCameraActive}
        onToggleCamera={handleToggleCamera}
        isTestFeedActive={isTestFeedActive}
        onToggleTestFeed={handleToggleTestFeed}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        onOpenHardwareModal={() => setIsHardwareModalOpen(true)}
        isHardwareConnected={false}
      />

      {/* Main Mission Control Dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 lg:p-6 space-y-4 sm:space-y-5">
        {/* Top Split Panels: Vision Feed & Mars Rover Simulation Arena */}
        <section aria-label="Vision and Rover Simulation" className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">
          {/* Left: Computer Vision Panel */}
          <WebcamVisionPanel
            isCameraActive={isCameraActive}
            onStartCamera={() => {
              setIsCameraActive(true);
              setIsTestFeedActive(false);
            }}
            onStopCamera={() => {
              setIsCameraActive(false);
              setActiveCommand('STOP');
            }}
            isTestFeedActive={isTestFeedActive}
            onStartTestFeed={handleToggleTestFeed}
            onSelectSyntheticGesture={handleSelectSyntheticGesture}
            onGestureDetected={handleGestureDetected}
            activeCommand={activeCommand}
            activeGesture={activeGesture}
            confidence={confidence}
          />

          {/* Right: Mars Rover Simulation Panel */}
          <RoverSimulationPanel
            activeCommand={activeCommand}
            onManualCommand={handleManualCommand}
            onTelemetryUpdate={setTelemetry}
            onLogEvent={addLog}
          />
        </section>

        {/* Bottom Split Panels: Gesture Cheat Sheet & Flight Telemetry Log */}
        <section aria-label="Control Protocol and Flight Telemetry" className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5">
          {/* Left: Gesture Reference Cards (7 cols) */}
          <div className="lg:col-span-7">
            <GestureReferenceCard
              activeGesture={activeGesture}
              onSelectGesture={handleSelectSyntheticGesture}
            />
          </div>

          {/* Right: Telemetry & Flight Log (5 cols) */}
          <div className="lg:col-span-5">
            <TelemetryFeed
              logs={logs}
              onClearLogs={() => setLogs([])}
              telemetry={telemetry}
              activeCommand={activeCommand}
            />
          </div>
        </section>
      </main>

      {/* Physical ESP32 Hardware Integration Drawer/Modal */}
      <Esp32HardwareModal
        isOpen={isHardwareModalOpen}
        onClose={() => setIsHardwareModalOpen(false)}
        activeCommand={activeCommand}
      />
    </div>
  );
}
