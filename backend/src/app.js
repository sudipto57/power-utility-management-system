// Creates the Express app and plugs in every route.
import express from 'express';
import cors from 'cors';
import env from './config/env.js';
import { query } from './config/db.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { securityHeaders } from './middleware/security.js';
import authRoutes from './routes/auth.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import customerRoutes from './routes/customers.routes.js';
import connectionRoutes from './routes/connections.routes.js';
import readingRoutes from './routes/readings.routes.js';
import billRoutes from './routes/bills.routes.js';
import requestRoutes from './routes/requests.routes.js';
import reportRoutes from './routes/reports.routes.js';
import myRoutes from './routes/my.routes.js';
import tariffRoutes from './routes/tariffs.routes.js';
import adminRoutes from './routes/adminRoutes.js';
import changeRequestRoutes from './routes/changeRequests.routes.js';

const app = express();

// Render (and most hosts) put one proxy in front of the server.
// This lets req.ip be the visitor's real address (used by the rate limits).
app.set('trust proxy', 1);
app.disable('x-powered-by'); // don't tell attackers we use Express
app.use(securityHeaders);

// Allow the React app (and tools like Postman, which send no Origin) to call the API
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || env.clientUrls.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
  })
);
app.use(express.json({ limit: '100kb' }));

// Small request logger:  GET /api/customers 200 12ms
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`));
  next();
});

// Health check: open http://localhost:5000/api/health in the browser
app.get('/api/health', async (req, res) => {
  const { rows } = await query('SELECT NOW() AS database_time');
  res.json({ data: { status: 'ok', app: 'Power Utility Management System API', database_time: rows[0].database_time } });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/readings', readingRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/change-requests', changeRequestRoutes); // profile change requests (admin)
app.use('/api/reports', reportRoutes);
app.use('/api/my', myRoutes);
app.use('/api/tariffs', tariffRoutes); // public bill estimator

app.use(notFound);
app.use(errorHandler);

export default app;
