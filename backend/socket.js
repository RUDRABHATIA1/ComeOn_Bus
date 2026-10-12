import http from "http";
import express from 'express';
import { Server } from "socket.io";
import Vehicle from './models/Vehicle.js';

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

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

export const setupChangeStream = () => {
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

export { io, server, app };
