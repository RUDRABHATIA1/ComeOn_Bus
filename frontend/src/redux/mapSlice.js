import { createSlice } from '@reduxjs/toolkit';

const mapSlice = createSlice({
  name: 'map',
  initialState: {
    highlightedRoad: [],
    nearestStops: [],
    userLocation: null,
    center: [28.8350, 78.7450],
    zoom: 13,
    bounds: null,
    isLocating: false
  },
  reducers: {
    setHighlightedRoad: (state, action) => { state.highlightedRoad = action.payload; },
    setNearestStops: (state, action) => { state.nearestStops = action.payload; },
    setUserLocation: (state, action) => { state.userLocation = action.payload; },
    setMapCenter: (state, action) => { state.center = action.payload; },
    setMapZoom: (state, action) => { state.zoom = action.payload; },
    setMapBounds: (state, action) => { state.bounds = action.payload; },
    setIsLocating: (state, action) => { state.isLocating = action.payload; }
  }
});

export const {
  setHighlightedRoad, setNearestStops, setUserLocation, setMapCenter,
  setMapZoom, setMapBounds, setIsLocating
} = mapSlice.actions;

export const selectMapState = state => state.map;

export default mapSlice.reducer;
