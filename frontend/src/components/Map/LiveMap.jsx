import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { getSimFromIcon, getSimToIcon, getOfficialStopIcon, getBusIcon } from './MapIcons';

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

export function LiveMap({
  mapCenter,
  mapZoom,
  mapBounds,
  highlightedRoad,
  userLocation,
  stops,
  simFromCity,
  simToCity,
  nearestStops,
  filteredBuses,
  selectedBus,
  routeCoordinates,
  routeBounds,
  setSelectedStop,
  setSelectedBus,
  setMapBounds,
  setMapCenter,
  simFromIcon,
  simToIcon,
  renderCrowdBadge
}) {
  return (
    <main className="flex-1 h-full w-full relative z-[10]">
      <MapContainer center={mapCenter} zoom={mapZoom} className="h-full w-full" zoomControl={false}>
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
            stopIcon = simFromIcon;
          } else if (stop.stopId === simToCity) {
            stopIcon = simToIcon;
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
                  setMapBounds(null);
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
                    setMapBounds(null);
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
  );
}
