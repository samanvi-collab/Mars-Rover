/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyHandGesture,
  mapGestureToCommand,
  generateEsp32Payload,
  GestureSmoother,
  GESTURE_DEFINITIONS,
  LandmarkPoint,
} from './gestureClassifier';

// Helper to construct synthetic 21 landmarks
function createSyntheticHand(fingerExtensions: {
  thumb?: boolean;
  index?: boolean;
  middle?: boolean;
  ring?: boolean;
  pinky?: boolean;
  indexDirection?: 'up' | 'left' | 'right';
  isPinch?: boolean;
}): LandmarkPoint[] {
  const points: LandmarkPoint[] = new Array(21).fill(null).map(() => ({ x: 0.5, y: 0.8, z: 0 }));

  // 0: Wrist
  points[0] = { x: 0.5, y: 0.8, z: 0 };

  // Thumb: 1, 2, 3, 4
  points[1] = { x: 0.45, y: 0.75, z: 0 };
  points[2] = { x: 0.42, y: 0.70, z: 0 };
  points[3] = { x: 0.38, y: 0.65, z: 0 };
  points[4] = fingerExtensions.thumb ? { x: 0.32, y: 0.55, z: 0 } : { x: 0.44, y: 0.68, z: 0 };

  // Index: 5, 6, 7, 8
  points[5] = { x: 0.44, y: 0.60, z: 0 };
  points[6] = { x: 0.44, y: 0.50, z: 0 };
  points[7] = { x: 0.44, y: 0.42, z: 0 };
  if (fingerExtensions.index) {
    if (fingerExtensions.indexDirection === 'left') {
      points[6] = { x: 0.40, y: 0.60, z: 0 };
      points[7] = { x: 0.30, y: 0.60, z: 0 };
      points[8] = { x: 0.15, y: 0.60, z: 0 }; // far left
    } else if (fingerExtensions.indexDirection === 'right') {
      points[6] = { x: 0.50, y: 0.60, z: 0 };
      points[7] = { x: 0.60, y: 0.60, z: 0 };
      points[8] = { x: 0.75, y: 0.60, z: 0 }; // far right
    } else {
      // Up
      points[8] = { x: 0.44, y: 0.30, z: 0 }; // far up
    }
  } else {
    // Curled index
    points[8] = { x: 0.44, y: 0.65, z: 0 };
  }

  // Middle: 9, 10, 11, 12
  points[9] = { x: 0.50, y: 0.58, z: 0 };
  points[10] = { x: 0.50, y: 0.48, z: 0 };
  points[11] = { x: 0.50, y: 0.40, z: 0 };
  points[12] = fingerExtensions.middle ? { x: 0.50, y: 0.28, z: 0 } : { x: 0.50, y: 0.65, z: 0 };

  // Ring: 13, 14, 15, 16
  points[13] = { x: 0.56, y: 0.60, z: 0 };
  points[14] = { x: 0.56, y: 0.52, z: 0 };
  points[15] = { x: 0.56, y: 0.45, z: 0 };
  points[16] = fingerExtensions.ring ? { x: 0.56, y: 0.32, z: 0 } : { x: 0.56, y: 0.66, z: 0 };

  // Pinky: 17, 18, 19, 20
  points[17] = { x: 0.62, y: 0.65, z: 0 };
  points[18] = { x: 0.62, y: 0.58, z: 0 };
  points[19] = { x: 0.62, y: 0.50, z: 0 };
  points[20] = fingerExtensions.pinky ? { x: 0.62, y: 0.38, z: 0 } : { x: 0.62, y: 0.68, z: 0 };

  if (fingerExtensions.isPinch) {
    // Place thumb tip right next to index tip
    points[4] = { x: 0.44, y: 0.44, z: 0 };
    points[8] = { x: 0.44, y: 0.45, z: 0 };
  }

  return points;
}

test('recognizes OPEN_PALM when all fingers extended', () => {
  const hand = createSyntheticHand({
    thumb: true,
    index: true,
    middle: true,
    ring: true,
    pinky: true,
  });
  const res = classifyHandGesture(hand);
  assert.equal(res.gesture, 'OPEN_PALM');
  assert.ok(res.confidence > 0.8);
  assert.equal(mapGestureToCommand(res.gesture), 'STOP');
});

