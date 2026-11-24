import React, { useState } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  Volume2, 
  VolumeX, 
  Flame, 
  Timer, 
  Gauge, 
  MapPin, 
  Navigation2, 
  CheckCircle2, 
  Sparkles,
  Layers
} from 'lucide-react';
import { LeafletMap } from './LeafletMap';
import { SplitLap, RunSession } from '../types';

interface LiveRunTrackerViewProps {
  tracker: {
    status: 'idle' | 'running' | 'paused' | 'finished';
    distanceKm: number;
    durationSec: number;
    durationFormatted: string;
    currentPace: string;
    avgPace: string;
    splits: SplitLap[];
    route: any[];
    currentLocation: any;
    audioCuesEnabled: boolean;
    setAudioCuesEnabled: (enabled: boolean) => void;
    isSimulated: boolean;
    setIsSimulated: (sim: boolean) => void;
    linkedEvent: { id: string; title: string } | null;
    startTracking: (simulated?: boolean, event?: any) => void;
    pauseTracking: () => void;
    resumeTracking: () => void;
    finishTracking: (customTitle?: string) => RunSession;
    resetTracking: () => void;
  };
  onOpenFinishModal: () => void;
}

export const LiveRunTrackerView: React.FC<LiveRunTrackerViewProps> = ({
  tracker,
  onOpenFinishModal,
}) => {
  const [selectedSimRoute, setSelectedSimRoute] = useState<'carthage' | 'custom'>('carthage');

  const caloriesEstimated = Math.round(tracker.distanceKm * 65);

  const handleFinishClick = () => {
    tracker.pauseTracking();
    onOpenFinishModal();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Banner / Event link info */}
      {tracker.linkedEvent && (
        <div className="bg-gradient-to-r from-orange-500/20 to-teal-500/10 border border-orange-500/30 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="p-2 rounded-xl bg-[#FF6B35] text-white">
              <Navigation2 className="w-5 h-5" />
            </span>
            <div>
              <div className="text-xs uppercase font-bold text-[#FF6B35]">Planned Event Run</div>
              <div className="text-sm font-semibold text-white">{tracker.linkedEvent.title}</div>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-white/10 rounded-full text-gray-300">
            Linked Workout
          </span>
        </div>
      )}

      {/* Main HUD Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Distance Card */}
        <div className="bg-[#1B263B] border border-white/10 rounded-2xl p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Distance</span>
            <MapPin className="w-4 h-4 text-[#FF6B35]" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-4xl sm:text-5xl font-heading font-extrabold text-white tracking-tight">
              {tracker.distanceKm.toFixed(2)}
            </span>
            <span className="text-sm font-bold text-[#FF6B35]">KM</span>
          </div>
          <div className="mt-2 text-xs text-gray-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
            GPS Accurate
          </div>
        </div>

        {/* Duration Card */}
        <div className="bg-[#1B263B] border border-white/10 rounded-2xl p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Duration</span>
            <Timer className="w-4 h-4 text-[#2AB7CA]" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-4xl sm:text-5xl font-heading font-extrabold text-white tracking-tight">
              {tracker.durationFormatted}
            </span>
          </div>
          <div className="mt-2 text-xs text-gray-400">
            {tracker.status === 'running' ? 'Tracking in real-time' : tracker.status === 'paused' ? 'Paused' : 'Ready'}
          </div>
        </div>

        {/* Avg Pace Card */}
        <div className="bg-[#1B263B] border border-white/10 rounded-2xl p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Avg Pace</span>
            <Gauge className="w-4 h-4 text-[#FED766]" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-4xl sm:text-5xl font-heading font-extrabold text-white tracking-tight">
              {tracker.avgPace}
            </span>
            <span className="text-xs font-bold text-gray-400">/KM</span>
          </div>
          <div className="mt-2 text-xs text-gray-400">
            Current: <span className="text-white font-semibold">{tracker.currentPace}</span>
          </div>
        </div>

        {/* Calories Card */}
        <div className="bg-[#1B263B] border border-white/10 rounded-2xl p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Calories</span>
            <Flame className="w-4 h-4 text-orange-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-4xl sm:text-5xl font-heading font-extrabold text-white tracking-tight">
              {caloriesEstimated}
            </span>
            <span className="text-xs font-bold text-orange-400">KCAL</span>
          </div>
          <div className="mt-2 text-xs text-gray-400">
            Energy burn estimate
          </div>
        </div>
      </div>

      {/* Map & Live Route Replay */}
      <div className="bg-[#1B263B] border border-white/10 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <Navigation2 className="w-5 h-5 text-[#FF6B35]" />
            <h3 className="font-heading font-bold text-lg text-white">Live Route & GPS Positioning</h3>
          </div>

          {/* Controls: Audio Cues & Simulator mode */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => tracker.setAudioCuesEnabled(!tracker.audioCuesEnabled)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                tracker.audioCuesEnabled
                  ? 'bg-orange-500/10 text-[#FF6B35] border-orange-500/30'
                  : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
              }`}
              title="Voice coach audio split announcements"
            >
              {tracker.audioCuesEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span>Voice Coach {tracker.audioCuesEnabled ? 'ON' : 'OFF'}</span>
            </button>

            {/* Simulation toggle */}
            <button
              onClick={() => {
                if (tracker.status === 'idle') {
                  tracker.setIsSimulated(!tracker.isSimulated);
                }
              }}
              disabled={tracker.status !== 'idle'}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                tracker.isSimulated
                  ? 'bg-teal-500/15 text-[#2AB7CA] border-teal-500/40'
                  : 'bg-white/5 text-gray-400 border-white/10'
              }`}
              title="Toggle simulated GPS route for desktop testing"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Simulated Route: {tracker.isSimulated ? 'Carthage Coast' : 'Device GPS'}</span>
            </button>
          </div>
        </div>

        {/* Map Container */}
        <div className="h-80 sm:h-96 w-full rounded-xl overflow-hidden border border-white/5 relative">
          <LeafletMap
            route={tracker.route}
            currentPoint={tracker.currentLocation}
            className="w-full h-full"
            zoom={14}
          />

          {/* Floating Controls Overlay */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[400] flex items-center space-x-3 bg-[#0D1B2A]/90 p-2 rounded-2xl border border-white/15 backdrop-blur-md shadow-2xl">
            {tracker.status === 'idle' && (
              <button
                onClick={() => tracker.startTracking(tracker.isSimulated, tracker.linkedEvent)}
                className="flex items-center space-x-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#FF6B35] to-[#ff8254] text-white font-heading font-bold text-base shadow-lg shadow-orange-500/30 hover:scale-105 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>START RUN</span>
              </button>
            )}

            {tracker.status === 'running' && (
              <>
                <button
                  onClick={tracker.pauseTracking}
                  className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-[#2AB7CA] text-white font-heading font-bold text-sm shadow-md hover:bg-[#25a2b3] transition-all"
                >
                  <Pause className="w-4 h-4 fill-white" />
                  <span>PAUSE</span>
                </button>
                <button
                  onClick={handleFinishClick}
                  className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-[#E74C3C] text-white font-heading font-bold text-sm shadow-md hover:bg-[#d63b2c] transition-all"
                >
                  <Square className="w-4 h-4 fill-white" />
                  <span>FINISH</span>
                </button>
              </>
            )}

            {tracker.status === 'paused' && (
              <>
                <button
                  onClick={tracker.resumeTracking}
                  className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-white font-heading font-bold text-sm shadow-md hover:bg-emerald-600 transition-all"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>RESUME</span>
                </button>
                <button
                  onClick={handleFinishClick}
                  className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-[#E74C3C] text-white font-heading font-bold text-sm shadow-md hover:bg-[#d63b2c] transition-all"
                >
                  <Square className="w-4 h-4 fill-white" />
                  <span>FINISH</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Per-Kilometer Splits Section */}
      <div className="bg-[#1B263B] border border-white/10 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Layers className="w-5 h-5 text-[#2AB7CA]" />
            <h3 className="font-heading font-bold text-lg text-white">Kilometer Splits</h3>
          </div>
          <span className="text-xs text-gray-400 font-medium">
            {tracker.splits.length} km logged
          </span>
        </div>

        {tracker.splits.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            <p>Every 1.0 km you run will automatically appear here with exact split time and pace.</p>
            <p className="text-xs text-gray-500 mt-1">Audio cues will announce your splits through your headphones!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase font-bold text-gray-400">
                  <th className="py-2.5 px-3">Split</th>
                  <th className="py-2.5 px-3">Lap Time</th>
                  <th className="py-2.5 px-3">Pace</th>
                  <th className="py-2.5 px-3 text-right">Pace Graph</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {tracker.splits.map((split) => {
                  const minutes = Math.floor(split.timeSec / 60);
                  const seconds = split.timeSec % 60;
                  const formattedLap = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                  // Pace bar width proportional (4 min = 100%, 7 min = 40%)
                  const barWidth = Math.max(20, Math.min(100, (300 / split.timeSec) * 100));

                  return (
                    <tr key={split.km} className="hover:bg-white/5 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-white flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>KM {split.km}</span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-gray-300">{formattedLap}</td>
                      <td className="py-2.5 px-3 font-semibold text-[#FF6B35]">{split.paceMinKm} /km</td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="w-32 bg-white/10 rounded-full h-2 inline-block overflow-hidden align-middle">
                          <div
                            className="bg-gradient-to-r from-[#FF6B35] to-[#FED766] h-full rounded-full"
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
