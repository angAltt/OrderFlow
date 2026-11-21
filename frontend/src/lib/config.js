// NEXT_PUBLIC_* values are inlined at build time, so they must be read with
// the full literal name (process.env[name] would not work in the browser).

export const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api').replace(
  /\/$/,
  '',
);

// Public demo accounts created by backend/database/seed.sql
export const DEMO_ACCOUNTS = {
  admin: {
    email: process.env.NEXT_PUBLIC_DEMO_ADMIN_EMAIL || 'admin@orderflow.dev',
    password: process.env.NEXT_PUBLIC_DEMO_ADMIN_PASSWORD || 'Admin123!',
  },
  viewer: {
    email: process.env.NEXT_PUBLIC_DEMO_VIEWER_EMAIL || 'viewer@orderflow.dev',
    password: process.env.NEXT_PUBLIC_DEMO_VIEWER_PASSWORD || 'Viewer123!',
  },
};

// Same default as LOW_STOCK_THRESHOLD in the API. The real value comes from the
// API response and replaces this one after the first products request.
export const DEFAULT_LOW_STOCK_THRESHOLD = 10;
