import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import Stop from './models/Stop.js';
import Vehicle from './models/Vehicle.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("Error: MONGODB_URI is not defined in backend/.env file.");
  process.exit(1);
}

const seedDatabase = async () => {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected successfully.");

    // Clear existing collections
    console.log("Clearing existing stops and vehicles...");
    await Stop.deleteMany({});
    await Vehicle.deleteMany({});

    // Read route data
    const rawData = fs.readFileSync('./route-data.json', 'utf-8');
    const routeData = JSON.parse(rawData);

    // Seed stops
    console.log("Seeding stops...");
    const stopsToInsert = routeData.stops.map(stop => ({
      stopId: stop.stopId,
      name: stop.name,
      location: {
        type: "Point",
        coordinates: stop.coordinates
      },
      isOfficial: stop.isOfficial
    }));

    await Stop.insertMany(stopsToInsert);
    console.log(`Successfully seeded ${stopsToInsert.length} stops.`);

    // Seed initial vehicles (Buses) on master highway
    console.log("Seeding vehicles...");
    const vehiclesToInsert = [
      {
        busNumber: "UP-21-AT-1008",
        routeId: routeData.routeId,
        routeName: "Bareilly - Dharamshala Main Highway Route",
        location: {
          type: "Point",
          coordinates: routeData.coordinates[0] // Starting at Bareilly
        },
        capacity: 40,
        ticketsSold: 28,
        passengerDestinations: [
          { stopId: "stop-milepost-2", count: 4 },
          { stopId: "stop-milepost-5", count: 6 },
          { stopId: "stop-milepost-12", count: 8 },
          { stopId: "stop-dharamshala", count: 10 }
        ],
        crowdStatus: "normal",
        speed: 35,
        lastUpdated: new Date()
      },
      {
        busNumber: "UP-21-BT-4321",
        routeId: routeData.routeId,
        routeName: "Hamirpur - Majhola Corridor Route",
        location: {
          type: "Point",
          coordinates: [76.2700, 31.6800] // Starting at Hamirpur
        },
        capacity: 45,
        ticketsSold: 32,
        passengerDestinations: [
          { stopId: "stop-milepost-35", count: 12 },
          { stopId: "stop-milepost-32", count: 10 },
          { stopId: "stop-milepost-28", count: 10 }
        ],
        crowdStatus: "normal",
        speed: 40,
        lastUpdated: new Date()
      }
    ];

    await Vehicle.insertMany(vehiclesToInsert);
    console.log("Successfully seeded vehicles.");

    console.log("Database seeding completed successfully!");
  } catch (error) {
    console.error("Seeding failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
};

seedDatabase();
