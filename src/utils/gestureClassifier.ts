/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  GestureType,
  RoverCommand,
  GestureDefinition,
  LandmarkPoint,
  GestureDetectionResult,
} from '../types/rover';

export type { LandmarkPoint };

export const GESTURE_DEFINITIONS: GestureDefinition[] = [
  {
    type: 'OPEN_PALM',
    name: 'Open Palm',
    command: 'STOP',
    description: 'All 5 fingers outstretched facing the camera.',
    handPose: '5 fingers extended',
    iconName: 'Hand',
    esp32Code: 'CMD:STOP',
  },
  {
    type: 'POINT_UP',
    name: 'Point Up',
    command: 'FORWARD',
    description: 'Index finger pointing straight up, other fingers folded.',
    handPose: 'Index extended UP',
    iconName: 'ArrowUp',
    esp32Code: 'CMD:FWD:PWM180',
  },
  {
    type: 'POINT_LEFT',
    name: 'Point Left',
    command: 'STEER_LEFT',
    description: 'Index finger pointing horizontally towards the left.',
    handPose: 'Index extended LEFT',
    iconName: 'ArrowLeft',
    esp32Code: 'CMD:LEFT:PWM140',
  },
  {
    type: 'POINT_RIGHT',
    name: 'Point Right',
    command: 'STEER_RIGHT',
    description: 'Index finger pointing horizontally towards the right.',
    handPose: 'Index extended RIGHT',
    iconName: 'ArrowRight',
    esp32Code: 'CMD:RIGHT:PWM140',
  },
  {
    type: 'FIST',
    name: 'Closed Fist',
    command: 'REVERSE',
    description: 'All fingers curled tightly into a clenched fist.',
    handPose: 'All fingers curled',
    iconName: 'CircleDot',
    esp32Code: 'CMD:REV:PWM150',
  },
  {
    type: 'VICTORY',
    name: 'Peace / V-Sign',
    command: 'SCAN_360',
    description: 'Index and middle fingers extended in a V-shape.',
    handPose: 'Index & Middle extended',
    iconName: 'RotateCw',
    esp32Code: 'CMD:SCAN:PAN360',
  },
  {
    type: 'PINCH',
    name: 'Pinch / OK',
    command: 'DRILL_SAMPLE',
    description: 'Thumb tip touching index finger tip.',
    handPose: 'Thumb + Index contact',
    iconName: 'Crosshair',
    esp32Code: 'CMD:ARM:DRILL',
  },
];

/**
 * Generates synthetic 21 hand landmarks for visual preview during testing/simulation mode.
 */
export function getSyntheticLandmarks(gesture: GestureType): LandmarkPoint[] {
  const points: LandmarkPoint[] = new Array(21).fill(null).map(() => ({ x: 0.5, y: 0.75, z: 0 }));
  const wrist = { x: 0.5, y: 0.75, z: 0 };
  points[0] = wrist;

  const isFist = gesture === 'FIST';
  const isPinch = gesture === 'PINCH';
  const isVictory = gesture === 'VICTORY';
  const isOpenPalm = gesture === 'OPEN_PALM';
  const isPointUp = gesture === 'POINT_UP';
  const isPointLeft = gesture === 'POINT_LEFT';
  const isPointRight = gesture === 'POINT_RIGHT';

  // Thumb
  points[1] = { x: 0.44, y: 0.70, z: 0 };
  points[2] = { x: 0.39, y: 0.65, z: 0 };
  points[3] = { x: 0.35, y: 0.58, z: 0 };
  points[4] = isPinch
    ? { x: 0.45, y: 0.44, z: 0 }
    : isOpenPalm
    ? { x: 0.30, y: 0.50, z: 0 }
    : { x: 0.42, y: 0.62, z: 0 };

  // Index
  points[5] = { x: 0.44, y: 0.55, z: 0 };
  points[6] = { x: 0.44, y: 0.46, z: 0 };
  points[7] = { x: 0.44, y: 0.38, z: 0 };
  if (isPointLeft) {
    points[6] = { x: 0.38, y: 0.55, z: 0 };
    points[7] = { x: 0.28, y: 0.55, z: 0 };
    points[8] = { x: 0.16, y: 0.55, z: 0 };
  } else if (isPointRight) {
    points[6] = { x: 0.50, y: 0.55, z: 0 };
    points[7] = { x: 0.60, y: 0.55, z: 0 };
    points[8] = { x: 0.72, y: 0.55, z: 0 };
  } else if (isPointUp || isOpenPalm || isVictory) {
    points[8] = { x: 0.44, y: 0.28, z: 0 };
  } else if (isPinch) {
    points[7] = { x: 0.45, y: 0.40, z: 0 };
    points[8] = { x: 0.45, y: 0.44, z: 0 };
  } else {
    // Fist
    points[8] = { x: 0.44, y: 0.62, z: 0 };
  }

  // Middle
  points[9] = { x: 0.50, y: 0.54, z: 0 };
  points[10] = { x: 0.50, y: 0.44, z: 0 };
  points[11] = { x: 0.50, y: 0.36, z: 0 };
  points[12] = (isOpenPalm || isVictory) ? { x: 0.50, y: 0.25, z: 0 } : { x: 0.50, y: 0.62, z: 0 };

  // Ring
  points[13] = { x: 0.56, y: 0.56, z: 0 };
  points[14] = { x: 0.56, y: 0.47, z: 0 };
  points[15] = { x: 0.56, y: 0.40, z: 0 };
  points[16] = isOpenPalm ? { x: 0.56, y: 0.29, z: 0 } : { x: 0.56, y: 0.63, z: 0 };

  // Pinky
  points[17] = { x: 0.62, y: 0.60, z: 0 };
  points[18] = { x: 0.62, y: 0.52, z: 0 };
  points[19] = { x: 0.62, y: 0.45, z: 0 };
  points[20] = isOpenPalm ? { x: 0.62, y: 0.35, z: 0 } : { x: 0.62, y: 0.64, z: 0 };

  return points;
}

