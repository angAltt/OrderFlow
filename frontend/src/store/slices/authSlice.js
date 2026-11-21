import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { apiRequest, toSerializableError } from '@/lib/api';
import { clearSession, saveSession } from '@/lib/session';

const initialState = {
  token: null,
  user: null, // { id, name, email, role }
  status: 'idle', // idle | loading | failed
  error: null,
  hydrated: false, // true once the stored session (if any) has been read
  sessionExpired: false,
};

export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const { data } = await apiRequest('/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      const session = { token: data.token, user: data.user };
      saveSession(session);
      return session;
    } catch (error) {
      return rejectWithValue(toSerializableError(error));
    }
  },
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    sessionRestored(state, action) {
      state.token = action.payload?.token ?? null;
      state.user = action.payload?.user ?? null;
      state.hydrated = true;
    },
    loggedOut(state) {
      Object.assign(state, initialState, { hydrated: true });
    },
    sessionExpired(state) {
      Object.assign(state, initialState, { hydrated: true, sessionExpired: true });
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.status = 'loading';
        state.error = null;
        state.sessionExpired = false;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.status = 'idle';
        state.token = action.payload.token;
        state.user = action.payload.user;
      })
      .addCase(login.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload?.message || 'Sign in failed';
      });
  },
});

export const { sessionRestored, loggedOut, sessionExpired } = authSlice.actions;

/** Clears the stored token and resets every slice. */
export const logout = () => (dispatch) => {
  clearSession();
  dispatch(loggedOut());
};

/** Used when the API answers 401 to an authenticated request. */
export const expireSession = () => (dispatch) => {
  clearSession();
  dispatch(sessionExpired());
};

export const selectAuth = (state) => state.auth;
export const selectUser = (state) => state.auth.user;
export const selectToken = (state) => state.auth.token;
export const selectIsAuthenticated = (state) => Boolean(state.auth.token);
export const selectIsAdmin = (state) => state.auth.user?.role === 'admin';

export default authSlice.reducer;
