/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type GestureType =
  | 'NONE'
  | 'OPEN_PALM'
  | 'POINT_UP'
  | 'POINT_LEFT'
  | 'POINT_RIGHT'
  | 'FIST'
  | 'VICTORY'
  | 'PINCH';

export type RoverCommand =
  | 'STOP'
  | 'FORWARD'
  | 'REVERSE'
  | 'STEER_LEFT'
  | 'STEER_RIGHT'
  | 'SCAN_360'
  | 'DRILL_SAMPLE';

export interface GestureDefinition {
  type: GestureType;
  name: string;
  command: RoverCommand;
  description: string;
  handPose: string;
  iconName: string;
  esp32Code: string;
}

export interface LandmarkPoint {
  x: number;
  y: number;
  z?: number;
}

export interface GestureDetectionResult {
  gesture: GestureType;
  command: RoverCommand;
  confidence: number;
  handedness: 'Left' | 'Right' | 'Unknown';
  landmarks: LandmarkPoint[];
  boundingBox?: {
    xMin: number;
    yMin: number;
    xMax: number;
    yMax: number;
  };
}

export interface RoverTelemetry {
  x: number;
  y: number;
  heading: number; // in degrees 0 - 360
  speed: number;   // m/s or km/h
  throttle: number; // -100 to 100
  wheelRPM: number;
  steerAngle: number; // degrees
  batteryPercent: number;
  coreTempC: number;
  signalLatencyMs: number;
  samplesCollected: number;
  isScanning: boolean;
  isDrilling: boolean;
  drillProgress: number; // 0 to 100
  headlightsOn: boolean;
  hazardWarning: string | null;
}

export interface MissionLogEntry {
  id: string;
  timestamp: string;
  type: 'COMMAND' | 'GESTURE' | 'HAZARD' | 'SAMPLE' | 'SYSTEM';
  message: string;
  details?: string;
}

export interface Esp32Config {
  protocol: 'simulation' | 'serial' | 'websocket' | 'http';
  baudRate: number;
  websocketUrl: string;
  httpEndpoint: string;
  isConnected: boolean;
  serialPort: string | null;
}
