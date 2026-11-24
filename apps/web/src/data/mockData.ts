import { UserProfile, SportEvent, SocialPost, AppNotification, RunSession } from '../types';

export const CURRENT_USER: UserProfile = {
  id: 'usr-1',
  name: 'Asma Ayari',
  username: 'asma_runner',
  email: 'asma@sportup.app',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
  bio: 'Passionate marathoner & trail runner. Exploring the scenic paths of Tunisia! 🏃‍♀️✨',
  region: 'Tunis',
  runningLevel: 'ADVANCED',
  rankScore: 2450,
  totalDistanceKm: 428.6,
  totalRuns: 46,
  eventsJoined: 18,
  preferredSports: ['running', 'hiking', 'cycling'],
  isOnline: true,
};

export const OTHER_USERS: UserProfile[] = [
  {
    id: 'usr-2',
    name: 'Karim Ben Salem',
    username: 'karim_stride',
    email: 'karim@sportup.app',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
    bio: 'Ultra marathon trainer & cycling enthusiast. Let’s push limits together!',
    region: 'Nabeul',
    runningLevel: 'ELITE',
    rankScore: 3820,
    totalDistanceKm: 812.4,
    totalRuns: 89,
    eventsJoined: 34,
    preferredSports: ['running', 'cycling'],
    isOnline: true,
  },
  {
    id: 'usr-3',
    name: 'Sarah Mansour',
    username: 'sarah_m',
    email: 'sarah@sportup.app',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80',
    bio: 'Morning jogger, yoga lover & 10K finisher. Good vibes only 🌟',
    region: 'Sousse',
    runningLevel: 'INTERMEDIATE',
    rankScore: 1720,
    totalDistanceKm: 284.1,
    totalRuns: 32,
    eventsJoined: 12,
    preferredSports: ['running', 'yoga'],
    isOnline: false,
  },
  {
    id: 'usr-4',
    name: 'Youssef Trabelsi',
    username: 'youssef_t',
    email: 'youssef@sportup.app',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
    bio: 'Football captain and speed runner. Weekend group runs organizer.',
    region: 'Tunis',
    runningLevel: 'ADVANCED',
    rankScore: 2190,
    totalDistanceKm: 395.0,
    totalRuns: 41,
    eventsJoined: 22,
    preferredSports: ['running', 'football'],
    isOnline: true,
  },
  {
    id: 'usr-5',
    name: 'Nour El Houda',
    username: 'nour_fit',
    email: 'nour@sportup.app',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80',
    bio: 'Starting my 5K journey! Looking for supportive running buddies. 💪',
    region: 'Bizerte',
    runningLevel: 'BEGINNER',
    rankScore: 680,
    totalDistanceKm: 92.5,
    totalRuns: 14,
    eventsJoined: 5,
    preferredSports: ['running', 'fitness'],
    isOnline: false,
  }
];

