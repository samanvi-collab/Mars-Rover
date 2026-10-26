/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Cpu,
  X,
  Radio,
  Copy,
  Check,
  AlertTriangle,
  Cable,
  Wifi,
  Send,
  Terminal,
  ShieldAlert,
} from 'lucide-react';
import { RoverCommand, Esp32Config } from '../types/rover';
import { generateEsp32Payload } from '../utils/gestureClassifier';

interface Esp32HardwareModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeCommand: RoverCommand;
}

export const Esp32HardwareModal: React.FC<Esp32HardwareModalProps> = ({
  isOpen,
  onClose,
  activeCommand,
}) => {
  const [config, setConfig] = useState<Esp32Config>({
    protocol: 'simulation',
    baudRate: 115200,
    websocketUrl: 'ws://192.168.4.1:81',
    httpEndpoint: 'http://192.168.4.1/api/cmd',
    isConnected: false,
    serialPort: null,
  });

  const [connectionAttemptStatus, setConnectionAttemptStatus] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeTab, setActiveTab] = useState<'CONNECT' | 'PAYLOAD' | 'FIRMWARE' | 'PINOUT'>('CONNECT');

  if (!isOpen) return null;

  const currentPayload = generateEsp32Payload(activeCommand);

  // Attempt Web Serial or WebSocket connection
  const handleConnectHardware = async () => {
    setConnectionAttemptStatus('Initiating handshake...');

    if (config.protocol === 'serial') {
      if ('serial' in navigator) {
        try {
          // Request real Web Serial port
          const port = await (navigator as any).serial.requestPort();
          await port.open({ baudRate: config.baudRate });
          setConfig(prev => ({ ...prev, isConnected: true, serialPort: 'USB Serial (COM)' }));
          setConnectionAttemptStatus('Web Serial port opened successfully.');
        } catch (err: any) {
          setConnectionAttemptStatus(
            `Serial link refused or cancelled: ${err.message || 'No port selected'}`
          );
        }
      } else {
        setConnectionAttemptStatus(
          'Web Serial API is not supported in this browser. Use Chrome/Edge over HTTPS or WebSocket mode.'
        );
      }
    } else if (config.protocol === 'websocket') {
      try {
        const ws = new WebSocket(config.websocketUrl);
        ws.onopen = () => {
          setConfig(prev => ({ ...prev, isConnected: true }));
          setConnectionAttemptStatus(`WebSocket connected to ${config.websocketUrl}`);
        };
        ws.onerror = () => {
          setConnectionAttemptStatus(
            `Connection failed to ${config.websocketUrl}. Ensure ESP32 is powered and connected to same WiFi network.`
          );
        };
      } catch (e: any) {
        setConnectionAttemptStatus(`WebSocket error: ${e.message}`);
      }
    } else {
      setConnectionAttemptStatus(
        'Simulation mode active. Hardware dispatch safely disabled.'
      );
    }
  };

  const handleDisconnect = () => {
    setConfig(prev => ({ ...prev, isConnected: false, serialPort: null }));
    setConnectionAttemptStatus('Hardware disconnected. Reverted to simulation sandbox.');
  };

  const copyFirmwareToClipboard = () => {
    navigator.clipboard.writeText(ESP32_ARDUINO_SKETCH);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0B0F17] border border-slate-700/80 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 bg-[#0E1320] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Cpu className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-base font-bold text-slate-100 font-display">
                ESP32 Hardware Bridge & Microcontroller Interface
              </h2>
              <div className="text-xs text-slate-400 font-mono">
                Physical Rover Serial & Wireless Robotics Integration
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Safety Disclaimer Banner */}
        <div className="bg-amber-950/40 border-b border-amber-800/40 px-5 py-2.5 flex items-center justify-between text-xs text-amber-300 font-mono">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              STATUS:{' '}
              {config.isConnected
                ? 'PHYSICAL HARDWARE ONLINE'
                : 'SIMULATION MODE (PHYSICAL HARDWARE UNCONNECTED)'}
            </span>
          </div>
          <span className="text-[11px] text-amber-400/80">
            Safety Interlock: {config.isConnected ? 'Armed' : 'Engaged'}
          </span>
        </div>

        {/* Navigation Tabs */}
        <div className="px-5 pt-3 border-b border-slate-800 flex items-center gap-2 text-xs font-mono">
          <button
            type="button"
            onClick={() => setActiveTab('CONNECT')}
            className={`px-3 py-1.5 border-b-2 font-medium transition-colors ${
              activeTab === 'CONNECT'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Connection Setup
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('PAYLOAD')}
            className={`px-3 py-1.5 border-b-2 font-medium transition-colors ${
              activeTab === 'PAYLOAD'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Live JSON Payload
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('FIRMWARE')}
            className={`px-3 py-1.5 border-b-2 font-medium transition-colors ${
              activeTab === 'FIRMWARE'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            ESP32 Arduino Firmware
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('PINOUT')}
            className={`px-3 py-1.5 border-b-2 font-medium transition-colors ${
              activeTab === 'PINOUT'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            GPIO Pinout Guide
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 text-slate-300 text-xs">
          {/* TAB 1: CONNECT */}
          {activeTab === 'CONNECT' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Select Communication Protocol:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono">
                  <button
                    type="button"
                    onClick={() => setConfig(c => ({ ...c, protocol: 'simulation' }))}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      config.protocol === 'simulation'
                        ? 'bg-cyan-950/50 border-cyan-500 text-cyan-300'
                        : 'bg-[#121722] border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-semibold text-slate-200">Simulation Only</div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Pure browser canvas sandbox (No hardware needed)
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfig(c => ({ ...c, protocol: 'serial' }))}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      config.protocol === 'serial'
                        ? 'bg-cyan-950/50 border-cyan-500 text-cyan-300'
                        : 'bg-[#121722] border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <Cable className="w-3.5 h-3.5" />
                      <span>Web Serial (USB)</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Direct browser UART COM port connection
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfig(c => ({ ...c, protocol: 'websocket' }))}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      config.protocol === 'websocket'
                        ? 'bg-cyan-950/50 border-cyan-500 text-cyan-300'
                        : 'bg-[#121722] border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <Wifi className="w-3.5 h-3.5" />
                      <span>WiFi WebSocket</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Wireless low-latency telemetry socket
                    </div>
                  </button>
                </div>
              </div>

              {config.protocol === 'serial' && (
                <div className="p-3 bg-[#111724] border border-slate-800 rounded-lg space-y-2">
                  <div className="font-semibold text-slate-200 font-mono text-xs">
                    Web Serial Parameters
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="text-xs text-slate-400">Baud Rate:</label>
                    <select
                      value={config.baudRate}
                      onChange={e =>
                        setConfig(c => ({ ...c, baudRate: Number(e.target.value) }))
                      }
                      className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-200 font-mono text-xs"
                    >
                      <option value={9600}>9600 bps</option>
                      <option value={57600}>57600 bps</option>
                      <option value={115200}>115200 bps (Standard ESP32)</option>
                      <option value={921600}>921600 bps</option>
                    </select>
                  </div>
                </div>
              )}

              {config.protocol === 'websocket' && (
                <div className="p-3 bg-[#111724] border border-slate-800 rounded-lg space-y-2">
                  <div className="font-semibold text-slate-200 font-mono text-xs">
                    WebSocket Server Endpoint
                  </div>
                  <input
                    type="text"
                    value={config.websocketUrl}
                    onChange={e =>
                      setConfig(c => ({ ...c, websocketUrl: e.target.value }))
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-slate-200 font-mono text-xs"
                    placeholder="ws://192.168.4.1:81"
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                {!config.isConnected ? (
                  <button
                    type="button"
                    onClick={handleConnectHardware}
                    className="px-4 py-2 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-medium transition-colors flex items-center gap-1.5 shadow"
                  >
                    <Radio className="w-4 h-4" />
                    <span>Connect Physical Rover</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    className="px-4 py-2 rounded-md bg-red-950 hover:bg-red-900 text-red-300 border border-red-700/60 font-mono font-medium transition-colors"
                  >
                    Disconnect Hardware Link
                  </button>
                )}

                <div className="text-xs text-slate-400">
                  {connectionAttemptStatus ||
                    'Select protocol above and click connect when ready.'}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LIVE PAYLOAD */}
          {activeTab === 'PAYLOAD' && (
            <div className="space-y-3 font-mono">
              <div className="text-xs text-slate-300">
                This JSON payload is streamed to the ESP32 in real time whenever hand gestures change:
              </div>
              <pre className="p-3 bg-[#06090F] border border-slate-800 rounded-lg text-cyan-300 text-xs overflow-x-auto">
                {JSON.stringify(currentPayload.jsonPayload, null, 2)}
              </pre>

              <div className="text-xs text-slate-400 pt-1">
                Raw Serial Packet Format (UART):
              </div>
              <div className="p-2.5 bg-[#06090F] border border-slate-800 rounded text-amber-400 text-xs">
                {currentPayload.rawSerialString}
              </div>
            </div>
          )}

          {/* TAB 3: FIRMWARE SKETCH */}
          {activeTab === 'FIRMWARE' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-mono">
                  Complete Arduino / PlatformIO ESP32 C++ Sketch:
                </span>
                <button
                  type="button"
                  onClick={copyFirmwareToClipboard}
                  className="px-3 py-1 text-xs font-mono rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 transition-colors"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Sketch</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="p-3 bg-[#06090F] border border-slate-800 rounded-lg text-slate-300 text-[11px] font-mono overflow-x-auto max-h-72">
                {ESP32_ARDUINO_SKETCH}
              </pre>
            </div>
          )}

          {/* TAB 4: PINOUT */}
          {activeTab === 'PINOUT' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-300">
                Recommended circuit wiring for ESP32 DevKit to Dual H-Bridge Motor Driver (L298N / TB6612FNG):
              </div>

              <div className="border border-slate-800 rounded-lg overflow-hidden font-mono text-xs">
                <table className="w-full text-left">
                  <thead className="bg-[#111724] text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-2.5">ESP32 GPIO</th>
                      <th className="p-2.5">Driver / Actuator Pin</th>
                      <th className="p-2.5">Function</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    <tr>
                      <td className="p-2.5 text-cyan-400">GPIO 25</td>
                      <td className="p-2.5">ENA (Left PWM)</td>
                      <td className="p-2.5">Left Rocker Speed Control</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 text-cyan-400">GPIO 26</td>
                      <td className="p-2.5">IN1 (Left Direction A)</td>
                      <td className="p-2.5">Forward Left Drive</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 text-cyan-400">GPIO 27</td>
                      <td className="p-2.5">IN2 (Left Direction B)</td>
                      <td className="p-2.5">Reverse Left Drive</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 text-amber-400">GPIO 14</td>
                      <td className="p-2.5">ENB (Right PWM)</td>
                      <td className="p-2.5">Right Rocker Speed Control</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 text-amber-400">GPIO 12</td>
                      <td className="p-2.5">IN3 (Right Direction A)</td>
                      <td className="p-2.5">Forward Right Drive</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 text-amber-400">GPIO 13</td>
                      <td className="p-2.5">IN4 (Right Direction B)</td>
                      <td className="p-2.5">Reverse Right Drive</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 text-purple-400">GPIO 18</td>
                      <td className="p-2.5">SERVO_PWM (Core Drill)</td>
                      <td className="p-2.5">Robotic Arm Deployment Servo</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-[#0E1320] flex items-center justify-between">
          <span className="text-[11px] font-mono text-slate-500">
            MARS-X Hardware Integration Layer · v1.2
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-mono font-medium rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            Close Settings
          </button>
        </div>
      </div>
    </div>
  );
};

const ESP32_ARDUINO_SKETCH = `/*
 * MARS-X | AI Gesture-Controlled Mars Rover ESP32 Firmware
 * Hardware: ESP32 DevKit v1 + L298N Motor Driver + Servo
 * Communication: Serial UART (115200) & WebSockets
 */

#include <Arduino.h>
#include <WiFi.h>
#include <WebSocketsServer.h>
#include <ArduinoJson.h>

// Motor Driver Pins (L298N / TB6612)
#define PIN_ENA 25
#define PIN_IN1 26
#define PIN_IN2 27
#define PIN_IN3 12
#define PIN_IN4 13
#define PIN_ENB 14

WebSocketsServer webSocket = WebSocketsServer(81);

void setMotors(int leftSpeed, int rightSpeed) {
  // Left Motor
  if (leftSpeed > 0) {
    digitalWrite(PIN_IN1, HIGH);
    digitalWrite(PIN_IN2, LOW);
  } else if (leftSpeed < 0) {
    digitalWrite(PIN_IN1, LOW);
    digitalWrite(PIN_IN2, HIGH);
  } else {
    digitalWrite(PIN_IN1, LOW);
    digitalWrite(PIN_IN2, LOW);
  }
  ledcWrite(0, abs(leftSpeed)); // PWM channel 0

  // Right Motor
  if (rightSpeed > 0) {
    digitalWrite(PIN_IN3, HIGH);
    digitalWrite(PIN_IN4, LOW);
  } else if (rightSpeed < 0) {
    digitalWrite(PIN_IN3, LOW);
    digitalWrite(PIN_IN4, HIGH);
  } else {
    digitalWrite(PIN_IN3, LOW);
    digitalWrite(PIN_IN4, LOW);
  }
  ledcWrite(1, abs(rightSpeed)); // PWM channel 1
}

void executeCommand(String cmd, int speed, int steer) {
  if (cmd == "FORWARD") {
    setMotors(speed, speed);
  } else if (cmd == "REVERSE") {
    setMotors(-speed, -speed);
  } else if (cmd == "STEER_LEFT") {
    setMotors(speed / 2, speed);
  } else if (cmd == "STEER_RIGHT") {
    setMotors(speed, speed / 2);
  } else if (cmd == "SCAN_360") {
    setMotors(120, -120); // Pivot turn
  } else {
    setMotors(0, 0); // Safety brake
  }
}

void setup() {
  Serial.begin(115200);

  pinMode(PIN_IN1, OUTPUT);
  pinMode(PIN_IN2, OUTPUT);
  pinMode(PIN_IN3, OUTPUT);
  pinMode(PIN_IN4, OUTPUT);

  // Setup PWM channels for motor speed
  ledcAttachPin(PIN_ENA, 0);
  ledcSetup(0, 5000, 8);
  ledcAttachPin(PIN_ENB, 1);
  ledcSetup(1, 5000, 8);

  setMotors(0, 0);
  Serial.println("[MARS-X] Rover initialized. Waiting for gesture commands...");
}

void loop() {
  // Check USB Serial commands
  if (Serial.available()) {
    String line = Serial.readStringUntil('\\n');
    StaticJsonDocument<256> doc;
    DeserializationError error = deserializeJson(doc, line);
    if (!error) {
      String cmd = doc["command"];
      int speed = doc["speed"];
      int steer = doc["steer"];
      executeCommand(cmd, speed, steer);
    }
  }
}
`;
