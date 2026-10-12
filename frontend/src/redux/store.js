import { configureStore } from '@reduxjs/toolkit';
import transitReducer from './transitSlice.js';
import mapReducer from './mapSlice.js';
import uiReducer from './uiSlice.js';

export const store = configureStore({
  reducer: {
    transit: transitReducer,
    map: mapReducer,
    ui: uiReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
      immutableCheck: false,
    }),
});