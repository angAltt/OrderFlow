import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit';
import { apiRequest, toSerializableError } from '@/lib/api';
import { DEFAULT_LOW_STOCK_THRESHOLD } from '@/lib/config';
import { getStockLevel } from '@/lib/stock';
import { loggedOut, sessionExpired } from './authSlice';

const initialState = {
  items: [],
  status: 'idle', // idle | loading | succeeded | failed
  error: null,
  lowStockThreshold: DEFAULT_LOW_STOCK_THRESHOLD,
  filters: {
    search: '',
    stockLevel: 'all', // all | low | out
    category: 'all',
  },
};

// Wraps a request so every thunk gets the token and a serializable error.
const authed =
  (request) =>
  async (arg, { getState, rejectWithValue }) => {
    try {
      return await request(arg, getState().auth.token);
    } catch (error) {
      return rejectWithValue(toSerializableError(error));
    }
  };

export const fetchProducts = createAsyncThunk(
  'inventory/fetchProducts',
  authed(async (_, token) => apiRequest('/products', { token })),
  {
    // The layout and a page can ask at the same time; only one request goes out
    condition: (_, { getState }) => getState().inventory.status !== 'loading',
  },
);

export const createProduct = createAsyncThunk(
  'inventory/createProduct',
  authed(async (product, token) => {
    const { data } = await apiRequest('/products', { method: 'POST', body: product, token });
    return data;
  }),
);

export const updateProduct = createAsyncThunk(
  'inventory/updateProduct',
  authed(async ({ id, changes }, token) => {
    const { data } = await apiRequest(`/products/${id}`, {
      method: 'PATCH',
      body: changes,
      token,
    });
    return data;
  }),
);

export const deleteProduct = createAsyncThunk(
  'inventory/deleteProduct',
  authed(async (id, token) => {
    await apiRequest(`/products/${id}`, { method: 'DELETE', token });
    return id;
  }),
);

const sortByName = (a, b) => a.name.localeCompare(b.name);

const inventorySlice = createSlice({
  name: 'inventory',
  initialState,
  reducers: {
    searchChanged(state, action) {
      state.filters.search = action.payload;
    },
    stockLevelChanged(state, action) {
      state.filters.stockLevel = action.payload;
    },
    categoryChanged(state, action) {
      state.filters.category = action.payload;
    },
    filtersCleared(state) {
      state.filters = initialState.filters;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload.data;
        state.lowStockThreshold = action.payload.meta?.lowStockThreshold ?? state.lowStockThreshold;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload?.message || 'Could not load products';
      })
      .addCase(createProduct.fulfilled, (state, action) => {
        state.items.push(action.payload);
        state.items.sort(sortByName);
      })
      .addCase(updateProduct.fulfilled, (state, action) => {
        const index = state.items.findIndex((p) => p.id === action.payload.id);
        if (index !== -1) state.items[index] = action.payload;
      })
      .addCase(deleteProduct.fulfilled, (state, action) => {
        state.items = state.items.filter((p) => p.id !== action.payload);
      })
      .addCase(loggedOut, () => initialState)
      .addCase(sessionExpired, () => initialState);
  },
});

export const { searchChanged, stockLevelChanged, categoryChanged, filtersCleared } =
  inventorySlice.actions;

// Selectors
export const selectInventory = (state) => state.inventory;
export const selectProducts = (state) => state.inventory.items;
export const selectInventoryFilters = (state) => state.inventory.filters;
export const selectLowStockThreshold = (state) => state.inventory.lowStockThreshold;

export const selectCategories = createSelector([selectProducts], (items) =>
  [...new Set(items.map((p) => p.category).filter(Boolean))].sort(),
);

/** Live search and filters run on the client, so results update on every keystroke. */
export const selectFilteredProducts = createSelector(
  [selectProducts, selectInventoryFilters, selectLowStockThreshold],
  (items, { search, stockLevel, category }, threshold) => {
    const term = search.trim().toLowerCase();
    return items.filter((product) => {
      if (category !== 'all' && product.category !== category) return false;
      if (stockLevel !== 'all') {
        const level = getStockLevel(product.stock, threshold);
        // "low" includes products that already ran out
        if (stockLevel === 'low' && level === 'ok') return false;
        if (stockLevel === 'out' && level !== 'out') return false;
      }
      if (!term) return true;
      return [product.name, product.sku, product.category]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term));
    });
  },
);

/** Low-stock alerts: products under the threshold, the most urgent first. */
export const selectLowStockProducts = createSelector(
  [selectProducts, selectLowStockThreshold],
  (items, threshold) =>
    items.filter((p) => p.stock < threshold).sort((a, b) => a.stock - b.stock || sortByName(a, b)),
);

export default inventorySlice.reducer;
