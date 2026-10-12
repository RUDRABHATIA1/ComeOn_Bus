import React, { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import * as turf from '@turf/turf';
import { useLiveBuses } from '../hooks/useLiveBuses';
import {
  selectBuses, selectIsConnected, selectTransitData,
  setRouteCoordinates as setRouteCoordinatesAction, setMasterStops as setMasterStopsAction,
  setStops as setStopsAction, setTransitError
} from '../redux/transitSlice';
import {
  selectMapState, setHighlightedRoad as setHighlightedRoadAction,
  setNearestStops as setNearestStopsAction, setUserLocation as setUserLocationAction,
  setMapCenter as setMapCenterAction, setMapZoom as setMapZoomAction,
  setMapBounds as setMapBoundsAction, setIsLocating as setIsLocatingAction
} from '../redux/mapSlice';
import {
  selectUiState, setSelectedBus as setSelectedBusAction, setSelectedStop as setSelectedStopAction,
  setSidebarOpen as setSidebarOpenAction, setSimFromCity as setSimFromCityAction,
  setSimToCity as setSimToCityAction
} from '../redux/uiSlice';
import { SidebarOverlay } from '../components/UI/SidebarOverlay';
import { MenuToggleButton } from '../components/UI/MenuToggleButton';
import { SidebarContainer } from '../components/Sidebar/SidebarContainer';
import { LiveMap } from '../components/Map/LiveMap';
import { getSimFromIcon, getSimToIcon } from '../components/Map/MapIcons';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Static icon generators moved to components/Map/MapIcons.js

export default function App() {
  useLiveBuses();
  const dispatch = useDispatch();
  const busesList = useSelector(selectBuses);
  const isConnected = useSelector(selectIsConnected);
  const { routeCoordinates, masterStops, stops, errorMessage } = useSelector(selectTransitData);
  const { highlightedRoad, nearestStops, userLocation, center: mapCenter, zoom: mapZoom, bounds: mapBounds, isLocating } = useSelector(selectMapState);
  const { selectedBus, selectedStop, isSidebarOpen, simFromCity, simToCity } = useSelector(selectUiState);
  const setRouteCoordinates = value => dispatch(setRouteCoordinatesAction(value));
  const setHighlightedRoad = value => dispatch(setHighlightedRoadAction(value));
  const setStops = value => dispatch(setStopsAction(value));
  const setMasterStops = value => dispatch(setMasterStopsAction(value));
  const setNearestStops = value => dispatch(setNearestStopsAction(value));
  const setUserLocation = value => dispatch(setUserLocationAction(value));
  const setMapCenter = value => dispatch(setMapCenterAction(value));
  const setMapZoom = value => dispatch(setMapZoomAction(value));
  const setMapBounds = value => dispatch(setMapBoundsAction(value));
  const setIsLocating = value => dispatch(setIsLocatingAction(value));
  const setSelectedBus = value => dispatch(setSelectedBusAction(value));
  const setSelectedStop = value => dispatch(setSelectedStopAction(value));
  const setIsSidebarOpen = value => dispatch(setSidebarOpenAction(value));
  const setSimFromCity = value => dispatch(setSimFromCityAction(value));
  const setSimToCity = value => dispatch(setSimToCityAction(value));
  const lastFramedCityRef = useRef(null);

  // Sync selectedBus data when live bus list updates from socket
  useEffect(() => {
    if (selectedBus) {
      const liveBus = busesList.find(b => b.busNumber === selectedBus.busNumber);
      if (liveBus) {
        setSelectedBus(liveBus);
      }
    }
  }, [busesList, selectedBus]);

  // Memoize icons so Leaflet doesn't destroy and recreate the DOM node (which ruins CSS animations)
  const simFromIcon = React.useMemo(() => getSimFromIcon(), []);
  const simToIcon = React.useMemo(() => getSimToIcon(), []);

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

        // Auto-fit map to the entire pathway without freezing Leaflet with 47k points
        if (leafletCoords && leafletCoords.length > 0) {
          let minLat = Infinity, minLng = Infinity, maxLat = -Infinity, maxLng = -Infinity;
          for (let i = 0; i < leafletCoords.length; i++) {
            const [lat, lng] = leafletCoords[i];
            if (lat < minLat) minLat = lat;
            if (lat > maxLat) maxLat = lat;
            if (lng < minLng) minLng = lng;
            if (lng > maxLng) maxLng = lng;
          }
          setMapBounds([[minLat, minLng], [maxLat, maxLng]]);
        }
      } catch (err) {
        console.error("Failed to load initial transit data:", err);
        dispatch(setTransitError("Could not connect to database. Make sure your server and database are running."));
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
      dispatch(setTransitError("Geolocation is not supported by your browser"));
      return;
    }

    setIsLocating(true);
    dispatch(setTransitError(''));
    setHighlightedRoad([]);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation([latitude, longitude]);
        setMapBounds(null);
        setMapCenter([latitude, longitude]);
        setMapZoom(14);

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
            setMapBounds(bounds);
          }
        } catch (err) {
          console.error("Error fetching nearest stops:", err);
          dispatch(setTransitError("Failed to locate closest stops."));
          setIsLocating(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        dispatch(setTransitError("Permission denied or location retrieval timed out. Using mock location..."));

        const mockLat = 28.8400;
        const mockLng = 78.7480;
        setUserLocation([mockLat, mockLng]);
        setMapBounds(null);
        setMapCenter([mockLat, mockLng]);
        setMapZoom(14);

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
              setMapBounds(bounds);
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

  // Icons are imported directly in LiveMap now

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

  // Auto-frame map ONCE when a bus approaches a newly selected terminal
  useEffect(() => {
    if (filteredBuses.length > 0 && simFromCity) {
      if (simFromCity !== lastFramedCityRef.current) {
        lastFramedCityRef.current = simFromCity;
        const nearestBus = filteredBuses[0];
        const fromStop = masterStops.find(s => s.stopId === simFromCity);
        
        if (fromStop) {
          const busLatLng = [nearestBus.location[1], nearestBus.location[0]];
          const stopLatLng = [fromStop.coordinates[1], fromStop.coordinates[0]];
          setMapBounds([busLatLng, stopLatLng]);
        }
      }
    } else if (!simFromCity) {
      lastFramedCityRef.current = null;
    }
  }, [filteredBuses, simFromCity, masterStops]);

  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
      <SidebarOverlay isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
      
      <MenuToggleButton isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />

      <SidebarContainer
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        isConnected={isConnected}
        errorMessage={errorMessage}
        isLocating={isLocating}
        handleFindNearestStops={handleFindNearestStops}
        nearestStops={nearestStops}
        userLocation={userLocation}
        setSelectedStop={setSelectedStop}
        setSelectedBus={setSelectedBus}
        setMapCenter={setMapCenter}
        setMapZoom={setMapZoom}
        selectedStop={selectedStop}
        filteredBuses={filteredBuses}
        selectedBus={selectedBus}
        renderCrowdBadge={renderCrowdBadge}
        findNextStopForBus={findNextStopForBus}
        calculateETA={calculateETA}
        getStopFriendlyName={getStopFriendlyName}
        simFromCity={simFromCity}
        setSimFromCity={setSimFromCity}
        simToCity={simToCity}
        setSimToCity={setSimToCity}
        masterStops={masterStops}
      />

      <LiveMap 
        mapCenter={mapCenter}
        mapZoom={mapZoom}
        mapBounds={mapBounds}
        highlightedRoad={highlightedRoad}
        userLocation={userLocation}
        stops={stops}
        simFromCity={simFromCity}
        simToCity={simToCity}
        nearestStops={nearestStops}
        filteredBuses={filteredBuses}
        selectedBus={selectedBus}
        routeCoordinates={routeCoordinates}
        routeBounds={routeBounds}
        setSelectedStop={setSelectedStop}
        setSelectedBus={setSelectedBus}
        setMapBounds={setMapBounds}
        setMapCenter={setMapCenter}
        simFromIcon={simFromIcon}
        simToIcon={simToIcon}
        renderCrowdBadge={renderCrowdBadge}
      />
    </div>
  );
}
