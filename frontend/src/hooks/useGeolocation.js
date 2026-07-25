import { useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export function useGeolocation() {
  const [userLocation, setUserLocation] = useState(null);
  const [nearestStops, setNearestStops] = useState([]);
  const [isLocating, setIsLocating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const findNearestStops = (onSuccessBounds, onSuccessCenterZoom) => {
    if (!navigator.geolocation) {
      setErrorMessage("Geolocation is not supported by your browser");
      return;
    }

    setIsLocating(true);
    setErrorMessage('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation([latitude, longitude]);
        onSuccessCenterZoom([latitude, longitude], 14);

        try {
          const res = await fetch(`${API_BASE}/api/stops/near?lat=${latitude}&lng=${longitude}`);
          if (!res.ok) throw new Error("Failed to search nearby stops");
          const data = await res.json();
          setNearestStops(data);
          setIsLocating(false);

          if (data.length > 0) {
            const bounds = [
              [latitude, longitude],
              ...data.map(stop => [stop.location.coordinates[1], stop.location.coordinates[0]])
            ];
            onSuccessBounds(bounds);
          }
        } catch (err) {
          console.error("Error fetching nearest stops:", err);
          setErrorMessage("Failed to locate closest stops.");
          setIsLocating(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        setErrorMessage("Permission denied or location retrieval timed out. Using mock location...");

        const mockLat = 28.8400;
        const mockLng = 78.7480;
        setUserLocation([mockLat, mockLng]);
        onSuccessCenterZoom([mockLat, mockLng], 14);

        fetch(`${API_BASE}/api/stops/near?lat=${mockLat}&lng=${mockLng}`)
          .then(res => res.json())
          .then(data => {
            setNearestStops(data);
            setIsLocating(false);

            if (data.length > 0) {
              const bounds = [
                [mockLat, mockLng],
                ...data.map(stop => [stop.location.coordinates[1], stop.location.coordinates[0]])
              ];
              onSuccessBounds(bounds);
            }
          })
          .catch(err => {
            console.error("Mock fetch failed:", err);
            setIsLocating(false);
          });
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return {
    userLocation,
    nearestStops,
    isLocating,
    errorMessage,
    setErrorMessage,
    findNearestStops
  };
}
