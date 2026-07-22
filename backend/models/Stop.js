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

const stopSchema = new mongoose.Schema({
  stopId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  location: {
    type: pointSchema,
    required: true
  },
  isOfficial: {
    type: Boolean,
    default: false
  }
});

stopSchema.index({ location: '2dsphere' });

const Stop = mongoose.model('Stop', stopSchema);
export default Stop;
