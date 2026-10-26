/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  updateRoverPhysics,
  INITIAL_SIM_STATE,
} from './roverPhysics';

test('forward command accelerates rover along its heading', () => {
  const state = { ...INITIAL_SIM_STATE, x: 100, y: 100, heading: 0, speed: 0 };
  const { nextState } = updateRoverPhysics(state, 'FORWARD', 0.5);
  assert.ok(nextState.speed > 0);
  assert.ok(nextState.x > 100);
  assert.equal(nextState.y, 100);
});

test('steer left command updates rover heading counterclockwise', () => {
  const state = { ...INITIAL_SIM_STATE, heading: 90 };
  const { nextState } = updateRoverPhysics(state, 'STEER_LEFT', 0.2);
  assert.ok(nextState.heading < 90);
});

test('steer right command updates rover heading clockwise', () => {
  const state = { ...INITIAL_SIM_STATE, heading: 90 };
  const { nextState } = updateRoverPhysics(state, 'STEER_RIGHT', 0.2);
  assert.ok(nextState.heading > 90);
});

test('stop command decelerates rover to zero speed', () => {
  const state = { ...INITIAL_SIM_STATE, speed: 40 };
  const { nextState } = updateRoverPhysics(state, 'STOP', 0.8);
  assert.equal(nextState.speed, 0);
});

test('scan 360 mode activates scanning flag and rotates scan angle', () => {
  const state = { ...INITIAL_SIM_STATE, scanAngle: 0 };
  const { nextState } = updateRoverPhysics(state, 'SCAN_360', 0.5);
  assert.equal(nextState.isScanning, true);
  assert.ok(nextState.scanAngle > 0);
});

test('drill sample mode increments progress and caps at 100', () => {
  const state = { ...INITIAL_SIM_STATE, drillProgress: 50 };
  const { nextState } = updateRoverPhysics(state, 'DRILL_SAMPLE', 2.0);
  assert.equal(nextState.isDrilling, false);
  assert.equal(nextState.drillProgress, 0); // finished and reset
});
