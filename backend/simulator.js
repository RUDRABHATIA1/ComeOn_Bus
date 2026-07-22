import fs from 'fs';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Vehicle from './models/Vehicle.js';

dotenv.config();

// Shared simulation state in memory
export const busStates = {};

// Initialize state with default routes from route-data.json
export function initializeSimulationState() {
  const routeData = JSON.parse(fs.readFileSync('./route-data.json', 'utf-8'));
  const coordinates = routeData.coordinates;
  const stops = routeData.stops;

  for (let i = 1; i <= 10; i++) {
    const busNumber = `UP-21-AT-${1000 + i}`;
    const direction = i % 2 === 0 ? 1 : -1;
    const activeCoords = direction === 1 ? [...coordinates] : [...coordinates].reverse();
    
    // Spread their starting positions evenly across the highway
    const startIndex = Math.floor((activeCoords.length / 10) * (i - 1));
    
    // Ordered segment stops
    const segmentStops = direction === 1 ? [...stops] : [...stops].reverse();
    
    const capacity = 40 + (i % 3) * 5; // 40, 45, 50
    const ticketsSold = Math.floor(Math.random() * (capacity - 10)) + 10;
    
    // Random initial destinations
    const passengerDestinations = [];
    let remaining = ticketsSold;
    for(let j = 0; j < 3; j++) {
      if(remaining <= 0) break;
      const count = j === 2 ? remaining : Math.floor(remaining / 2);
      remaining -= count;
      // Pick random stop in forward path
      const randomStop = segmentStops[Math.floor(Math.random() * segmentStops.length)];
      passengerDestinations.push({ stopId: randomStop.stopId, count });
    }

    busStates[busNumber] = {
      coordinates: activeCoords,
      segmentStops: segmentStops,
      index: startIndex,
      direction: direction,
      capacity: capacity,
      ticketsSold: ticketsSold,
      passengerDestinations: passengerDestinations
    };
  }
}

export function startSimulator() {
  if (Object.keys(busStates).length === 0) {
    initializeSimulationState();
  }

  console.log("Starting bus simulation interval (every 3 seconds)...");

  const intervalId = setInterval(async () => {
    for (const [busNumber, state] of Object.entries(busStates)) {
      try {
        const coordinates = state.coordinates;
        let nextIndex = state.index + state.direction;

        // Boundary reverse logic
        if (nextIndex >= coordinates.length) {
          state.direction = -1;
          nextIndex = coordinates.length - 2;
        } else if (nextIndex < 0) {
          state.direction = 1;
          nextIndex = 1;
        }

        state.index = nextIndex;
        const currentCoordinates = coordinates[nextIndex];

        // 1. Arrived at stop logic
        const reachedStop = state.segmentStops.find(
          s => s.coordinates[0] === currentCoordinates[0] && s.coordinates[1] === currentCoordinates[1]
        );

        if (reachedStop) {
          console.log(`\n--- Bus ${busNumber} arrived at stop: ${reachedStop.name} ---`);
          
          // De-boarding: free seats
          const destIdx = state.passengerDestinations.findIndex(pd => pd.stopId === reachedStop.stopId);
          let disembarked = 0;
          if (destIdx !== -1) {
            disembarked = state.passengerDestinations[destIdx].count;
            state.passengerDestinations.splice(destIdx, 1);
            console.log(`>> Disembarked: ${disembarked} passengers`);
          }

          // Boarding: tickets sold to upcoming stops
          const upcomingStops = state.segmentStops.filter((stop, sIdx) => {
            const stopIdx = coordinates.findIndex(
              c => c[0] === stop.coordinates[0] && c[1] === stop.coordinates[1]
            );
            return state.direction === 1 ? stopIdx > nextIndex : stopIdx < nextIndex;
          });

          if (upcomingStops.length > 0) {
            const newBoarders = Math.floor(Math.random() * 12) + 2;
            console.log(`>> Boarded: ${newBoarders} new passengers`);

            for (let i = 0; i < newBoarders; i++) {
              const randomStop = upcomingStops[Math.floor(Math.random() * upcomingStops.length)];
              const existingDest = state.passengerDestinations.find(pd => pd.stopId === randomStop.stopId);
              
              if (existingDest) {
                existingDest.count += 1;
              } else {
                state.passengerDestinations.push({ stopId: randomStop.stopId, count: 1 });
              }
            }
          }

          state.ticketsSold = state.passengerDestinations.reduce((sum, pd) => sum + pd.count, 0);
        } else {
          // Transit fluctuations
          if (Math.random() < 0.15 && state.passengerDestinations.length > 0) {
            const randomDest = state.passengerDestinations[Math.floor(Math.random() * state.passengerDestinations.length)];
            const seatsFluctuation = Math.random() < 0.5 ? -1 : 1;
            randomDest.count = Math.max(1, randomDest.count + seatsFluctuation);
            state.ticketsSold = state.passengerDestinations.reduce((sum, pd) => sum + pd.count, 0);
          }
        }

        // 2. Crowd Status calculation
        const ratio = state.ticketsSold / state.capacity;
        let crowdStatus = 'normal';
        if (ratio > 1.20) {
          crowdStatus = 'full';
        } else if (ratio > 1.10) {
          crowdStatus = 'overcrowded';
        } else if (ratio > 1.0) {
          crowdStatus = 'crowded';
        }

        const speed = reachedStop ? 0 : Math.floor(Math.random() * 20) + 25;

          // 3. Update database coordinates
          await Vehicle.findOneAndUpdate(
            { busNumber },
            {
              location: {
                type: "Point",
                coordinates: currentCoordinates
              },
              ticketsSold: state.ticketsSold,
              passengerDestinations: state.passengerDestinations,
              crowdStatus,
              speed,
              direction: state.direction,
              lastUpdated: new Date()
            },
            { new: true, upsert: true }
          );

      } catch (err) {
        console.error(`Simulation update failed for ${busNumber}:`, err.message);
      }
    }
  }, 3000);

  return intervalId;
}

