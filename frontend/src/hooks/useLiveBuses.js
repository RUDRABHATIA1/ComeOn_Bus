import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useDispatch } from 'react-redux';
import { setBuses, setConnectionStatus, updateBus } from '../redux/transitSlice';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export function useLiveBuses() {
  const dispatch = useDispatch();

  useEffect(() => {
    const socket = io(API_BASE);

    socket.on('connect', () => {
      dispatch(setConnectionStatus(true));
    });

    socket.on('disconnect', () => {
      dispatch(setConnectionStatus(false));
    });

    socket.on('initial_buses', (initialBuses) => {
      dispatch(setBuses(initialBuses));
    });

    socket.on('bus_update', (updatedBus) => {
      dispatch(updateBus(updatedBus));
    });

    return () => {
      socket.disconnect();
    };
  }, [dispatch]);

}
