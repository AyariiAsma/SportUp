import React, { useState } from 'react';
import { History, Calendar, Timer, Gauge, Flame, MapPin, ChevronDown, ChevronUp, Layers } from 'lucide-react';
import { RunSession } from '../types';
import { LeafletMap } from './LeafletMap';

interface RunHistoryViewProps {
  runs: RunSession[];
  onStartNewRun: () => void;
}

export const RunHistoryView: React.FC<RunHistoryViewProps> = ({
  runs,
  onStartNewRun,
}) => {
  const [expandedRunId, setExpandedRunId] = useState<string | null>(runs[0]?.id || null);

  const toggleExpand = (id: string) => {
    setExpandedRunId(prev => prev === id ? null : id);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-extrabold text-3xl text-white tracking-tight">
            Workout History
          </h1>
          <p className="text-gray-400 text-xs sm:text-sm">
            Review your past runs, per-kilometer splits, and interactive GPS route replays.
          </p>
        </div>

        <button
          onClick={onStartNewRun}
          className="px-5 py-2.5 rounded-xl bg-[#FF6B35] text-white font-heading font-bold text-xs sm:text-sm shadow-lg shadow-orange-500/20 hover:scale-102 transition-all"
        >
          + Track New Run
        </button>
      </div>

      {/* Runs List */}
      <div className="space-y-4">
        {runs.map(run => {
          const isExpanded = expandedRunId === run.id;
          const mins = Math.floor(run.durationSec / 60);
          const secs = run.durationSec % 60;
          const formattedDuration = `${mins}m ${secs.toString().padStart(2, '0')}s`;

          return (
            <div
              key={run.id}
              className="bg-[#1B263B] border border-white/10 rounded-2xl overflow-hidden transition-all shadow-md"
            >
              {/* Summary Header Row */}
              <div
                onClick={() => toggleExpand(run.id)}
                className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors gap-3"
              >
                <div className="flex items-center space-x-3.5">
                  <div className="w-11 h-11 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-[#FF6B35]">
                    <span className="text-lg">🏃</span>
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-base sm:text-lg text-white">
                      {run.title}
                    </h3>
                    <div className="flex items-center space-x-2 text-xs text-gray-400 mt-0.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{run.createdAt}</span>
                      {run.eventTitle && (
                        <span className="text-[#2AB7CA] font-semibold">• Event: {run.eventTitle}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick KPIs */}
                <div className="flex items-center space-x-4 sm:space-x-8">
                  <div className="text-right">
                    <div className="text-base sm:text-xl font-heading font-extrabold text-[#FF6B35]">
                      {run.distanceKm.toFixed(2)} <span className="text-xs">km</span>
                    </div>
                    <div className="text-[10px] uppercase font-bold text-gray-400">Distance</div>
                  </div>

                  <div className="hidden sm:block text-right">
                    <div className="text-base font-heading font-bold text-white">
                      {formattedDuration}
                    </div>
                    <div className="text-[10px] uppercase font-bold text-gray-400">Duration</div>
                  </div>

                  <div className="hidden sm:block text-right">
                    <div className="text-base font-heading font-bold text-[#FED766]">
                      {run.avgPace}
                    </div>
                    <div className="text-[10px] uppercase font-bold text-gray-400">Pace /km</div>
                  </div>

                  <button className="p-1 rounded-lg text-gray-400 hover:text-white">
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Expanded Details: Map Replay & Splits Breakdown */}
              {isExpanded && (
                <div className="p-5 border-t border-white/5 bg-[#0D1B2A]/70 space-y-5 animate-fadeIn">
                  {/* Route Replay */}
                  {run.route && run.route.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-xs font-bold text-gray-300 uppercase tracking-wider">
                        <MapPin className="w-4 h-4 text-[#FF6B35]" />
                        <span>GPS Route Replay</span>
                      </div>
                      <div className="h-64 rounded-xl overflow-hidden border border-white/5">
                        <LeafletMap route={run.route} className="w-full h-full" zoom={14} />
                      </div>
                    </div>
                  )}

                  {/* Splits Breakdown */}
                  {run.splits && run.splits.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-xs font-bold text-gray-300 uppercase tracking-wider">
                        <Layers className="w-4 h-4 text-[#2AB7CA]" />
                        <span>Per-Kilometer Splits</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2">
                        {run.splits.map(s => (
                          <div key={s.km} className="bg-[#1B263B] border border-white/5 p-2.5 rounded-xl text-center">
                            <span className="text-[10px] uppercase font-bold text-gray-400">KM {s.km}</span>
                            <div className="text-sm font-heading font-extrabold text-[#FF6B35] mt-0.5">
                              {s.paceMinKm}
                            </div>
                            <span className="text-[10px] text-gray-400 font-mono">
                              {Math.floor(s.timeSec / 60)}:{(s.timeSec % 60).toString().padStart(2, '0')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {runs.length === 0 && (
          <div className="bg-[#1B263B] border border-white/10 rounded-2xl p-12 text-center space-y-3">
            <span className="text-4xl">👟</span>
            <h3 className="font-heading font-bold text-lg text-white">No runs recorded yet</h3>
            <p className="text-xs text-gray-400">
              Start tracking your first run or simulated workout using the Live Tracker!
            </p>
            <button
              onClick={onStartNewRun}
              className="px-4 py-2 rounded-xl bg-[#FF6B35] text-white text-xs font-bold"
            >
              Start First Run
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