// Function to update a bus path dynamically from API Controls
export async function updateBusRoute(busNumber, fromStopId, toStopId, ticketsSoldInput) {
  const routeData = JSON.parse(fs.readFileSync('./route-data.json', 'utf-8'));
  const stops = routeData.stops;
  const coordinates = routeData.coordinates;

  const fromStop = stops.find(s => s.stopId === fromStopId);
  const toStop = stops.find(s => s.stopId === toStopId);

  if (!fromStop || !toStop) throw new Error("Stops not found");

  const fromCoordIdx = coordinates.findIndex(c => c[0] === fromStop.coordinates[0] && c[1] === fromStop.coordinates[1]);
  const toCoordIdx = coordinates.findIndex(c => c[0] === toStop.coordinates[0] && c[1] === toStop.coordinates[1]);

  if (fromCoordIdx === -1 || toCoordIdx === -1) throw new Error("Coordinates not found for stops");

  let activeCoords = [];
  if (fromCoordIdx <= toCoordIdx) {
    activeCoords = coordinates.slice(fromCoordIdx, toCoordIdx + 1);
  } else {
    activeCoords = coordinates.slice(toCoordIdx, fromCoordIdx + 1).reverse();
  }

  // Segment stops in order
  const segmentStops = [];
  activeCoords.forEach(coord => {
    const matchedStop = stops.find(s => s.coordinates[0] === coord[0] && s.coordinates[1] === coord[1]);
    if (matchedStop) {
      segmentStops.push(matchedStop);
    }
  });

  // Distribute tickets to upcoming stops along route segment
  const upcomingStops = segmentStops.slice(1);
  const passengerDestinations = [];
  if (upcomingStops.length > 0) {
    let remainingTickets = ticketsSoldInput;
    upcomingStops.forEach((stop, i) => {
      if (i === upcomingStops.length - 1) {
        passengerDestinations.push({ stopId: stop.stopId, count: remainingTickets });
      } else {
        const count = Math.floor(Math.random() * (remainingTickets / (upcomingStops.length - i)));
        passengerDestinations.push({ stopId: stop.stopId, count });
        remainingTickets -= count;
      }
    });
  }

  // Update simulation state in memory
  const capacity = busNumber === "UP-21-AT-1008" ? 40 : 45;
  busStates[busNumber] = {
    coordinates: activeCoords,
    segmentStops: segmentStops,
    index: 0,
    direction: 1,
    capacity: capacity,
    ticketsSold: ticketsSoldInput,
    passengerDestinations
  };

  const ratio = ticketsSoldInput / capacity;
  let crowdStatus = 'normal';
  if (ratio > 1.20) crowdStatus = 'full';
  else if (ratio > 1.10) crowdStatus = 'overcrowded';
  else if (ratio > 1.0) crowdStatus = 'crowded';

  const routeCleanName = `${fromStop.name.replace(/ Junction| Highway| Main| Village| Terminal| Stand/g, '')} - ${toStop.name.replace(/ Junction| Highway| Main| Village| Terminal| Stand/g, '')}`;

  // Update DB instantly to teleport the bus to starting point
  await Vehicle.findOneAndUpdate(
    { busNumber },
    {
      routeName: `${routeCleanName} Route`,
      location: {
        type: "Point",
        coordinates: activeCoords[0]
      },
      ticketsSold: ticketsSoldInput,
      passengerDestinations,
      crowdStatus,
      speed: 0,
      direction: 1,
      lastUpdated: new Date()
    },
    { new: true, upsert: true }
  );

  console.log(`Bus ${busNumber} manually updated: ${fromStop.name} -> ${toStop.name}, tickets: ${ticketsSoldInput}`);
}

// Standalone support
const isRunningDirectly = import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, '/')}`;
if (isRunningDirectly) {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    console.error("Error: MONGODB_URI is not defined in backend/.env file.");
    process.exit(1);
  }

  mongoose.connect(MONGODB_URI)
    .then(() => {
      initializeSimulationState();
      startSimulator();
    })
    .catch(err => {
      console.error("Database connection failed:", err);
    });
}
