import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import Stop from './models/Stop.js';
import Vehicle from './models/Vehicle.js';
import { startSimulator, updateBusRoute } from './simulator.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

app.use(cors());
app.use(express.json());

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("Critical Error: MONGODB_URI is not defined in backend/.env");
  process.exit(1);
}

// ---------------- Express API Endpoints ----------------

// 1. Get static route path coordinates and route info
app.get('/api/routes', (req, res) => {
  try {
    const rawData = fs.readFileSync('./route-data.json', 'utf-8');
    const routeData = JSON.parse(rawData);
    res.json({
      routeId: routeData.routeId,
      routeName: routeData.routeName,
      coordinates: routeData.coordinates,
      stops: routeData.stops
    });
  } catch (error) {
    console.error("Error reading route data:", error);
    res.status(500).json({ error: "Failed to load route data" });
  }
});

// 2. Get all stops (including their official/unofficial classification)
app.get('/api/stops', async (req, res) => {
  try {
    const stops = await Stop.find({});
    res.json(stops);
  } catch (error) {
    console.error("Error fetching stops:", error);
    res.status(500).json({ error: "Failed to fetch stops" });
  }
});

// 3. Find the 3 nearest stops to a coordinate using MongoDB $near
app.get('/api/stops/near', async (req, res) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ error: "Latitude and longitude query parameters are required" });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ error: "Latitude and longitude must be valid numbers" });
    }

    console.log(`Searching nearest stops to: Lat ${latitude}, Lng ${longitude}`);

    const nearestStops = await Stop.find({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [longitude, latitude] // MongoDB expects [lng, lat]
          }
        }
      }
    }).limit(3);

    res.json(nearestStops);
  } catch (error) {
    console.error("Error in geospatial search:", error);
    res.status(500).json({ error: "Failed to find nearby stops" });
  }
});

// 4. Update simulator route configuration manually from prototype dashboard
app.post('/api/simulator/config', async (req, res) => {
  try {
    const { busNumber, fromCity, toCity, ticketsSold } = req.body;
    
    if (!busNumber || !fromCity || !toCity || ticketsSold === undefined) {
      return res.status(400).json({ error: "Missing required fields: busNumber, fromCity, toCity, ticketsSold" });
    }

    await updateBusRoute(busNumber, fromCity, toCity, parseInt(ticketsSold));
    res.json({ message: `Successfully updated route config for ${busNumber}` });
  } catch (error) {
    console.error("Error updating simulator config:", error);
    res.status(500).json({ error: error.message || "Failed to update simulator configuration" });
  }
});

// ---------------- Socket.io Connection & Change Stream ----------------

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  
  // Send current active bus locations immediately to the newly connected client
  Vehicle.find({}).then((vehicles) => {
    socket.emit('initial_buses', vehicles.map(v => ({
      busNumber: v.busNumber,
      routeId: v.routeId,
      routeName: v.routeName,
      location: v.location.coordinates, // [lng, lat]
      capacity: v.capacity,
      ticketsSold: v.ticketsSold,
      passengerDestinations: v.passengerDestinations,
      crowdStatus: v.crowdStatus,
      speed: v.speed,
      direction: v.direction,
      lastUpdated: v.lastUpdated
    })));
  }).catch(err => {
    console.error("Error fetching initial vehicle positions:", err);
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Watch Vehicle collection and broadcast changes via Socket.io
const setupChangeStream = () => {
  console.log("Setting up MongoDB Change Stream for vehicles...");
  try {
    const vehicleChangeStream = Vehicle.watch([], { fullDocument: 'updateLookup' });

    vehicleChangeStream.on('change', (change) => {
      if (['insert', 'update', 'replace'].includes(change.operationType)) {
        const fullDoc = change.fullDocument;
        if (!fullDoc) return;

        // Broadcast updated coordinates and ticket statistics to all clients
        io.emit('bus_update', {
          busNumber: fullDoc.busNumber,
          routeId: fullDoc.routeId,
          routeName: fullDoc.routeName,
          location: fullDoc.location.coordinates, // [lng, lat]
          capacity: fullDoc.capacity,
          ticketsSold: fullDoc.ticketsSold,
          passengerDestinations: fullDoc.passengerDestinations,
          crowdStatus: fullDoc.crowdStatus,
          speed: fullDoc.speed,
          direction: fullDoc.direction,
          lastUpdated: fullDoc.lastUpdated
        });
      }
    });

    vehicleChangeStream.on('error', (error) => {
      console.error("Change Stream error encountered:", error);
    });

  } catch (error) {
    console.error("WARNING: Failed to start MongoDB Change Stream.");
    console.error("Change streams require a replica set (like MongoDB Atlas). Please configure Atlas.");
  }
};

// ---------------- Database Connection & Server Boot ----------------

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log("Connected to MongoDB successfully.");
    
    // Ensure geospatial indexes are built before taking requests
    try {
      console.log("Verifying spatial indexes...");
      await Stop.createIndexes();
      await Vehicle.createIndexes();
      console.log("Spatial indexes ready.");
      
      console.log("Clearing old vehicle data for fresh simulation...");
      await Vehicle.deleteMany({});
    } catch (indexErr) {
      console.error("Warning: Index sync encountered an error:", indexErr.message);
    }
    
    setupChangeStream();
    startSimulator();

    httpServer.listen(PORT, () => {
      console.log(`Backend server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Critical: Database connection failed. Express server not started.");
    console.error(err);
  });
