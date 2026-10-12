import mongoose from 'mongoose';
import Stop from '../models/Stop.js';
import Vehicle from '../models/Vehicle.js';

const connectDB = async () => {
  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      console.error("Critical Error: MONGODB_URI is not defined in backend/.env");
      process.exit(1);
    }

    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB connected successfully');

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
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

export default connectDB;
