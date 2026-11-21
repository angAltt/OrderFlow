import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit';
import { apiRequest, toSerializableError } from '@/lib/api';
import { loggedOut, sessionExpired } from './authSlice';

const initialState = {
  items: [],
  status: 'idle', // idle | loading | succeeded | failed
  error: null,
  statusFilter: 'All',
  search: '',
  currentRequestId: null,
  updatingIds: {}, // { [orderId]: previousStatus } while a status change is in flight
};

const authed =
  (request) =>
  async (arg, { getState, rejectWithValue }) => {
    try {
      return await request(arg, getState().auth.token);
    } catch (error) {
      return rejectWithValue(toSerializableError(error));
    }
  };

/** Status filtering runs on the API (GET /orders?status=...). */
export const fetchOrders = createAsyncThunk(
  'orders/fetchOrders',
  authed(async (status, token) => {
    const query = status && status !== 'All' ? `?status=${encodeURIComponent(status)}` : '';
    const { data } = await apiRequest(`/orders${query}`, { token });
    return data;
  }),
);

export const updateOrderStatus = createAsyncThunk(
  'orders/updateStatus',
  authed(async ({ id, status }, token) => {
    const { data } = await apiRequest(`/orders/${id}/status`, {
      method: 'PATCH',
      body: { status },
      token,
    });
    return data;
  }),
);

export const createOrder = createAsyncThunk(
  'orders/create',
  authed(async (order, token) => {
    const { data } = await apiRequest('/orders', { method: 'POST', body: order, token });
    return data;
  }),
);

// The detail endpoint returns items; the list uses aggregated columns instead.
const toListRow = (order) => ({
  ...order,
  total_units: order.items?.reduce((sum, item) => sum + item.quantity, 0) ?? order.total_units,
  item_count: order.items?.length ?? order.item_count,
});

const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    statusFilterChanged(state, action) {
      state.statusFilter = action.payload;
    },
    orderSearchChanged(state, action) {
      state.search = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOrders.pending, (state, action) => {
        state.status = 'loading';
        state.error = null;
        state.currentRequestId = action.meta.requestId;
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        // Ignore late responses when the user switched filters quickly
        if (action.meta.requestId !== state.currentRequestId) return;
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        if (action.meta.requestId !== state.currentRequestId) return;
        state.status = 'failed';
        state.error = action.payload?.message || 'Could not load orders';
      })

      // Optimistic update: the badge changes right away and goes back if the API fails
      .addCase(updateOrderStatus.pending, (state, action) => {
        const { id, status } = action.meta.arg;
        const order = state.items.find((o) => o.id === id);
        if (!order) return;
        state.updatingIds[id] = order.status;
        order.status = status;
      })
      .addCase(updateOrderStatus.fulfilled, (state, action) => {
        const index = state.items.findIndex((o) => o.id === action.payload.id);
        delete state.updatingIds[action.payload.id];
        if (index === -1) return;
        // In a filtered view (for example "Pending"), an order that moved to
        // another status no longer belongs to the list, so it leaves it.
        if (state.statusFilter !== 'All' && action.payload.status !== state.statusFilter) {
          state.items.splice(index, 1);
          return;
        }
        state.items[index] = { ...state.items[index], ...toListRow(action.payload) };
      })
      .addCase(updateOrderStatus.rejected, (state, action) => {
        const { id } = action.meta.arg;
        const order = state.items.find((o) => o.id === id);
        if (order && state.updatingIds[id]) order.status = state.updatingIds[id];
        delete state.updatingIds[id];
      })

      .addCase(createOrder.fulfilled, (state, action) => {
        if (state.statusFilter === 'All' || state.statusFilter === action.payload.status) {
          state.items.unshift(toListRow(action.payload));
        }
      })
      .addCase(loggedOut, () => initialState)
      .addCase(sessionExpired, () => initialState);
  },
});

export const { statusFilterChanged, orderSearchChanged } = ordersSlice.actions;

export const selectOrdersState = (state) => state.orders;
export const selectOrders = (state) => state.orders.items;
export const selectOrderSearch = (state) => state.orders.search;
export const selectUpdatingIds = (state) => state.orders.updatingIds;

/** Text search runs on the client over the orders already loaded for the active status. */
export const selectVisibleOrders = createSelector(
  [selectOrders, selectOrderSearch],
  (items, search) => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((order) =>
      [order.order_number, order.customer_name, order.customer_email]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term)),
    );
  },
);

export default ordersSlice.reducer;
