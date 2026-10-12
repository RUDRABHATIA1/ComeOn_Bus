import { updateBusRoute } from '../simulator.js';

export const updateSimulatorConfig = async (req, res) => {
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
};
