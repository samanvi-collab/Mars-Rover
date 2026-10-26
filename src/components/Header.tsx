/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Camera,
  CameraOff,
  Radio,
  Cpu,
  Volume2,
  VolumeX,
  ShieldCheck,
  Sparkles,
  Bot,
} from 'lucide-react';

interface HeaderProps {
  isCameraActive: boolean;
  onToggleCamera: () => void;
  isTestFeedActive: boolean;
  onToggleTestFeed: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenHardwareModal: () => void;
  isHardwareConnected: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  isCameraActive,
  onToggleCamera,
  isTestFeedActive,
  onToggleTestFeed,
  isMuted,
  onToggleMute,
  onOpenHardwareModal,
  isHardwareConnected,
}) => {
  return (
    <header className="border-b border-slate-800/80 bg-[#0B0F17]/90 backdrop-blur sticky top-0 z-40 px-4 lg:px-6 py-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        {/* Left: Brand & Mode Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-950 to-slate-900 border border-cyan-500/40 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-wider text-base text-slate-100 font-display">
                MARS-X
              </span>
              <span className="text-xs text-slate-400">/</span>
              <span className="text-xs font-mono text-cyan-400">ROVER CONTROL</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>Vision-Based Gesture Control System</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-amber-400 font-mono">SIMULATION ACTIVE</span>
            </div>
          </div>
        </div>

        {/* Center: System Status Indicators */}
        <div className="hidden lg:flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-2 text-slate-300">
            <span
              className={`w-2 h-2 rounded-full ${
                isCameraActive
                  ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                  : isTestFeedActive
                  ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]'
                  : 'bg-slate-600'
              }`}
            />
            <span>
              {isCameraActive
                ? 'CAMERA ACTIVE (LOCAL)'
                : isTestFeedActive
                ? 'SYNTHETIC TEST FEED'
                : 'CAMERA DISCONNECTED'}
            </span>
          </div>

          <span aria-hidden="true" className="text-slate-700">|</span>

          <div className="flex items-center gap-2 text-slate-300">
            <span
              className={`w-2 h-2 rounded-full ${
                isHardwareConnected ? 'bg-emerald-400' : 'bg-amber-500'
              }`}
            />
            <span>
              {isHardwareConnected ? 'ESP32 LINKED' : 'ESP32 STANDBY (SIM ONLY)'}
            </span>
          </div>

          <span aria-hidden="true" className="text-slate-700">|</span>

          <div className="flex items-center gap-1.5 text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[11px]">100% On-Device Wasm</span>
          </div>
        </div>

        {/* Right: Functional Control Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 w-full md:w-auto justify-between sm:justify-end flex-wrap">
          {/* Synthetic Demo/Test Feed Toggle */}
          <button
            type="button"
            onClick={onToggleTestFeed}
            aria-pressed={isTestFeedActive}
            aria-label="Toggle synthetic gesture simulation feed"
            className={`px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-mono font-medium rounded-md transition-colors flex items-center gap-1 sm:gap-1.5 ${
              isTestFeedActive
                ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/50 shadow-sm'
                : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700/60'
            }`}
            title="Simulate gestures without needing a physical camera"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>{isTestFeedActive ? 'Synthetic: ON' : 'Synthetic'}</span>
          </button>

          {/* Primary Camera Toggle */}
          <button
            type="button"
            onClick={onToggleCamera}
            aria-pressed={isCameraActive}
            aria-label={isCameraActive ? 'Stop Camera Feed' : 'Start Camera Feed'}
            className={`px-2.5 sm:px-3.5 py-1.5 text-[11px] sm:text-xs font-mono font-medium rounded-md transition-all flex items-center gap-1 sm:gap-1.5 ${
              isCameraActive
                ? 'bg-red-950/70 hover:bg-red-900/80 text-red-300 border border-red-500/50'
                : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
            }`}
          >
            {isCameraActive ? (
              <>
                <CameraOff className="w-3.5 h-3.5" />
                <span>Stop</span>
              </>
            ) : (
              <>
                <Camera className="w-3.5 h-3.5" />
                <span>Start Camera</span>
              </>
            )}
          </button>

          {/* Audio Feedback Toggle */}
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={isMuted ? 'Unmute mission audio' : 'Mute mission audio'}
            aria-pressed={!isMuted}
            className="p-1.5 rounded-md bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700/60 transition-colors"
            title={isMuted ? 'Telemetry Audio: Muted' : 'Telemetry Audio: Active'}
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-slate-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-cyan-400" />
            )}
          </button>

          {/* ESP32 Hardware Bridge Config */}
          <button
            type="button"
            onClick={onOpenHardwareModal}
            aria-label="Open ESP32 hardware bridge settings"
            className="px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-mono font-medium rounded-md bg-slate-800/80 hover:bg-slate-700/80 text-amber-300 border border-amber-500/40 transition-colors flex items-center gap-1 sm:gap-1.5"
            title="Configure ESP32 microcontroller connection & firmware"
          >
            <Cpu className="w-3.5 h-3.5 text-amber-400" />
            <span>ESP32</span>
          </button>
        </div>
      </div>
    </header>
  );
};
