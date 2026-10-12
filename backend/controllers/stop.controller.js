import Stop from '../models/Stop.js';

export const getAllStops = async (req, res) => {
  try {
    const stops = await Stop.find({});
    res.json(stops);
  } catch (error) {
    console.error("Error fetching stops:", error);
    res.status(500).json({ error: "Failed to fetch stops" });
  }
};

export const getNearestStops = async (req, res) => {
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
};
