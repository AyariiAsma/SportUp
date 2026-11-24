import React from 'react';
import { 
  Activity, 
  MapPin, 
  Users, 
  Trophy, 
  History, 
  User, 
  Bell, 
  Flame,
  PlusCircle,
  Play
} from 'lucide-react';
import { UserProfile, AppNotification } from '../types';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  currentUser: UserProfile;
  otherUsers: UserProfile[];
  onSwitchUser: (user: UserProfile) => void;
  notifications: AppNotification[];
  onOpenNotifications: () => void;
  onCreateEventClick: () => void;
  isTrackingActive?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  otherUsers,
  onSwitchUser,
  notifications,
  onOpenNotifications,
  onCreateEventClick,
  isTrackingActive,
}) => {
  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <header className="sticky top-0 z-50 glass-nav transition-all duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('explore')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#FF6B35] to-[#FFA07A] flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Flame className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-heading font-extrabold text-xl text-white tracking-tight">SportUp</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-orange-500/20 text-[#FF6B35] border border-orange-500/30">Web</span>
              </div>
              <p className="text-[10px] text-gray-400 font-medium">Connect • Train • Compete</p>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="hidden md:flex items-center space-x-1">
            <button
              onClick={() => setActiveTab('explore')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'explore'
                  ? 'bg-[#FF6B35] text-white shadow-md shadow-orange-500/20'
                  : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <MapPin className="w-4 h-4" />
              <span>Explore Events</span>
            </button>

            <button
              onClick={() => setActiveTab('tracker')}
              className={`relative flex items-center space-x-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'tracker'
                  ? 'bg-[#FF6B35] text-white shadow-md shadow-orange-500/20'
                  : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Play className="w-4 h-4 text-emerald-400" />
              <span>Live Tracker</span>
              {isTrackingActive && (
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping absolute top-2 right-1.5" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('feed')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'feed'
                  ? 'bg-[#FF6B35] text-white shadow-md shadow-orange-500/20'
                  : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Community Feed</span>
            </button>

            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'leaderboard'
                  ? 'bg-[#FF6B35] text-white shadow-md shadow-orange-500/20'
                  : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span>Leaderboard</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'history'
                  ? 'bg-[#FF6B35] text-white shadow-md shadow-orange-500/20'
                  : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <History className="w-4 h-4" />
              <span>My Runs</span>
            </button>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center space-x-3">
            {/* Create Event Button */}
            <button
              onClick={onCreateEventClick}
              className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#2AB7CA]/20 text-[#2AB7CA] border border-[#2AB7CA]/40 hover:bg-[#2AB7CA]/30 transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Host Run</span>
            </button>

            {/* Notification Bell */}
            <button
              onClick={onOpenNotifications}
              className="relative p-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-[#FF6B35] text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-[#0D1B2A]">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* User Profile & Demo Switcher */}
            <div className="flex items-center space-x-2 pl-2 border-l border-white/10">
              <button
                onClick={() => setActiveTab('profile')}
                className="flex items-center space-x-2 p-1 rounded-xl hover:bg-white/5 transition-all text-left group"
              >
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-[#FF6B35]/40 group-hover:ring-[#FF6B35]"
                />
                <div className="hidden lg:block">
                  <div className="text-xs font-bold text-white group-hover:text-[#FF6B35] transition-colors leading-none">
                    {currentUser.name}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">
                    {currentUser.totalDistanceKm.toFixed(0)} km • {currentUser.runningLevel}
                  </div>
                </div>
              </button>

              {/* Demo Switcher Select */}
              <select
                aria-label="Switch athlete demo profile"
                value={currentUser.id}
                onChange={(e) => {
                  const selected = [currentUser, ...otherUsers].find(u => u.id === e.target.value);
                  if (selected) onSwitchUser(selected);
                }}
                className="bg-[#1B263B] text-[11px] text-gray-300 border border-white/10 rounded-lg px-2 py-1 outline-none hover:border-[#FF6B35]/50 cursor-pointer"
                title="Switch demo profile"
              >
                <option value={currentUser.id}>{currentUser.name.split(' ')[0]} (You)</option>
                {otherUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.name.split(' ')[0]} ({u.runningLevel})</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Tab Bar */}
      <div className="md:hidden flex items-center justify-around py-2.5 px-2 bg-[#0D1B2A]/95 border-t border-white/10 backdrop-blur-md">
        <button
          onClick={() => setActiveTab('explore')}
          className={`flex flex-col items-center text-[10px] font-semibold ${
            activeTab === 'explore' ? 'text-[#FF6B35]' : 'text-gray-400'
          }`}
        >
          <MapPin className="w-5 h-5 mb-0.5" />
          <span>Explore</span>
        </button>

        <button
          onClick={() => setActiveTab('tracker')}
          className={`relative flex flex-col items-center text-[10px] font-semibold ${
            activeTab === 'tracker' ? 'text-[#FF6B35]' : 'text-gray-400'
          }`}
        >
          <Play className="w-5 h-5 mb-0.5 text-emerald-400" />
          <span>Live Run</span>
          {isTrackingActive && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 absolute top-0 right-3 animate-ping" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('feed')}
          className={`flex flex-col items-center text-[10px] font-semibold ${
            activeTab === 'feed' ? 'text-[#FF6B35]' : 'text-gray-400'
          }`}
        >
          <Users className="w-5 h-5 mb-0.5" />
          <span>Feed</span>
        </button>

        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`flex flex-col items-center text-[10px] font-semibold ${
            activeTab === 'leaderboard' ? 'text-[#FF6B35]' : 'text-gray-400'
          }`}
        >
          <Trophy className="w-5 h-5 mb-0.5" />
          <span>Ranks</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center text-[10px] font-semibold ${
            activeTab === 'history' ? 'text-[#FF6B35]' : 'text-gray-400'
          }`}
        >
          <History className="w-5 h-5 mb-0.5" />
          <span>History</span>
        </button>
      </div>
    </header>
  );
};