/**
 * Calculates Euclidean 2D distance between two points.
 */
export function getDistance(p1: LandmarkPoint, p2: LandmarkPoint): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Checks which fingers are extended given 21 MediaPipe hand landmarks.
 */
export function getFingerExtensionStates(landmarks: LandmarkPoint[]) {
  if (!landmarks || landmarks.length < 21) {
    return {
      thumb: false,
      index: false,
      middle: false,
      ring: false,
      pinky: false,
    };
  }

  const wrist = landmarks[0];

  // Thumb: compare tip (4) distance to pinky MCP (17) vs IP (3) distance to pinky MCP
  const thumbTipToPinky = getDistance(landmarks[4], landmarks[17]);
  const thumbIpToPinky = getDistance(landmarks[3], landmarks[17]);
  const thumbTipToWrist = getDistance(landmarks[4], wrist);
  const thumbMcpToWrist = getDistance(landmarks[2], wrist);
  const thumbExtended = thumbTipToPinky > thumbIpToPinky && thumbTipToWrist > thumbMcpToWrist * 1.1;

  // Other fingers: compare tip distance to wrist vs PIP/DIP distance to wrist
  const indexExtended =
    getDistance(landmarks[8], wrist) > getDistance(landmarks[6], wrist) * 1.25 &&
    getDistance(landmarks[8], wrist) > getDistance(landmarks[5], wrist) * 1.25;

  const middleExtended =
    getDistance(landmarks[12], wrist) > getDistance(landmarks[10], wrist) * 1.25 &&
    getDistance(landmarks[12], wrist) > getDistance(landmarks[9], wrist) * 1.25;

  const ringExtended =
    getDistance(landmarks[16], wrist) > getDistance(landmarks[14], wrist) * 1.25 &&
    getDistance(landmarks[16], wrist) > getDistance(landmarks[13], wrist) * 1.25;

  const pinkyExtended =
    getDistance(landmarks[20], wrist) > getDistance(landmarks[18], wrist) * 1.25 &&
    getDistance(landmarks[20], wrist) > getDistance(landmarks[17], wrist) * 1.25;

  return {
    thumb: thumbExtended,
    index: indexExtended,
    middle: middleExtended,
    ring: ringExtended,
    pinky: pinkyExtended,
  };
}

/**
 * Classifies 21 MediaPipe hand landmarks into a recognized gesture.
 */
