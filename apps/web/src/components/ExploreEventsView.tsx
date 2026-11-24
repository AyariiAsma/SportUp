import React, { useState } from 'react';
import { 
  MapPin, 
  Calendar, 
  Users, 
  PlusCircle, 
  Search, 
  Filter, 
  Navigation2, 
  ChevronRight, 
  Check, 
  Play, 
  Map as MapIcon, 
  List,
  Sparkles
} from 'lucide-react';
import { SportEvent, SportType, UserProfile } from '../types';
import { LeafletMap } from './LeafletMap';

interface ExploreEventsViewProps {
  events: SportEvent[];
  currentUser: UserProfile;
  onJoinEvent: (eventId: string) => void;
  onLeaveEvent: (eventId: string) => void;
  onStartEventRun: (event: SportEvent) => void;
  onCreateEventClick: () => void;
}

const SPORTS_FILTER: Array<{ id: 'all' | SportType; label: string; icon: string }> = [
  { id: 'all', label: 'All Activities', icon: '⚡' },
  { id: 'running', label: 'Running', icon: '🏃' },
  { id: 'cycling', label: 'Cycling', icon: '🚴' },
  { id: 'football', label: 'Football', icon: '⚽' },
  { id: 'yoga', label: 'Yoga', icon: '🧘' },
  { id: 'hiking', label: 'Hiking', icon: '🥾' },
  { id: 'fitness', label: 'Fitness', icon: '💪' },
];

const REGIONS_FILTER = ['All Regions', 'Tunis', 'Nabeul', 'Sousse', 'Bizerte'];