export const INITIAL_EVENTS: SportEvent[] = [
  {
    id: 'evt-1',
    title: 'Carthage Coastline Sunrise Run 🌅',
    description: 'Join us for a brisk 8K morning run starting from Byrsa Hill down to the scenic La Marsa Corniche. Refreshments provided!',
    sport: 'running',
    difficulty: 'INTERMEDIATE',
    startAt: 'Tomorrow, 07:00 AM',
    locationName: 'Byrsa Hill to La Marsa',
    region: 'Tunis',
    lat: 36.8528,
    lng: 10.3233,
    distanceKm: 8.0,
    maxParticipants: 25,
    organizer: {
      id: 'usr-1',
      name: 'Asma Ayari',
      avatar: CURRENT_USER.avatar,
      level: 'ADVANCED',
    },
    participants: [
      { id: 'usr-1', name: 'Asma Ayari', avatar: CURRENT_USER.avatar },
      { id: 'usr-2', name: 'Karim Ben Salem', avatar: OTHER_USERS[0].avatar },
      { id: 'usr-3', name: 'Sarah Mansour', avatar: OTHER_USERS[1].avatar },
      { id: 'usr-4', name: 'Youssef Trabelsi', avatar: OTHER_USERS[2].avatar },
    ],
    coverImage: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=800&q=80',
    status: 'UPCOMING'
  },
  {
    id: 'evt-2',
    title: 'Hammamet Gulf Coastal 12K Run',
    description: 'Smooth flat asphalt run along the beautiful beaches of Nabeul and Hammamet. Great training for half-marathons!',
    sport: 'running',
    difficulty: 'ADVANCED',
    startAt: 'Saturday, 06:30 AM',
    locationName: 'Hammamet Marina',
    region: 'Nabeul',
    lat: 36.4074,
    lng: 10.6124,
    distanceKm: 12.0,
    maxParticipants: 40,
    organizer: {
      id: 'usr-2',
      name: 'Karim Ben Salem',
      avatar: OTHER_USERS[0].avatar,
      level: 'ELITE',
    },
    participants: [
      { id: 'usr-2', name: 'Karim Ben Salem', avatar: OTHER_USERS[0].avatar },
      { id: 'usr-1', name: 'Asma Ayari', avatar: CURRENT_USER.avatar },
    ],
    coverImage: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=800&q=80',
    status: 'UPCOMING'
  },
  {
    id: 'evt-3',
    title: 'Beginner 5K & Outdoor Stretch',
    description: 'A relaxed 5K loop in Belvedere Park followed by a guided recovery stretch. Welcoming all paces!',
    sport: 'running',
    difficulty: 'BEGINNER',
    startAt: 'Sunday, 08:30 AM',
    locationName: 'Parc du Belvédère',
    region: 'Tunis',
    lat: 36.8188,
    lng: 10.1706,
    distanceKm: 5.0,
    maxParticipants: 20,
    organizer: {
      id: 'usr-3',
      name: 'Sarah Mansour',
      avatar: OTHER_USERS[1].avatar,
      level: 'INTERMEDIATE',
    },
    participants: [
      { id: 'usr-3', name: 'Sarah Mansour', avatar: OTHER_USERS[1].avatar },
      { id: 'usr-5', name: 'Nour El Houda', avatar: OTHER_USERS[3].avatar },
    ],
    coverImage: 'https://images.unsplash.com/photo-1483721074574-06d9d15024d9?auto=format&fit=crop&w=800&q=80',
    status: 'UPCOMING'
  },
  {
    id: 'evt-4',
    title: 'Sousse Ribat Sunset 10K',
    description: 'Evening seaside run passing by the historic Sousse Medina & port. Scenic and high energy!',
    sport: 'running',
    difficulty: 'INTERMEDIATE',
    startAt: 'Friday, 05:45 PM',
    locationName: 'Boujaafar Promenade',
    region: 'Sousse',
    lat: 35.8340,
    lng: 10.6380,
    distanceKm: 10.0,
    maxParticipants: 30,
    organizer: {
      id: 'usr-3',
      name: 'Sarah Mansour',
      avatar: OTHER_USERS[1].avatar,
      level: 'INTERMEDIATE',
    },
    participants: [
      { id: 'usr-3', name: 'Sarah Mansour', avatar: OTHER_USERS[1].avatar },
    ],
    coverImage: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&w=800&q=80',
    status: 'UPCOMING'
  }
];

export const INITIAL_POSTS: SocialPost[] = [
  {
    id: 'post-1',
    author: {
      id: CURRENT_USER.id,
      name: CURRENT_USER.name,
      username: CURRENT_USER.username,
      avatar: CURRENT_USER.avatar,
      level: CURRENT_USER.runningLevel,
    },
    content: 'Crushed a personal best this morning along the Carthage coast! 🌊 The breeze was perfect and the pace felt effortless.',
    sport: 'running',
    imageUrl: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=800&q=80',
    runSummary: {
      distanceKm: 10.2,
      durationFormatted: '48m 32s',
      avgPace: "4'45\" /km",
    },
    likesCount: 24,
    likedByMe: true,
    comments: [
      {
        id: 'c-1',
        author: {
          id: OTHER_USERS[0].id,
          name: OTHER_USERS[0].name,
          avatar: OTHER_USERS[0].avatar,
        },
        content: 'Unreal pace Asma! 🔥 Ready for the Hammamet 12K on Saturday?',
        createdAt: '2 hours ago',
        likesCount: 3,
      },
      {
        id: 'c-2',
        author: {
          id: OTHER_USERS[1].id,
          name: OTHER_USERS[1].name,
          avatar: OTHER_USERS[1].avatar,
        },
        content: 'Inspiring as always! That morning light in Carthage is unbeatable.',
        createdAt: '1 hour ago',
        likesCount: 1,
      }
    ],
    createdAt: '3 hours ago'
  },
  {
    id: 'post-2',
    author: {
      id: OTHER_USERS[0].id,
      name: OTHER_USERS[0].name,
      username: OTHER_USERS[0].username,
      avatar: OTHER_USERS[0].avatar,
      level: OTHER_USERS[0].runningLevel,
    },
    content: 'Long interval workout done. 5 x 1000m at race pace. Hydration is key in this humidity!',
    sport: 'running',
    runSummary: {
      distanceKm: 14.5,
      durationFormatted: '1h 05m 12s',
      avgPace: "4'30\" /km",
    },
    likesCount: 38,
    likedByMe: false,
    comments: [
      {
        id: 'c-3',
        author: {
          id: CURRENT_USER.id,
          name: CURRENT_USER.name,
          avatar: CURRENT_USER.avatar,
        },
        content: 'Strong work coach! Beast mode unlocked. 💥',
        createdAt: '4 hours ago',
        likesCount: 2,
      }
    ],
    createdAt: '5 hours ago'
  }
];

