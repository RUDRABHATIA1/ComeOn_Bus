import { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export function useTransitData() {
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [masterStops, setMasterStops] = useState([]);
  const [stops, setStops] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const fetchRouteAndStops = async () => {
      try {
        const routeRes = await fetch(`${API_BASE}/api/routes`);
        const routeData = await routeRes.json();
        const leafletCoords = routeData.coordinates.map(coord => [coord[1], coord[0]]);
        setRouteCoordinates(leafletCoords);
        if (routeData.stops) {
          setMasterStops(routeData.stops);
        }

        const stopsRes = await fetch(`${API_BASE}/api/stops`);
        const stopsData = await stopsRes.json();
        setStops(stopsData);
      } catch (err) {
        console.error("Failed to load initial transit data:", err);
        setErrorMessage("Could not connect to database. Make sure your server and database are running.");
      }
    };

    fetchRouteAndStops();
  }, []);

  return { routeCoordinates, masterStops, stops, errorMessage, setErrorMessage };
}
