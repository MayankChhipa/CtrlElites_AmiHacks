import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, CheckCheck, Clock, ExternalLink } from 'lucide-react';
import api from '../services/api';
import { getSocket } from '../services/socket';

const NotificationDropdown = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications?limit=10');
      if (res.data.success) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (err) {
      console.warn('Failed to load notifications:', err.message);
    }
  };

  useEffect(() => {
    fetchNotifications();

    const socket = getSocket();
    if (socket) {
      const handleNewNotification = (notification) => {
        setNotifications((prev) => [notification, ...prev]);
        setUnreadCount((c) => c + 1);
      };

      socket.on('notification', handleNewNotification);

      return () => {
        socket.off('notification', handleNewNotification);
      };
    }
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 text-stone-600 hover:text-red-950 rounded-xl hover:bg-orange-100/70 transition-colors"
        title="Notifications"
      >
        <Bell className="w-5 h-5 stroke-[2]" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 px-1.5 py-0.5 text-[10px] font-black text-white bg-red-600 rounded-full animate-pulse shadow-sm shadow-red-600/40">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 rounded-2xl bg-[#FFFDF6] shadow-xl z-50 overflow-hidden border border-orange-200/80 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="p-4 border-b border-orange-100 flex items-center justify-between bg-amber-50/50">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-red-950">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-xs bg-amber-100 text-amber-900 font-bold px-2.5 py-0.5 rounded-full border border-amber-300">
                  {unreadCount} unread
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs font-bold text-stone-500 hover:text-red-900 flex items-center gap-1 transition-colors"
              >
                <CheckCheck className="w-4 h-4 stroke-[2]" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-orange-100">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-stone-500 text-sm">
                <Bell className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                No notifications yet.
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n._id}
                  className={`p-4 hover:bg-orange-50/60 transition-colors ${
                    !n.isRead ? 'bg-amber-50/60 border-l-4 border-amber-500' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-xs font-extrabold text-red-950 leading-snug">
                      {n.title}
                    </h4>
                    {!n.isRead && (
                      <button
                        onClick={() => markAsRead(n._id)}
                        className="text-stone-400 hover:text-emerald-700 p-1 rounded-lg hover:bg-emerald-50 transition-colors"
                        title="Mark as read"
                      >
                        <Check className="w-4 h-4 stroke-[2.5]" />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                    {n.message}
                  </p>
                  <div className="flex items-center gap-1.5 mt-2.5 text-[10px] font-bold text-stone-400">
                    <Clock className="w-3.5 h-3.5 stroke-[2]" />
                    <span>{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;