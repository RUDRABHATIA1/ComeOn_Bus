import mongoose from 'mongoose';

const pointSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Point'],
    default: 'Point',
    required: true
  },
  coordinates: {
    type: [Number], // [longitude, latitude]
    required: true
  }
}, { _id: false });

const destinationSchema = new mongoose.Schema({
  stopId: {
    type: String,
    required: true
  },
  count: {
    type: Number,
    required: true,
    default: 0
  }
}, { _id: false });

const vehicleSchema = new mongoose.Schema({
  busNumber: {
    type: String,
    required: true,
    unique: true
  },
  routeId: {
    type: String,
    required: true
  },
  routeName: {
    type: String,
    required: true
  },
  location: {
    type: pointSchema,
    required: true
  },
  capacity: {
    type: Number,
    default: 40
  },
  ticketsSold: {
    type: Number,
    default: 0
  },
  passengerDestinations: {
    type: [destinationSchema],
    default: []
  },
  crowdStatus: {
    type: String,
    enum: ['normal', 'crowded', 'overcrowded', 'full'],
    default: 'normal'
  },
  speed: {
    type: Number,
    default: 0
  },
  direction: {
    type: Number,
    enum: [1, -1],
    default: 1
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

vehicleSchema.index({ location: '2dsphere' });

const Vehicle = mongoose.model('Vehicle', vehicleSchema);
export default Vehicle;