export const ExploreEventsView: React.FC<ExploreEventsViewProps> = ({
  events,
  currentUser,
  onJoinEvent,
  onLeaveEvent,
  onStartEventRun,
  onCreateEventClick,
}) => {
  const [selectedSport, setSelectedSport] = useState<'all' | SportType>('all');
  const [selectedRegion, setSelectedRegion] = useState<string>('All Regions');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Filter events
  const filteredEvents = events.filter(e => {
    const matchesSport = selectedSport === 'all' || e.sport === selectedSport;
    const matchesRegion = selectedRegion === 'All Regions' || e.region.toLowerCase() === selectedRegion.toLowerCase();
    const matchesQuery = !searchQuery || 
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      e.locationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSport && matchesRegion && matchesQuery;
  });

  // Prepare map markers
  const mapMarkers = filteredEvents.map(e => ({
    id: e.id,
    lat: e.lat,
    lng: e.lng,
    title: e.title,
    subtitle: `${e.distanceKm} KM • ${e.startAt}`,
    badge: e.difficulty,
    onClick: () => setSelectedEventId(e.id),
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#1B263B] via-[#24324d] to-[#1B263B] border border-white/10 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 z-10 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-[#FF6B35] text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            Discover & Join Group Runs
          </div>
          <h1 className="font-heading font-extrabold text-3xl sm:text-4xl text-white tracking-tight">
            Explore Sporting Events
          </h1>
          <p className="text-gray-300 text-sm leading-relaxed">
            Find group runs, community cycling, and sports activities near you or across Tunisia. Run together, stay motivated!
          </p>
        </div>

        <div className="flex items-center gap-3 z-10 w-full sm:w-auto">
          <button
            onClick={onCreateEventClick}
            className="flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-[#FF6B35] to-[#ff8254] text-white font-heading font-bold text-sm shadow-xl shadow-orange-500/25 hover:scale-102 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Host New Event</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#1B263B] border border-white/10 rounded-2xl p-4 space-y-4">
        {/* Top Controls: Search, Region, View Mode */}
        <div className="flex flex-col md:flex-row items-center gap-3 justify-between">
          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, park, or city..."
              className="w-full bg-[#0D1B2A] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-white placeholder-gray-500 outline-none focus:border-[#FF6B35] transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
            {/* Region select */}
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-gray-400" />
              <select
                aria-label="Filter events by region"
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="bg-[#0D1B2A] text-xs font-semibold text-gray-200 border border-white/10 rounded-xl px-3 py-2 outline-none hover:border-[#FF6B35]/50 cursor-pointer"
              >
                {REGIONS_FILTER.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-[#0D1B2A] p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'list' ? 'bg-[#FF6B35] text-white shadow' : 'text-gray-400 hover:text-white'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">List</span>
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'map' ? 'bg-[#FF6B35] text-white shadow' : 'text-gray-400 hover:text-white'
                }`}
              >
                <MapIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Map</span>
              </button>
            </div>
          </div>
        </div>

        {/* Sports Categories Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {SPORTS_FILTER.map(sport => (
            <button
              key={sport.id}
              onClick={() => setSelectedSport(sport.id)}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                selectedSport === sport.id
                  ? 'bg-[#FF6B35] text-white shadow-md shadow-orange-500/20'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white border border-white/5'
              }`}
            >
              <span>{sport.icon}</span>
              <span>{sport.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content: Map or List */}
      {viewMode === 'map' ? (
        <div className="bg-[#1B263B] border border-white/10 rounded-2xl p-4 space-y-4">
          <div className="h-[480px] rounded-xl overflow-hidden border border-white/5 relative">
            <LeafletMap markers={mapMarkers} className="w-full h-full" zoom={12} />
          </div>
          <div className="text-xs text-gray-400">
            Showing {filteredEvents.length} events pinned on the interactive map. Click on any event pin to view details.
          </div>
        </div>
      ) : null}

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredEvents.map(event => {
          const isParticipant = event.participants.some(p => p.id === currentUser.id);
          const isOrganizer = event.organizer.id === currentUser.id;

          return (
            <div
              key={event.id}
              className={`bg-[#1B263B] border rounded-2xl overflow-hidden flex flex-col justify-between transition-all hover:border-[#FF6B35]/50 group ${
                selectedEventId === event.id ? 'border-[#FF6B35] ring-2 ring-[#FF6B35]/30' : 'border-white/10'
              }`}
            >
              {/* Cover Image / Thumbnail */}
              <div className="relative h-44 w-full overflow-hidden bg-[#0D1B2A]">
                {event.coverImage ? (
                  <img
                    src={event.coverImage}
                    alt={event.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-[#1B263B] to-[#24324d]">
                    <span className="text-4xl">🏃</span>
                  </div>
                )}
                {/* Distance Badge */}
                <div className="absolute top-3 left-3 bg-[#0D1B2A]/85 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/15 text-xs font-bold text-white flex items-center gap-1">
                  <span className="text-[#FF6B35]">●</span> {event.distanceKm} KM
                </div>
                {/* Difficulty Badge */}
                <div className="absolute top-3 right-3 bg-[#0D1B2A]/85 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/15 text-xs font-bold text-white">
                  {event.difficulty}
                </div>
              </div>

              {/* Event Body */}
              <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-gray-400">
                    <Calendar className="w-3.5 h-3.5 text-[#2AB7CA]" />
                    <span>{event.startAt}</span>
                  </div>

                  <h3 className="font-heading font-bold text-lg text-white group-hover:text-[#FF6B35] transition-colors line-clamp-1">
                    {event.title}
                  </h3>

                  <p className="text-gray-300 text-xs line-clamp-2 leading-relaxed">
                    {event.description}
                  </p>

                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <MapPin className="w-3.5 h-3.5 text-[#FF6B35]" />
                    <span className="truncate">{event.locationName} ({event.region})</span>
                  </div>
                </div>

                {/* Organizer & Attendees */}
                <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <img
                      src={event.organizer.avatar}
                      alt={event.organizer.name}
                      className="w-7 h-7 rounded-full object-cover ring-1 ring-[#FF6B35]"
                    />
                    <div className="text-xs">
                      <div className="font-bold text-white leading-tight">{event.organizer.name}</div>
                      <div className="text-[10px] text-gray-400">Host • {event.organizer.level}</div>
                    </div>
                  </div>

                  {/* Attendees Avatars */}
                  <div className="flex items-center -space-x-2 overflow-hidden">
                    {event.participants.slice(0, 3).map((p, idx) => (
                      <img
                        key={idx}
                        src={p.avatar}
                        alt={p.name}
                        className="inline-block h-6 w-6 rounded-full ring-2 ring-[#1B263B] object-cover"
                      />
                    ))}
                    {event.participants.length > 3 && (
                      <span className="flex items-center justify-center h-6 w-6 rounded-full bg-[#0D1B2A] text-[10px] font-bold text-gray-300 ring-2 ring-[#1B263B]">
                        +{event.participants.length - 3}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions: Join / Leave & Start Run */}
                <div className="pt-2 flex items-center gap-2">
                  {isParticipant ? (
                    <button
                      onClick={() => onLeaveEvent(event.id)}
                      className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-red-500/15 hover:text-red-400 hover:border-red-500/30 transition-all flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Joined</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => onJoinEvent(event.id)}
                      className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold bg-[#2AB7CA]/15 text-[#2AB7CA] border border-[#2AB7CA]/40 hover:bg-[#2AB7CA]/25 transition-all flex items-center justify-center gap-1.5"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Join Run ({event.participants.length}/{event.maxParticipants})</span>
                    </button>
                  )}

                  {/* Start Run Now Button */}
                  <button
                    onClick={() => onStartEventRun(event)}
                    className="py-2 px-3 rounded-xl text-xs font-bold bg-[#FF6B35] text-white hover:bg-[#ff8254] transition-all flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/20"
                    title="Start live GPS tracking linked to this event"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Run Now</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredEvents.length === 0 && (
        <div className="bg-[#1B263B] border border-white/10 rounded-2xl p-12 text-center space-y-3">
          <div className="text-4xl">🏃‍♂️</div>
          <h3 className="font-heading font-bold text-lg text-white">No events match your search</h3>
          <p className="text-xs text-gray-400 max-w-sm mx-auto">
            Try resetting your sport filter or governorate, or host your own group run for the community!
          </p>
          <button
            onClick={() => { setSelectedSport('all'); setSelectedRegion('All Regions'); setSearchQuery(''); }}
            className="text-xs font-bold text-[#FF6B35] hover:underline"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
};
