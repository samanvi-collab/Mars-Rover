/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Terminal,
  Activity,
  Cpu,
  Trash2,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Radio,
} from 'lucide-react';
import { MissionLogEntry, RoverTelemetry, RoverCommand } from '../types/rover';

interface TelemetryFeedProps {
  logs: MissionLogEntry[];
  onClearLogs: () => void;
  telemetry: RoverTelemetry;
  activeCommand: RoverCommand;
}

export const TelemetryFeed: React.FC<TelemetryFeedProps> = ({
  logs,
  onClearLogs,
  telemetry,
  activeCommand,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'COMMAND' | 'HAZARD' | 'SAMPLE'>('ALL');

  const filteredLogs = logs.filter(log => {
    if (filter === 'ALL') return true;
    return log.type === filter;
  });

  return (
    <div className="bg-[#0D111A] border border-slate-800/90 rounded-xl overflow-hidden shadow-lg flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-slate-800/80 bg-[#121824]/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-semibold tracking-wide text-slate-200 uppercase font-display">
            Live Telemetry & Flight Log
          </h2>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setFilter('ALL')}
            className={`px-2 py-0.5 text-[11px] font-mono rounded transition-colors ${
              filter === 'ALL'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setFilter('COMMAND')}
            className={`px-2 py-0.5 text-[11px] font-mono rounded transition-colors ${
              filter === 'COMMAND'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Commands
          </button>
          <button
            type="button"
            onClick={() => setFilter('HAZARD')}
            className={`px-2 py-0.5 text-[11px] font-mono rounded transition-colors ${
              filter === 'HAZARD'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Hazards
          </button>
          <button
            type="button"
            onClick={() => setFilter('SAMPLE')}
            className={`px-2 py-0.5 text-[11px] font-mono rounded transition-colors ${
              filter === 'SAMPLE'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Science
          </button>
          <button
            type="button"
            onClick={onClearLogs}
            aria-label="Clear telemetry logs"
            className="p-1 hover:text-red-400 text-slate-500 transition-colors ml-1"
            title="Clear Log Terminal"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Numerical Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-[#090D15] border-b border-slate-800/80 font-mono text-xs">
        <div className="bg-[#111724] border border-slate-800/80 rounded p-2">
          <div className="text-[10px] text-slate-400">POSITION (GRID)</div>
          <div className="text-slate-200 font-semibold mt-0.5">
            X:{telemetry.x} · Y:{telemetry.y}
          </div>
        </div>

        <div className="bg-[#111724] border border-slate-800/80 rounded p-2">
          <div className="text-[10px] text-slate-400">MOTOR DRIVE (RPM)</div>
          <div className="text-cyan-400 font-semibold mt-0.5">
            {telemetry.wheelRPM} RPM
          </div>
        </div>

        <div className="bg-[#111724] border border-slate-800/80 rounded p-2">
          <div className="text-[10px] text-slate-400">AVIONICS TEMP</div>
          <div className="text-slate-200 font-semibold mt-0.5">
            {telemetry.coreTempC}°C (Nominal)
          </div>
        </div>

        <div className="bg-[#111724] border border-slate-800/80 rounded p-2">
          <div className="text-[10px] text-slate-400">COMMAND LATENCY</div>
          <div className="text-emerald-400 font-semibold mt-0.5">
            {telemetry.signalLatencyMs} ms
          </div>
        </div>
      </div>

      {/* Terminal Log Console */}
      <div className="flex-1 p-3 font-mono text-xs overflow-y-auto max-h-56 min-h-[140px] space-y-1.5 bg-[#070A10]">
        {filteredLogs.length === 0 ? (
          <div className="text-slate-600 text-center py-6 italic">
            No telemetry events recorded for this filter.
          </div>
        ) : (
          filteredLogs.map(log => (
            <div
              key={log.id}
              className="flex items-start gap-2 leading-relaxed text-slate-300"
            >
              <span className="text-slate-500 select-none text-[10px] pt-0.5">
                [{log.timestamp}]
              </span>

              {log.type === 'COMMAND' && (
                <span className="text-cyan-400 font-semibold text-[10px] px-1 py-0.2 rounded bg-cyan-950/60 border border-cyan-800/40">
                  CMD
                </span>
              )}
              {log.type === 'HAZARD' && (
                <span className="text-amber-400 font-semibold text-[10px] px-1 py-0.2 rounded bg-amber-950/60 border border-amber-800/40">
                  WARN
                </span>
              )}
              {log.type === 'SAMPLE' && (
                <span className="text-emerald-400 font-semibold text-[10px] px-1 py-0.2 rounded bg-emerald-950/60 border border-emerald-800/40">
                  SCI
                </span>
              )}
              {log.type === 'SYSTEM' && (
                <span className="text-purple-400 font-semibold text-[10px] px-1 py-0.2 rounded bg-purple-950/60 border border-purple-800/40">
                  SYS
                </span>
              )}

              <span className="flex-1 break-words">{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
