import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { API_URL } from '../utils/api';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (user?._id) {
      const socket = io(API_URL, {
        transports: ['websocket', 'polling']
      });

      socketRef.current = socket;

      socket.emit('join', user._id);

      socket.on('userStatus', ({ userId, status }) => {
        setOnlineUsers(prev => {
          const next = new Set(prev);
          if (status === 'online') next.add(userId);
          else next.delete(userId);
          return next;
        });
      });

      // Handle new notifications (Announcements, Tasks, etc.)
      socket.on('notification', (data) => {
        setNotifications(prev => [data, ...prev].slice(0, 50));
        // You could also trigger a browser notification here
        if (Notification.permission === "granted") {
           new Notification(data.title || "New Update", {
             body: data.message || data.content,
           });
        }
      });

      return () => {
        socket.disconnect();
      };
    }
  }, [user?._id]);

  const value = {
    socket: socketRef.current,
    onlineUsers,
    notifications,
    setNotifications
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
