import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export function useLiveBuses() {
  const [busesList, setBusesList] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socket = io(API_BASE);

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('initial_buses', (initialBuses) => {
      setBusesList(initialBuses);
    });

    socket.on('bus_update', (updatedBus) => {
      setBusesList(prevBuses => {
        const index = prevBuses.findIndex(b => b.busNumber === updatedBus.busNumber);
        if (index !== -1) {
          const newBuses = [...prevBuses];
          newBuses[index] = updatedBus;
          return newBuses;
        } else {
          return [...prevBuses, updatedBus];
        }
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return { busesList, isConnected };
}
