import { createSlice } from '@reduxjs/toolkit';

const transitSlice = createSlice({
  name: 'transit',
  initialState: {
    buses: [],
    isConnected: false,
    routeCoordinates: [],
    masterStops: [],
    stops: [],
    errorMessage: ''
  },
  reducers: {
    setBuses: (state, action) => { state.buses = action.payload; },
    updateBus: (state, action) => {
      const index = state.buses.findIndex(bus => bus.busNumber === action.payload.busNumber);
      if (index === -1) state.buses.push(action.payload);
      else state.buses[index] = action.payload;
    },
    setConnectionStatus: (state, action) => { state.isConnected = action.payload; },
    setRouteCoordinates: (state, action) => { state.routeCoordinates = action.payload; },
    setMasterStops: (state, action) => { state.masterStops = action.payload; },
    setStops: (state, action) => { state.stops = action.payload; },
    setTransitError: (state, action) => { state.errorMessage = action.payload; }
  }
});

export const {
  setBuses, updateBus, setConnectionStatus, setRouteCoordinates,
  setMasterStops, setStops, setTransitError
} = transitSlice.actions;

export const selectBuses = state => state.transit.buses;
export const selectIsConnected = state => state.transit.isConnected;
export const selectTransitData = state => state.transit;

export default transitSlice.reducer;
