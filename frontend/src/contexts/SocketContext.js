import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user, token } = useAuthStore();

  useEffect(() => {
    if (user && token) {
      // Create socket connection
      const newSocket = io(process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000', {
        auth: {
          token: token
        },
        transports: ['websocket', 'polling']
      });

      // Connection event handlers
      newSocket.on('connect', () => {
        console.log('Connected to server');
        setIsConnected(true);
        
        // Join user-specific room
        newSocket.emit('join', user.id);
        
        // Join family room if user has family
        if (user.familyId) {
          newSocket.emit('joinFamily', user.familyId);
        }
      });

      newSocket.on('disconnect', () => {
        console.log('Disconnected from server');
        setIsConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        setIsConnected(false);
      });

      // Medication alarm handlers
      newSocket.on('medicationAlarm', (data) => {
        toast.success(`Medication: ${data.message}`, {
          duration: 10000,
          position: 'top-center',
          style: {
            background: '#2563eb',
            color: 'white',
            fontSize: '16px',
            padding: '16px',
          },
        });
        
        // Play notification sound if enabled
        if (data.sound && data.sound !== 'none') {
          playNotificationSound(data.sound);
        }
        
        // Trigger vibration if supported and enabled
        if (data.vibration && navigator.vibrate) {
          navigator.vibrate([200, 100, 200]);
        }
      });

      newSocket.on('medicationReminder', (data) => {
        toast(`Reminder ${data.reminderNumber}/${data.maxReminders}: Time for ${data.medication.commonName}`, {
          duration: 8000,
          position: 'top-center',
          style: {
            background: '#ea580c',
            color: 'white',
          },
        });
      });

      // Health data handlers
      newSocket.on('healthDataAdded', (data) => {
        toast.success(`Health Data: New ${data.dataType} reading recorded: ${data.value} ${data.unit}`);
      });

      // Family notifications
      newSocket.on('familyMedicationAlert', (data) => {
        toast.error(`Alert: ${data.patient.name} missed their ${data.medication.commonName} dose`, {
          duration: 8000,
          position: 'top-center',
        });
      });

      newSocket.on('medicationTaken', (data) => {
        toast.success(`${data.patient.firstName} took their ${data.medication.commonName}`, {
          duration: 5000,
        });
      });

      // Emergency alerts
      newSocket.on('emergencyAlert', (data) => {
        toast.error(`EMERGENCY: ${data.message}`, {
          duration: 15000,
          position: 'top-center',
          style: {
            background: '#dc2626',
            color: 'white',
            fontSize: '18px',
            fontWeight: 'bold',
          },
        });
        
        // Play emergency sound
        playNotificationSound('emergency');
        
        // Strong vibration pattern
        if (navigator.vibrate) {
          navigator.vibrate([500, 200, 500, 200, 500]);
        }
      });

      // AI query responses
      newSocket.on('queryResponse', (data) => {
        toast.success('AI Assistant has responded to your question');
      });

      newSocket.on('queryError', (data) => {
        toast.error('Failed to process your question. Please try again.');
      });

      // General notifications
      newSocket.on('notification', (data) => {
        const { title, body, priority } = data;
        
        if (priority === 'high') {
          toast.error(`${title}: ${body}`, { duration: 8000 });
        } else {
          toast(body, { 
            duration: 5000 
          });
        }
      });

      setSocket(newSocket);

      // Cleanup on unmount
      return () => {
        newSocket.close();
        setSocket(null);
        setIsConnected(false);
      };
    } else {
      // No user or token, clean up socket
      if (socket) {
        socket.close();
        setSocket(null);
        setIsConnected(false);
      }
    }
  }, [user, token]);

  // Helper function to play notification sounds
  const playNotificationSound = (soundType = 'default') => {
    try {
      const audio = new Audio();
      
      switch (soundType) {
        case 'emergency':
          // Use a more urgent sound for emergencies
          audio.src = '/sounds/emergency.mp3';
          break;
        case 'medication':
          audio.src = '/sounds/medication.mp3';
          break;
        default:
          audio.src = '/sounds/notification.mp3';
      }
      
      audio.volume = 0.5;
      audio.play().catch(error => {
        console.log('Could not play notification sound:', error);
      });
    } catch (error) {
      console.log('Audio not supported or sound file missing:', error);
    }
  };

  // Socket utility functions
  const emit = (event, data) => {
    if (socket && isConnected) {
      socket.emit(event, data);
    }
  };

  const on = (event, callback) => {
    if (socket) {
      socket.on(event, callback);
    }
  };

  const off = (event, callback) => {
    if (socket) {
      socket.off(event, callback);
    }
  };

  const value = {
    socket,
    isConnected,
    emit,
    on,
    off,
    playNotificationSound
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
