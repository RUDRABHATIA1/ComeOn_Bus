import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import * as turf from '@turf/turf';
import { useLiveBuses } from './hooks/useLiveBuses';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function MapController({ center, zoom, bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14, animate: true, duration: 1 });
    } else if (center) {
      map.setView(center, zoom || map.getZoom(), { animate: true, duration: 1 });
    }
  }, [center, zoom, bounds, map]);
  return null;
}

export default function App() {
  const { busesList, isConnected } = useLiveBuses();
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [highlightedRoad, setHighlightedRoad] = useState([]);
  const [stops, setStops] = useState([]);
  const [masterStops, setMasterStops] = useState([]);
  const [nearestStops, setNearestStops] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState([28.8350, 78.7450]);
  const [mapZoom, setMapZoom] = useState(13);
  const [mapBounds, setMapBounds] = useState(null);
  const lastFramedBusRef = useRef(null);
  const [selectedBus, setSelectedBus] = useState(null);
  const [selectedStop, setSelectedStop] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Simulator Control Desk State
  const [simBusNumber, setSimBusNumber] = useState('UP-21-AT-1008');
  const [simFromCity, setSimFromCity] = useState('stop-bareilly');
  const [simToCity, setSimToCity] = useState('stop-dharamshala');
  const [simTicketsSold, setSimTicketsSold] = useState(25);
  const [simMessage, setSimMessage] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);

  // Sync selectedBus data when live bus list updates from socket
  useEffect(() => {
    if (selectedBus) {
      const liveBus = busesList.find(b => b.busNumber === selectedBus.busNumber);
      if (liveBus) {
        setSelectedBus(liveBus);
      }
    }
  }, [busesList, selectedBus]);

  // Fetch static route coordinates and stops from backend
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

  // Derive highlighted road segment locally from routeCoordinates for instant and reliable rendering
  useEffect(() => {
    if (masterStops.length === 0 || routeCoordinates.length === 0) {
      setHighlightedRoad([]);
      return;
    }

    const fromIdx = masterStops.findIndex(s => s.stopId === simFromCity);
    const toIdx = masterStops.findIndex(s => s.stopId === simToCity);
    if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) {
      setHighlightedRoad([]);
      return;
    }

    const fromStop = masterStops[fromIdx];
    const toStop = masterStops[toIdx];

    // Find nearest coordinates with distance threshold
    const findClosestCoordIdx = (stopCoords) => {
      let closestIdx = -1;
      let minDistance = Infinity;
      routeCoordinates.forEach((c, idx) => {
        // stopCoords is [lng, lat], routeCoordinates is [lat, lng]
        const d = Math.abs(c[0] - stopCoords[1]) + Math.abs(c[1] - stopCoords[0]);
        if (d < minDistance) {
          minDistance = d;
          closestIdx = idx;
        }
      });
      return closestIdx;
    };

    const fromCoordIdx = findClosestCoordIdx(fromStop.coordinates);
    const toCoordIdx = findClosestCoordIdx(toStop.coordinates);

    if (fromCoordIdx !== -1 && toCoordIdx !== -1) {
      const minIdx = Math.min(fromCoordIdx, toCoordIdx);
      const maxIdx = Math.max(fromCoordIdx, toCoordIdx);
      setHighlightedRoad(routeCoordinates.slice(minIdx, maxIdx + 1));
    }
  }, [simFromCity, simToCity, masterStops, routeCoordinates]);


  // Request browser geolocation to find 3 closest unofficial/official stops
  const handleFindNearestStops = () => {
    if (!navigator.geolocation) {
      setErrorMessage("Geolocation is not supported by your browser");
      return;
    }

    setIsLocating(true);
    setErrorMessage('');
    setHighlightedRoad([]);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation([latitude, longitude]);
        setMapCenter([latitude, longitude]);
        setMapZoom(14);

        try {
          const res = await fetch(`${API_BASE}/api/stops/near?lat=${latitude}&lng=${longitude}`);
          if (!res.ok) throw new Error("Failed to search nearby stops");
          const data = await res.json();
          setNearestStops(data);
          setIsLocating(false);
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
        setMapCenter([mockLat, mockLng]);
        setMapZoom(14);

        fetch(`${API_BASE}/api/stops/near?lat=${mockLat}&lng=${mockLng}`)
          .then(res => res.json())
          .then(data => {
            setNearestStops(data);
            setIsLocating(false);
          })
          .catch(err => {
            console.error("Mock fetch failed:", err);
            setIsLocating(false);
          });
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Trigger manually config endpoint
  const handleApplySimConfig = async (e) => {
    e.preventDefault();
    setSimMessage('');
    setIsSimulating(true);

    if (simFromCity === simToCity) {
      setSimMessage('Error: From and To cities must be different.');
      setIsSimulating(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/simulator/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          busNumber: simBusNumber,
          fromCity: simFromCity,
          toCity: simToCity,
          ticketsSold: simTicketsSold
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update simulator');

      setSimMessage('Route applied! Teleporting bus...');

      // Pan the map to the start city coordinates
      const startCity = masterStops.find(c => c.stopId === simFromCity);
      if (startCity) {
        setMapCenter([startCity.coordinates[1], startCity.coordinates[0]]);
        setMapZoom(11);
      }

      setTimeout(() => setSimMessage(''), 4000);
    } catch (err) {
      console.error(err);
      setSimMessage(`Error: ${err.message}`);
    } finally {
      setIsSimulating(false);
    }
  };

  // Helper to calculate distance and estimated arrival time using Turf.js
  const calculateETA = (busLocationLngLat, stopLocationLngLat, speedKmh = 30) => {
    if (!busLocationLngLat || !stopLocationLngLat) return null;
    try {
      const from = turf.point(busLocationLngLat);
      const to = turf.point(stopLocationLngLat);
      const distKm = turf.distance(from, to, { units: 'kilometers' });

      const speed = speedKmh > 0 ? speedKmh : 35;
      const etaMinutes = Math.round((distKm / speed) * 60);

      return {
        distanceKm: parseFloat(distKm.toFixed(2)),
        etaMinutes: etaMinutes < 1 ? 1 : etaMinutes
      };
    } catch (e) {
      console.error("Turf math error:", e);
      return null;
    }
  };

  // HTML custom div-icon generator for dynamic buses based on crowd capacity status
  const getBusIcon = (crowdStatus, ticketsSold, capacity, isSelected) => {
    let colorClass = 'bg-emerald-500';
    let ringClass = 'ring-emerald-500/30';

    if (crowdStatus === 'crowded') {
      colorClass = 'bg-amber-500';
      ringClass = 'ring-amber-500/30';
    } else if (crowdStatus === 'overcrowded') {
      colorClass = 'bg-orange-600';
      ringClass = 'ring-orange-600/30 animate-pulse';
    } else if (crowdStatus === 'full') {
      colorClass = 'bg-rose-700';
      ringClass = 'ring-rose-700/30';
    }

    const selectedStyle = isSelected ? 'scale-125 ring-4 ring-cyan-400 z-[999]' : 'ring-4';
    const seatIndicator = capacity >= ticketsSold ? `${capacity - ticketsSold}` : `+${ticketsSold - capacity}`;

    return L.divIcon({
      className: 'custom-bus-marker',
      html: `
        <div class="relative flex items-center justify-center w-10 h-10 rounded-full shadow-2xl transition-all duration-300 ${colorClass} ${ringClass} ${selectedStyle}">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-5 h-5 text-white">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124l-.317-5.074a2.25 2.25 0 0 0-2.247-2.112H18M4.75 6.75h14.5m-14.5 4h14.5M3 14.25h18M6.75 6.75v7.5m10.5-7.5v7.5" />
          </svg>
          <div class="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-950 border border-slate-700 text-[9px] font-extrabold text-white">
            ${seatIndicator}
          </div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });
  };

  const getUnofficialStopIcon = (isHighlighted) => {
    return L.divIcon({
      className: 'custom-stop-marker',
      html: `<div class="${isHighlighted ? 'custom-pulse-green' : 'custom-pulse-amber'}"></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
  };

  const getOfficialStopIcon = (isHighlighted) => {
    const bgClass = isHighlighted ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-blue-600 shadow-blue-500/50';
    return L.divIcon({
      className: 'custom-stop-marker-official',
      html: `
        <div class="relative flex items-center justify-center w-5 h-5 rounded-full ${bgClass} shadow-lg border border-white">
          <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
        </div>
      `,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
  };

  const getSimFromIcon = () => {
    return L.divIcon({
      className: 'custom-sim-from-marker',
      html: `
        <div class="relative flex items-center justify-center w-8 h-8 z-[1000]">
          <span class="absolute inline-flex h-full w-full rounded-full bg-orange-500 opacity-75 animate-ping"></span>
          <span class="relative inline-flex rounded-full h-4 w-4 bg-orange-500 border-2 border-white shadow-md"></span>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
  };

  const getSimToIcon = () => {
    return L.divIcon({
      className: 'custom-sim-to-marker',
      html: `
        <div class="relative flex items-center justify-center w-6 h-6 rounded-full bg-rose-600 border-2 border-white shadow-[0_0_10px_rgba(225,29,72,0.6)] z-[1000]">
          <div class="w-2 h-2 rounded-full bg-white"></div>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
  };

  const findNextStopForBus = (busCoordinates) => {
    if (!stops.length || !busCoordinates) return null;
    let closestStop = null;
    let minDistance = Infinity;

    stops.forEach(stop => {
      const dist = turf.distance(
        turf.point(busCoordinates),
        turf.point(stop.location.coordinates),
        { units: 'kilometers' }
      );
      if (dist < minDistance) {
        minDistance = dist;
        closestStop = stop;
      }
    });

    return { stop: closestStop, distance: minDistance };
  };

  const getStopFriendlyName = (stopId) => {
    const foundStop = stops.find(s => s.stopId === stopId);
    return foundStop ? foundStop.name : stopId;
  };

  const renderCrowdBadge = (status, ticketsSold, capacity) => {
    if (status === 'crowded') {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-950/80 text-amber-400 border border-amber-800/40">
          Crowded (+{ticketsSold - capacity} Standing)
        </span>
      );
    }
    if (status === 'overcrowded') {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-950/90 text-orange-400 border border-orange-850/50 animate-pulse">
          Overcrowded
        </span>
      );
    }
    if (status === 'full') {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-950/90 text-rose-400 border border-rose-800/40">
          Full (No Boarding)
        </span>
      );
    }
    return (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/40">
        Seats Available ({capacity - ticketsSold} left)
      </span>
    );
  };

  const routeBounds = React.useMemo(() => {
    if (masterStops.length === 0 || routeCoordinates.length === 0) return null;

    const fromIdx = masterStops.findIndex(s => s.stopId === simFromCity);
    const toIdx = masterStops.findIndex(s => s.stopId === simToCity);
    if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return null;

    const travelDir = fromIdx < toIdx ? 1 : -1;
    const fromStop = masterStops[fromIdx];
    const toStop = masterStops[toIdx];

    const findClosestCoordIdx = (stopCoords) => {
      let closestIdx = -1;
      let minDistance = Infinity;
      routeCoordinates.forEach((c, idx) => {
        const d = Math.abs(c[0] - stopCoords[1]) + Math.abs(c[1] - stopCoords[0]);
        if (d < minDistance) {
          minDistance = d;
          closestIdx = idx;
        }
      });
      return closestIdx;
    };

    const fromCoordIdx = findClosestCoordIdx(fromStop.coordinates);
    const toCoordIdx = findClosestCoordIdx(toStop.coordinates);

    if (fromCoordIdx === -1 || toCoordIdx === -1) return null;

    return { fromCoordIdx, toCoordIdx, travelDir };
  }, [simFromCity, simToCity, masterStops, routeCoordinates]);

  // Derive filtered buses based on user selection (Path bounding & Direction)
  const filteredBuses = React.useMemo(() => {
    if (!routeBounds) return busesList;

    const incomingBuses = busesList.map(bus => {
      const busCoordIdx = routeCoordinates.findIndex(c => 
        Math.abs(c[0] - bus.location[1]) < 0.0001 && Math.abs(c[1] - bus.location[0]) < 0.0001
      );
      return { ...bus, busCoordIdx };
    }).filter(bus => {
      // 1. Direction Filter
      if (bus.direction && bus.direction !== routeBounds.travelDir) return false;

      // 2. Incoming Bus Filter (Has not yet passed the From city)
      if (bus.busCoordIdx === -1) return false;

      if (routeBounds.travelDir === 1) {
        // Forward: Show ONLY buses that are approaching 'From' (have not yet passed the From stop)
        return bus.busCoordIdx <= routeBounds.fromCoordIdx;
      } else {
        // Backward: Show ONLY buses that are approaching 'From' (have not yet passed the From stop)
        return bus.busCoordIdx >= routeBounds.fromCoordIdx;
      }
    });

    if (incomingBuses.length <= 1) return incomingBuses;

    // Sort by proximity to the 'From' station and only return the nearest one
    incomingBuses.sort((a, b) => {
      const distA = Math.abs(a.busCoordIdx - routeBounds.fromCoordIdx);
      const distB = Math.abs(b.busCoordIdx - routeBounds.fromCoordIdx);
      return distA - distB;
    });

    return [incomingBuses[0]];
  }, [busesList, routeBounds, routeCoordinates]);

  // Auto-frame map when a bus approaches
  useEffect(() => {
    if (filteredBuses.length > 0 && simFromCity) {
      const nearestBus = filteredBuses[0];
      const fromStop = masterStops.find(s => s.stopId === simFromCity);
      
      if (fromStop && nearestBus.busNumber !== lastFramedBusRef.current) {
        lastFramedBusRef.current = nearestBus.busNumber;
        const busLatLng = [nearestBus.location[1], nearestBus.location[0]];
        const stopLatLng = [fromStop.coordinates[1], fromStop.coordinates[0]];
        setMapBounds([busLatLng, stopLatLng]);
      }
    } else if (filteredBuses.length === 0) {
      lastFramedBusRef.current = null;
    }
  }, [filteredBuses, simFromCity, masterStops]);

  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">

      {/* 1. Left Glassmorphic Sidebar (Traveler Facing) */}
      <aside className="absolute left-0 top-0 z-[1000] h-full w-full sm:w-[380px] glass-panel p-5 flex flex-col justify-between shadow-2xl transition-all duration-300">
        <div className="flex flex-col h-full overflow-hidden">

          {/* Header */}
          <div className="border-b border-slate-800 pb-4 mb-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                ComeOn Bus
              </h1>
              <span className="flex items-center gap-1.5 text-[10px] uppercase font-bold glass-badge px-2 py-0.5 rounded-full">
                <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
                {isConnected ? 'Sync Active' : 'Disconnected'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Conductor integrated ticket & seat forecasting engine.
            </p>
          </div>

          {/* Error Message Box */}
          {errorMessage && (
            <div className="bg-rose-950/40 border border-rose-800/50 rounded-lg p-2 text-rose-300 text-xs mb-3 flex items-start gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 mt-0.5 shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
              </svg>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Action Trigger */}
          <button
            onClick={handleFindNearestStops}
            disabled={isLocating}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 disabled:opacity-50 text-white font-semibold text-sm py-2.5 px-4 rounded-xl shadow-lg shadow-emerald-950/20 active:scale-95 transition-all mb-4"
          >
            {isLocating ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Locating Wait Points...
              </span>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4.5 h-4.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                </svg>
                Find Nearest Wait Points
              </>
            )}
          </button>

          {/* Sidebar Lists */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">

            {/* 1. Nearest Stops list */}
            {nearestStops.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Closest Commuter Wait Points
                </h3>
                <div className="grid gap-2">
                  {nearestStops.map((stop) => {
                    let userDist = null;
                    if (userLocation) {
                      userDist = parseFloat(
                        turf.distance(
                          turf.point([userLocation[1], userLocation[0]]),
                          turf.point(stop.location.coordinates),
                          { units: 'kilometers' }
                        ).toFixed(2)
                      );
                    }
                    return (
                      <div
                        key={stop.stopId}
                        onClick={() => {
                          setSelectedStop(stop);
                          setSelectedBus(null);
                          setMapCenter([stop.location.coordinates[1], stop.location.coordinates[0]]);
                          setMapZoom(15);
                        }}
                        className={`p-3 rounded-xl cursor-pointer transition-all ${selectedStop?.stopId === stop.stopId
                            ? 'bg-slate-800 border border-emerald-500/50'
                            : 'glass-card border border-slate-800'
                          }`}
                      >
                        <div className="flex justify-between items-start">
                          <h4 className="text-xs font-semibold text-emerald-300">
                            {stop.name}
                          </h4>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/40">
                            {stop.isOfficial ? 'Terminal' : 'Wait Spot'}
                          </span>
                        </div>
                        {userDist !== null && (
                          <p className="text-[10px] text-slate-400 mt-1">
                            Distance from you: <span className="font-semibold text-slate-200">{userDist} km</span>
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. Active Buses List */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Live Buses in Operation
              </h3>
              {filteredBuses.length === 0 ? (
                <p className="text-xs text-slate-500 italic p-3 text-center bg-slate-900/50 rounded-lg">
                  No active buses tracked. Start backend simulation.
                </p>
              ) : (
                <div className="grid gap-2">
                  {filteredBuses.map((bus) => {
                    let barColor = 'bg-emerald-500';
                    let progressWidth = (bus.ticketsSold / bus.capacity) * 100;

                    if (bus.crowdStatus === 'crowded') {
                      barColor = 'bg-amber-500';
                    } else if (bus.crowdStatus === 'overcrowded') {
                      barColor = 'bg-orange-600';
                    } else if (bus.crowdStatus === 'full') {
                      barColor = 'bg-rose-700 animate-pulse';
                    }

                    if (progressWidth > 100) progressWidth = 100;

                    const isBusSelected = selectedBus?.busNumber === bus.busNumber;

                    return (
                      <div
                        key={bus.busNumber}
                        onClick={() => {
                          setSelectedBus(bus);
                          setSelectedStop(null);
                          setMapCenter([bus.location[1], bus.location[0]]);
                          setMapZoom(12);
                        }}
                        className={`p-3 rounded-xl cursor-pointer transition-all ${isBusSelected
                            ? 'bg-slate-800 border border-cyan-500/50'
                            : 'glass-card border border-slate-800'
                          }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-xs font-bold text-slate-100">
                              {bus.busNumber}
                            </span>
                            <p className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5">
                              {bus.routeName}
                            </p>
                          </div>
                          <div className="text-right flex flex-col items-end gap-1">
                            {renderCrowdBadge(bus.crowdStatus, bus.ticketsSold, bus.capacity)}
                            <span className="text-[9px] text-slate-400">
                              Speed: {bus.speed} km/h
                            </span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-[10px] text-slate-400 mt-2">
                          <span>Sold: {bus.ticketsSold}</span>
                          <span>Cap: {bus.capacity}</span>
                        </div>

                        <div className="w-full bg-slate-950 rounded-full h-1.5 mt-1 overflow-hidden">
                          <div
                            className={`h-full ${barColor} transition-all duration-500`}
                            style={{ width: `${progressWidth}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* 3a. Detailed Conductor Forecast calculations (If Bus is selected) */}
          {selectedBus && (
            <div className="border-t border-slate-800 pt-4 mt-4 bg-slate-900/80 rounded-xl p-3 border border-slate-800">
              <div className="relative">
                <button
                  onClick={() => setSelectedBus(null)}
                  className="absolute right-0 top-0 text-slate-400 hover:text-white"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
                <span className="text-[9px] uppercase font-bold tracking-widest text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                  Forecasting Dashboard
                </span>

                <h4 className="text-sm font-bold text-white mt-2 flex items-center justify-between">
                  <span>{selectedBus.busNumber}</span>
                  <span className="text-xs text-slate-400 font-normal">Active Route</span>
                </h4>

                {(() => {
                  const nextStopDetails = findNextStopForBus(selectedBus.location);
                  if (!nextStopDetails || !nextStopDetails.stop) return null;

                  const eta = calculateETA(
                    selectedBus.location,
                    nextStopDetails.stop.location.coordinates,
                    selectedBus.speed
                  );

                  return (
                    <div className="mt-3 space-y-2">
                      <div className="flex justify-between items-center bg-cyan-950/40 p-2 rounded-lg border border-cyan-800/30">
                        <span className="text-xs text-cyan-300 font-semibold">Time remaining to arrive:</span>
                        <span className="text-xs text-cyan-300 font-extrabold animate-pulse">
                          {eta ? `${eta.etaMinutes} mins` : 'N/A'}
                        </span>
                      </div>
                      
                      <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                        <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-2">Passenger Destinations</div>
                        {selectedBus.passengerDestinations && selectedBus.passengerDestinations.length > 0 ? (
                          <div className="space-y-1">
                            {selectedBus.passengerDestinations.map(pd => (
                               <div key={pd.stopId} className="flex justify-between items-center text-[10px] text-slate-300">
                                 <span>Passengers to {getStopFriendlyName(pd.stopId)}:</span>
                                 <span className="font-bold text-white bg-slate-800 px-1.5 py-0.5 rounded">{pd.count}</span>
                               </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-500 italic">No passengers currently tracked.</div>
                        )}
                        <div className="border-t border-slate-800 mt-2 pt-2 flex justify-between items-center text-[10px] text-slate-300 font-bold">
                           <span>Total seats available:</span>
                           <span className="text-emerald-400 text-xs">{Math.max(0, selectedBus.capacity - selectedBus.ticketsSold)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* 3b. Detailed Wait Point Forecast (If Stop is selected) */}
          {selectedStop && !selectedBus && (
            <div className="border-t border-slate-800 pt-4 mt-4 bg-slate-950/80 rounded-xl p-3 border border-slate-800">
              <div className="relative">
                <button
                  onClick={() => setSelectedStop(null)}
                  className="absolute right-0 top-0 text-slate-400 hover:text-white"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
                <span className="text-[9px] uppercase font-bold tracking-widest text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                  Stop Prediction Forecast
                </span>

                <h4 className="text-sm font-bold text-white mt-2">
                  {selectedStop.name}
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Type: {selectedStop.isOfficial ? 'Official Terminal' : 'Unofficial Roadside Stand'}
                </p>

                <div className="mt-3 space-y-3">
                  <h5 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">
                    Approaching Buses & ETAs
                  </h5>

                  {filteredBuses.length === 0 ? (
                    <p className="text-[10px] text-slate-500 italic">No active buses on route.</p>
                  ) : (
                    <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                      {filteredBuses.map(bus => {
                        const eta = calculateETA(bus.location, selectedStop.location.coordinates, bus.speed);
                        const deboardingCount = bus.passengerDestinations?.find(pd => pd.stopId === selectedStop.stopId)?.count || 0;

                        const projectedTickets = Math.max(0, bus.ticketsSold - deboardingCount);
                        const projectedSeats = bus.capacity - projectedTickets;

                        return (
                          <div key={bus.busNumber} className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800 space-y-1">
                            <div className="flex justify-between items-center text-[10px] font-extrabold text-slate-200 mb-1">
                              <span>Bus {bus.busNumber}</span>
                              <span className="text-cyan-400 animate-pulse">
                                {eta ? `~ ${eta.etaMinutes} mins` : 'Arrived'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-[9px] text-slate-400 border-t border-slate-800 pt-1.5 mt-1.5">
                              <span className="font-semibold text-emerald-400">Seats Available: {Math.max(0, bus.capacity - bus.ticketsSold)}</span>
                              <span>Speed: {bus.speed || 0} km/h</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Trip Planner (Simulation Control Desk moved to sidebar) */}
        <div className="mt-auto pt-4 border-t border-slate-900 pb-2">


          <div className="space-y-3 text-xs bg-slate-950/50 p-3 rounded-xl border border-slate-800/60 shadow-inner">
            {/* Route Segment Selectors */}
            <div className="flex flex-col gap-2">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold block">From Terminal</label>
                <select
                  value={simFromCity}
                  onChange={(e) => setSimFromCity(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-cyan-500/50"
                >
                  {masterStops.filter(s => s.isOfficial).map(city => (
                    <option key={city.stopId} value={city.stopId}>{city.name.replace(' Terminal', '')}</option>
                  ))}
                </select>
              </div>

              {/* Swap Button */}
              <div className="flex justify-center -my-3 relative z-10">
                <button 
                  onClick={() => {
                    const temp = simFromCity;
                    setSimFromCity(simToCity);
                    setSimToCity(temp);
                  }}
                  className="bg-slate-800 hover:bg-cyan-900 text-cyan-400 p-1.5 rounded-full border border-slate-700 shadow-lg transition-colors active:scale-90"
                  title="Swap Terminals"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />
                  </svg>
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold block">To Terminal</label>
                <select
                  value={simToCity}
                  onChange={(e) => setSimToCity(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-cyan-500/50"
                >
                  {masterStops.filter(s => s.isOfficial).map(city => (
                    <option key={city.stopId} value={city.stopId}>{city.name.replace(' Terminal', '')}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-[10px] text-slate-600 text-center pt-3 mt-1 shrink-0">
          Created for rural travelers waiting in Majhola Moradabad.
        </div>
      </aside>



      {/* 3. Full screen Leaflet Map */}
      <main className="flex-1 h-full w-full relative z-[10]">
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          className="h-full w-full"
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />

          <MapController center={mapCenter} zoom={mapZoom} bounds={mapBounds} />

          {/* Draw Highlighted OSRM Real Road Polyline (Dotted) */}
          {highlightedRoad.length > 0 && (
            <Polyline
              positions={highlightedRoad}
              color="#06b6d4"
              weight={4}
              opacity={0.8}
              dashArray="6, 12"
              className="drop-shadow-lg"
            />
          )}

          {/* Render User Location Marker */}
          {userLocation && (
            <Marker
              position={userLocation}
              icon={L.divIcon({
                className: 'custom-user-marker',
                html: `
                  <div class="relative flex items-center justify-center w-8 h-8">
                    <span class="absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-60 animate-ping"></span>
                    <span class="relative inline-flex rounded-full h-4.5 w-4.5 bg-cyan-500 border-2 border-white shadow-md"></span>
                  </div>
                `,
                iconSize: [32, 32],
                iconAnchor: [16, 16]
              })}
            >
              <Popup>
                <div className="text-xs font-semibold p-1">Your Wait Location</div>
              </Popup>
            </Marker>
          )}

          {/* Render Stops & Wait Points */}
          {stops.filter(stop => {
            return stop.stopId === simFromCity ||
              stop.stopId === simToCity ||
              nearestStops.some(ns => ns.stopId === stop.stopId);
          }).map((stop) => {
            const isHighlighted = nearestStops.some(ns => ns.stopId === stop.stopId);
            const stopLatLng = [stop.location.coordinates[1], stop.location.coordinates[0]];

            let stopIcon;
            if (stop.stopId === simFromCity) {
              stopIcon = getSimFromIcon();
            } else if (stop.stopId === simToCity) {
              stopIcon = getSimToIcon();
            } else {
              stopIcon = getOfficialStopIcon(isHighlighted);
            }

            return (
              <Marker
                key={stop.stopId}
                position={stopLatLng}
                icon={stopIcon}
                eventHandlers={{
                  click: () => {
                    setSelectedStop(stop);
                    setSelectedBus(null);
                    setMapCenter(stopLatLng);
                  }
                }}
              >
                <Popup>
                  <div className="p-2 space-y-1 text-slate-100 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className={`h-2.5 w-2.5 rounded-full ${stop.isOfficial ? 'bg-blue-500' : 'bg-amber-500'}`}></span>
                      <strong className="text-white text-xs">{stop.name}</strong>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Status: <span className="font-semibold text-slate-300">{stop.isOfficial ? 'Official Bus Stand' : 'Unofficial Wait Spot'}</span>
                    </p>
                    {isHighlighted && (
                      <p className="text-[10px] text-emerald-400 font-extrabold bg-emerald-950/50 p-1 rounded border border-emerald-900/30">
                        ⭐ Nearest to you!
                      </p>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Render Active Moving Buses */}
          {filteredBuses.map((bus) => {
            const busLatLng = [bus.location[1], bus.location[0]];
            const isSelected = selectedBus?.busNumber === bus.busNumber;

            return (
              <React.Fragment key={bus.busNumber}>
                {/* Draw Red Dotted Line for Pickup Path (from bus to start city) */}
                {bus.busCoordIdx !== undefined && bus.busCoordIdx !== -1 && routeBounds && (
                  <Polyline
                    positions={routeCoordinates.slice(
                      Math.min(bus.busCoordIdx, routeBounds.fromCoordIdx),
                      Math.max(bus.busCoordIdx, routeBounds.fromCoordIdx) + 1
                    )}
                    color="#ef4444"
                    weight={3}
                    dashArray="5, 10"
                    opacity={0.6}
                    className="drop-shadow-lg"
                  />
                )}

                <Marker
                  position={busLatLng}
                  icon={getBusIcon(bus.crowdStatus, bus.ticketsSold, bus.capacity, isSelected)}
                  eventHandlers={{
                    click: () => {
                      setSelectedBus(bus);
                      setSelectedStop(null);
                      setMapCenter(busLatLng);
                    }
                  }}
                >
                <Popup>
                  <div className="p-2.5 space-y-2 text-slate-100 text-xs min-w-[180px]">
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-white text-sm">{bus.busNumber}</span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Live</span>
                    </div>

                    <div className="text-[10px] text-slate-400">
                      Route: <span className="text-slate-200 font-medium">{bus.routeName}</span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span>Status:</span>
                      {renderCrowdBadge(bus.crowdStatus, bus.ticketsSold, bus.capacity)}
                    </div>

                    <div className="flex justify-between items-center text-xs mt-1">
                      <span>Seats Available:</span>
                      <span className="font-extrabold text-emerald-400">{Math.max(0, bus.capacity - bus.ticketsSold)}</span>
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-slate-400 border-t border-slate-800 pt-1.5 mt-1">
                      <span>Speed: {bus.speed} km/h</span>
                      <span>Updated: Just now</span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
            );
          })}
        </MapContainer>
      </main>

    </div>
  );
}
