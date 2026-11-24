import React, { useState } from 'react';
import { Trophy, Medal, Flame, TrendingUp, Award, UserPlus, Check } from 'lucide-react';
import { UserProfile } from '../types';

interface LeaderboardViewProps {
  athletes: UserProfile[];
  currentUser: UserProfile;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  athletes,
  currentUser,
}) => {
  const [timeframe, setTimeframe] = useState<'weekly' | 'monthly' | 'allTime'>('monthly');
  const [followingMap, setFollowingMap] = useState<{ [id: string]: boolean }>({});

  const toggleFollow = (id: string) => {
    setFollowingMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Sort athletes by rankScore descending
  const sortedAthletes = [...athletes].sort((a, b) => b.rankScore - a.rankScore);

  const topThree = sortedAthletes.slice(0, 3);
  const remainingAthletes = sortedAthletes.slice(3);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/15 border border-yellow-500/30 text-yellow-400 text-xs font-bold uppercase tracking-wider">
          <Trophy className="w-3.5 h-3.5" />
          Tunisia Community Rankings
        </div>
        <h1 className="font-heading font-extrabold text-3xl sm:text-4xl text-white tracking-tight">
          Athlete Leaderboard
        </h1>
        <p className="text-gray-300 text-sm max-w-lg mx-auto">
          Earn rank points for every kilometer run and community event attended. Climb the tiers from Beginner to Elite!
        </p>

        {/* Timeframe Switcher */}
        <div className="inline-flex bg-[#1B263B] p-1 rounded-xl border border-white/10 mt-2">
          {(['weekly', 'monthly', 'allTime'] as const).map(tf => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                timeframe === tf
                  ? 'bg-[#FF6B35] text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tf === 'allTime' ? 'All Time' : tf}
            </button>
          ))}
        </div>
      </div>

      {/* Podium Top 3 */}
      <div className="grid grid-cols-3 gap-3 sm:gap-6 items-end pt-8 max-w-2xl mx-auto">
        {/* 2nd Place (Silver) */}
        {topThree[1] && (
          <div className="bg-[#1B263B] border border-white/10 rounded-3xl p-4 text-center space-y-3 relative group hover:border-gray-300/40 transition-all">
            <div className="w-8 h-8 rounded-full bg-gray-400 text-black font-extrabold text-sm flex items-center justify-center mx-auto shadow-md">
              2
            </div>
            <img
              src={topThree[1].avatar}
              alt={topThree[1].name}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full mx-auto object-cover ring-4 ring-gray-400/50"
            />
            <div>
              <div className="font-heading font-bold text-sm sm:text-base text-white truncate">{topThree[1].name}</div>
              <div className="text-[11px] text-gray-400">{topThree[1].region}</div>
            </div>
            <div className="bg-[#0D1B2A] py-1.5 px-2 rounded-xl text-xs font-bold text-[#FF6B35]">
              {topThree[1].rankScore} PTS
            </div>
            <div className="text-[10px] text-gray-400 font-mono">
              {topThree[1].totalDistanceKm.toFixed(0)} KM
            </div>
          </div>
        )}

        {/* 1st Place (Gold) */}
        {topThree[0] && (
          <div className="bg-gradient-to-b from-[#1B263B] to-[#25354e] border-2 border-yellow-400/50 rounded-3xl p-5 text-center space-y-3 relative shadow-2xl shadow-yellow-500/10 scale-105">
            <div className="w-9 h-9 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-extrabold text-base flex items-center justify-center mx-auto shadow-lg">
              👑
            </div>
            <img
              src={topThree[0].avatar}
              alt={topThree[0].name}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full mx-auto object-cover ring-4 ring-yellow-400"
            />
            <div>
              <div className="font-heading font-extrabold text-base sm:text-lg text-white truncate">{topThree[0].name}</div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-300 border border-yellow-400/30">
                {topThree[0].runningLevel}
              </span>
            </div>
            <div className="bg-[#0D1B2A] py-2 px-3 rounded-xl text-sm font-extrabold text-yellow-400">
              {topThree[0].rankScore} PTS
            </div>
            <div className="text-xs text-gray-300 font-mono font-semibold">
              {topThree[0].totalDistanceKm.toFixed(0)} KM RUN
            </div>
          </div>
        )}

        {/* 3rd Place (Bronze) */}
        {topThree[2] && (
          <div className="bg-[#1B263B] border border-white/10 rounded-3xl p-4 text-center space-y-3 relative group hover:border-amber-700/40 transition-all">
            <div className="w-8 h-8 rounded-full bg-amber-700 text-white font-extrabold text-sm flex items-center justify-center mx-auto shadow-md">
              3
            </div>
            <img
              src={topThree[2].avatar}
              alt={topThree[2].name}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full mx-auto object-cover ring-4 ring-amber-700/50"
            />
            <div>
              <div className="font-heading font-bold text-sm sm:text-base text-white truncate">{topThree[2].name}</div>
              <div className="text-[11px] text-gray-400">{topThree[2].region}</div>
            </div>
            <div className="bg-[#0D1B2A] py-1.5 px-2 rounded-xl text-xs font-bold text-[#FF6B35]">
              {topThree[2].rankScore} PTS
            </div>
            <div className="text-[10px] text-gray-400 font-mono">
              {topThree[2].totalDistanceKm.toFixed(0)} KM
            </div>
          </div>
        )}
      </div>

      {/* Ranks Table */}
      <div className="bg-[#1B263B] border border-white/10 rounded-2xl p-5 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase font-bold text-gray-400">
              <th className="py-3 px-4">Rank</th>
              <th className="py-3 px-4">Athlete</th>
              <th className="py-3 px-4">Governorate</th>
              <th className="py-3 px-4">Tier</th>
              <th className="py-3 px-4">Total KM</th>
              <th className="py-3 px-4">Score</th>
              <th className="py-3 px-4 text-right">Connect</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {sortedAthletes.map((athlete, index) => {
              const rank = index + 1;
              const isCurrentUser = athlete.id === currentUser.id;
              const isFollowing = !!followingMap[athlete.id];

              return (
                <tr
                  key={athlete.id}
                  className={`hover:bg-white/5 transition-colors ${
                    isCurrentUser ? 'bg-orange-500/10' : ''
                  }`}
                >
                  <td className="py-3.5 px-4 font-heading font-bold text-base text-gray-300">
                    {rank === 1 ? '🥇 1' : rank === 2 ? '🥈 2' : rank === 3 ? '🥉 3' : `#${rank}`}
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="flex items-center space-x-3">
                      <img
                        src={athlete.avatar}
                        alt={athlete.name}
                        className="w-9 h-9 rounded-full object-cover ring-1 ring-white/20"
                      />
                      <div>
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span>{athlete.name}</span>
                          {isCurrentUser && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#FF6B35] text-white">YOU</span>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-400">@{athlete.username}</div>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 text-xs text-gray-300">
                    {athlete.region}
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 text-gray-200 border border-white/10">
                      {athlete.runningLevel}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 font-mono font-bold text-white text-xs">
                    {athlete.totalDistanceKm.toFixed(1)} km
                  </td>

                  <td className="py-3.5 px-4 font-heading font-extrabold text-[#FF6B35]">
                    {athlete.rankScore}
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    {!isCurrentUser && (
                      <button
                        onClick={() => toggleFollow(athlete.id)}
                        className={`text-xs px-3 py-1.5 rounded-xl font-semibold transition-all ${
                          isFollowing
                            ? 'bg-white/10 text-gray-300 hover:bg-white/15'
                            : 'bg-[#FF6B35]/20 text-[#FF6B35] border border-[#FF6B35]/40 hover:bg-[#FF6B35]/30'
                        }`}
                      >
                        {isFollowing ? 'Following' : '+ Follow'}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
