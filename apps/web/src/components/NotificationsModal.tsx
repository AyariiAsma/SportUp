import React from 'react';
import { X, Bell, Check, Navigation2, Trophy, Heart } from 'lucide-react';
import { AppNotification } from '../types';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onMarkAllAsRead: () => void;
  onSelectNotificationEvent: (eventId: string) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllAsRead,
  onSelectNotificationEvent,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#1B263B] border border-white/15 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-[#0D1B2A]">
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5 text-[#FF6B35]" />
            <h3 className="font-heading font-bold text-base text-white">Notifications</h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={onMarkAllAsRead}
              className="text-xs text-[#2AB7CA] hover:underline font-semibold"
            >
              Mark all read
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-full text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="p-4 space-y-2.5 overflow-y-auto flex-1">
          {notifications.map(n => {
            return (
              <div
                key={n.id}
                onClick={() => {
                  if (n.eventId) {
                    onSelectNotificationEvent(n.eventId);
                    onClose();
                  }
                }}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  n.isRead
                    ? 'bg-[#0D1B2A]/50 border-white/5 opacity-80'
                    : 'bg-[#0D1B2A] border-[#FF6B35]/30 ring-1 ring-[#FF6B35]/20'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-heading font-bold text-xs sm:text-sm text-white">
                    {n.title}
                  </div>
                  <span className="text-[10px] text-gray-400 whitespace-nowrap">{n.createdAt}</span>
                </div>
                <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                  {n.body}
                </p>
                {n.eventId && (
                  <div className="mt-2 text-[11px] font-bold text-[#FF6B35] flex items-center gap-1">
                    <Navigation2 className="w-3 h-3" />
                    <span>View Event & Run Details →</span>
                  </div>
                )}
              </div>
            );
          })}

          {notifications.length === 0 && (
            <div className="py-8 text-center text-xs text-gray-400">
              No new notifications at this time.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