export const INITIAL_RUN_HISTORY: RunSession[] = [
  {
    id: 'run-prev-1',
    userId: 'usr-1',
    title: 'Morning Coastal Tempo Run 🌅',
    sport: 'running',
    distanceKm: 10.2,
    durationSec: 2912,
    avgPace: "4'45\"",
    calories: 680,
    createdAt: 'Yesterday, 07:15 AM',
    splits: [
      { km: 1, timeSec: 295, paceMinKm: "4'55\"" },
      { km: 2, timeSec: 288, paceMinKm: "4'48\"" },
      { km: 3, timeSec: 284, paceMinKm: "4'44\"" },
      { km: 4, timeSec: 282, paceMinKm: "4'42\"" },
      { km: 5, timeSec: 286, paceMinKm: "4'46\"" },
      { km: 6, timeSec: 280, paceMinKm: "4'40\"" },
      { km: 7, timeSec: 283, paceMinKm: "4'43\"" },
      { km: 8, timeSec: 285, paceMinKm: "4'45\"" },
      { km: 9, timeSec: 279, paceMinKm: "4'39\"" },
      { km: 10, timeSec: 275, paceMinKm: "4'35\"" },
    ],
    route: [
      { lat: 36.8528, lng: 10.3233 },
      { lat: 36.8550, lng: 10.3260 },
      { lat: 36.8590, lng: 10.3295 },
      { lat: 36.8640, lng: 10.3320 },
      { lat: 36.8700, lng: 10.3345 },
      { lat: 36.8780, lng: 10.3325 },
      { lat: 36.8830, lng: 10.3280 },
    ]
  },
  {
    id: 'run-prev-2',
    userId: 'usr-1',
    title: 'Easy Recovery 5K Jog',
    sport: 'running',
    distanceKm: 5.1,
    durationSec: 1680,
    avgPace: "5'29\"",
    calories: 340,
    createdAt: '3 days ago',
    splits: [
      { km: 1, timeSec: 335, paceMinKm: "5'35\"" },
      { km: 2, timeSec: 330, paceMinKm: "5'30\"" },
      { km: 3, timeSec: 328, paceMinKm: "5'28\"" },
      { km: 4, timeSec: 326, paceMinKm: "5'26\"" },
      { km: 5, timeSec: 322, paceMinKm: "5'22\"" },
    ],
    route: [
      { lat: 36.8188, lng: 10.1706 },
      { lat: 36.8210, lng: 10.1730 },
      { lat: 36.8240, lng: 10.1710 },
      { lat: 36.8220, lng: 10.1680 },
      { lat: 36.8190, lng: 10.1695 },
    ]
  }
];

export const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-1',
    type: 'EVENT_INVITE',
    title: 'New Event Invite 🏃‍♂️',
    body: 'Karim invited you to join "Hammamet Gulf Coastal 12K Run".',
    createdAt: '25 min ago',
    isRead: false,
    eventId: 'evt-2',
  },
  {
    id: 'notif-2',
    type: 'RANK_UP',
    title: 'Level Up! 🏅',
    body: 'Congratulations! You reached Advanced Runner status with 2,450 rank points.',
    createdAt: '1 day ago',
    isRead: false,
  },
  {
    id: 'notif-3',
    type: 'POST_LIKED',
    title: 'New Kudos 👍',
    body: 'Sarah and 14 others liked your Carthage morning run post.',
    createdAt: '2 days ago',
    isRead: true,
  }
];
