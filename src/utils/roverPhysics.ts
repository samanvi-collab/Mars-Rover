/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RoverCommand, RoverTelemetry } from '../types/rover';

export interface TerrainObstacle {
  x: number;
  y: number;
  radius: number;
  type: 'crater' | 'boulder' | 'ridge';
}

export interface ScienceSample {
  id: string;
  name: string;
  x: number;
  y: number;
  minerals: string;
  drilled: boolean;
  value: number;
}

export interface SimulationState {
  x: number;
  y: number;
  heading: number; // degrees 0-360
  speed: number;   // m/s
  wheelRpm: number;
  steerAngle: number;
  battery: number;
  isScanning: boolean;
  isDrilling: boolean;
  drillProgress: number;
  samplesCollected: number;
  obstacles: TerrainObstacle[];
  samples: ScienceSample[];
  activeHazard: string | null;
  scanAngle: number;
  headlights: boolean;
  odometer: number;
}

export const INITIAL_OBSTACLES: TerrainObstacle[] = [
  { x: 220, y: 160, radius: 42, type: 'crater' },
  { x: 450, y: 310, radius: 55, type: 'crater' },
  { x: 180, y: 420, radius: 28, type: 'boulder' },
  { x: 620, y: 180, radius: 36, type: 'boulder' },
  { x: 380, y: 110, radius: 22, type: 'boulder' },
  { x: 580, y: 440, radius: 48, type: 'crater' },
  { x: 100, y: 280, radius: 25, type: 'ridge' },
  { x: 700, y: 330, radius: 30, type: 'ridge' },
];

export const INITIAL_SAMPLES: ScienceSample[] = [
  { id: 'S-01', name: 'Jezero Clay Specimen', x: 280, y: 240, minerals: 'Phyllosilicates', drilled: false, value: 95 },
  { id: 'S-02', name: 'Hematite Spherule', x: 520, y: 220, minerals: 'Iron Oxide', drilled: false, value: 85 },
  { id: 'S-03', name: 'Olivine Basalt Core', x: 340, y: 460, minerals: 'Magnesium Silicate', drilled: false, value: 90 },
  { id: 'S-04', name: 'Sulfate Vein Outcrop', x: 640, y: 120, minerals: 'Gypsum / Anhydrite', drilled: false, value: 78 },
];

export const INITIAL_SIM_STATE: SimulationState = {
  x: 400,
  y: 300,
  heading: 90, // facing East
  speed: 0,
  wheelRpm: 0,
  steerAngle: 0,
  battery: 98.4,
  isScanning: false,
  isDrilling: false,
  drillProgress: 0,
  samplesCollected: 0,
  obstacles: INITIAL_OBSTACLES,
  samples: INITIAL_SAMPLES,
  activeHazard: null,
  scanAngle: 0,
  headlights: true,
  odometer: 0,
};

/**
 * Updates rover physics state based on elapsed time dt (seconds) and command.
 */
export function updateRoverPhysics(
  state: SimulationState,
  command: RoverCommand,
  dt: number,
  fieldWidth = 800,
  fieldHeight = 600
): { nextState: SimulationState; event: string | null } {
  const next = { ...state };
  let event: string | null = null;

  // Max speeds and acceleration
  const maxForwardSpeed = 50; // pixels per sec
  const maxReverseSpeed = -30;
  const accel = 60;
  const turnSpeed = 65; // degrees per sec

  // Handle Drilling
  if (command === 'DRILL_SAMPLE' || next.isDrilling) {
    next.speed = 0;
    next.wheelRpm = 0;
    next.isDrilling = true;
    next.drillProgress = Math.min(100, next.drillProgress + dt * 35);

    // Check if close to a sample
    const targetSample = next.samples.find(
      s => !s.drilled && Math.hypot(s.x - next.x, s.y - next.y) < 60
    );

    if (next.drillProgress >= 100) {
      next.isDrilling = false;
      next.drillProgress = 0;
      if (targetSample) {
        targetSample.drilled = true;
        next.samplesCollected += 1;
        event = `Drilled and encapsulated: ${targetSample.name} (${targetSample.minerals})`;
      } else {
        event = 'Sample drill cycle complete. Regolith baseline analyzed.';
      }
    }
    return { nextState: next, event };
  } else {
    next.drillProgress = 0;
  }

  // Handle 360 Scan
  if (command === 'SCAN_360') {
    next.speed = 0;
    next.wheelRpm = 10;
    next.isScanning = true;
    next.scanAngle = (next.scanAngle + dt * 180) % 360;
    next.heading = (next.heading + dt * 45) % 360;
    return { nextState: next, event: null };
  } else {
    next.isScanning = false;
  }

  // Handle Steering and Throttle Commands
  let targetSpeed = 0;
  let targetSteer = 0;

  switch (command) {
    case 'FORWARD':
      targetSpeed = maxForwardSpeed;
      targetSteer = 0;
      break;
    case 'REVERSE':
      targetSpeed = maxReverseSpeed;
      targetSteer = 0;
      break;
    case 'STEER_LEFT':
      targetSpeed = maxForwardSpeed * 0.7;
      targetSteer = -turnSpeed;
      next.heading = (next.heading - turnSpeed * dt + 360) % 360;
      break;
    case 'STEER_RIGHT':
      targetSpeed = maxForwardSpeed * 0.7;
      targetSteer = turnSpeed;
      next.heading = (next.heading + turnSpeed * dt) % 360;
      break;
    case 'STOP':
    default:
      targetSpeed = 0;
      targetSteer = 0;
      break;
  }

  // Smooth speed transition
  if (next.speed < targetSpeed) {
    next.speed = Math.min(targetSpeed, next.speed + accel * dt);
  } else if (next.speed > targetSpeed) {
    next.speed = Math.max(targetSpeed, next.speed - accel * 1.5 * dt);
  }

  next.wheelRpm = Math.round(Math.abs(next.speed) * 1.8);
  next.steerAngle = targetSteer;

  // Calculate forward displacement
  const rad = (next.heading * Math.PI) / 180;
  const dx = Math.cos(rad) * next.speed * dt;
  const dy = Math.sin(rad) * next.speed * dt;

  let candidateX = next.x + dx;
  let candidateY = next.y + dy;

  // Arena bounds check
  const roverRadius = 24;
  candidateX = Math.max(roverRadius + 10, Math.min(fieldWidth - roverRadius - 10, candidateX));
  candidateY = Math.max(roverRadius + 10, Math.min(fieldHeight - roverRadius - 10, candidateY));

  // Obstacle collision check
  let hazardDetected: string | null = null;
  for (const obs of next.obstacles) {
    const dist = Math.hypot(obs.x - candidateX, obs.y - candidateY);
    const minDist = obs.radius + roverRadius;

    if (dist < minDist) {
      // Collision detected! Push back slightly
      hazardDetected = `Proximity warning: ${obs.type.toUpperCase()} terrain collision!`;
      candidateX = next.x;
      candidateY = next.y;
      next.speed = 0;
      break;
    } else if (dist < minDist + 25) {
      hazardDetected = `Caution: Terrain hazard (${obs.type}) within ${Math.round(dist - roverRadius)}cm`;
    }
  }

  next.activeHazard = hazardDetected;
  next.x = candidateX;
  next.y = candidateY;
  next.odometer += Math.abs(next.speed * dt) * 0.05;

  // Slow battery consumption
  if (next.speed !== 0 || next.isScanning || next.isDrilling) {
    next.battery = Math.max(5, next.battery - dt * 0.015);
  }

  return { nextState: next, event };
}
