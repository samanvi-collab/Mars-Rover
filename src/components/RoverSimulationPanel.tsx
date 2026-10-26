/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Compass,
  Gauge,
  Battery,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Zap,
  Target,
  Sun,
  Flame,
  Radio,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Square,
  Crosshair,
  RotateCw,
} from 'lucide-react';
import { RoverCommand, RoverTelemetry } from '../types/rover';
import {
  SimulationState,
  INITIAL_SIM_STATE,
  updateRoverPhysics,
} from '../utils/roverPhysics';
import { soundManager } from '../utils/soundEffects';

interface RoverSimulationPanelProps {
  activeCommand: RoverCommand;
  onManualCommand: (cmd: RoverCommand) => void;
  onTelemetryUpdate: (telemetry: RoverTelemetry) => void;
  onLogEvent: (type: 'COMMAND' | 'HAZARD' | 'SAMPLE' | 'SYSTEM', msg: string) => void;
}

export const RoverSimulationPanel: React.FC<RoverSimulationPanelProps> = ({
  activeCommand,
  onManualCommand,
  onTelemetryUpdate,
  onLogEvent,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const simStateRef = useRef<SimulationState>({ ...INITIAL_SIM_STATE });
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const prevCommandRef = useRef<RoverCommand>('STOP');

  const [headlights, setHeadlights] = useState(true);
  const [hudStats, setHudStats] = useState({
    heading: 90,
    speed: 0,
    rpm: 0,
    battery: 98.4,
    samples: 0,
    hazard: null as string | null,
    isDrilling: false,
    drillProgress: 0,
    isScanning: false,
  });

  // Sound triggers on state changes
  useEffect(() => {
    if (activeCommand !== prevCommandRef.current) {
      if (activeCommand === 'DRILL_SAMPLE') {
        soundManager.playDrillHum();
        onLogEvent('COMMAND', 'Robotic Arm Deployed: Specimen Core Drill Engaged');
      } else if (activeCommand === 'SCAN_360') {
        soundManager.playRadarPing();
        onLogEvent('COMMAND', 'Panoramic Mast Camera 360° LiDAR Scan Initiated');
      } else if (activeCommand === 'STOP') {
        soundManager.playAlert();
        onLogEvent('COMMAND', 'Dynamic Braking: Rover Stationary');
      } else if (activeCommand === 'FORWARD') {
        soundManager.playGestureLock();
        onLogEvent('COMMAND', 'Drive Motors Active: Forward Propulsion');
      }
      prevCommandRef.current = activeCommand;
    }
  }, [activeCommand, onLogEvent]);

  // Keyboard navigation overrides (WASD / Arrows)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      switch (e.key.toLowerCase()) {
        case 'w':
        case 'arrowup':
          onManualCommand('FORWARD');
          break;
        case 's':
        case 'arrowdown':
          onManualCommand('REVERSE');
          break;
        case 'a':
        case 'arrowleft':
          onManualCommand('STEER_LEFT');
          break;
        case 'd':
        case 'arrowright':
          onManualCommand('STEER_RIGHT');
          break;
        case ' ':
          onManualCommand('STOP');
          break;
        case 'p':
          onManualCommand('DRILL_SAMPLE');
          break;
        case 'v':
          onManualCommand('SCAN_360');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onManualCommand]);

  // Main Canvas Render & Physics Simulation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles: { x: number; y: number; vx: number; vy: number; life: number }[] = [];

    const renderLoop = (now: number) => {
      const dt = Math.min(0.1, (now - lastTimeRef.current) / 1000);
      lastTimeRef.current = now;

      const simState = simStateRef.current;
      const { nextState, event } = updateRoverPhysics(
        simState,
        activeCommand,
        dt,
        canvas.width,
        canvas.height
      );
      simStateRef.current = nextState;

      if (event) {
        onLogEvent('SAMPLE', event);
        soundManager.playGestureLock();
      }

      // Update HUD state & parent telemetry periodically
      setHudStats({
        heading: Math.round(nextState.heading),
        speed: Math.round(Math.abs(nextState.speed) * 0.1 * 10) / 10,
        rpm: nextState.wheelRpm,
        battery: Math.round(nextState.battery * 10) / 10,
        samples: nextState.samplesCollected,
        hazard: nextState.activeHazard,
        isDrilling: nextState.isDrilling,
        drillProgress: Math.round(nextState.drillProgress),
        isScanning: nextState.isScanning,
      });

      onTelemetryUpdate({
        x: Math.round(nextState.x),
        y: Math.round(nextState.y),
        heading: Math.round(nextState.heading),
        speed: Math.round(Math.abs(nextState.speed) * 0.1 * 10) / 10,
        throttle: activeCommand === 'FORWARD' ? 80 : activeCommand === 'REVERSE' ? -50 : 0,
        wheelRPM: nextState.wheelRpm,
        steerAngle: nextState.steerAngle,
        batteryPercent: Math.round(nextState.battery),
        coreTempC: 18.5,
        signalLatencyMs: 14,
        samplesCollected: nextState.samplesCollected,
        isScanning: nextState.isScanning,
        isDrilling: nextState.isDrilling,
        drillProgress: nextState.drillProgress,
        headlightsOn: headlights,
        hazardWarning: nextState.activeHazard,
      });

      // DRAWING THE MARTIAN LANDSCAPE
      drawTerrain(ctx, canvas.width, canvas.height, nextState);

      // DRILL PARTICLES
      if (nextState.isDrilling) {
        for (let i = 0; i < 3; i++) {
          const rad = (nextState.heading * Math.PI) / 180;
          particles.push({
            x: nextState.x + Math.cos(rad) * 32 + (Math.random() - 0.5) * 10,
            y: nextState.y + Math.sin(rad) * 32 + (Math.random() - 0.5) * 10,
            vx: (Math.random() - 0.5) * 40,
            vy: (Math.random() - 0.5) * 40,
            life: 1.0,
          });
        }
      }

      // Update and draw dust particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt * 2;
        if (p.life <= 0) {
          particles.splice(i, 1);
        } else {
          ctx.fillStyle = `rgba(234, 88, 12, ${p.life * 0.8})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2.5 * p.life, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // DRAW ROVER
      drawMarsRover(ctx, nextState, headlights);

      animFrameRef.current = requestAnimationFrame(renderLoop);
    };

    animFrameRef.current = requestAnimationFrame(renderLoop);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [activeCommand, headlights, onTelemetryUpdate, onLogEvent]);

  // Reset Rover Position
  const handleResetPosition = () => {
    simStateRef.current = {
      ...INITIAL_SIM_STATE,
      samples: INITIAL_SIM_STATE.samples.map(s => ({ ...s, drilled: false })),
    };
    onLogEvent('SYSTEM', 'Rover arena reset: origin coordinates reassigned.');
  };

  // Draw Martian Terrain, Craters, Science Targets
  const drawTerrain = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    state: SimulationState
  ) => {
    // 1. Martian Regolith Gradient Background
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#1c0f0d');
    bgGrad.addColorStop(0.5, '#261410');
    bgGrad.addColorStop(1, '#180d0b');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Subtle Coordinate Grid Lines
    ctx.strokeStyle = 'rgba(217, 119, 6, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 60) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // 3. Draw Craters & Boulders
    for (const obs of state.obstacles) {
      if (obs.type === 'crater') {
        // Outer crater rim
        ctx.beginPath();
        ctx.arc(obs.x, obs.y, obs.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(23, 11, 9, 0.9)';
        ctx.fill();

        // Rim shadow highlight
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = 'rgba(180, 83, 9, 0.4)';
        ctx.stroke();

        // Inner crater floor
        ctx.beginPath();
        ctx.arc(obs.x - 2, obs.y - 2, obs.radius * 0.7, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(15, 8, 7, 0.85)';
        ctx.fill();
      } else if (obs.type === 'boulder') {
        // Rock shadow
        ctx.beginPath();
        ctx.ellipse(obs.x + 4, obs.y + 4, obs.radius, obs.radius * 0.7, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fill();

        // Rock body
        ctx.beginPath();
        ctx.arc(obs.x, obs.y, obs.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#4a2820';
        ctx.fill();
        ctx.strokeStyle = '#6e382d';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else {
        // Ridge
        ctx.beginPath();
        ctx.ellipse(obs.x, obs.y, obs.radius * 1.5, obs.radius * 0.6, Math.PI / 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(78, 38, 28, 0.6)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(154, 52, 18, 0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // 4. Draw Science Mineral Targets
    for (const sample of state.samples) {
      const isNear = Math.hypot(sample.x - state.x, sample.y - state.y) < 70;

      // Glow circle
      ctx.beginPath();
      ctx.arc(sample.x, sample.y, isNear ? 16 : 10, 0, Math.PI * 2);
      ctx.fillStyle = sample.drilled
        ? 'rgba(52, 211, 153, 0.2)'
        : isNear
        ? 'rgba(34, 211, 238, 0.35)'
        : 'rgba(251, 146, 60, 0.25)';
      ctx.fill();

      // Core pip
      ctx.beginPath();
      ctx.arc(sample.x, sample.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = sample.drilled ? '#34D399' : isNear ? '#22D3EE' : '#FB923C';
      ctx.fill();

      // Label
      ctx.font = '10px monospace';
      ctx.fillStyle = sample.drilled ? '#6EE7B7' : '#E2E8F0';
      ctx.textAlign = 'center';
      ctx.fillText(
        `${sample.name}${sample.drilled ? ' [ANALYZED]' : ''}`,
        sample.x,
        sample.y - 14
      );

      // Distance tag if close
      if (isNear && !sample.drilled) {
        ctx.fillStyle = '#22D3EE';
        ctx.fillText('DRILL READY (PINCH)', sample.x, sample.y + 24);
      }
    }

    // 5. Radar Sweep Line if Scanning
    if (state.isScanning) {
      const rad = (state.scanAngle * Math.PI) / 180;
      const scanDist = 180;
      const endX = state.x + Math.cos(rad) * scanDist;
      const endY = state.y + Math.sin(rad) * scanDist;

      // Sweep gradient arc
      ctx.beginPath();
      ctx.moveTo(state.x, state.y);
      ctx.arc(state.x, state.y, scanDist, rad - 0.4, rad);
      ctx.closePath();
      ctx.fillStyle = 'rgba(6, 182, 212, 0.18)';
      ctx.fill();

      // Sweep beam line
      ctx.beginPath();
      ctx.moveTo(state.x, state.y);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = '#22D3EE';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Range rings
      ctx.beginPath();
      ctx.arc(state.x, state.y, 80, 0, Math.PI * 2);
      ctx.arc(state.x, state.y, 140, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  };

  // Draw 6-Wheel Rocker-Bogie Mars Rover Model
  const drawMarsRover = (
    ctx: CanvasRenderingContext2D,
    state: SimulationState,
    enableHeadlights: boolean
  ) => {
    ctx.save();
    ctx.translate(state.x, state.y);
    ctx.rotate((state.heading * Math.PI) / 180);

    // 1. Dual Headlight Beams
    if (enableHeadlights) {
      const beamGrad = ctx.createRadialGradient(25, 0, 10, 110, 0, 130);
      beamGrad.addColorStop(0, 'rgba(254, 240, 138, 0.45)');
      beamGrad.addColorStop(0.5, 'rgba(253, 224, 71, 0.18)');
      beamGrad.addColorStop(1, 'rgba(253, 224, 71, 0)');

      ctx.beginPath();
      ctx.moveTo(25, -12);
      ctx.lineTo(140, -55);
      ctx.lineTo(140, 55);
      ctx.lineTo(25, 12);
      ctx.closePath();
      ctx.fillStyle = beamGrad;
      ctx.fill();
    }

    // 2. Rover Shadow
    ctx.beginPath();
    ctx.ellipse(0, 2, 34, 26, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fill();

    // 3. Six Rocker-Bogie Wheels (Front-L, Mid-L, Rear-L, Front-R, Mid-R, Rear-R)
    const wheelPositions = [
      { x: 20, y: -22, isSteerable: true },
      { x: 0, y: -23, isSteerable: false },
      { x: -20, y: -22, isSteerable: true },
      { x: 20, y: 22, isSteerable: true },
      { x: 0, y: 23, isSteerable: false },
      { x: -20, y: 22, isSteerable: true },
    ];

    for (const w of wheelPositions) {
      ctx.save();
      ctx.translate(w.x, w.y);
      if (w.isSteerable) {
        ctx.rotate((state.steerAngle * 0.4 * Math.PI) / 180);
      }

      // Wheel Tire
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      ctx.fillRect(-7, -4, 14, 8);
      ctx.strokeRect(-7, -4, 14, 8);

      // Tread Grooves
      ctx.strokeStyle = '#64748b';
      ctx.beginPath();
      ctx.moveTo(-3, -4);
      ctx.lineTo(-3, 4);
      ctx.moveTo(3, -4);
      ctx.lineTo(3, 4);
      ctx.stroke();

      ctx.restore();
    }

    // 4. Rocker-Bogie Suspension Struts
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 3;
    ctx.beginPath();
    // Left rocker
    ctx.moveTo(18, -18);
    ctx.lineTo(0, -18);
    ctx.lineTo(-18, -18);
    // Right rocker
    ctx.moveTo(18, 18);
    ctx.lineTo(0, 18);
    ctx.lineTo(-18, 18);
    // Transverse differential bar
    ctx.moveTo(0, -18);
    ctx.lineTo(0, 18);
    ctx.stroke();

    // 5. Main Avionics Chassis (Gold foil & Aerospace Carbon)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-22, -15, 44, 30);
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-22, -15, 44, 30);

    // Solar / RTG Power Deck
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-18, -11, 22, 22);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.strokeRect(-18, -11, 22, 22);

    // Grid on solar array
    ctx.strokeStyle = '#0284c7';
    ctx.beginPath();
    ctx.moveTo(-18, 0);
    ctx.lineTo(4, 0);
    ctx.moveTo(-7, -11);
    ctx.lineTo(-7, 11);
    ctx.stroke();

    // High Gain Antenna Dish
    ctx.beginPath();
    ctx.arc(-12, 0, 5.5, 0, Math.PI * 2);
    ctx.fillStyle = '#f8fafc';
    ctx.fill();
    ctx.strokeStyle = '#94a3b8';
    ctx.stroke();

    // 6. Robotic Arm / Specimen Drill (Front mounted)
    ctx.save();
    ctx.translate(22, 0);
    if (state.isDrilling) {
      // Extended vibrating drill arm
      const jitter = (Math.random() - 0.5) * 2;
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(16 + jitter, 0);
      ctx.stroke();

      // Spinning drill head
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(16 + jitter, -3, 6, 6);
    } else {
      // Stowed drill arm
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(8, -6);
      ctx.stroke();
    }
    ctx.restore();

    // 7. Pancam Remote Sensing Mast Camera (Rotates during 360 scan)
    ctx.save();
    ctx.translate(8, 0);
    if (state.isScanning) {
      ctx.rotate((state.scanAngle * Math.PI) / 180);
    }
    // Mast base
    ctx.fillStyle = '#06b6d4';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    // Dual stereo camera lenses
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(2, -3, 4, 2.5);
    ctx.fillRect(2, 0.5, 4, 2.5);
    ctx.restore();

    // Forward Direction Arrow Pointer
    ctx.fillStyle = '#22d3ee';
    ctx.beginPath();
    ctx.moveTo(26, 0);
    ctx.lineTo(20, -5);
    ctx.lineTo(20, 5);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  };

  return (
    <div className="bg-[#0D111A] border border-slate-800/90 rounded-xl overflow-hidden shadow-lg flex flex-col h-full">
      {/* Panel Subheader */}
      <div className="px-4 py-2.5 border-b border-slate-800/80 bg-[#121824]/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-semibold tracking-wide text-slate-200 uppercase font-display">
            Jezero Crater Simulation Arena
          </h2>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
          <button
            type="button"
            onClick={() => setHeadlights(!headlights)}
            className="hover:text-amber-400 transition-colors flex items-center gap-1"
            title="Toggle headlights"
          >
            <Sun className="w-3.5 h-3.5" />
            <span>Lights: {headlights ? 'ON' : 'OFF'}</span>
          </button>
          <span aria-hidden="true">·</span>
          <button
            type="button"
            onClick={handleResetPosition}
            className="hover:text-cyan-400 transition-colors flex items-center gap-1"
            title="Reset rover arena position"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Position</span>
          </button>
        </div>
      </div>

      {/* Main Simulation Canvas & Overlays */}
      <div className="relative aspect-video w-full bg-[#180d0b] flex items-center justify-center overflow-hidden">
        <canvas
          ref={canvasRef}
          width={800}
          height={480}
          data-testid="rover-canvas"
          className="w-full h-full object-cover select-none"
        />

        {/* Dynamic Warning Notification for Hazards */}
        {hudStats.hazard && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-amber-950/90 border border-amber-500/80 text-amber-300 px-3.5 py-1.5 rounded-md text-xs font-mono shadow-lg flex items-center gap-2 animate-bounce">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>{hudStats.hazard}</span>
          </div>
        )}

        {/* Drilling In-Progress Overlay Banner */}
        {hudStats.isDrilling && (
          <div className="absolute top-12 left-1/2 -translate-x-1/2 z-20 bg-[#0B0F17]/95 border border-cyan-500 rounded-lg px-4 py-2 text-center shadow-xl w-64">
            <div className="text-[11px] font-mono text-cyan-300 font-semibold mb-1 flex items-center justify-center gap-1.5">
              <Crosshair className="w-3.5 h-3.5 animate-spin text-cyan-400" />
              <span>SUBSURFACE CORE DRILLING</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-cyan-400 h-full transition-all duration-100"
                style={{ width: `${hudStats.drillProgress}%` }}
              />
            </div>
            <div className="text-[10px] font-mono text-slate-400 mt-1">
              Progress: {hudStats.drillProgress}%
            </div>
          </div>
        )}

        {/* Top-Left Telemetry HUD Pills */}
        <div className="absolute top-3 left-3 z-20 pointer-events-none flex flex-col gap-1.5 font-mono text-xs">
          <div className="bg-[#0B0F17]/90 backdrop-blur border border-slate-700/60 rounded px-2.5 py-1 text-slate-200 flex items-center gap-2">
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span>HEADING: {hudStats.heading}°</span>
          </div>
          <div className="bg-[#0B0F17]/90 backdrop-blur border border-slate-700/60 rounded px-2.5 py-1 text-slate-200 flex items-center gap-2">
            <Gauge className="w-3.5 h-3.5 text-amber-400" />
            <span>VELOCITY: {hudStats.speed} m/s</span>
          </div>
        </div>

        {/* Top-Right Samples & Battery HUD */}
        <div className="absolute top-3 right-3 z-20 pointer-events-none flex flex-col gap-1.5 font-mono text-xs">
          <div className="bg-[#0B0F17]/90 backdrop-blur border border-slate-700/60 rounded px-2.5 py-1 text-slate-200 flex items-center gap-2 justify-end">
            <Battery className="w-3.5 h-3.5 text-emerald-400" />
            <span>BATTERY: {hudStats.battery}%</span>
          </div>
          <div className="bg-[#0B0F17]/90 backdrop-blur border border-slate-700/60 rounded px-2.5 py-1 text-slate-200 flex items-center gap-2 justify-end">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>SAMPLES: {hudStats.samples} / 4</span>
          </div>
        </div>

        {/* Keyboard Hints Overlay */}
        <div className="absolute bottom-3 right-3 z-20 pointer-events-none hidden sm:flex items-center gap-2 bg-[#0B0F17]/85 border border-slate-800/80 rounded px-2 py-1 text-[10px] font-mono text-slate-400">
          <span>Manual Override:</span>
          <span className="text-cyan-300">[W] FWD</span>
          <span className="text-cyan-300">[A/D] STEER</span>
          <span className="text-red-300">[SPACE] STOP</span>
        </div>
      </div>

      {/* Manual Control Pad (Interactive fallbacks for testing) */}
      <div className="p-3 border-t border-slate-800/80 bg-[#0E131E] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onManualCommand('STEER_LEFT')}
            aria-label="Steer Rover Left"
            className="p-2 rounded bg-slate-800/90 hover:bg-cyan-950 text-slate-300 hover:text-cyan-400 border border-slate-700/60 transition-colors"
            title="Steer Left (Point Left)"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => onManualCommand('FORWARD')}
              aria-label="Drive Rover Forward"
              className="p-2 rounded bg-slate-800/90 hover:bg-cyan-950 text-slate-300 hover:text-cyan-400 border border-slate-700/60 transition-colors"
              title="Drive Forward (Point Up)"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onManualCommand('REVERSE')}
              aria-label="Reverse Rover"
              className="p-2 rounded bg-slate-800/90 hover:bg-cyan-950 text-slate-300 hover:text-cyan-400 border border-slate-700/60 transition-colors"
              title="Reverse (Clenched Fist)"
            >
              <ArrowDown className="w-4 h-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => onManualCommand('STEER_RIGHT')}
            aria-label="Steer Rover Right"
            className="p-2 rounded bg-slate-800/90 hover:bg-cyan-950 text-slate-300 hover:text-cyan-400 border border-slate-700/60 transition-colors"
            title="Steer Right (Point Right)"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onManualCommand('STOP')}
            aria-label="Emergency Stop Rover"
            className="px-3 py-2 rounded bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-700/60 transition-colors font-mono text-xs flex items-center gap-1.5 font-bold"
            title="Emergency Stop (Open Palm)"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>STOP</span>
          </button>
        </div>

        {/* Action triggers */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onManualCommand('SCAN_360')}
            className="px-3 py-1.5 rounded bg-slate-800/90 hover:bg-cyan-950 text-cyan-300 border border-cyan-800/60 transition-colors font-mono text-xs flex items-center gap-1.5"
            title="360 Panorama Scan (Victory 'V')"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>360 Scan</span>
          </button>

          <button
            type="button"
            onClick={() => onManualCommand('DRILL_SAMPLE')}
            className="px-3 py-1.5 rounded bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-700/60 transition-colors font-mono text-xs flex items-center gap-1.5"
            title="Drill Rock Sample (Pinch / OK)"
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>Sample Drill</span>
          </button>
        </div>
      </div>
    </div>
  );
};