export function classifyHandGesture(
  landmarks: LandmarkPoint[],
  handedness: 'Left' | 'Right' | 'Unknown' = 'Unknown'
): { gesture: GestureType; confidence: number } {
  if (!landmarks || landmarks.length < 21) {
    return { gesture: 'NONE', confidence: 0 };
  }

  const fingers = getFingerExtensionStates(landmarks);
  const wrist = landmarks[0];
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const indexPip = landmarks[6];
  const indexMcp = landmarks[5];

  // Count extended fingers (excluding thumb for finger count)
  const extendedCount = [
    fingers.index,
    fingers.middle,
    fingers.ring,
    fingers.pinky,
  ].filter(Boolean).length;

  // Check PINCH (Thumb tip close to Index tip in space)
  const pinchDistance = getDistance(thumbTip, indexTip);
  const palmScale = getDistance(landmarks[0], landmarks[9]); // Wrist to Middle MCP scale
  const normalizedPinchDist = palmScale > 0 ? pinchDistance / palmScale : 1;
  const thumbDistToWrist = palmScale > 0 ? getDistance(thumbTip, wrist) / palmScale : 0;

  if (normalizedPinchDist < 0.32 && thumbDistToWrist > 0.65) {
    return { gesture: 'PINCH', confidence: Math.max(0.75, 1 - normalizedPinchDist * 2) };
  }

  // 1. FIST: All 4 fingers are curled into palm
  if (extendedCount === 0) {
    return { gesture: 'FIST', confidence: 0.92 };
  }

  // 2. OPEN PALM: At least 4 or 5 extended fingers
  if (extendedCount >= 4 && (fingers.thumb || extendedCount === 4)) {
    return { gesture: 'OPEN_PALM', confidence: 0.94 };
  }

  // 3. VICTORY / PEACE: Index & Middle extended, Ring & Pinky curled
  if (fingers.index && fingers.middle && !fingers.ring && !fingers.pinky) {
    return { gesture: 'VICTORY', confidence: 0.91 };
  }

  // 4. POINTING (Index extended, middle/ring/pinky curled)
  if (fingers.index && !fingers.middle && !fingers.ring && !fingers.pinky) {
    // Vector from PIP (6) to TIP (8)
    const dx = indexTip.x - indexPip.x;
    const dy = indexTip.y - indexPip.y;
    const length = Math.sqrt(dx * dx + dy * dy);

    if (length > 0.001) {
      const nx = dx / length;
      const ny = dy / length;

      // Note: in canvas/screen coords, Y goes downward.
      // ny < -0.5 means pointing UP towards screen top
      if (ny < -0.55 && Math.abs(nx) < 0.8) {
        return { gesture: 'POINT_UP', confidence: 0.88 };
      }

      // Horizontal pointing:
      // In mirrored selfie view:
      // pointing towards screen LEFT has nx < -0.5
      // pointing towards screen RIGHT has nx > 0.5
      if (nx < -0.55) {
        return { gesture: 'POINT_LEFT', confidence: 0.86 };
      }
      if (nx > 0.55) {
        return { gesture: 'POINT_RIGHT', confidence: 0.86 };
      }

      // Default to POINT_UP if index is pointing predominantly away from wrist
      if (indexTip.y < indexMcp.y) {
        return { gesture: 'POINT_UP', confidence: 0.80 };
      }
    }
  }

  return { gesture: 'NONE', confidence: 0.3 };
}

/**
 * Maps a gesture to a rover command.
 */
export function mapGestureToCommand(gesture: GestureType): RoverCommand {
  switch (gesture) {
    case 'OPEN_PALM':
      return 'STOP';
    case 'POINT_UP':
      return 'FORWARD';
    case 'POINT_LEFT':
      return 'STEER_LEFT';
    case 'POINT_RIGHT':
      return 'STEER_RIGHT';
    case 'FIST':
      return 'REVERSE';
    case 'VICTORY':
      return 'SCAN_360';
    case 'PINCH':
      return 'DRILL_SAMPLE';
    case 'NONE':
    default:
      return 'STOP';
  }
}

/**
 * Generates an ESP32 command payload in standard JSON and raw byte string formats.
 */
export function generateEsp32Payload(command: RoverCommand, speed = 180, steer = 0) {
  const timestamp = Date.now();
  const jsonPayload = {
    header: 'MRSX_ESP32',
    timestamp,
    command,
    speed: command === 'FORWARD' ? speed : command === 'REVERSE' ? -speed : 0,
    steer: command === 'STEER_LEFT' ? -45 : command === 'STEER_RIGHT' ? 45 : steer,
    armAction: command === 'DRILL_SAMPLE' ? 'ENGAGE_DRILL' : 'IDLE',
    scanMode: command === 'SCAN_360' ? true : false,
  };

  const rawSerialString = `${command}:${jsonPayload.speed}:${jsonPayload.steer}\n`;

  return {
    jsonPayload,
    rawSerialString,
  };
}

/**
 * Smoothing buffer to prevent gesture flickering.
 */
export class GestureSmoother {
  private history: GestureType[] = [];
  private readonly windowSize: number;
  private currentStableGesture: GestureType = 'NONE';

  constructor(windowSize = 5) {
    this.windowSize = windowSize;
  }

  public update(newGesture: GestureType): GestureType {
    this.history.push(newGesture);
    if (this.history.length > this.windowSize) {
      this.history.shift();
    }

    // Count occurrences
    const counts: Record<string, number> = {};
    for (const g of this.history) {
      counts[g] = (counts[g] || 0) + 1;
    }

    // Find highest count
    let maxGesture: GestureType = 'NONE';
    let maxCount = 0;
    for (const [g, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count;
        maxGesture = g as GestureType;
      }
    }

    // Require majority agreement based on current sample count
    const threshold = Math.ceil(this.history.length / 2);
    if (maxCount >= threshold) {
      this.currentStableGesture = maxGesture;
    }

    return this.currentStableGesture;
  }

  public reset() {
    this.history = [];
    this.currentStableGesture = 'NONE';
  }
}
