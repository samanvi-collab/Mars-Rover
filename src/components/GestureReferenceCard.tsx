/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Hand,
  ArrowUp,
  ArrowLeft,
  ArrowRight,
  CircleDot,
  RotateCw,
  Crosshair,
  HelpCircle,
  Play,
} from 'lucide-react';
import { GestureType, RoverCommand } from '../types/rover';
import { GESTURE_DEFINITIONS } from '../utils/gestureClassifier';

interface GestureReferenceCardProps {
  activeGesture: GestureType;
  onSelectGesture: (gesture: GestureType) => void;
}

export const GestureReferenceCard: React.FC<GestureReferenceCardProps> = ({
  activeGesture,
  onSelectGesture,
}) => {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Hand':
        return <Hand className="w-4 h-4 text-rose-400" />;
      case 'ArrowUp':
        return <ArrowUp className="w-4 h-4 text-emerald-400" />;
      case 'ArrowLeft':
        return <ArrowLeft className="w-4 h-4 text-cyan-400" />;
      case 'ArrowRight':
        return <ArrowRight className="w-4 h-4 text-cyan-400" />;
      case 'CircleDot':
        return <CircleDot className="w-4 h-4 text-purple-400" />;
      case 'RotateCw':
        return <RotateCw className="w-4 h-4 text-blue-400" />;
      case 'Crosshair':
        return <Crosshair className="w-4 h-4 text-amber-400" />;
      default:
        return <Hand className="w-4 h-4 text-cyan-400" />;
    }
  };

  return (
    <div className="bg-[#0D111A] border border-slate-800/90 rounded-xl overflow-hidden shadow-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-semibold tracking-wide text-slate-200 uppercase font-display">
            Gesture Control Protocol
          </h2>
        </div>
        <span className="text-xs font-mono text-slate-400">
          7 Predefined Vision Commands
        </span>
      </div>

      {/* Grid of Gesture Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-2.5">
        {GESTURE_DEFINITIONS.map(def => {
          const isActive = activeGesture === def.type;

          return (
            <div
              key={def.type}
              className={`p-3 rounded-lg border transition-all flex flex-col justify-between ${
                isActive
                  ? 'bg-cyan-950/40 border-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                  : 'bg-[#111724] border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
                    {getIcon(def.iconName)}
                  </div>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      isActive
                        ? 'bg-cyan-400 text-slate-950 font-bold'
                        : 'text-slate-400 bg-slate-800/80'
                    }`}
                  >
                    {def.command}
                  </span>
                </div>

                <div className="font-semibold text-xs text-slate-200 font-display">
                  {def.name}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 leading-snug">
                  {def.description}
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-500">
                  {def.esp32Code.split(':')[1] || def.command}
                </span>

                <button
                  type="button"
                  onClick={() => onSelectGesture(def.type)}
                  className="px-2 py-0.5 text-[10px] font-mono rounded bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-slate-300 transition-colors flex items-center gap-1"
                  title={`Test ${def.name}`}
                >
                  <Play className="w-2.5 h-2.5" />
                  <span>Test</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
