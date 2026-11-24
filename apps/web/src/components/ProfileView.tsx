import React from 'react';
import { 
  User, 
  MapPin, 
  Trophy, 
  Activity, 
  Flame, 
  Calendar, 
  CheckCircle, 
  Award,
  Sparkles
} from 'lucide-react';
import { UserProfile } from '../types';

interface ProfileViewProps {
  currentUser: UserProfile;
  otherUsers: UserProfile[];
  onSwitchUser: (user: UserProfile) => void;
  onStartRun: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  currentUser,
  otherUsers,
  onSwitchUser,
  onStartRun,
}) => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Profile Header Card */}
      <div className="bg-gradient-to-r from-[#1B263B] to-[#25354e] border border-white/10 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
        <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6 text-center sm:text-left z-10">
          <img
            src={currentUser.avatar}
            alt={currentUser.name}
            className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover ring-4 ring-[#FF6B35] shadow-xl"
          />

          <div className="space-y-2 flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-white">
                {currentUser.name}
              </h1>
              <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full bg-orange-500/20 text-[#FF6B35] border border-orange-500/30 w-fit mx-auto sm:mx-0">
                <Award className="w-3.5 h-3.5" />
                {currentUser.runningLevel} ATHLETE
              </span>
            </div>

            <div className="flex items-center justify-center sm:justify-start space-x-3 text-xs text-gray-400">
              <span>@{currentUser.username}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#2AB7CA]" />
                {currentUser.region}, Tunisia
              </span>
            </div>

            <p className="text-gray-300 text-xs sm:text-sm max-w-lg leading-relaxed pt-1">
              {currentUser.bio}
            </p>

            {/* Preferred Sports */}
            <div className="flex items-center justify-center sm:justify-start gap-1.5 pt-2 flex-wrap">
              {currentUser.preferredSports.map(sport => (
                <span key={sport} className="text-xs px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-300 capitalize">
                  {sport}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Lifetime Stats Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-8 pt-6 border-t border-white/10">
          <div className="bg-[#0D1B2A]/80 p-3.5 rounded-2xl border border-white/5 text-center">
            <div className="text-[11px] font-bold text-gray-400 uppercase">Total Distance</div>
            <div className="text-2xl font-heading font-extrabold text-[#FF6B35] mt-1">
              {currentUser.totalDistanceKm.toFixed(1)} <span className="text-xs">km</span>
            </div>
          </div>

          <div className="bg-[#0D1B2A]/80 p-3.5 rounded-2xl border border-white/5 text-center">
            <div className="text-[11px] font-bold text-gray-400 uppercase">Rank Score</div>
            <div className="text-2xl font-heading font-extrabold text-[#FED766] mt-1">
              {currentUser.rankScore} <span className="text-xs">pts</span>
            </div>
          </div>

          <div className="bg-[#0D1B2A]/80 p-3.5 rounded-2xl border border-white/5 text-center">
            <div className="text-[11px] font-bold text-gray-400 uppercase">Runs Logged</div>
            <div className="text-2xl font-heading font-extrabold text-white mt-1">
              {currentUser.totalRuns}
            </div>
          </div>

          <div className="bg-[#0D1B2A]/80 p-3.5 rounded-2xl border border-white/5 text-center">
            <div className="text-[11px] font-bold text-gray-400 uppercase">Events Joined</div>
            <div className="text-2xl font-heading font-extrabold text-[#2AB7CA] mt-1">
              {currentUser.eventsJoined}
            </div>
          </div>
        </div>
      </div>

      {/* Demo Athlete Profiles Switcher Card */}
      <div className="bg-[#1B263B] border border-white/10 rounded-2xl p-6 space-y-4 shadow-lg">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-yellow-400" />
          <h3 className="font-heading font-bold text-lg text-white">Interactive Demo Profiles</h3>
        </div>
        <p className="text-xs text-gray-400">
          Easily test the app from different athlete perspectives to experience group runs, social posts, and leaderboard positions:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[currentUser, ...otherUsers].map(u => {
            const isActive = u.id === currentUser.id;
            return (
              <div
                key={u.id}
                onClick={() => onSwitchUser(u)}
                className={`p-3.5 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
                  isActive
                    ? 'bg-orange-500/10 border-[#FF6B35] ring-2 ring-[#FF6B35]/30'
                    : 'bg-[#0D1B2A] border-white/5 hover:border-white/20'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <img
                    src={u.avatar}
                    alt={u.name}
                    className="w-10 h-10 rounded-full object-cover ring-1 ring-white/10"
                  />
                  <div>
                    <div className="text-sm font-bold text-white">{u.name}</div>
                    <div className="text-[11px] text-gray-400">
                      {u.region} • {u.runningLevel} ({u.totalDistanceKm.toFixed(0)} km)
                    </div>
                  </div>
                </div>

                {isActive ? (
                  <span className="text-xs font-bold text-[#FF6B35] px-2 py-1 rounded bg-[#FF6B35]/20">
                    Active
                  </span>
                ) : (
                  <button className="text-xs font-semibold text-gray-400 hover:text-white">
                    Switch
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
