import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import inventoryReducer from './slices/inventorySlice';
import ordersReducer from './slices/ordersSlice';

// A function instead of a singleton, as recommended for the Next.js App Router:
// each browser session gets its own store and nothing is shared between requests.
export const makeStore = () =>
  configureStore({
    reducer: {
      auth: authReducer,
      inventory: inventoryReducer,
      orders: ordersReducer,
    },
  });
