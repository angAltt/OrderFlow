const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const env = require('./config/env');
const apiRoutes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middlewares/error.middleware');

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1); // needed behind Render/Railway/Heroku style proxies

app.use(helmet());

app.use(
  cors({
    // Requests without an Origin header (curl, Postman, server-to-server) are allowed.
    // Unknown origins get no CORS headers, so the browser blocks them.
    origin: (origin, callback) => callback(null, !origin || env.corsOrigins.includes(origin)),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

app.use(express.json({ limit: '100kb' }));

app.use('/api', apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
