import React, { useState } from 'react';
import { Header } from './components/Header';
import { ExploreEventsView } from './components/ExploreEventsView';
import { LiveRunTrackerView } from './components/LiveRunTrackerView';
import { SocialFeedView } from './components/SocialFeedView';
import { LeaderboardView } from './components/LeaderboardView';
import { RunHistoryView } from './components/RunHistoryView';
import { ProfileView } from './components/ProfileView';
import { FinishRunModal } from './components/FinishRunModal';
import { CreateEventModal } from './components/CreateEventModal';
import { NotificationsModal } from './components/NotificationsModal';
import { useLiveTracker } from './hooks/useLiveTracker';
import { 
  CURRENT_USER, 
  OTHER_USERS, 
  INITIAL_EVENTS, 
  INITIAL_POSTS, 
  INITIAL_RUN_HISTORY, 
  INITIAL_NOTIFICATIONS 
} from './data/mockData';
import { SportEvent, SocialPost, UserProfile, RunSession, SportType } from './types';

export function App() {
  const [activeTab, setActiveTab] = useState<'explore' | 'tracker' | 'feed' | 'leaderboard' | 'history' | 'profile'>('explore');
  const [currentUser, setCurrentUser] = useState<UserProfile>(CURRENT_USER);
  const [otherUsers, setOtherUsers] = useState<UserProfile[]>(OTHER_USERS);
  const [events, setEvents] = useState<SportEvent[]>(INITIAL_EVENTS);
  const [posts, setPosts] = useState<SocialPost[]>(INITIAL_POSTS);
  const [runHistory, setRunHistory] = useState<RunSession[]>(INITIAL_RUN_HISTORY);
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);

  // Modals state
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
  const [finishedSession, setFinishedSession] = useState<RunSession | null>(null);
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Live GPS Workout Tracker Hook
  const tracker = useLiveTracker();

  // Handle Event RSVP: Join Event
  const handleJoinEvent = (eventId: string) => {
    setEvents(prev => prev.map(evt => {
      if (evt.id === eventId) {
        if (!evt.participants.some(p => p.id === currentUser.id)) {
          return {
            ...evt,
            participants: [...evt.participants, { id: currentUser.id, name: currentUser.name, avatar: currentUser.avatar }]
          };
        }
      }
      return evt;
    }));
  };

  // Handle Event RSVP: Leave Event
  const handleLeaveEvent = (eventId: string) => {
    setEvents(prev => prev.map(evt => {
      if (evt.id === eventId) {
        return {
          ...evt,
          participants: evt.participants.filter(p => p.id !== currentUser.id)
        };
      }
      return evt;
    }));
  };

  // Start live run pre-linked to an event
  const handleStartEventRun = (event: SportEvent) => {
    tracker.resetTracking();
    tracker.setLinkedEvent({ id: event.id, title: event.title });
    setActiveTab('tracker');
    // Start tracking with simulation for desktop demonstration
    tracker.startTracking(true, { id: event.id, title: event.title });
  };

  // Open finish run flow
  const handleOpenFinishModal = () => {
    const session = tracker.finishTracking();
    setFinishedSession(session);
    setIsFinishModalOpen(true);
  };

  // Confirm Save finished run
  const handleConfirmSaveRun = (title: string, shareToFeed: boolean) => {
    if (!finishedSession) return;
    const finalSession = { ...finishedSession, title };

    // 1. Add to user run history
    setRunHistory(prev => [finalSession, ...prev]);

    // 2. Update user lifetime stats
    setCurrentUser(prev => ({
      ...prev,
      totalDistanceKm: prev.totalDistanceKm + finalSession.distanceKm,
      totalRuns: prev.totalRuns + 1,
      rankScore: prev.rankScore + Math.round(finalSession.distanceKm * 20) + 50,
    }));

    // 3. Optionally post to community feed
    if (shareToFeed) {
      const minutes = Math.floor(finalSession.durationSec / 60);
      const seconds = finalSession.durationSec % 60;
      const newPost: SocialPost = {
        id: `post-${Date.now()}`,
        author: {
          id: currentUser.id,
          name: currentUser.name,
          username: currentUser.username,
          avatar: currentUser.avatar,
          level: currentUser.runningLevel,
        },
        content: `Just completed: "${title}"! Felt strong across all splits. 🏃‍♂️💨`,
        sport: finalSession.sport,
        runSummary: {
          distanceKm: finalSession.distanceKm,
          durationFormatted: `${minutes}m ${seconds}s`,
          avgPace: `${finalSession.avgPace} /km`,
        },
        likesCount: 1,
        likedByMe: true,
        comments: [],
        createdAt: 'Just now',
      };
      setPosts(prev => [newPost, ...prev]);
    }

    setIsFinishModalOpen(false);
    tracker.resetTracking();
    setActiveTab('history');
  };

  // Create new group event
  const handleCreateEvent = (newEvent: SportEvent) => {
    setEvents(prev => [newEvent, ...prev]);
  };

  // Like feed post
  const handleLikePost = (postId: string) => {
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          likedByMe: !p.likedByMe,
          likesCount: p.likedByMe ? p.likesCount - 1 : p.likesCount + 1,
        };
      }
      return p;
    }));
  };

  // Add comment to feed post
  const handleAddComment = (postId: string, content: string) => {
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        const newComment = {
          id: `c-${Date.now()}`,
          author: {
            id: currentUser.id,
            name: currentUser.name,
            avatar: currentUser.avatar,
          },
          content,
          createdAt: 'Just now',
          likesCount: 0,
        };
        return {
          ...p,
          comments: [...p.comments, newComment],
        };
      }
      return p;
    }));
  };

  // Create text/activity post
  const handleCreatePost = (content: string, sport: SportType) => {
    const newPost: SocialPost = {
      id: `post-${Date.now()}`,
      author: {
        id: currentUser.id,
        name: currentUser.name,
        username: currentUser.username,
        avatar: currentUser.avatar,
        level: currentUser.runningLevel,
      },
      content,
      sport,
      likesCount: 0,
      likedByMe: false,
      comments: [],
      createdAt: 'Just now',
    };
    setPosts(prev => [newPost, ...prev]);
  };

  // Switch demo user
  const handleSwitchUser = (newUser: UserProfile) => {
    setCurrentUser(newUser);
  };

  const handleMarkAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  return (
    <div className="min-h-screen bg-[#0D1B2A] text-white flex flex-col font-sans">
      {/* Navigation Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        otherUsers={otherUsers}
        onSwitchUser={handleSwitchUser}
        notifications={notifications}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onCreateEventClick={() => setIsCreateEventOpen(true)}
        isTrackingActive={tracker.status === 'running'}
      />

      {/* Main Content Body */}
      <main className="flex-1 pb-16 md:pb-8">
        {activeTab === 'explore' && (
          <ExploreEventsView
            events={events}
            currentUser={currentUser}
            onJoinEvent={handleJoinEvent}
            onLeaveEvent={handleLeaveEvent}
            onStartEventRun={handleStartEventRun}
            onCreateEventClick={() => setIsCreateEventOpen(true)}
          />
        )}

        {activeTab === 'tracker' && (
          <LiveRunTrackerView
            tracker={tracker}
            onOpenFinishModal={handleOpenFinishModal}
          />
        )}

        {activeTab === 'feed' && (
          <SocialFeedView
            posts={posts}
            currentUser={currentUser}
            onLikePost={handleLikePost}
            onAddComment={handleAddComment}
            onCreatePost={handleCreatePost}
          />
        )}

        {activeTab === 'leaderboard' && (
          <LeaderboardView
            athletes={[currentUser, ...otherUsers]}
            currentUser={currentUser}
          />
        )}

        {activeTab === 'history' && (
          <RunHistoryView
            runs={runHistory}
            onStartNewRun={() => {
              tracker.resetTracking();
              setActiveTab('tracker');
            }}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileView
            currentUser={currentUser}
            otherUsers={otherUsers}
            onSwitchUser={handleSwitchUser}
            onStartRun={() => setActiveTab('tracker')}
          />
        )}
      </main>

      {/* Modals */}
      <FinishRunModal
        isOpen={isFinishModalOpen}
        onClose={() => setIsFinishModalOpen(false)}
        runSession={finishedSession}
        onConfirmSave={handleConfirmSaveRun}
      />

      <CreateEventModal
        isOpen={isCreateEventOpen}
        onClose={() => setIsCreateEventOpen(false)}
        currentUser={currentUser}
        onCreateEvent={handleCreateEvent}
      />

      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        onMarkAllAsRead={handleMarkAllNotificationsRead}
        onSelectNotificationEvent={(eventId) => {
          setActiveTab('explore');
        }}
      />
    </div>
  );
}

export default App;
