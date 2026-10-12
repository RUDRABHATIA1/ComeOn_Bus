import { createSlice } from '@reduxjs/toolkit';

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    selectedBus: null,
    selectedStop: null,
    isSidebarOpen: typeof window === 'undefined' ? true : window.innerWidth >= 640,
    simFromCity: 'stop-bareilly',
    simToCity: 'stop-dharamshala'
  },
  reducers: {
    setSelectedBus: (state, action) => { state.selectedBus = action.payload; },
    setSelectedStop: (state, action) => { state.selectedStop = action.payload; },
    setSidebarOpen: (state, action) => { state.isSidebarOpen = action.payload; },
    setSimFromCity: (state, action) => { state.simFromCity = action.payload; },
    setSimToCity: (state, action) => { state.simToCity = action.payload; }
  }
});

export const {
  setSelectedBus, setSelectedStop, setSidebarOpen, setSimFromCity, setSimToCity
} = uiSlice.actions;

export const selectUiState = state => state.ui;

export default uiSlice.reducer;
