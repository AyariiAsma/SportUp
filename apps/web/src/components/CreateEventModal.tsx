import React, { useState } from 'react';
import { X, Calendar, MapPin, Plus, Trophy, Navigation2 } from 'lucide-react';
import { SportEvent, SportType, EventDifficulty, UserProfile } from '../types';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onCreateEvent: (event: SportEvent) => void;
}

export const CreateEventModal: React.FC<CreateEventModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onCreateEvent,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sport, setSport] = useState<SportType>('running');
  const [difficulty, setDifficulty] = useState<EventDifficulty>('INTERMEDIATE');
  const [startAt, setStartAt] = useState('This Saturday, 07:30 AM');
  const [locationName, setLocationName] = useState('');
  const [region, setRegion] = useState('Tunis');
  const [distanceKm, setDistanceKm] = useState('7.5');
  const [maxParticipants, setMaxParticipants] = useState('25');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !locationName.trim()) return;

    // Default coords based on selected region
    let lat = 36.8065;
    let lng = 10.1815;
    if (region === 'Nabeul') { lat = 36.4561; lng = 10.7376; }
    if (region === 'Sousse') { lat = 35.8256; lng = 10.6369; }
    if (region === 'Bizerte') { lat = 37.2744; lng = 9.8739; }

    const newEvent: SportEvent = {
      id: `evt-${Date.now()}`,
      title: title.trim(),
      description: description.trim() || `Community group ${sport} event in ${locationName}. All paces welcome!`,
      sport,
      difficulty,
      startAt,
      locationName: locationName.trim(),
      region,
      lat,
      lng,
      distanceKm: parseFloat(distanceKm) || 5.0,
      maxParticipants: parseInt(maxParticipants, 10) || 20,
      organizer: {
        id: currentUser.id,
        name: currentUser.name,
        avatar: currentUser.avatar,
        level: currentUser.runningLevel,
      },
      participants: [
        { id: currentUser.id, name: currentUser.name, avatar: currentUser.avatar }
      ],
      coverImage: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=800&q=80',
      status: 'UPCOMING',
    };

    onCreateEvent(newEvent);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#1B263B] border border-white/15 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1B263B] to-[#25354e] p-5 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="font-heading font-extrabold text-xl text-white">Host a Group Activity</h2>
            <p className="text-gray-400 text-xs">Create an event for runners and athletes in your area</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Title */}
          <div>
            <label className="block text-xs uppercase font-bold text-gray-400 mb-1">
              Event Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Sidi Bou Said Sunset 8K Run"
              className="w-full bg-[#0D1B2A] border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white outline-none focus:border-[#FF6B35] transition-colors"
            />
          </div>

          {/* Sport & Difficulty */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs uppercase font-bold text-gray-400 mb-1">
                Sport
              </label>
              <select
                aria-label="Event sport type"
                value={sport}
                onChange={(e) => setSport(e.target.value as SportType)}
                className="w-full bg-[#0D1B2A] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
              >
                <option value="running">🏃 Running</option>
                <option value="cycling">🚴 Cycling</option>
                <option value="hiking">🥾 Hiking</option>
                <option value="yoga">🧘 Yoga</option>
                <option value="football">⚽ Football</option>
                <option value="fitness">💪 Fitness</option>
              </select>
            </div>

            <div>
              <label className="block text-xs uppercase font-bold text-gray-400 mb-1">
                Difficulty
              </label>
              <select
                aria-label="Event difficulty level"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as EventDifficulty)}
                className="w-full bg-[#0D1B2A] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
              >
                <option value="BEGINNER">Beginner (All Paces)</option>
                <option value="INTERMEDIATE">Intermediate (Regular)</option>
                <option value="ADVANCED">Advanced (Fast Pace)</option>
                <option value="ELITE">Elite (Competitive)</option>
              </select>
            </div>
          </div>

          {/* Date & Time */}
          <div>
            <label className="block text-xs uppercase font-bold text-gray-400 mb-1">
              Date & Start Time
            </label>
            <input
              type="text"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              placeholder="e.g. Sunday, 07:00 AM"
              className="w-full bg-[#0D1B2A] border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white outline-none focus:border-[#FF6B35] transition-colors"
            />
          </div>

          {/* Location & Region */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs uppercase font-bold text-gray-400 mb-1">
                Meeting Point / Location *
              </label>
              <input
                type="text"
                required
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="e.g. Café des Délices"
                className="w-full bg-[#0D1B2A] border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white outline-none focus:border-[#FF6B35] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs uppercase font-bold text-gray-400 mb-1">
                Governorate
              </label>
              <select
                aria-label="Event governorate region"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full bg-[#0D1B2A] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
              >
                <option value="Tunis">Tunis</option>
                <option value="Nabeul">Nabeul</option>
                <option value="Sousse">Sousse</option>
                <option value="Bizerte">Bizerte</option>
              </select>
            </div>
          </div>

          {/* Distance & Max Participants */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs uppercase font-bold text-gray-400 mb-1">
                Distance (KM)
              </label>
              <input
                type="number"
                step="0.5"
                value={distanceKm}
                onChange={(e) => setDistanceKm(e.target.value)}
                className="w-full bg-[#0D1B2A] border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white outline-none focus:border-[#FF6B35] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs uppercase font-bold text-gray-400 mb-1">
                Max Athletes
              </label>
              <input
                type="number"
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(e.target.value)}
                className="w-full bg-[#0D1B2A] border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white outline-none focus:border-[#FF6B35] transition-colors"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs uppercase font-bold text-gray-400 mb-1">
              Description & Route Details
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What to bring, route surface, hydration notes..."
              className="w-full bg-[#0D1B2A] border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-[#FF6B35] transition-colors resize-none"
            />
          </div>

          {/* Submit Buttons */}
          <div className="pt-2 flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-gray-400 bg-white/5 hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-2 py-2.5 px-6 rounded-xl bg-gradient-to-r from-[#FF6B35] to-[#ff8254] text-white font-heading font-bold text-sm shadow-lg shadow-orange-500/25 hover:scale-102 transition-all"
            >
              Publish Event
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
