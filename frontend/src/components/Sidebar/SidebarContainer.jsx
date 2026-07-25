import React from 'react';
import * as turf from '@turf/turf';

export function SidebarContainer({
  isSidebarOpen,
  setIsSidebarOpen,
  isConnected,
  errorMessage,
  isLocating,
  handleFindNearestStops,
  nearestStops,
  userLocation,
  setSelectedStop,
  setSelectedBus,
  setMapCenter,
  setMapZoom,
  selectedStop,
  filteredBuses,
  selectedBus,
  renderCrowdBadge,
  findNextStopForBus,
  calculateETA,
  getStopFriendlyName,
  simFromCity,
  setSimFromCity,
  simToCity,
  setSimToCity,
  masterStops
}) {
  return (
    <aside className={`absolute left-0 top-0 z-[1000] h-full w-full sm:w-[380px] glass-panel p-5 flex flex-col justify-between shadow-2xl transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="border-b border-slate-800 pb-4 mb-4 relative">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              ComeOn Bus
            </h1>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-[10px] uppercase font-bold glass-badge px-2 py-0.5 rounded-full">
                <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
                {isConnected ? 'Sync Active' : 'Disconnected'}
              </span>
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="text-slate-400 hover:text-white bg-slate-800/50 p-1.5 rounded-lg transition-colors"
                title="Close Sidebar"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 pr-8">
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
                        setIsSidebarOpen(false);
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
                        setIsSidebarOpen(false);
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

      {/* Trip Planner (Simulation Control Desk) */}
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
  );
}
