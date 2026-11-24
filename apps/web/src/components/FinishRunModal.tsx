import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, CheckCircle, Share2, Flame, Timer, Gauge, MapPin, X } from 'lucide-react';
import { RunSession } from '../types';
import { getAutoRunTitle } from '../utils/geo';

interface FinishRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  runSession: RunSession | null;
  onConfirmSave: (title: string, shareToFeed: boolean) => void;
}

export const FinishRunModal: React.FC<FinishRunModalProps> = ({
  isOpen,
  onClose,
  runSession,
  onConfirmSave,
}) => {
  const [runTitle, setRunTitle] = useState('');
  const [shareToFeed, setShareToFeed] = useState(true);

  useEffect(() => {
    if (isOpen && runSession) {
      setRunTitle(runSession.title || getAutoRunTitle(runSession.eventTitle));
      // Trigger celebration confetti blast!
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#FF6B35', '#2AB7CA', '#FED766', '#2ECC71'],
        });
      } catch {
        // safe fallback
      }
    }
  }, [isOpen, runSession]);

  if (!isOpen || !runSession) return null;

  const minutes = Math.floor(runSession.durationSec / 60);
  const seconds = runSession.durationSec % 60;
  const timeFormatted = `${minutes}m ${seconds}s`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#1B263B] border border-white/15 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative">
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-[#FF6B35] to-[#ff8254] p-6 text-center text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="inline-flex p-3 rounded-2xl bg-white/20 mb-2 shadow-inner">
            <Trophy className="w-8 h-8 text-yellow-300 animate-bounce" />
          </div>
          <h2 className="font-heading font-extrabold text-2xl tracking-tight">Run Completed! 🔥</h2>
          <p className="text-white/80 text-xs mt-1">Outstanding workout, keep the momentum going!</p>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Title Input */}
          <div>
            <label className="block text-xs uppercase font-bold text-gray-400 mb-1.5">
              Name your run
            </label>
            <input
              type="text"
              value={runTitle}
              onChange={(e) => setRunTitle(e.target.value)}
              placeholder="e.g. Morning Seaside Stride"
              className="w-full bg-[#0D1B2A] border border-white/10 rounded-xl px-4 py-2.5 text-white font-semibold text-sm outline-none focus:border-[#FF6B35] transition-colors"
            />
          </div>

          {/* Key KPIs */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#0D1B2A] p-3 rounded-xl border border-white/5 text-center">
              <span className="text-[11px] font-bold text-gray-400 uppercase">Distance</span>
              <div className="text-xl font-heading font-extrabold text-[#FF6B35] mt-1">
                {runSession.distanceKm.toFixed(2)} <span className="text-xs">km</span>
              </div>
            </div>

            <div className="bg-[#0D1B2A] p-3 rounded-xl border border-white/5 text-center">
              <span className="text-[11px] font-bold text-gray-400 uppercase">Time</span>
              <div className="text-xl font-heading font-extrabold text-[#2AB7CA] mt-1">
                {timeFormatted}
              </div>
            </div>

            <div className="bg-[#0D1B2A] p-3 rounded-xl border border-white/5 text-center">
              <span className="text-[11px] font-bold text-gray-400 uppercase">Avg Pace</span>
              <div className="text-xl font-heading font-extrabold text-[#FED766] mt-1">
                {runSession.avgPace}
              </div>
            </div>
          </div>

          {/* Splits summary chips */}
          {runSession.splits.length > 0 && (
            <div className="bg-[#0D1B2A] p-3.5 rounded-xl border border-white/5 space-y-2">
              <div className="text-xs font-bold text-gray-300">Splits ({runSession.splits.length} km):</div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {runSession.splits.map(s => (
                  <span key={s.km} className="text-xs px-2 py-1 rounded bg-white/5 text-gray-300 font-mono">
                    KM {s.km}: <span className="text-[#FF6B35] font-semibold">{s.paceMinKm}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Share to Community Feed Checkbox */}
          <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-xl bg-[#0D1B2A] border border-white/5 hover:border-white/10 transition-colors">
            <input
              type="checkbox"
              checked={shareToFeed}
              onChange={(e) => setShareToFeed(e.target.checked)}
              className="w-4 h-4 accent-[#FF6B35] rounded"
            />
            <div className="text-xs">
              <span className="font-semibold text-white">Share to Community Social Feed</span>
              <p className="text-gray-400 text-[11px]">Inspire friends and collect kudos on your achievement!</p>
            </div>
          </label>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl text-xs font-bold text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
            >
              Discard
            </button>
            <button
              onClick={() => onConfirmSave(runTitle, shareToFeed)}
              className="flex-2 flex items-center justify-center space-x-2 py-3 px-6 rounded-xl bg-gradient-to-r from-[#FF6B35] to-[#ff8254] text-white font-heading font-bold text-sm shadow-lg shadow-orange-500/25 hover:scale-102 transition-all"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Save & Continue</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