test('recognizes FIST when all fingers are curled', () => {
  const hand = createSyntheticHand({
    thumb: false,
    index: false,
    middle: false,
    ring: false,
    pinky: false,
  });
  const res = classifyHandGesture(hand);
  assert.equal(res.gesture, 'FIST');
  assert.equal(mapGestureToCommand(res.gesture), 'REVERSE');
});

test('recognizes POINT_UP when only index finger is extended upward', () => {
  const hand = createSyntheticHand({
    thumb: false,
    index: true,
    middle: false,
    ring: false,
    pinky: false,
    indexDirection: 'up',
  });
  const res = classifyHandGesture(hand);
  assert.equal(res.gesture, 'POINT_UP');
  assert.equal(mapGestureToCommand(res.gesture), 'FORWARD');
});

test('recognizes POINT_LEFT when index points to the left', () => {
  const hand = createSyntheticHand({
    thumb: false,
    index: true,
    middle: false,
    ring: false,
    pinky: false,
    indexDirection: 'left',
  });
  const res = classifyHandGesture(hand);
  assert.equal(res.gesture, 'POINT_LEFT');
  assert.equal(mapGestureToCommand(res.gesture), 'STEER_LEFT');
});

test('recognizes POINT_RIGHT when index points to the right', () => {
  const hand = createSyntheticHand({
    thumb: false,
    index: true,
    middle: false,
    ring: false,
    pinky: false,
    indexDirection: 'right',
  });
  const res = classifyHandGesture(hand);
  assert.equal(res.gesture, 'POINT_RIGHT');
  assert.equal(mapGestureToCommand(res.gesture), 'STEER_RIGHT');
});

test('recognizes VICTORY when index and middle are extended', () => {
  const hand = createSyntheticHand({
    thumb: false,
    index: true,
    middle: true,
    ring: false,
    pinky: false,
  });
  const res = classifyHandGesture(hand);
  assert.equal(res.gesture, 'VICTORY');
  assert.equal(mapGestureToCommand(res.gesture), 'SCAN_360');
});

test('recognizes PINCH when thumb tip is touching index tip', () => {
  const hand = createSyntheticHand({
    isPinch: true,
  });
  const res = classifyHandGesture(hand);
  assert.equal(res.gesture, 'PINCH');
  assert.equal(mapGestureToCommand(res.gesture), 'DRILL_SAMPLE');
});

test('GestureSmoother stabilizes fluctuating predictions', () => {
  const smoother = new GestureSmoother(5);
  // 3 out of 5 are POINT_UP
  assert.equal(smoother.update('POINT_UP'), 'POINT_UP');
  assert.equal(smoother.update('POINT_UP'), 'POINT_UP');
  assert.equal(smoother.update('NONE'), 'POINT_UP');
  assert.equal(smoother.update('POINT_UP'), 'POINT_UP');
  assert.equal(smoother.update('NONE'), 'POINT_UP');
});

test('generateEsp32Payload produces valid command structures', () => {
  const forwardPayload = generateEsp32Payload('FORWARD', 200);
  assert.equal(forwardPayload.jsonPayload.header, 'MRSX_ESP32');
  assert.equal(forwardPayload.jsonPayload.command, 'FORWARD');
  assert.equal(forwardPayload.jsonPayload.speed, 200);
  assert.equal(forwardPayload.jsonPayload.steer, 0);
  assert.ok(forwardPayload.rawSerialString.startsWith('FORWARD:200:0'));

  const drillPayload = generateEsp32Payload('DRILL_SAMPLE');
  assert.equal(drillPayload.jsonPayload.armAction, 'ENGAGE_DRILL');
});

test('GESTURE_DEFINITIONS contains all 7 primary control gestures', () => {
  assert.equal(GESTURE_DEFINITIONS.length, 7);
  const types = GESTURE_DEFINITIONS.map(d => d.type);
  assert.ok(types.includes('OPEN_PALM'));
  assert.ok(types.includes('POINT_UP'));
  assert.ok(types.includes('POINT_LEFT'));
  assert.ok(types.includes('POINT_RIGHT'));
  assert.ok(types.includes('FIST'));
  assert.ok(types.includes('VICTORY'));
  assert.ok(types.includes('PINCH'));
});
