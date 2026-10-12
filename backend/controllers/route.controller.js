import fs from 'fs';

export const getRoutes = (req, res) => {
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
};
