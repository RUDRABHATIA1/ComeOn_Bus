import fs from 'fs';
import * as turf from '@turf/turf';

async function generate() {
  
  // 1. Fetch OSRM geometry traversing the main terminals
  const coordsStr = '79.4300,28.3670;78.7733,28.8386;78.1642,29.9457;78.0322,30.3165;76.7794,30.7333;76.2700,31.6800;76.3240,32.2180';
  const url = 'http://router.project-osrm.org/route/v1/driving/' + coordsStr + '?overview=full&geometries=geojson';
  
  const res = await fetch(url);
  const data = await res.json();
  const routeGeom = data.routes[0].geometry;
  const line = turf.lineString(routeGeom.coordinates);
  const totalLengthKm = turf.length(line, {units: 'kilometers'});
  
  const terminals = [
    { id: 'stop-bareilly', name: 'Bareilly Terminal', coords: [79.4300, 28.3670], isOfficial: true },
    { id: 'stop-moradabad', name: 'Moradabad Terminal', coords: [78.7733, 28.8386], isOfficial: true },
    { id: 'stop-haridwar', name: 'Haridwar Terminal', coords: [78.1642, 29.9457], isOfficial: true },
    { id: 'stop-dehradun', name: 'Dehradun Terminal', coords: [78.0322, 30.3165], isOfficial: true },
    { id: 'stop-chandigarh', name: 'Chandigarh Terminal', coords: [76.7794, 30.7333], isOfficial: true },
    { id: 'stop-hamirpur', name: 'Hamirpur Terminal', coords: [76.2700, 31.6800], isOfficial: true },
    { id: 'stop-dharamshala', name: 'Dharamshala Terminal', coords: [76.3240, 32.2180], isOfficial: true }
  ];
  
  // Map terminals to their distance along the line
  const terminalDistances = terminals.map(t => {
    const pt = turf.point(t.coords);
    const snapped = turf.nearestPointOnLine(line, pt, {units: 'kilometers'});
    return { ...t, distance: snapped.properties.location, snappedCoords: snapped.geometry.coordinates };
  });
  
  const stops = [];
  let currentDistance = 0;
  let terminalIndex = 0;
  let milepostCount = 1;
  
  while(currentDistance <= totalLengthKm) {
    // Check if we passed a terminal
    if (terminalIndex < terminalDistances.length && currentDistance >= terminalDistances[terminalIndex].distance) {
      const term = terminalDistances[terminalIndex];
      // Only push if we didn't just push it
      if (stops.length === 0 || stops[stops.length-1].stopId !== term.id) {
        stops.push({
          stopId: term.id,
          name: term.name,
          coordinates: term.snappedCoords,
          isOfficial: term.isOfficial
        });
      }
      terminalIndex++;
      // Align currentDistance to the next 20km milestone after this terminal?
      // Actually, standard mileposts continue uniformly. Let's just push the milepost if it's not identical.
    }
    
    // Add the 20km milepost if it doesn't heavily overlap the terminal (within 1km)
    let overlaps = false;
    for(let t of terminalDistances) {
      if (Math.abs(t.distance - currentDistance) < 1.0) {
        overlaps = true; break;
      }
    }
    
    if (!overlaps && currentDistance > 0) {
      const pt = turf.along(line, currentDistance, {units: 'kilometers'});
      stops.push({
        stopId: 'stop-milepost-' + milepostCount,
        name: 'Milepost ' + currentDistance + 'km',
        coordinates: pt.geometry.coordinates,
        isOfficial: false
      });
      milepostCount++;
    }
    
    currentDistance += 20;
  }
  
  // Make sure the last terminal is pushed
  if (terminalIndex < terminalDistances.length) {
     const term = terminalDistances[terminalDistances.length - 1];
     stops.push({
       stopId: term.id,
       name: term.name,
       coordinates: term.snappedCoords,
       isOfficial: term.isOfficial
     });
  }

  const newRouteData = {
    routeId: "master-highway-route",
    routeName: "Inter-State Highway (Bareilly - Majhola Uttarakhand - Hamirpur - Dharamshala)",
    coordinates: routeGeom.coordinates,
    stops: stops
  };

  fs.writeFileSync('route-data.json', JSON.stringify(newRouteData, null, 2));
  console.log('Successfully generated route-data.json with', stops.length, 'stops!');
}

generate().catch(console.error);
